import mongoose from 'mongoose';
import {
  RideModel,
  RideOfferModel,
  RideEventModel,
  DriverProfileModel,
  DriverLocationModel,
  PaymentRecordModel,
  UserModel,
  VehicleModel,
  RideMessageModel,
} from '../models/index.js';
import {
  SYSTEM_CONFIG,
  canTransitionRide,
  PASSENGER_CANCELLATION_REASONS,
  DRIVER_CANCELLATION_REASONS,
} from '@gaon-auto/config';
import {
  generateNumericOtp,
  hashSha256,
  generateRideNumber,
  calculateDistanceMeters,
  estimateEtaMinutes,
} from '@gaon-auto/utils';
import { locationService } from './location.service.js';
import { socketService } from './socket.service.js';
import { AppError } from '../middlewares/errorHandler.middleware.js';
import { CreateRideInput, SubmitOfferInput } from '@gaon-auto/validation';

import { RideCancellationActor, PaymentMethod, PaymentStatus } from '@gaon-auto/types';


export class RideService {
  /**
   * Creates a ride request with anti-duplicate active ride validation.
   */
  async createRide(passengerId: string, input: CreateRideInput) {
    // Check if passenger already has an active ride
    const passengerObjId = new mongoose.Types.ObjectId(passengerId);
    const existingActiveRide = await RideModel.findOne({
      passengerId: passengerObjId,
      status: {
        $in: [
          'REQUESTED',
          'SEARCHING_DRIVER',
          'OFFERS_RECEIVED',
          'DRIVER_SELECTED',
          'DRIVER_EN_ROUTE',
          'DRIVER_ARRIVED',
          'RIDE_READY',
          'RIDE_STARTED',
        ],
      },
    });

    if (existingActiveRide) {
      throw new Error('You already have an active ride request. Please complete or cancel it first.');
    }

    const rideNumber = generateRideNumber();
    const plainOtp = generateNumericOtp(SYSTEM_CONFIG.TRIP_OTP_LENGTH);
    const otpHash = hashSha256(plainOtp, rideNumber);

    // Compute distance between pickup and destination if coordinates available
    const hasDestCoords =
      typeof input.destination.latitude === 'number' &&
      typeof input.destination.longitude === 'number';
    let distanceMeters: number | undefined = undefined;
    let durationSeconds: number | undefined = undefined;
    let distanceStatus: 'CALCULATED' | 'UNKNOWN' = 'UNKNOWN';

    if (
      hasDestCoords &&
      typeof input.pickup.latitude === 'number' &&
      typeof input.pickup.longitude === 'number'
    ) {
      distanceMeters = calculateDistanceMeters(
        input.pickup.latitude,
        input.pickup.longitude,
        input.destination.latitude!,
        input.destination.longitude!
      );
      durationSeconds = Math.round((distanceMeters / (25 * 1000)) * 3600); // 25km/h rural road average
      distanceStatus = 'CALCULATED';
    }

    const initialRadiusKm = SYSTEM_CONFIG.INITIAL_SEARCH_RADIUS_KM || 3.0;

    const ride = await RideModel.create({
      rideNumber,
      passengerId: passengerObjId,
      pickup: {
        addressText: input.pickup.addressText,
        landmark: input.pickup.landmark,
        location: {
          type: 'Point',
          coordinates: [input.pickup.longitude, input.pickup.latitude],
        },
      },
      destination: {
        addressText: input.destination.addressText,
        landmark: input.destination.landmark,
        location: hasDestCoords
          ? {
              type: 'Point',
              coordinates: [input.destination.longitude!, input.destination.latitude!],
            }
          : undefined,
      },
      passengerCount: input.passengerCount,
      luggageDescription: input.luggageDescription,
      passengerNote: input.passengerNote,
      vehiclePreference: input.vehiclePreference,
      status: 'SEARCHING_DRIVER',
      version: 1,
      otp: {
        code: plainOtp,
        codeHash: otpHash,
        attempts: 0,
        maxAttempts: SYSTEM_CONFIG.TRIP_OTP_MAX_ATTEMPTS,
      },
      timestamps: {
        requestedAt: new Date(),
        searchingAt: new Date(),
      },
      routeMetrics: {
        distanceMeters,
        durationSeconds,
        distanceStatus,
      },
      searchRadiusKm: initialRadiusKm,
    });

    // Create immutable audit ledger event
    await RideEventModel.create({
      rideId: ride._id,
      eventType: 'REQUESTED',
      actorId: new mongoose.Types.ObjectId(passengerId),
      actorRole: 'PASSENGER',
      metadata: { pickup: input.pickup.addressText, destination: input.destination.addressText },
    });

    // Find nearby available drivers using initial search radius (e.g. 3.0 km)
    const { drivers } = await locationService.findNearbyEligibleDrivers(
      input.pickup.latitude,
      input.pickup.longitude,
      initialRadiusKm,
      initialRadiusKm
    );

    ride.searchRadiusKm = initialRadiusKm;
    ride.contactedDriversCount = drivers.length;
    await ride.save();

    if (drivers.length > 0) {
      const driverIds = drivers.map((d) => d.driverId);
      socketService.broadcastNewRideRequest(ride.toJSON() as any, driverIds, distanceMeters);

      await RideEventModel.create({
        rideId: ride._id,
        eventType: 'DRIVER_NOTIFIED',
        actorId: new mongoose.Types.ObjectId(passengerId),
        actorRole: 'SYSTEM',
        metadata: { contactedDriversCount: drivers.length, radiusUsedKm: initialRadiusKm },
      });
    }

    return ride.toJSON();
  }

