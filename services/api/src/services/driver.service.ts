import mongoose from 'mongoose';
import {
  UserModel,
  DriverProfileModel,
  VehicleModel,
  DriverLocationModel,
  DriverDocumentModel,
  RideOfferModel,
  RideModel,
} from '../models/index.js';
import { storageService } from './storage.service.js';
import { socketService } from './socket.service.js';
import { DriverOnboardingInput } from '@gaon-auto/validation';
import { DocumentType } from '@gaon-auto/types';
import { calculateDistanceMeters } from '@gaon-auto/utils';

export class DriverService {
  /**
   * Onboards a driver with vehicle and initial profile details.
   */
  async onboardDriver(userId: string, input: DriverOnboardingInput) {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('User not found');

    let driverProfile = await DriverProfileModel.findOne({ userId });
    if (driverProfile && driverProfile.verificationStatus === 'APPROVED') {
      throw new Error('Driver is already registered and approved.');
    }

    if (!driverProfile) {
      driverProfile = await DriverProfileModel.create({
        userId,
        licenceNumber: input.licenceNumber,
        licenceExpiry: input.licenceExpiry ? new Date(input.licenceExpiry) : undefined,
        upiId: input.upiId || undefined,
        operatingAreaId: input.operatingAreaId ? new mongoose.Types.ObjectId(input.operatingAreaId) : undefined,
        verificationStatus: 'PENDING',
        availabilityStatus: 'OFFLINE',
        isOnline: false,
      });

      // Update user role to DRIVER
      user.role = 'DRIVER';
      if (input.name) user.name = input.name;
      await user.save();
    } else {
      driverProfile.licenceNumber = input.licenceNumber;
      if (input.licenceExpiry) driverProfile.licenceExpiry = new Date(input.licenceExpiry);
      if (input.upiId) driverProfile.upiId = input.upiId;
      driverProfile.verificationStatus = 'PENDING';
      await driverProfile.save();
    }

    // Create or update vehicle
    let vehicle = await VehicleModel.findOne({ driverId: driverProfile._id });
    if (!vehicle) {
      vehicle = await VehicleModel.create({
        driverId: driverProfile._id,
        vehicleType: input.vehicle.vehicleType,
        registrationNumber: input.vehicle.registrationNumber,
        makeModel: input.vehicle.makeModel,
        year: input.vehicle.year,
        seatingCapacity: input.vehicle.seatingCapacity,
      });
    } else {
      vehicle.vehicleType = input.vehicle.vehicleType;
      vehicle.registrationNumber = input.vehicle.registrationNumber;
      vehicle.makeModel = input.vehicle.makeModel;
      vehicle.year = input.vehicle.year;
      vehicle.seatingCapacity = input.vehicle.seatingCapacity;
      await vehicle.save();
    }

    return {
      driverProfile: driverProfile.toJSON(),
      vehicle: vehicle.toJSON(),
    };
  }

  /**
   * Uploads and stores a protected driver document.
   */
  async uploadDocument(
    userId: string,
    documentType: DocumentType,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ) {
    const driverProfile = await DriverProfileModel.findOne({ userId });
    if (!driverProfile) {
      throw new Error('Driver profile not found. Please complete basic onboarding first.');
    }

    // Save to protected storage (private directory)
    const saved = await storageService.saveDocument(fileBuffer, originalName, mimeType);

    // Save document metadata in database
    const doc = await DriverDocumentModel.findOneAndUpdate(
      { driverId: driverProfile._id, documentType },
      {
        driverId: driverProfile._id,
        documentType,
        fileKey: saved.fileKey,
        originalName: saved.originalName,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        verificationStatus: 'PENDING',
        rejectionReason: undefined,
      },
      { upsert: true, new: true }
    );

    return doc.toJSON();
  }

  /**
   * Toggles driver Online/Offline status.
   */
  async setAvailability(userId: string, isOnline: boolean) {
    const driverProfile = await DriverProfileModel.findOne({ userId });
    if (!driverProfile) throw new Error('Driver profile not found');

    if (driverProfile.verificationStatus !== 'APPROVED') {
      throw new Error('Your driver account is not yet approved by admin.');
    }

    // If driver is currently BUSY on an active ride, they cannot switch to OFFLINE
    if (!isOnline && driverProfile.availabilityStatus === 'BUSY') {
      const activeRide = await RideModel.findOne({
        driverId: driverProfile._id,
        status: { $in: ['DRIVER_SELECTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'RIDE_READY', 'RIDE_STARTED'] },
      });
      if (activeRide) {
        throw new Error('Cannot go offline while you have an active ride in progress.');
      }
    }

    const newStatus = isOnline ? 'AVAILABLE' : 'OFFLINE';
    driverProfile.isOnline = isOnline;
    driverProfile.availabilityStatus = newStatus;
    await driverProfile.save();

    await DriverLocationModel.findOneAndUpdate(
      { driverId: driverProfile._id },
      { isOnline, availabilityStatus: newStatus },
      { upsert: false }
    );

    // If driver goes offline, automatically withdraw any pending offers from this driver
    if (!isOnline) {
      await RideOfferModel.updateMany(
        { driverId: driverProfile._id, status: 'PENDING' },
        { status: 'WITHDRAWN' }
      );
    }

    return {
      isOnline: driverProfile.isOnline,
      availabilityStatus: driverProfile.availabilityStatus,
    };
  }

  /**
   * Updates driver's live GPS coordinates with throttling and active-ride broadcast.
   */
  async updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
    heading?: number,
    speed?: number,
    accuracy?: number
  ) {
    const driverProfile = await DriverProfileModel.findOne({ userId });
    if (!driverProfile) throw new Error('Driver profile not found');

    const now = new Date();

    const existingLoc = await DriverLocationModel.findOne({ driverId: driverProfile._id });

    // Distance threshold check: if moved less than 10 meters and updated recently, skip DB write
    if (existingLoc) {
      const [prevLng, prevLat] = existingLoc.location.coordinates;
      const movedMeters = calculateDistanceMeters(prevLat, prevLng, latitude, longitude);
      const timeSinceLastMs = now.getTime() - new Date(existingLoc.updatedAt).getTime();

      // If active ride, update at least every 5s or 10m; if idle, at least every 15s or 15m
      const minIntervalMs = driverProfile.availabilityStatus === 'BUSY' ? 5000 : 15000;
      if (movedMeters < 10 && timeSinceLastMs < minIntervalMs) {
        return { updated: false, throttled: true };
      }
    }

    await DriverLocationModel.findOneAndUpdate(
      { driverId: driverProfile._id },
      {
        driverId: driverProfile._id,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        heading,
        speed,
        accuracy,
        isOnline: driverProfile.isOnline,
        availabilityStatus: driverProfile.availabilityStatus,
        updatedAt: now,
      },
      { upsert: true, new: true }
    );

    driverProfile.lastLocationUpdateAt = now;
    await driverProfile.save();

    // If driver is BUSY on an active ride, broadcast live location to the passenger
    if (driverProfile.availabilityStatus === 'BUSY') {
      const activeRide = await RideModel.findOne({
        driverId: driverProfile._id,
        status: { $in: ['DRIVER_SELECTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'RIDE_READY', 'RIDE_STARTED'] },
      });

      if (activeRide) {
        socketService.broadcastToRide(activeRide._id.toString(), 'driver:location_updated', {
          driverId: driverProfile._id.toString(),
          latitude,
          longitude,
          heading,
          updatedAt: now.toISOString(),
        });
      }
    }

    return { updated: true, throttled: false };
  }
}

export const driverService = new DriverService();
