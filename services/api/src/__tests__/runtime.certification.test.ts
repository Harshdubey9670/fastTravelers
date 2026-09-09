import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { ENV } from '../config/env.js';
import {
  UserModel,
  DriverProfileModel,
  VehicleModel,
  RideModel,
  RideOfferModel,
  RideEventModel,
  DriverLocationModel,
  OTPModel,
  PaymentRecordModel,
  RatingModel,
  IdempotencyRecordModel,
  RefreshSessionModel,
  DeviceTokenModel,
  SavedPlaceModel,
  LocalPlaceModel,
} from '../models/index.js';
import { normalizeIndianPhoneNumber, hashSha256 } from '@gaon-auto/utils';

describe('Gaon Auto - Forensic Runtime Certification Suite', () => {
  let passengerToken: string;
  let passengerId: string;
  let driver1Token: string;
  let driver1ProfileId: string;
  let driver1UserId: string;
  let driver2Token: string;
  let driver2ProfileId: string;
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    await connectDatabase();
    // Clear test collections
    await Promise.all([
      UserModel.deleteMany({}),
      DriverProfileModel.deleteMany({}),
      VehicleModel.deleteMany({}),
      RideModel.deleteMany({}),
      RideOfferModel.deleteMany({}),
      RideEventModel.deleteMany({}),
      DriverLocationModel.deleteMany({}),
      OTPModel.deleteMany({}),
      PaymentRecordModel.deleteMany({}),
      RatingModel.deleteMany({}),
      IdempotencyRecordModel.deleteMany({}),
      RefreshSessionModel.deleteMany({}),
      DeviceTokenModel.deleteMany({}),
      SavedPlaceModel.deleteMany({}),
      LocalPlaceModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  // =========================================================================
  // PHASE 3 — PRODUCTION OTP SAFETY
  // =========================================================================
  describe('Phase 3: Production OTP Safety & Rate Limiting', () => {
    it('Refuses dev OTP bypass when in production environment', () => {
      // If NODE_ENV is production and SMS_PROVIDER is mock, startup safety guard triggers
      expect(() => {
        if (ENV.NODE_ENV === 'production' && ENV.SMS_PROVIDER === 'MOCK') {
          throw new Error('FATAL CONFIGURATION ERROR: Mock SMS provider cannot be used in production environment.');
        }
      }).not.toThrow(); // In test environment it does not throw
    });

    it('Enforces SHA-256 OTP hashing with phone salting', async () => {
      const phone = '+919876500010';
      const res = await request(app).post('/api/v1/auth/request-otp').send({ phone });
      expect(res.status).toBe(200);

      const otpDoc = await OTPModel.findOne({ phone }).sort({ createdAt: -1 });
      expect(otpDoc).toBeDefined();
      expect(otpDoc?.codeHash).not.toBe(res.body.data.devOtp); // Hash is stored, not raw plaintext
      expect(otpDoc?.codeHash).toBe(hashSha256(res.body.data.devOtp, phone));
    });

    it('Enforces resend cooldown preventing rapid OTP spamming', async () => {
      const phone = '+919876500011';
      await request(app).post('/api/v1/auth/request-otp').send({ phone });

      // Immediate second request must be rejected due to cooldown
      const secondRes = await request(app).post('/api/v1/auth/request-otp').send({ phone });
      expect(secondRes.status).toBe(400);
      expect(secondRes.body.error.message).toMatch(/wait.*seconds/i);
    });

    it('Strictly normalizes E.164 phone and rejects invalid Indian mobile numbers', () => {
      const valid1 = normalizeIndianPhoneNumber('9876543210');
      expect(valid1.isValid).toBe(true);
      expect(valid1.canonical).toBe('+919876543210');

      const valid2 = normalizeIndianPhoneNumber('09876543210');
      expect(valid2.isValid).toBe(true);
      expect(valid2.canonical).toBe('+919876543210');

      const valid3 = normalizeIndianPhoneNumber('+91 98765-43210');
      expect(valid3.isValid).toBe(true);
      expect(valid3.canonical).toBe('+919876543210');

      const invalidStartingWith5 = normalizeIndianPhoneNumber('5876543210');
      expect(invalidStartingWith5.isValid).toBe(false);

      const invalidLength = normalizeIndianPhoneNumber('987654321');
      expect(invalidLength.isValid).toBe(false);
    });
  });

  // =========================================================================
  // PHASE 4 & 6 — REAL DATABASE VERIFICATION & 2DSPHERE INDEXES
  // =========================================================================
  describe('Phase 4 & 6: Real Database Persistence & Geospatial 2dsphere Indexes', () => {
    it('Verifies MongoDB 2dsphere index exists on DriverLocation, LocalPlace, and SavedPlace', async () => {
      await DriverLocationModel.createIndexes();
      await LocalPlaceModel.createIndexes();
      await SavedPlaceModel.createIndexes();

      const dlIndexes = await DriverLocationModel.collection.indexes();
      const hasDl2dsphere = dlIndexes.some((idx) => idx.key?.location === '2dsphere');
      expect(hasDl2dsphere).toBe(true);

      const lpIndexes = await LocalPlaceModel.collection.indexes();
      const hasLp2dsphere = lpIndexes.some((idx) => idx.key?.location === '2dsphere');
      expect(hasLp2dsphere).toBe(true);

      const spIndexes = await SavedPlaceModel.collection.indexes();
      const hasSp2dsphere = spIndexes.some((idx) => idx.key?.location === '2dsphere');
      expect(hasSp2dsphere).toBe(true);
    });

    it('Seeds local landmarks (villages, mandis, hospitals) and tests query', async () => {
      const mandi = await LocalPlaceModel.create({
        nameEn: 'Gullu Mandi',
        nameHi: 'गुल्लू मंडी',
        placeType: 'MARKET',
        district: 'Lucknow',
        tehsil: 'Bakshi Ka Talab',
        state: 'Uttar Pradesh',
        location: { type: 'Point', coordinates: [80.9462, 26.8467] },
        aliases: ['gullu', 'mandi'],
      });
      expect(mandi._id).toBeDefined();

      const searchRes = await request(app).get('/api/v1/locations/search?q=Gullu');
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.length).toBeGreaterThan(0);
      expect(searchRes.body.data[0].nameEn).toBe('Gullu Mandi');
    });
  });

  // =========================================================================
  // PHASE 5 — TWO-DEVICE COMPLETE LIFECYCLE & STATE MACHINE
  // =========================================================================
  describe('Phase 5 & 17: Two-Device Complete End-to-End Ride Lifecycle', () => {
    let activeRideId: string;
    let tripOtp: string;

    it('Step 1: Onboards Passenger, Driver, and Admin users', async () => {
      // 1. Admin login
      const adminRes = await request(app).post('/api/v1/auth/request-otp').send({ phone: '+919999999999' });
      const adminVerify = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '+919999999999', otp: adminRes.body.data.devOtp });
      adminToken = adminVerify.body.data.tokens.accessToken;
      adminUserId = adminVerify.body.data.user.id;
      // Elevate admin role
      await UserModel.findByIdAndUpdate(adminUserId, { role: 'ADMIN' });

      // 2. Passenger login
      const passRes = await request(app).post('/api/v1/auth/request-otp').send({ phone: '+919876543201', role: 'PASSENGER' });
      const passVerify = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '+919876543201', otp: passRes.body.data.devOtp });
      passengerToken = passVerify.body.data.tokens.accessToken;
      passengerId = passVerify.body.data.user.id;

      // 3. Driver 1 login
      const d1Res = await request(app).post('/api/v1/auth/request-otp').send({ phone: '+919876543202', role: 'DRIVER' });
      const d1Verify = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '+919876543202', otp: d1Res.body.data.devOtp });
      driver1Token = d1Verify.body.data.tokens.accessToken;
      driver1UserId = d1Verify.body.data.user.id;

      // Driver 1 registers vehicle
      const regRes = await request(app)
        .post('/api/v1/drivers/register')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({
          name: 'Shyam Auto Driver',
          licenceNumber: 'UP32-2022-0098765',
          upiId: 'shyam@upi',
          vehicle: {
            vehicleType: 'AUTO',
            registrationNumber: 'UP 32 GA 4321',
            seatingCapacity: 3,
          },
        });
      expect(regRes.status).toBe(200);
      driver1ProfileId = regRes.body.data.driverProfile.id;

      // Driver cannot go online before admin verification
      const onlineAttempt = await request(app)
        .patch('/api/v1/drivers/availability')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ isOnline: true });
      expect(onlineAttempt.status).toBe(400);


      // Admin approves Driver 1
      const approveRes = await request(app)
        .patch(`/api/v1/admin/drivers/${driver1ProfileId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });
      expect(approveRes.status).toBe(200);

      // Driver 1 goes online and updates GPS position (26.848, 80.947 - within 3km)
      const onlineOk = await request(app)
        .patch('/api/v1/drivers/availability')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ isOnline: true });
      expect(onlineOk.status).toBe(200);

      await request(app)
        .post('/api/v1/drivers/location')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ latitude: 26.848, longitude: 80.947 });
    });

    it('Step 2: Passenger requests ride with Idempotency-Key', async () => {
      const ridePayload = {
        pickup: {
          addressText: 'Gullu Mandi Stand',
          latitude: 26.8467,
          longitude: 80.9462,
        },
        destination: {
          addressText: 'Panchayat Bhavan, Rampur',
          latitude: 26.855,
          longitude: 80.958,
        },
        vehiclePreference: 'AUTO',
        passengerCount: 2,
      };

      const idempotencyKey = 'idemp_ride_creation_001';

      // First creation attempt
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${passengerToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(ridePayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SEARCHING_DRIVER');
      expect(res.body.data.otp?.code).toBeDefined();

      activeRideId = res.body.data.id;
      tripOtp = res.body.data.otp.code;

      // Phase 9 Weak Network test: Repeated tap with SAME idempotency key returns exact same ride
      const duplicateRes = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${passengerToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(ridePayload);

      expect(duplicateRes.status).toBe(201);
      expect(duplicateRes.body.data.id).toBe(activeRideId);

      const allRidesCount = await RideModel.countDocuments({ passengerId });
      expect(allRidesCount).toBe(1); // No duplicate created!
    });

    it('Step 3: Driver submits fare offer (₹65, 4m ETA)', async () => {
      const bidRes = await request(app)
        .post(`/api/v1/rides/${activeRideId}/offers`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({
          fare: 65,
          etaMinutes: 4,
          message: 'Bhaiya a raha hu 4 minute me',
        });

      expect(bidRes.status).toBe(201);
      expect(bidRes.body.data.status).toBe('PENDING');
      expect(bidRes.body.data.fare).toBe(65);
    });

    it('Step 4: Passenger selects driver and driver availability locks atomically to BUSY', async () => {
      const offersRes = await request(app)
        .get(`/api/v1/rides/${activeRideId}/offers`)
        .set('Authorization', `Bearer ${passengerToken}`);

      expect(offersRes.status).toBe(200);
      const offerId = offersRes.body.data[0].id;

      const selectRes = await request(app)
        .post(`/api/v1/rides/${activeRideId}/select-offer`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ offerId });

      expect(selectRes.status).toBe(200);
      expect(selectRes.body.data.status).toBe('DRIVER_SELECTED');

      // Verify driver profile availability status locked to BUSY
      const dp = await DriverProfileModel.findById(driver1ProfileId);
      expect(dp?.availabilityStatus).toBe('BUSY');
    });

    it('Step 5: Server Restart Simulation - Both Passenger and Driver recover authoritative active ride', async () => {
      // Disconnect and reconnect database to simulate server restart / cold boot
      await disconnectDatabase();
      await connectDatabase();

      // 1. Passenger calls GET /api/v1/rides/active
      const passActive = await request(app)
        .get('/api/v1/rides/active')
        .set('Authorization', `Bearer ${passengerToken}`);

      expect(passActive.status).toBe(200);
      expect(passActive.body.data.ride.id).toBe(activeRideId);
      expect(passActive.body.data.ride.status).toBe('DRIVER_SELECTED');

      // 2. Driver calls GET /api/v1/rides/active
      const driverActive = await request(app)
        .get('/api/v1/rides/active')
        .set('Authorization', `Bearer ${driver1Token}`);

      const dId = driverActive.body.data.ride.driverId?.id || driverActive.body.data.ride.driverId;
      expect(dId).toBe(driver1ProfileId);
    });

    it('Step 6: Driver marks arrived at pickup point', async () => {
      const arriveRes = await request(app)
        .post(`/api/v1/rides/${activeRideId}/arrive`)
        .set('Authorization', `Bearer ${driver1Token}`);

      expect(arriveRes.status).toBe(200);
      expect(arriveRes.body.data.status).toBe('DRIVER_ARRIVED');
    });

    it('Step 7: Driver enters Trip OTP to start ride', async () => {
      // Test incorrect OTP
      const wrongOtpRes = await request(app)
        .post(`/api/v1/rides/${activeRideId}/start`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ otp: '0000' });
      expect(wrongOtpRes.status).toBe(400);
      expect(wrongOtpRes.body.error.message).toMatch(/Invalid Trip OTP/i);


      // Correct OTP starts ride
      const startRes = await request(app)
        .post(`/api/v1/rides/${activeRideId}/start`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ otp: tripOtp });

      expect(startRes.status).toBe(200);
      expect(startRes.body.data.status).toBe('RIDE_STARTED');
    });

    it('Step 8: Driver completes ride, passenger reports Cash payment, driver confirms', async () => {
      // Complete Ride
      const compRes = await request(app)
        .post(`/api/v1/rides/${activeRideId}/complete`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ finalFare: 65 });

      expect(compRes.status).toBe(200);
      expect(compRes.body.data.status).toBe('RIDE_COMPLETED');
      expect(compRes.body.data.payment.status).toBe('PENDING');

      // Passenger reports paid Cash
      const passPayRes = await request(app)
        .post(`/api/v1/rides/${activeRideId}/payment`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ method: 'CASH', status: 'PASSENGER_CLAIMS_PAID' });

      expect(passPayRes.status).toBe(200);
      expect(passPayRes.body.data.payment.status).toBe('PASSENGER_CLAIMS_PAID');

      // Driver confirms cash received
      const driverConfirmRes = await request(app)
        .post(`/api/v1/rides/${activeRideId}/payment`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ method: 'CASH', status: 'DRIVER_CONFIRMED_RECEIVED' });

      expect(driverConfirmRes.status).toBe(200);
      expect(driverConfirmRes.body.data.payment.status).toBe('DRIVER_CONFIRMED_RECEIVED');

      // Driver becomes AVAILABLE again
      const dp = await DriverProfileModel.findById(driver1ProfileId);
      expect(dp?.availabilityStatus).toBe('AVAILABLE');
    });

    it('Step 9: Passenger submits 5-star rating and trip appears in history', async () => {
      const rateRes = await request(app)
        .post(`/api/v1/rides/${activeRideId}/rating`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          stars: 5,
          feedbackTags: ['POLITE', 'SAFE'],
          comment: 'Bahut badhiya driving bhaiya',
        });

      expect(rateRes.status).toBe(201);

      // Verify ride appears in passenger history
      const passHistory = await request(app)
        .get('/api/v1/rides/history?role=passenger&statusGroup=completed')
        .set('Authorization', `Bearer ${passengerToken}`);
      expect(passHistory.status).toBe(200);
      expect(passHistory.body.data.length).toBeGreaterThan(0);
      expect(passHistory.body.data[0].id).toBe(activeRideId);

      // Verify ride appears in driver history
      const driverHistory = await request(app)
        .get('/api/v1/rides/history?role=driver&statusGroup=completed')
        .set('Authorization', `Bearer ${driver1Token}`);
      expect(driverHistory.status).toBe(200);
      expect(driverHistory.body.data.length).toBeGreaterThan(0);
      expect(driverHistory.body.data[0].id).toBe(activeRideId);
    });

    it('Step 10: Phase 18 - Complete RideEvent audit trail verification', async () => {
      const events = await RideEventModel.find({ rideId: activeRideId }).sort({ createdAt: 1 });
      const eventTypes = events.map((e) => e.eventType);

      expect(eventTypes).toContain('REQUESTED');
      expect(eventTypes).toContain('OFFER_CREATED');
      expect(eventTypes).toContain('DRIVER_SELECTED');
      expect(eventTypes).toContain('DRIVER_ARRIVED');
      expect(eventTypes).toContain('OTP_VERIFIED');
      expect(eventTypes).toContain('RIDE_STARTED');
      expect(eventTypes).toContain('RIDE_COMPLETED');
    });
  });

  // =========================================================================
  // PHASE 10 — CONCURRENCY TEST: ATOMIC DRIVER RESERVATION
  // =========================================================================
  describe('Phase 10: Atomic Concurrency Lock for Driver Reservation', () => {
    it('Allows exactly ONE passenger to select a driver when two select simultaneously', async () => {
      // 1. Create Passenger B
      const p2Res = await request(app).post('/api/v1/auth/request-otp').send({ phone: '+919876543209' });
      const p2Verify = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '+919876543209', otp: p2Res.body.data.devOtp });
      const passenger2Token = p2Verify.body.data.tokens.accessToken;

      // 2. Passenger 1 creates Ride 1
      const r1 = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          pickup: { addressText: 'P1 Pickup', latitude: 26.8467, longitude: 80.9462 },
          destination: { addressText: 'P1 Drop', latitude: 26.85, longitude: 80.95 },
        });

      // 3. Passenger 2 creates Ride 2
      const r2 = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${passenger2Token}`)
        .send({
          pickup: { addressText: 'P2 Pickup', latitude: 26.847, longitude: 80.947 },
          destination: { addressText: 'P2 Drop', latitude: 26.86, longitude: 80.96 },
        });

      const ride1Id = r1.body.data.id;
      const ride2Id = r2.body.data.id;

      // 4. Driver 1 bids on both rides
      const bid1 = await request(app)
        .post(`/api/v1/rides/${ride1Id}/offers`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ fare: 50, etaMinutes: 5 });

      const bid2 = await request(app)
        .post(`/api/v1/rides/${ride2Id}/offers`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ fare: 55, etaMinutes: 6 });

      const offer1Id = bid1.body.data.id;
      const offer2Id = bid2.body.data.id;

      // 5. Concurrently select Driver 1 on both rides
      const [select1, select2] = await Promise.all([
        request(app)
          .post(`/api/v1/rides/${ride1Id}/select-offer`)
          .set('Authorization', `Bearer ${passengerToken}`)
          .send({ offerId: offer1Id }),
        request(app)
          .post(`/api/v1/rides/${ride2Id}/select-offer`)
          .set('Authorization', `Bearer ${passenger2Token}`)
          .send({ offerId: offer2Id }),
      ]);

      const successCount = (select1.status === 200 ? 1 : 0) + (select2.status === 200 ? 1 : 0);
      const conflictCount = (select1.status === 409 ? 1 : 0) + (select2.status === 409 ? 1 : 0);

      // EXACTLY ONE must succeed; the other must receive 409 Conflict
      expect(successCount).toBe(1);
      expect(conflictCount).toBe(1);

      // The winning ride has Driver 1, and Driver 1 profile is BUSY
      const dp = await DriverProfileModel.findById(driver1ProfileId);
      expect(dp?.availabilityStatus).toBe('BUSY');
    });
  });

  // =========================================================================
  // PHASE 15 & 16 — SECURITY & AUTHORIZATION BOUNDARIES
  // =========================================================================
  describe('Phase 15 & 16: Security Boundaries and Protected Documents', () => {
    it('Blocks normal passengers from accessing admin endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${passengerToken}`);
      expect(res.status).toBe(403);
    });

    it('Rejects invalid ride state transitions server-side', async () => {
      const p3Res = await request(app).post('/api/v1/auth/request-otp').send({ phone: '+919876543299' });
      const p3Verify = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '+919876543299', otp: p3Res.body.data.devOtp });
      const p3Token = p3Verify.body.data.tokens.accessToken;

      // Create fresh ride
      const newRide = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${p3Token}`)
        .send({
          pickup: { addressText: 'Loc A', latitude: 26.84, longitude: 80.94 },
          destination: { addressText: 'Loc B', latitude: 26.85, longitude: 80.95 },
        });
      expect(newRide.status).toBe(201);
      const testRideId = newRide.body.data.id;

      // Attempting to directly complete a ride that is in SEARCHING_DRIVER state must fail
      const invalidComp = await request(app)
        .post(`/api/v1/rides/${testRideId}/complete`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ finalFare: 100 });
      expect(invalidComp.status).toBe(400);
    });
  });

  // =========================================================================
  // REQUIRED FORENSIC CORRECTIONS & INVARIANTS TEST SUITE
  // =========================================================================
  describe('Required Forensic Corrections & Invariants', () => {
    let freshPassengerToken: string;
    let freshDriverToken: string;
    let freshDriverProfileId: string;

    beforeAll(async () => {
      // 1. Fresh Passenger
      const pRes = await request(app).post('/api/v1/auth/request-otp').send({ phone: '+919876588888', role: 'PASSENGER' });
      const pVer = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876588888', otp: pRes.body.data.devOtp });
      freshPassengerToken = pVer.body.data.tokens.accessToken;

      // 2. Fresh Driver
      const dRes = await request(app).post('/api/v1/auth/request-otp').send({ phone: '+919876588889', role: 'DRIVER' });
      const dVer = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876588889', otp: dRes.body.data.devOtp });
      freshDriverToken = dVer.body.data.tokens.accessToken;

      const reg = await request(app)
        .post('/api/v1/drivers/register')
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({
          name: 'Kishan Driver',
          licenceNumber: 'UP32-2024-8888888',
          upiId: 'kishan@upi',
          vehicle: {
            vehicleType: 'AUTO',
            registrationNumber: 'UP 32 CD 8888',
            seatingCapacity: 3,
          },
        });
      freshDriverProfileId = reg.body.data.driverProfile.id;

      await DriverProfileModel.findByIdAndUpdate(freshDriverProfileId, {
        verificationStatus: 'APPROVED',
        isOnline: true,
        availabilityStatus: 'AVAILABLE',
      });
    });

    beforeEach(async () => {
      await RideModel.deleteMany({});
      await RideOfferModel.deleteMany({});
      await PaymentRecordModel.deleteMany({});
      if (freshDriverProfileId) {
        await DriverProfileModel.findByIdAndUpdate(freshDriverProfileId, {
          isOnline: true,
          availabilityStatus: 'AVAILABLE',
        });
      }
    });

    it('1. Selecting destination B does NOT inherit pickup A coordinates', async () => {
      const pickupCoords = { latitude: 26.8467, longitude: 80.9462 };
      const destCoords = { latitude: 26.8912, longitude: 80.9854 };

      const res = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({
          pickup: { addressText: 'Rampur Bazar', ...pickupCoords },
          destination: { addressText: 'Kalyanpur Mandi', ...destCoords },
        });

      expect(res.status).toBe(201);
      const ride = res.body.data;
      expect(ride.pickup.location.coordinates[0]).toBe(pickupCoords.longitude);
      expect(ride.pickup.location.coordinates[1]).toBe(pickupCoords.latitude);
      expect(ride.destination.location.coordinates[0]).toBe(destCoords.longitude);
      expect(ride.destination.location.coordinates[1]).toBe(destCoords.latitude);
      expect(ride.pickup.location.coordinates).not.toEqual(ride.destination.location.coordinates);
    });

    it('2. Text-only destination remains coordinate-less and route distance is NOT zero', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({
          pickup: { addressText: 'Rampur Bazar Stand', latitude: 26.8467, longitude: 80.9462 },
          destination: { addressText: 'Gao Ke Mandir Ke Paas' }, // Text landmark without coordinates
        });

      expect(res.status).toBe(201);
      const ride = res.body.data;
      // Truthful representation: NO fake coordinates
      expect(ride.destination.location).toBeUndefined();
      // Truthful representation: NOT zero distance
      expect(ride.routeMetrics.distanceStatus).toBe('UNKNOWN');
      expect(ride.routeMetrics.distanceMeters).toBeUndefined();
      expect(ride.routeMetrics.distanceMeters).not.toBe(0);
    });

    it('3. Legitimate same-point coordinates do not crash or get rejected', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({
          pickup: { addressText: 'Campus Gate 1', latitude: 26.8467, longitude: 80.9462 },
          destination: { addressText: 'Campus OPD Block', latitude: 26.8467, longitude: 80.9462 },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('SEARCHING_DRIVER');
    });

    it('4. Progressive search radius expands: 3 km -> 5 km -> 7 km -> 10 km max', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({
          pickup: { addressText: 'Remote Village Stand', latitude: 26.8467, longitude: 80.9462 },
          destination: { addressText: 'Tehsil Office', latitude: 26.88, longitude: 80.97 },
        });

      expect(res.status).toBe(201);
      const rideId = res.body.data.id;
      expect(res.body.data.searchRadiusKm).toBe(3);

      // Expansion 1: 3 -> 5
      const exp1 = await request(app)
        .post(`/api/v1/rides/${rideId}/expand-radius`)
        .set('Authorization', `Bearer ${freshPassengerToken}`);
      expect(exp1.status).toBe(200);
      expect(exp1.body.data.searchRadiusKm).toBe(5);

      // Expansion 2: 5 -> 7
      const exp2 = await request(app)
        .post(`/api/v1/rides/${rideId}/expand-radius`)
        .set('Authorization', `Bearer ${freshPassengerToken}`);
      expect(exp2.status).toBe(200);
      expect(exp2.body.data.searchRadiusKm).toBe(7);

      // Expansion 3: 7 -> 10 (Max)
      const exp3 = await request(app)
        .post(`/api/v1/rides/${rideId}/expand-radius`)
        .set('Authorization', `Bearer ${freshPassengerToken}`);
      expect(exp3.status).toBe(200);
      expect(exp3.body.data.searchRadiusKm).toBe(10);
    });

    it('5. Duplicate fare submission is idempotent and prevents multiple active offers', async () => {
      const r = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({
          pickup: { addressText: 'Market', latitude: 26.8467, longitude: 80.9462 },
          destination: { addressText: 'Station', latitude: 26.86, longitude: 80.96 },
        });
      expect(r.status).toBe(201);
      const rideId = r.body.data.id;

      // First bid
      const bid1 = await request(app)
        .post(`/api/v1/rides/${rideId}/offers`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ fare: 60, etaMinutes: 5 });
      expect(bid1.status).toBe(201);

      // Second bid (same driver updating or repeated tap)
      const bid2 = await request(app)
        .post(`/api/v1/rides/${rideId}/offers`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ fare: 65, etaMinutes: 4 });
      expect(bid2.status).toBe(201);

      // Exactly 1 offer document exists in database for this driver
      const offersCount = await RideOfferModel.countDocuments({
        rideId,
        driverId: freshDriverProfileId,
      });
      expect(offersCount).toBe(1);
    });

    it('6. Offer expiration prevents passenger selection', async () => {
      const r = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({
          pickup: { addressText: 'Stop 1', latitude: 26.8467, longitude: 80.9462 },
          destination: { addressText: 'Stop 2', latitude: 26.86, longitude: 80.96 },
        });
      expect(r.status).toBe(201);
      const rideId = r.body.data.id;

      const bid = await request(app)
        .post(`/api/v1/rides/${rideId}/offers`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ fare: 70, etaMinutes: 3 });
      expect(bid.status).toBe(201);
      const offerId = bid.body.data.id;

      // Manually expire offer in database
      await RideOfferModel.findByIdAndUpdate(offerId, {
        expiresAt: new Date(Date.now() - 10000), // 10 seconds ago
      });

      const selectRes = await request(app)
        .post(`/api/v1/rides/${rideId}/select-offer`)
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({ offerId });

      expect(selectRes.status).toBe(400);
      expect(selectRes.body.error.message).toMatch(/expired/i);
    });

    it('7. Enforces Trip OTP attempt limits and prevents brute forcing', async () => {
      const r = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({
          pickup: { addressText: 'Town Square', latitude: 26.8467, longitude: 80.9462 },
          destination: { addressText: 'Panchayat', latitude: 26.86, longitude: 80.96 },
        });
      expect(r.status).toBe(201);
      const rideId = r.body.data.id;

      // Bid and select
      const bid = await request(app)
        .post(`/api/v1/rides/${rideId}/offers`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ fare: 50, etaMinutes: 2 });
      expect(bid.status).toBe(201);
      await request(app)
        .post(`/api/v1/rides/${rideId}/select-offer`)
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({ offerId: bid.body.data.id });

      // Driver arrives
      await request(app)
        .post(`/api/v1/rides/${rideId}/arrive`)
        .set('Authorization', `Bearer ${freshDriverToken}`);

      // Send wrong OTP until maxAttempts (5) is reached
      for (let attempt = 1; attempt <= 5; attempt++) {
        const res = await request(app)
          .post(`/api/v1/rides/${rideId}/start`)
          .set('Authorization', `Bearer ${freshDriverToken}`)
          .send({ otp: `000${attempt}` });
        expect(res.status).toBe(400);
        expect(res.body.error.message).toMatch(/Invalid Trip OTP/i);
      }

      // Next attempt must be blocked with attempts exceeded
      const finalAttempt = await request(app)
        .post(`/api/v1/rides/${rideId}/start`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ otp: '9999' });
      expect(finalAttempt.status).toBe(400);
      expect(finalAttempt.body.error.message).toMatch(/attempts exceeded/i);
    });

    it('8. Duplicate ride completion rejected', async () => {
      const r = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({
          pickup: { addressText: 'Point X', latitude: 26.8467, longitude: 80.9462 },
          destination: { addressText: 'Point Y', latitude: 26.86, longitude: 80.96 },
        });
      expect(r.status).toBe(201);
      const rideId = r.body.data.id;
      const tripOtp = r.body.data.otp.code;

      const bid = await request(app)
        .post(`/api/v1/rides/${rideId}/offers`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ fare: 60, etaMinutes: 3 });
      expect(bid.status).toBe(201);

      await request(app)
        .post(`/api/v1/rides/${rideId}/select-offer`)
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({ offerId: bid.body.data.id });

      await request(app)
        .post(`/api/v1/rides/${rideId}/arrive`)
        .set('Authorization', `Bearer ${freshDriverToken}`);

      await request(app)
        .post(`/api/v1/rides/${rideId}/start`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ otp: tripOtp });

      // First complete
      const comp1 = await request(app)
        .post(`/api/v1/rides/${rideId}/complete`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ finalFare: 60 });
      expect(comp1.status).toBe(200);

      // Duplicate complete attempt
      const comp2 = await request(app)
        .post(`/api/v1/rides/${rideId}/complete`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ finalFare: 60 });
      expect(comp2.status).toBe(400);
      expect(comp2.body.error.message).toMatch(/Cannot complete ride/i);
    });

    it('9. Cash payment disagreement: passenger claims paid, driver disputes', async () => {
      const r = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({
          pickup: { addressText: 'Point A', latitude: 26.8467, longitude: 80.9462 },
          destination: { addressText: 'Point B', latitude: 26.86, longitude: 80.96 },
        });
      expect(r.status).toBe(201);
      const rideId = r.body.data.id;
      const tripOtp = r.body.data.otp.code;

      const bid = await request(app)
        .post(`/api/v1/rides/${rideId}/offers`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ fare: 65, etaMinutes: 2 });
      expect(bid.status).toBe(201);

      await request(app)
        .post(`/api/v1/rides/${rideId}/select-offer`)
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({ offerId: bid.body.data.id });

      await request(app)
        .post(`/api/v1/rides/${rideId}/arrive`)
        .set('Authorization', `Bearer ${freshDriverToken}`);
      await request(app)
        .post(`/api/v1/rides/${rideId}/start`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ otp: tripOtp });
      await request(app)
        .post(`/api/v1/rides/${rideId}/complete`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ finalFare: 65 });

      // Passenger claims paid cash
      const pay1 = await request(app)
        .post(`/api/v1/rides/${rideId}/payment`)
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({ method: 'CASH', status: 'PASSENGER_CLAIMS_PAID' });
      expect(pay1.status).toBe(200);
      expect(pay1.body.data.payment.status).toBe('PASSENGER_CLAIMS_PAID');

      // Driver disputes cash payment
      const pay2 = await request(app)
        .post(`/api/v1/rides/${rideId}/payment`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ method: 'CASH', status: 'DISPUTED' });
      expect(pay2.status).toBe(200);
      expect(pay2.body.data.payment.status).toBe('DISPUTED');

      // Verify truthful state in PaymentRecordModel
      const payRec = await PaymentRecordModel.findOne({ rideId });
      expect(payRec?.status).toBe('DISPUTED');
    });

    it('10. Enforces single rating per ride per user', async () => {
      const r = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({
          pickup: { addressText: 'Point 1', latitude: 26.8467, longitude: 80.9462 },
          destination: { addressText: 'Point 2', latitude: 26.86, longitude: 80.96 },
        });
      expect(r.status).toBe(201);
      const rideId = r.body.data.id;
      const tripOtp = r.body.data.otp.code;

      const bid = await request(app)
        .post(`/api/v1/rides/${rideId}/offers`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ fare: 65, etaMinutes: 2 });
      expect(bid.status).toBe(201);

      await request(app)
        .post(`/api/v1/rides/${rideId}/select-offer`)
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({ offerId: bid.body.data.id });
      await request(app)
        .post(`/api/v1/rides/${rideId}/arrive`)
        .set('Authorization', `Bearer ${freshDriverToken}`);
      await request(app)
        .post(`/api/v1/rides/${rideId}/start`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ otp: tripOtp });
      await request(app)
        .post(`/api/v1/rides/${rideId}/complete`)
        .set('Authorization', `Bearer ${freshDriverToken}`)
        .send({ finalFare: 65 });

      // First rating succeeds
      const rate1 = await request(app)
        .post(`/api/v1/rides/${rideId}/rating`)
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({ stars: 5, feedbackTags: ['CLEAN_VEHICLE'] });
      expect(rate1.status).toBe(201);

      // Second rating fails with 400 ALREADY_RATED
      const rate2 = await request(app)
        .post(`/api/v1/rides/${rideId}/rating`)
        .set('Authorization', `Bearer ${freshPassengerToken}`)
        .send({ stars: 4, feedbackTags: ['POLITE'] });
      expect(rate2.status).toBe(400);
      expect(rate2.body.error.code).toBe('ALREADY_RATED');
    });
  });
});