  /**
   * Driver submits a fare and ETA offer for a ride.
   */
  async submitOffer(driverUserId: string, rideId: string, input: SubmitOfferInput): Promise<any> {
    const driverProfile = await DriverProfileModel.findOne({ userId: driverUserId });
    if (!driverProfile) throw new Error('Driver profile not found');

    if (driverProfile.verificationStatus !== 'APPROVED') {
      throw new Error('Driver account is not approved');
    }

    if (!driverProfile.isOnline || driverProfile.availabilityStatus !== 'AVAILABLE') {
      throw new Error('Driver is not available to submit offers');
    }

    const ride = await RideModel.findById(rideId);
    if (!ride) throw new Error('Ride not found');

    if (ride.status !== 'SEARCHING_DRIVER' && ride.status !== 'OFFERS_RECEIVED') {
      throw new Error(`Cannot submit offer. Ride is in status: ${ride.status}`);
    }

    const expiresAt = new Date(Date.now() + SYSTEM_CONFIG.FARE_OFFER_TIMEOUT_SECONDS * 1000);

    // Upsert offer
    const offer = await RideOfferModel.findOneAndUpdate(
      { rideId: ride._id, driverId: driverProfile._id },
      {
        rideId: ride._id,
        driverId: driverProfile._id,
        fare: input.fare,
        etaMinutes: input.etaMinutes,
        message: input.message,
        status: 'PENDING',
        expiresAt,
      },
      { upsert: true, new: true }
    );

    // Update ride state to OFFERS_RECEIVED if it was SEARCHING_DRIVER
    if (ride.status === 'SEARCHING_DRIVER') {
      ride.status = 'OFFERS_RECEIVED';
      ride.timestamps.offersReceivedAt = new Date();
      ride.version += 1;
      await ride.save();
    }

    // Attach vehicle details to offer for passenger comparison
    const vehicle = await VehicleModel.findOne({ driverId: driverProfile._id });
    const populatedOffer: any = {
      ...offer.toJSON(),
      driver: {
        ...driverProfile.toJSON(),
        vehicle: vehicle ? vehicle.toJSON() : undefined,
      },
    };

    // Broadcast offer to passenger in realtime
    socketService.sendOfferToPassenger(ride.passengerId.toString(), ride._id.toString(), populatedOffer as any);

    await RideEventModel.create({
      rideId: ride._id,
      eventType: 'OFFER_CREATED',
      actorId: driverProfile._id,
      actorRole: 'DRIVER',
      metadata: { fare: input.fare, etaMinutes: input.etaMinutes },
    });

    return populatedOffer;
  }

