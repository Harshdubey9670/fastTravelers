"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rideService = exports.RideService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const index_js_1 = require("../models/index.js");
const config_1 = require("@gaon-auto/config");
const utils_1 = require("@gaon-auto/utils");
const location_service_js_1 = require("./location.service.js");
const socket_service_js_1 = require("./socket.service.js");
const errorHandler_middleware_js_1 = require("../middlewares/errorHandler.middleware.js");
class RideService {
    /**
     * Creates a ride request with anti-duplicate active ride validation.
     */
    async createRide(passengerId, input) {
        // Check if passenger already has an active ride
        const passengerObjId = new mongoose_1.default.Types.ObjectId(passengerId);
        const existingActiveRide = await index_js_1.RideModel.findOne({
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
        const rideNumber = (0, utils_1.generateRideNumber)();
        const plainOtp = (0, utils_1.generateNumericOtp)(config_1.SYSTEM_CONFIG.TRIP_OTP_LENGTH);
        const otpHash = (0, utils_1.hashSha256)(plainOtp, rideNumber);
        // Compute distance between pickup and destination if coordinates available
        const hasDestCoords = typeof input.destination.latitude === 'number' &&
            typeof input.destination.longitude === 'number';
        let distanceMeters = undefined;
        let durationSeconds = undefined;
        let distanceStatus = 'UNKNOWN';
        if (hasDestCoords &&
            typeof input.pickup.latitude === 'number' &&
            typeof input.pickup.longitude === 'number') {
            distanceMeters = (0, utils_1.calculateDistanceMeters)(input.pickup.latitude, input.pickup.longitude, input.destination.latitude, input.destination.longitude);
            durationSeconds = Math.round((distanceMeters / (25 * 1000)) * 3600); // 25km/h rural road average
            distanceStatus = 'CALCULATED';
        }
        const initialRadiusKm = config_1.SYSTEM_CONFIG.INITIAL_SEARCH_RADIUS_KM || 3.0;
        const ride = await index_js_1.RideModel.create({
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
                        coordinates: [input.destination.longitude, input.destination.latitude],
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
                maxAttempts: config_1.SYSTEM_CONFIG.TRIP_OTP_MAX_ATTEMPTS,
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
        await index_js_1.RideEventModel.create({
            rideId: ride._id,
            eventType: 'REQUESTED',
            actorId: new mongoose_1.default.Types.ObjectId(passengerId),
            actorRole: 'PASSENGER',
            metadata: { pickup: input.pickup.addressText, destination: input.destination.addressText },
        });
        // Find nearby available drivers using initial search radius (e.g. 3.0 km)
        const { drivers } = await location_service_js_1.locationService.findNearbyEligibleDrivers(input.pickup.latitude, input.pickup.longitude, initialRadiusKm, initialRadiusKm);
        ride.searchRadiusKm = initialRadiusKm;
        ride.contactedDriversCount = drivers.length;
        await ride.save();
        if (drivers.length > 0) {
            const driverIds = drivers.map((d) => d.driverId);
            socket_service_js_1.socketService.broadcastNewRideRequest(ride.toJSON(), driverIds, distanceMeters);
            await index_js_1.RideEventModel.create({
                rideId: ride._id,
                eventType: 'DRIVER_NOTIFIED',
                actorId: new mongoose_1.default.Types.ObjectId(passengerId),
                actorRole: 'SYSTEM',
                metadata: { contactedDriversCount: drivers.length, radiusUsedKm: initialRadiusKm },
            });
        }
        return ride.toJSON();
    }
    /**
     * Driver submits a fare and ETA offer for a ride.
     */
    async submitOffer(driverUserId, rideId, input) {
        const driverProfile = await index_js_1.DriverProfileModel.findOne({ userId: driverUserId });
        if (!driverProfile)
            throw new Error('Driver profile not found');
        if (driverProfile.verificationStatus !== 'APPROVED') {
            throw new Error('Driver account is not approved');
        }
        if (!driverProfile.isOnline || driverProfile.availabilityStatus !== 'AVAILABLE') {
            throw new Error('Driver is not available to submit offers');
        }
        const ride = await index_js_1.RideModel.findById(rideId);
        if (!ride)
            throw new Error('Ride not found');
        if (ride.status !== 'SEARCHING_DRIVER' && ride.status !== 'OFFERS_RECEIVED') {
            throw new Error(`Cannot submit offer. Ride is in status: ${ride.status}`);
        }
        const expiresAt = new Date(Date.now() + config_1.SYSTEM_CONFIG.FARE_OFFER_TIMEOUT_SECONDS * 1000);
        // Upsert offer
        const offer = await index_js_1.RideOfferModel.findOneAndUpdate({ rideId: ride._id, driverId: driverProfile._id }, {
            rideId: ride._id,
            driverId: driverProfile._id,
            fare: input.fare,
            etaMinutes: input.etaMinutes,
            message: input.message,
            status: 'PENDING',
            expiresAt,
        }, { upsert: true, new: true });
        // Update ride state to OFFERS_RECEIVED if it was SEARCHING_DRIVER
        if (ride.status === 'SEARCHING_DRIVER') {
            ride.status = 'OFFERS_RECEIVED';
            ride.timestamps.offersReceivedAt = new Date();
            ride.version += 1;
            await ride.save();
        }
        // Attach vehicle details to offer for passenger comparison
        const vehicle = await index_js_1.VehicleModel.findOne({ driverId: driverProfile._id });
        const populatedOffer = {
            ...offer.toJSON(),
            driver: {
                ...driverProfile.toJSON(),
                vehicle: vehicle ? vehicle.toJSON() : undefined,
            },
        };
        // Broadcast offer to passenger in realtime
        socket_service_js_1.socketService.sendOfferToPassenger(ride.passengerId.toString(), ride._id.toString(), populatedOffer);
        await index_js_1.RideEventModel.create({
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
    async selectOffer(passengerUserId, rideId, offerId) {
        const passengerObjId = new mongoose_1.default.Types.ObjectId(passengerUserId);
        const ride = await index_js_1.RideModel.findOne({ _id: rideId, passengerId: passengerObjId });
        if (!ride)
            throw new Error('Ride not found or access denied');
        if (ride.status !== 'SEARCHING_DRIVER' && ride.status !== 'OFFERS_RECEIVED') {
            throw new Error(`Ride is no longer awaiting driver selection (Status: ${ride.status})`);
        }
        const offer = await index_js_1.RideOfferModel.findById(offerId);
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
        const reservedDriver = await index_js_1.DriverProfileModel.findOneAndUpdate({
            _id: offer.driverId,
            isOnline: true,
            availabilityStatus: 'AVAILABLE',
        }, {
            availabilityStatus: 'BUSY',
        }, { new: true });
        if (!reservedDriver) {
            offer.status = 'WITHDRAWN';
            await offer.save();
            throw new errorHandler_middleware_js_1.AppError('Driver is no longer available. Please select another offer.', 409, 'DRIVER_UNAVAILABLE');
        }
        // Update DriverLocation status
        await index_js_1.DriverLocationModel.updateOne({ driverId: reservedDriver._id }, { availabilityStatus: 'BUSY' });
        // Atomically update Ride
        ride.driverId = reservedDriver._id;
        ride.selectedOfferId = offer._id;
        ride.status = 'DRIVER_SELECTED';
        ride.fare.finalFare = offer.fare;
        ride.timestamps.driverSelectedAt = new Date();
        ride.version += 1;
        await ride.save();
        // Mark winning offer as SELECTED
        offer.status = 'SELECTED';
        await offer.save();
        // Mark all other offers for this ride as REJECTED
        await index_js_1.RideOfferModel.updateMany({ rideId: ride._id, _id: { $ne: offer._id }, status: 'PENDING' }, { status: 'REJECTED' });
        // Withdraw any other pending offers made by this driver on other rides
        await index_js_1.RideOfferModel.updateMany({ driverId: reservedDriver._id, _id: { $ne: offer._id }, status: 'PENDING' }, { status: 'WITHDRAWN' });
        // Audit Event
        await index_js_1.RideEventModel.create({
            rideId: ride._id,
            eventType: 'DRIVER_SELECTED',
            actorId: new mongoose_1.default.Types.ObjectId(passengerUserId),
            actorRole: 'PASSENGER',
            metadata: { driverId: reservedDriver._id.toString(), fare: offer.fare, etaMinutes: offer.etaMinutes },
        });
        const populatedRide = await this.getRideById(ride._id.toString());
        // Broadcast to ride room and driver channel
        socket_service_js_1.socketService.broadcastToRide(ride._id.toString(), 'ride:driver_selected', {
            ride: populatedRide,
            offer: offer.toJSON(),
        });
        socket_service_js_1.socketService.sendToDriver(reservedDriver._id.toString(), 'ride:driver_selected', {
            ride: populatedRide,
            offer: offer.toJSON(),
        });
        return populatedRide;
    }
    /**
     * Driver marks that they have arrived at the passenger pickup point.
     */
    async markDriverArrived(driverUserId, rideId) {
        const driverProfile = await index_js_1.DriverProfileModel.findOne({ userId: driverUserId });
        if (!driverProfile)
            throw new Error('Driver profile not found');
        const ride = await index_js_1.RideModel.findOne({ _id: rideId, driverId: driverProfile._id });
        if (!ride)
            throw new Error('Ride not found or access denied');
        if (ride.status !== 'DRIVER_SELECTED' && ride.status !== 'DRIVER_EN_ROUTE') {
            throw new Error(`Cannot mark arrived. Ride status is: ${ride.status}`);
        }
        ride.status = 'DRIVER_ARRIVED';
        ride.timestamps.driverArrivedAt = new Date();
        ride.version += 1;
        await ride.save();
        await index_js_1.RideEventModel.create({
            rideId: ride._id,
            eventType: 'DRIVER_ARRIVED',
            actorId: driverProfile._id,
            actorRole: 'DRIVER',
        });
        const populatedRide = await this.getRideById(ride._id.toString());
        socket_service_js_1.socketService.broadcastToRide(ride._id.toString(), 'ride:driver_arrived', { ride: populatedRide });
        return populatedRide;
    }
    /**
     * Driver enters Trip OTP to start ride. Verified securely server-side.
     */
    async startRide(driverUserId, rideId, inputOtp) {
        const driverProfile = await index_js_1.DriverProfileModel.findOne({ userId: driverUserId });
        if (!driverProfile)
            throw new Error('Driver profile not found');
        const ride = await index_js_1.RideModel.findOne({ _id: rideId, driverId: driverProfile._id });
        if (!ride)
            throw new Error('Ride not found');
        if (ride.status !== 'DRIVER_ARRIVED' && ride.status !== 'DRIVER_SELECTED' && ride.status !== 'DRIVER_EN_ROUTE') {
            throw new Error(`Cannot start ride from status: ${ride.status}`);
        }
        if (ride.otp.attempts >= ride.otp.maxAttempts) {
            throw new Error('Maximum Trip OTP attempts exceeded. Please contact passenger or support.');
        }
        const expectedHash = (0, utils_1.hashSha256)(inputOtp, ride.rideNumber);
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
        await index_js_1.RideEventModel.create({
            rideId: ride._id,
            eventType: 'OTP_VERIFIED',
            actorId: driverProfile._id,
            actorRole: 'DRIVER',
        });
        await index_js_1.RideEventModel.create({
            rideId: ride._id,
            eventType: 'RIDE_STARTED',
            actorId: driverProfile._id,
            actorRole: 'DRIVER',
        });
        const populatedRide = await this.getRideById(ride._id.toString());
        socket_service_js_1.socketService.broadcastToRide(ride._id.toString(), 'ride:started', { ride: populatedRide });
        return populatedRide;
    }
    /**
     * Completes the ride, records final fare, frees the driver.
     */
    async completeRide(driverUserId, rideId, finalFare) {
        const driverProfile = await index_js_1.DriverProfileModel.findOne({ userId: driverUserId });
        if (!driverProfile)
            throw new Error('Driver profile not found');
        const ride = await index_js_1.RideModel.findOne({ _id: rideId, driverId: driverProfile._id });
        if (!ride)
            throw new Error('Ride not found');
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
        await index_js_1.DriverLocationModel.updateOne({ driverId: driverProfile._id }, { availabilityStatus: driverProfile.availabilityStatus });
        // Create Initial Payment Record (Pending)
        await index_js_1.PaymentRecordModel.findOneAndUpdate({ rideId: ride._id }, {
            rideId: ride._id,
            passengerId: ride.passengerId,
            driverId: driverProfile._id,
            amount: ride.fare.finalFare || 0,
            method: ride.payment.method || 'CASH',
            status: 'PENDING',
        }, { upsert: true, new: true });
        await index_js_1.RideEventModel.create({
            rideId: ride._id,
            eventType: 'RIDE_COMPLETED',
            actorId: driverProfile._id,
            actorRole: 'DRIVER',
            metadata: { finalFare: ride.fare.finalFare },
        });
        const populatedRide = await this.getRideById(ride._id.toString());
        socket_service_js_1.socketService.broadcastToRide(ride._id.toString(), 'ride:completed', { ride: populatedRide });
        return populatedRide;
    }
    /**
     * Records payment with explicit multi-state confirmation.
     */
    async recordPayment(userId, userRole, rideId, method, status, transactionReference) {
        const ride = await index_js_1.RideModel.findById(rideId);
        if (!ride)
            throw new Error('Ride not found');
        const paymentRecord = await index_js_1.PaymentRecordModel.findOne({ rideId: ride._id });
        if (!paymentRecord)
            throw new Error('Payment record not found');
        ride.payment.method = method;
        paymentRecord.method = method;
        if (status === 'PASSENGER_CLAIMS_PAID') {
            ride.payment.status = 'PASSENGER_CLAIMS_PAID';
            paymentRecord.status = 'PASSENGER_CLAIMS_PAID';
            paymentRecord.passengerClaimedAt = new Date();
        }
        else if (status === 'DRIVER_CONFIRMED_RECEIVED') {
            ride.payment.status = 'DRIVER_CONFIRMED_RECEIVED';
            ride.payment.paidAt = new Date();
            paymentRecord.status = 'DRIVER_CONFIRMED_RECEIVED';
            paymentRecord.driverConfirmedAt = new Date();
        }
        else if (status === 'DISPUTED') {
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
        socket_service_js_1.socketService.broadcastToRide(ride._id.toString(), 'ride:completed', { ride: populatedRide });
        return populatedRide;
    }
    /**
     * Cancels a ride with reason logging and actor tracking.
     */
    async cancelRide(userId, actorRole, rideId, reason, details) {
        const ride = await index_js_1.RideModel.findById(rideId);
        if (!ride)
            throw new Error('Ride not found');
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
            const dp = await index_js_1.DriverProfileModel.findById(ride.driverId);
            if (dp) {
                dp.cancelledTrips += 1;
                dp.availabilityStatus = dp.isOnline ? 'AVAILABLE' : 'OFFLINE';
                await dp.save();
                await index_js_1.DriverLocationModel.updateOne({ driverId: dp._id }, { availabilityStatus: dp.availabilityStatus });
            }
        }
        // Expire/reject all offers on this ride
        await index_js_1.RideOfferModel.updateMany({ rideId: ride._id }, { status: 'REJECTED' });
        // Audit Event
        const eventType = actorRole === 'PASSENGER' ? 'PASSENGER_CANCELLED' : 'DRIVER_CANCELLED';
        await index_js_1.RideEventModel.create({
            rideId: ride._id,
            eventType,
            actorId: new mongoose_1.default.Types.ObjectId(userId),
            actorRole,
            metadata: { reason, details },
        });
        const populatedRide = await this.getRideById(ride._id.toString());
        socket_service_js_1.socketService.broadcastToRide(ride._id.toString(), 'ride:cancelled', {
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
    async getActiveRide(userId, role) {
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
        let query = { status: { $in: activeStatuses } };
        if (role === 'DRIVER') {
            const dp = await index_js_1.DriverProfileModel.findOne({ userId: new mongoose_1.default.Types.ObjectId(userId) });
            if (!dp)
                return { ride: null, offers: [], chatMessages: [] };
            query.driverId = dp._id;
        }
        else {
            query.passengerId = new mongoose_1.default.Types.ObjectId(userId);
        }
        const ride = await index_js_1.RideModel.findOne(query).sort({ createdAt: -1 });
        if (!ride) {
            return { ride: null, offers: [], chatMessages: [] };
        }
        const offers = await index_js_1.RideOfferModel.find({ rideId: ride._id })
            .populate({
            path: 'driverId',
            populate: { path: 'userId' },
        })
            .lean();
        const chatMessages = await index_js_1.RideMessageModel.find({ rideId: ride._id }).sort({ createdAt: 1 }).lean();
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
    async getRideById(rideId) {
        const ride = await index_js_1.RideModel.findById(rideId)
            .populate('passengerId')
            .populate({
            path: 'driverId',
            populate: [{ path: 'userId' }, { path: 'vehicle' }],
        })
            .populate('selectedOfferId');
        if (!ride)
            throw new Error('Ride not found');
        const result = ride.toJSON();
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
    async expandSearchRadius(rideId) {
        const ride = await index_js_1.RideModel.findById(rideId);
        if (!ride || ride.status !== 'SEARCHING_DRIVER')
            return null;
        const currentRadius = ride.searchRadiusKm || 3.0;
        const maxRadius = config_1.SYSTEM_CONFIG.MAX_SEARCH_RADIUS_KM || 10.0;
        const step = 2.0; // 3.0 -> 5.0 -> 7.0 -> 10.0
        let nextRadius = currentRadius + step;
        if (nextRadius > maxRadius)
            nextRadius = maxRadius;
        if (nextRadius === currentRadius)
            return this.getRideById(rideId);
        const coords = ride.pickup.location?.coordinates;
        const pickupLng = coords ? coords[0] : 80.9462;
        const pickupLat = coords ? coords[1] : 26.8467;
        const { drivers } = await location_service_js_1.locationService.findNearbyEligibleDrivers(pickupLat, pickupLng, nextRadius, nextRadius);
        ride.searchRadiusKm = nextRadius;
        ride.contactedDriversCount = drivers.length;
        await ride.save();
        if (drivers.length > 0) {
            const driverIds = drivers.map((d) => d.driverId);
            socket_service_js_1.socketService.broadcastNewRideRequest(ride.toJSON(), driverIds, ride.routeMetrics?.distanceMeters || 0);
        }
        // Realtime notification to passenger room
        socket_service_js_1.socketService.broadcastToRide(ride._id.toString(), 'ride:radius_expanded', {
            rideId: ride._id.toString(),
            searchRadiusKm: nextRadius,
            contactedDriversCount: drivers.length,
        });
        return this.getRideById(rideId);
    }
}
exports.RideService = RideService;
exports.rideService = new RideService();
//# sourceMappingURL=ride.service.js.map