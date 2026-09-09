import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import {
  UserModel,
  DriverProfileModel,
  RideModel,
  RideOfferModel,
  DriverLocationModel,
  IdempotencyRecordModel,
} from '../models/index.js';
import { normalizeIndianPhoneNumber } from '@gaon-auto/utils';

describe('Gaon Auto - Edge Cases and Boundary Conditions Test Suite', () => {
  let passengerToken: string;
  let driverToken: string;
  let driverProfileId: string;

  beforeAll(async () => {
    await connectDatabase();
    await Promise.all([
      UserModel.deleteMany({}),
      DriverProfileModel.deleteMany({}),
      RideModel.deleteMany({}),
      RideOfferModel.deleteMany({}),
      DriverLocationModel.deleteMany({}),
      IdempotencyRecordModel.deleteMany({}),
    ]);

    // Setup Passenger
    const pOtp = await request(app).post('/api/v1/auth/request-otp').send({ phone: '9876500001' });
    const pAuth = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '9876500001', otp: pOtp.body.data.devOtp });
    passengerToken = pAuth.body.data.tokens.accessToken;

    // Setup Driver
    const dOtp = await request(app).post('/api/v1/auth/request-otp').send({ phone: '9876500002', role: 'DRIVER' });
    const dAuth = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '9876500002', otp: dOtp.body.data.devOtp });
    driverToken = dAuth.body.data.tokens.accessToken;

    // Onboard Driver
    const onboard = await request(app)
      .post('/api/v1/drivers/register')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        name: 'Suresh Kumar',
        licenceNumber: 'DL-9988776655',
        vehicle: {
          vehicleType: 'E_RICKSHAW',
          registrationNumber: 'UP32-ER-9988',
          seatingCapacity: 4,
        },
      });

    driverProfileId = onboard.body.data.driverProfile.id;

    // Directly approve driver in DB for this test suite
    await DriverProfileModel.findByIdAndUpdate(driverProfileId, {
      verificationStatus: 'APPROVED',
      isOnline: true,
      availabilityStatus: 'AVAILABLE',
    });

    await DriverLocationModel.create({
      driverId: driverProfileId,
      location: { type: 'Point', coordinates: [82.073, 26.266] },
      isOnline: true,
      availabilityStatus: 'AVAILABLE',
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('1. Rejects selection of an expired fare offer', async () => {
    // Passenger creates ride
    const rideRes = await request(app)
      .post('/api/v1/rides')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        pickup: { addressText: 'Temple', latitude: 26.266, longitude: 82.073 },
        destination: { addressText: 'Market', latitude: 26.28, longitude: 82.09 },
      });

    const rideId = rideRes.body.data.id;

    // Driver submits offer
    const offerRes = await request(app)
      .post(`/api/v1/rides/${rideId}/offers`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ fare: 40, etaMinutes: 3 });

    const offerId = offerRes.body.data.id;

    // Fast-forward offer expiration into past in database
    await RideOfferModel.findByIdAndUpdate(offerId, {
      expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
    });

    // Selecting expired offer must fail with 400
    const selectRes = await request(app)
      .post(`/api/v1/rides/${rideId}/select-offer`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ offerId });

    expect(selectRes.status).toBe(400);

    // Cancel this test ride
    await request(app)
      .post(`/api/v1/rides/${rideId}/cancel`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ reason: 'OTHER', details: 'Cleanup' });
  });

  it('2. Auto-withdraws pending offers when driver goes offline', async () => {
    // Passenger creates ride
    const rideRes = await request(app)
      .post('/api/v1/rides')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        pickup: { addressText: 'Bus Stand', latitude: 26.266, longitude: 82.073 },
        destination: { addressText: 'Hospital', latitude: 26.28, longitude: 82.09 },
      });

    const rideId = rideRes.body.data.id;

    // Driver submits offer
    const offerRes = await request(app)
      .post(`/api/v1/rides/${rideId}/offers`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ fare: 60, etaMinutes: 4 });

    const offerId = offerRes.body.data.id;

    // Driver goes offline
    await request(app)
      .patch('/api/v1/drivers/availability')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ isOnline: false });

    // Verify offer status is now WITHDRAWN
    const offerInDb = await RideOfferModel.findById(offerId);
    expect(offerInDb?.status).toBe('WITHDRAWN');

    // Attempting to select withdrawn offer fails with 400
    const selectRes = await request(app)
      .post(`/api/v1/rides/${rideId}/select-offer`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ offerId });

    expect(selectRes.status).toBe(400);

    // Set driver back online for subsequent tests
    await request(app)
      .patch('/api/v1/drivers/availability')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ isOnline: true });

    // Cancel test ride
    await request(app)
      .post(`/api/v1/rides/${rideId}/cancel`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ reason: 'OTHER' });
  });

  it('3. Validates phone normalization against edge cases (prefixes, leading zeroes, invalid digits)', () => {
    // Valid cases
    expect(normalizeIndianPhoneNumber('9876543210').canonical).toBe('+919876543210');
    expect(normalizeIndianPhoneNumber('09876543210').canonical).toBe('+919876543210');
    expect(normalizeIndianPhoneNumber('+91 98765 43210').canonical).toBe('+919876543210');
    expect(normalizeIndianPhoneNumber('91-98765-43210').canonical).toBe('+919876543210');

    // Invalid cases
    expect(normalizeIndianPhoneNumber('12345').isValid).toBe(false);
    expect(normalizeIndianPhoneNumber('5876543210').isValid).toBe(false); // Must start with 6-9
    expect(normalizeIndianPhoneNumber('abcdefghij').isValid).toBe(false);
    expect(normalizeIndianPhoneNumber('').isValid).toBe(false);
  });
});