  /**
   * Passenger selects a driver offer.
   * STRICT ATOMIC LOCKING TO PREVENT DOUBLE BOOKING RACE CONDITIONS.
   */
  async selectOffer(passengerUserId: string, rideId: string, offerId: string) {
    const passengerObjId = new mongoose.Types.ObjectId(passengerUserId);
    const ride = await RideModel.findOne({ _id: rideId, passengerId: passengerObjId });
    if (!ride) throw new Error('Ride not found or access denied');

    if (ride.status !== 'SEARCHING_DRIVER' && ride.status !== 'OFFERS_RECEIVED') {
      throw new Error(`Ride is no longer awaiting driver selection (Status: ${ride.status})`);
    }

    const offer = await RideOfferModel.findById(offerId);
    if (!offer || offer.rideId.toString() !== rideId) {
      throw new Error('Selected offer not found');
    }

    if (offer.status !== 'PENDING') {
      throw new Error(`Offer is no longer valid (Status: ${offer.status})`);
    }

    if (offer.expiresAt < new Date()) {
      offer.status = 'EXPIRED';
      await offer.save();
      throw new Error('This offer has expired. Please select another offer.');
    }

    // ATOMIC RESERVATION OF DRIVER:
    // Only succeeds if driver is currently AVAILABLE and ONLINE!
    const reservedDriver = await DriverProfileModel.findOneAndUpdate(
      {
        _id: offer.driverId,
        isOnline: true,
        availabilityStatus: 'AVAILABLE',
      },
      {
        availabilityStatus: 'BUSY',
      },
      { new: true }
    );

    if (!reservedDriver) {
      offer.status = 'WITHDRAWN';
      await offer.save();
      throw new AppError('Driver is no longer available. Please select another offer.', 409, 'DRIVER_UNAVAILABLE');
    }


    // Update DriverLocation status
    await DriverLocationModel.updateOne(
      { driverId: reservedDriver._id },
      { availabilityStatus: 'BUSY' }
    );

    // Atomically update Ride
    ride.driverId = reservedDriver._id as any;
    ride.selectedOfferId = offer._id as any;
    ride.status = 'DRIVER_SELECTED';
    ride.fare.finalFare = offer.fare;
    ride.timestamps.driverSelectedAt = new Date();
    ride.version += 1;
    await ride.save();

    // Mark winning offer as SELECTED
    offer.status = 'SELECTED';
    await offer.save();

    // Mark all other offers for this ride as REJECTED
    await RideOfferModel.updateMany(
      { rideId: ride._id, _id: { $ne: offer._id }, status: 'PENDING' },
      { status: 'REJECTED' }
    );

    // Withdraw any other pending offers made by this driver on other rides
    await RideOfferModel.updateMany(
      { driverId: reservedDriver._id, _id: { $ne: offer._id }, status: 'PENDING' },
      { status: 'WITHDRAWN' }
    );

    // Audit Event
    await RideEventModel.create({
      rideId: ride._id,
      eventType: 'DRIVER_SELECTED',
      actorId: new mongoose.Types.ObjectId(passengerUserId),
      actorRole: 'PASSENGER',
      metadata: { driverId: reservedDriver._id.toString(), fare: offer.fare, etaMinutes: offer.etaMinutes },
    });

    const populatedRide = await this.getRideById(ride._id.toString());

    // Broadcast to ride room and driver channel
    socketService.broadcastToRide(ride._id.toString(), 'ride:driver_selected', {
      ride: populatedRide,
      offer: offer.toJSON(),
    });
    socketService.sendToDriver(reservedDriver._id.toString(), 'ride:driver_selected', {
      ride: populatedRide,
      offer: offer.toJSON(),
    });

    return populatedRide;
  }

  /**
   * Driver marks that they have arrived at the passenger pickup point.
   */
  async markDriverArrived(driverUserId: string, rideId: string) {
    const driverProfile = await DriverProfileModel.findOne({ userId: driverUserId });
    if (!driverProfile) throw new Error('Driver profile not found');

    const ride = await RideModel.findOne({ _id: rideId, driverId: driverProfile._id });
    if (!ride) throw new Error('Ride not found or access denied');

    if (ride.status !== 'DRIVER_SELECTED' && ride.status !== 'DRIVER_EN_ROUTE') {
      throw new Error(`Cannot mark arrived. Ride status is: ${ride.status}`);
    }

    ride.status = 'DRIVER_ARRIVED';
    ride.timestamps.driverArrivedAt = new Date();
    ride.version += 1;
    await ride.save();

    await RideEventModel.create({
      rideId: ride._id,
      eventType: 'DRIVER_ARRIVED',
      actorId: driverProfile._id,
      actorRole: 'DRIVER',
    });

    const populatedRide = await this.getRideById(ride._id.toString());
    socketService.broadcastToRide(ride._id.toString(), 'ride:driver_arrived', { ride: populatedRide });

    return populatedRide;
  }

  /**
   * Driver enters Trip OTP to start ride. Verified securely server-side.
   */
  async startRide(driverUserId: string, rideId: string, inputOtp: string) {
    const driverProfile = await DriverProfileModel.findOne({ userId: driverUserId });
    if (!driverProfile) throw new Error('Driver profile not found');

    const ride = await RideModel.findOne({ _id: rideId, driverId: driverProfile._id });
    if (!ride) throw new Error('Ride not found');

    if (ride.status !== 'DRIVER_ARRIVED' && ride.status !== 'DRIVER_SELECTED' && ride.status !== 'DRIVER_EN_ROUTE') {
      throw new Error(`Cannot start ride from status: ${ride.status}`);
    }

    if (ride.otp.attempts >= ride.otp.maxAttempts) {
      throw new Error('Maximum Trip OTP attempts exceeded. Please contact passenger or support.');
    }

    const expectedHash = hashSha256(inputOtp, ride.rideNumber);
    if (expectedHash !== ride.otp.codeHash) {
      ride.otp.attempts += 1;
      await ride.save();
      const remaining = ride.otp.maxAttempts - ride.otp.attempts;
      throw new Error(`Invalid Trip OTP. ${remaining} attempt(s) remaining.`);
    }

    ride.otp.verifiedAt = new Date();
    ride.status = 'RIDE_STARTED';
    ride.timestamps.rideStartedAt = new Date();
    ride.version += 1;
    await ride.save();

    await RideEventModel.create({
      rideId: ride._id,
      eventType: 'OTP_VERIFIED',
      actorId: driverProfile._id,
      actorRole: 'DRIVER',
    });

    await RideEventModel.create({
      rideId: ride._id,
      eventType: 'RIDE_STARTED',
      actorId: driverProfile._id,
      actorRole: 'DRIVER',
    });

    const populatedRide = await this.getRideById(ride._id.toString());
    socketService.broadcastToRide(ride._id.toString(), 'ride:started', { ride: populatedRide });

    return populatedRide;
  }

  /**
   * Completes the ride, records final fare, frees the driver.
   */
  async completeRide(driverUserId: string, rideId: string, finalFare?: number) {
    const driverProfile = await DriverProfileModel.findOne({ userId: driverUserId });
    if (!driverProfile) throw new Error('Driver profile not found');

    const ride = await RideModel.findOne({ _id: rideId, driverId: driverProfile._id });
    if (!ride) throw new Error('Ride not found');

    if (ride.status !== 'RIDE_STARTED') {
      throw new Error(`Cannot complete ride from status: ${ride.status}`);
    }

    const now = new Date();
    ride.status = 'RIDE_COMPLETED';
    ride.timestamps.completedAt = now;
    if (finalFare) {
      ride.fare.finalFare = finalFare;
    }
    ride.version += 1;
    await ride.save();

    // Free driver back to AVAILABLE (if still online)
    driverProfile.completedTrips += 1;
    driverProfile.totalTrips += 1;
    driverProfile.availabilityStatus = driverProfile.isOnline ? 'AVAILABLE' : 'OFFLINE';
    await driverProfile.save();

    await DriverLocationModel.updateOne(
      { driverId: driverProfile._id },
      { availabilityStatus: driverProfile.availabilityStatus }
    );

    // Create Initial Payment Record (Pending)
    await PaymentRecordModel.findOneAndUpdate(
      { rideId: ride._id },
      {
        rideId: ride._id,
        passengerId: ride.passengerId,
        driverId: driverProfile._id,
        amount: ride.fare.finalFare || 0,
        method: ride.payment.method || 'CASH',
        status: 'PENDING',
      },
      { upsert: true, new: true }
    );

    await RideEventModel.create({
      rideId: ride._id,
      eventType: 'RIDE_COMPLETED',
      actorId: driverProfile._id,
      actorRole: 'DRIVER',
      metadata: { finalFare: ride.fare.finalFare },
    });

    const populatedRide = await this.getRideById(ride._id.toString());
    socketService.broadcastToRide(ride._id.toString(), 'ride:completed', { ride: populatedRide });

    return populatedRide;
  }

  /**
   * Records payment with explicit multi-state confirmation.
   */
  async recordPayment(
    userId: string,
    userRole: string,
    rideId: string,
    method: PaymentMethod,
    status: PaymentStatus,
    transactionReference?: string
  ) {
    const ride = await RideModel.findById(rideId);
    if (!ride) throw new Error('Ride not found');

    const paymentRecord = await PaymentRecordModel.findOne({ rideId: ride._id });
    if (!paymentRecord) throw new Error('Payment record not found');

    ride.payment.method = method;
    paymentRecord.method = method;

    if (status === 'PASSENGER_CLAIMS_PAID') {
      ride.payment.status = 'PASSENGER_CLAIMS_PAID';
      paymentRecord.status = 'PASSENGER_CLAIMS_PAID';
      paymentRecord.passengerClaimedAt = new Date();
    } else if (status === 'DRIVER_CONFIRMED_RECEIVED') {
      ride.payment.status = 'DRIVER_CONFIRMED_RECEIVED';
      ride.payment.paidAt = new Date();
      paymentRecord.status = 'DRIVER_CONFIRMED_RECEIVED';
      paymentRecord.driverConfirmedAt = new Date();
    } else if (status === 'DISPUTED') {
      ride.payment.status = 'DISPUTED';
      paymentRecord.status = 'DISPUTED';
    }

    if (transactionReference) {
      ride.payment.transactionReference = transactionReference;
      paymentRecord.transactionReference = transactionReference;
    }

    await ride.save();
    await paymentRecord.save();

    const populatedRide = await this.getRideById(ride._id.toString());
    socketService.broadcastToRide(ride._id.toString(), 'ride:completed', { ride: populatedRide });

    return populatedRide;
  }

  /**
   * Cancels a ride with reason logging and actor tracking.
   */
  async cancelRide(
    userId: string,
    actorRole: RideCancellationActor,
    rideId: string,
    reason: string,
    details?: string
  ) {
    const ride = await RideModel.findById(rideId);
    if (!ride) throw new Error('Ride not found');

    if (ride.status === 'RIDE_COMPLETED' || ride.status === 'CANCELLED') {
      throw new Error(`Cannot cancel ride in status: ${ride.status}`);
    }

    ride.status = 'CANCELLED';
    ride.timestamps.cancelledAt = new Date();
    ride.cancellation = {
      cancelledBy: actorRole,
      reason,
      details,
      cancelledAt: new Date(),
    };
    ride.version += 1;
    await ride.save();

    // If a driver was assigned, free the driver back to AVAILABLE
    if (ride.driverId) {
      const dp = await DriverProfileModel.findById(ride.driverId);
      if (dp) {
        dp.cancelledTrips += 1;
        dp.availabilityStatus = dp.isOnline ? 'AVAILABLE' : 'OFFLINE';
        await dp.save();

        await DriverLocationModel.updateOne(
          { driverId: dp._id },
          { availabilityStatus: dp.availabilityStatus }
        );
      }
    }

    // Expire/reject all offers on this ride
    await RideOfferModel.updateMany({ rideId: ride._id }, { status: 'REJECTED' });

    // Audit Event
    const eventType = actorRole === 'PASSENGER' ? 'PASSENGER_CANCELLED' : 'DRIVER_CANCELLED';
    await RideEventModel.create({
      rideId: ride._id,
      eventType,
      actorId: new mongoose.Types.ObjectId(userId),
      actorRole,
      metadata: { reason, details },
    });

    const populatedRide = await this.getRideById(ride._id.toString());
    socketService.broadcastToRide(ride._id.toString(), 'ride:cancelled', {
      ride: populatedRide,
      reason,
      cancelledBy: actorRole,
    });

    return populatedRide;
  }

  /**
   * Authoritative Active Ride Recovery.
   * Returns current in-flight ride for reconnect / cold-start reconciliation.
   */
  async getActiveRide(userId: string, role: string) {
    const activeStatuses = [
      'REQUESTED',
      'SEARCHING_DRIVER',
      'OFFERS_RECEIVED',
      'DRIVER_SELECTED',
      'DRIVER_EN_ROUTE',
      'DRIVER_ARRIVED',
      'RIDE_READY',
      'RIDE_STARTED',
    ];

    let query: any = { status: { $in: activeStatuses } };

    if (role === 'DRIVER') {
      const dp = await DriverProfileModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!dp) return { ride: null, offers: [], chatMessages: [] };
      query.driverId = dp._id;
    } else {
      query.passengerId = new mongoose.Types.ObjectId(userId);
    }

    const ride = await RideModel.findOne(query).sort({ createdAt: -1 });
    if (!ride) {
      return { ride: null, offers: [], chatMessages: [] };
    }

    const offers = await RideOfferModel.find({ rideId: ride._id })
      .populate({
        path: 'driverId',
        populate: { path: 'userId' },
      })
      .lean();

    const chatMessages = await RideMessageModel.find({ rideId: ride._id }).sort({ createdAt: 1 }).lean();
    const populatedRide = await this.getRideById(ride._id.toString());

    return {
      ride: populatedRide,
      offers,
      chatMessages,
    };
  }

  /**
   * Helper to populate full ride details.
   */
  async getRideById(rideId: string) {
    const ride = await RideModel.findById(rideId)
      .populate('passengerId')
      .populate({
        path: 'driverId',
        populate: [{ path: 'userId' }, { path: 'vehicle' }],
      })
      .populate('selectedOfferId');

    if (!ride) throw new Error('Ride not found');

    const result: any = ride.toJSON();
    if (result.passengerId && typeof result.passengerId === 'object') {
      result.passenger = result.passengerId;
    }
    if (result.driverId && typeof result.driverId === 'object') {
      result.driver = result.driverId;
    }
    if (result.selectedOfferId && typeof result.selectedOfferId === 'object') {
      result.selectedOffer = result.selectedOfferId;
    }

    return result;
  }

  /**
   * Progressive Search Radius Expansion:
   * Expands search radius (e.g. 3km -> 5km -> 7km -> 10km) and broadcasts to newly eligible drivers.
   */
  async expandSearchRadius(rideId: string): Promise<any> {
    const ride = await RideModel.findById(rideId);
    if (!ride || ride.status !== 'SEARCHING_DRIVER') return null;

    const currentRadius = ride.searchRadiusKm || 3.0;
    const maxRadius = SYSTEM_CONFIG.MAX_SEARCH_RADIUS_KM || 10.0;
    let nextRadius = 5.0;
    if (currentRadius < 5.0) {
      nextRadius = 5.0;
    } else if (currentRadius < 7.0) {
      nextRadius = 7.0;
    } else {
      nextRadius = maxRadius; // 10.0
    }

    if (nextRadius === currentRadius) return this.getRideById(rideId);

    const coords = ride.pickup.location?.coordinates;
    const pickupLng = coords ? coords[0] : 80.9462;
    const pickupLat = coords ? coords[1] : 26.8467;
    const { drivers } = await locationService.findNearbyEligibleDrivers(
      pickupLat,
      pickupLng,
      nextRadius,
      nextRadius
    );

    ride.searchRadiusKm = nextRadius;
    ride.contactedDriversCount = drivers.length;
    await ride.save();

    if (drivers.length > 0) {
      const driverIds = drivers.map((d) => d.driverId);
      socketService.broadcastNewRideRequest(
        ride.toJSON() as any,
        driverIds,
        ride.routeMetrics?.distanceMeters || 0
      );
    }

    // Realtime notification to passenger room
    socketService.broadcastToRide(ride._id.toString(), 'ride:radius_expanded', {
      rideId: ride._id.toString(),
      searchRadiusKm: nextRadius,
      contactedDriversCount: drivers.length,
    });

    return this.getRideById(rideId);
  }
}

export const rideService = new RideService();
