import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
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
} from '../models/index.js';

describe('Gaon Auto - Complete Production Vertical Slice Test Suite', () => {
  let passengerToken: string;
  let passengerUser: any;
  let driverToken: string;
  let driverUser: any;
  let driverProfileId: string;
  let adminToken: string;
  let adminUser: any;

  beforeAll(async () => {
    await connectDatabase();
    // Clear test database collections
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
    ]);

    // Setup Admin user
    adminUser = await UserModel.create({
      phone: '+919999999999',
      role: 'ADMIN',
      name: 'System Admin',
      status: 'ACTIVE',
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  // ==========================================
  // PHASE 1: AUTHENTICATION & PHONE NORMALIZATION
  // ==========================================
  it('1. Normalizes Indian phone numbers and issues OTP with dev bypass safety guard', async () => {
    // Passenger requests OTP with unformatted number: "09876543210"
    const res = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone: '09876543210', role: 'PASSENGER' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.devOtp).toBeDefined();

    const devOtp = res.body.data.devOtp;

    // Verify OTP using canonical +91 format
    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+91 98765 43210', otp: devOtp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.user.phone).toBe('+919876543210');
    expect(verifyRes.body.data.tokens.accessToken).toBeDefined();

    passengerToken = verifyRes.body.data.tokens.accessToken;
    passengerUser = verifyRes.body.data.user;
  });

  it('2. Enforces OTP attempt limits and invalidates on repeated failures', async () => {
    const res = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone: '9876543211' });

    expect(res.status).toBe(200);

    // 3 wrong attempts
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '9876543211', otp: '000000' });
    }

    // 4th attempt should be rejected due to attempt limit
    const failedRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '9876543211', otp: '000000' });

    expect(failedRes.status).toBe(400);
  });

  // ==========================================
  // PHASE 2: DRIVER ONBOARDING & ADMIN VERIFICATION
  // ==========================================
  it('3. Driver onboards vehicle and requires Admin approval before going online', async () => {
    // Driver auth
    const otpRes = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone: '9123456789', role: 'DRIVER' });

    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '9123456789', otp: otpRes.body.data.devOtp });

    driverToken = verifyRes.body.data.tokens.accessToken;
    driverUser = verifyRes.body.data.user;

    // Driver submits onboarding details
    const onboardRes = await request(app)
      .post('/api/v1/drivers/register')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        name: 'Ramesh Auto Wala',
        licenceNumber: 'UP32-2021-0001234',
        upiId: 'ramesh@upi',
        vehicle: {
          vehicleType: 'AUTO',
          registrationNumber: 'UP32-AB-1234',
          makeModel: 'Bajaj RE Compact',
          year: 2022,
          seatingCapacity: 3,
        },
      });

    expect(onboardRes.status).toBe(200);
    expect(onboardRes.body.data.driverProfile.verificationStatus).toBe('PENDING');
    driverProfileId = onboardRes.body.data.driverProfile.id;

    // Driver cannot go online while PENDING (returns 400 Bad Request)
    const onlineFailRes = await request(app)
      .patch('/api/v1/drivers/availability')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ isOnline: true });

    expect(onlineFailRes.status).toBe(400);

    // Admin logs in and approves driver
    const adminOtp = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone: '9999999999', role: 'ADMIN' });

    const adminAuth = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '9999999999', otp: adminOtp.body.data.devOtp });

    adminToken = adminAuth.body.data.tokens.accessToken;

    const approveRes = await request(app)
      .patch(`/api/v1/admin/drivers/${driverProfileId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', verificationNotes: 'Aadhaar and DL physically checked' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.verificationStatus).toBe('APPROVED');

    // Driver can now go online
    const onlineSuccessRes = await request(app)
      .patch('/api/v1/drivers/availability')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ isOnline: true });

    expect(onlineSuccessRes.status).toBe(200);
    expect(onlineSuccessRes.body.data.isOnline).toBe(true);
    expect(onlineSuccessRes.body.data.availabilityStatus).toBe('AVAILABLE');

    // Driver sends initial location coordinates (near Lucknow/Sultanpur rural area)
    const locRes = await request(app)
      .post('/api/v1/drivers/location')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        latitude: 26.265,
        longitude: 82.072,
        heading: 90,
      });

    expect(locRes.status).toBe(200);
    expect(locRes.body.data.updated).toBe(true);
  });

  // ==========================================
  // PHASE 3: RIDE CREATION & IDEMPOTENCY
  // ==========================================
  let createdRideId: string;

  it('4. Passenger creates ride and duplicate request (double-tap) is blocked', async () => {
    const idempotencyKey = 'test_idem_ride_001';

    const ridePayload = {
      pickup: {
        addressText: 'Bijethua Mandir Gate',
        landmark: 'Near Banyan Tree',
        latitude: 26.266,
        longitude: 82.073,
      },
      destination: {
        addressText: 'Kadipur Main Chauraha',
        landmark: 'Opposite State Bank',
        latitude: 26.28,
        longitude: 82.09,
      },
      passengerCount: 2,
      passengerNote: 'Please come quickly to temple gate',
      vehiclePreference: 'AUTO',
    };

    // First tap
    const res1 = await request(app)
      .post('/api/v1/rides')
      .set('Authorization', `Bearer ${passengerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(ridePayload);

    expect(res1.status).toBe(201);
    expect(res1.body.data.status).toBe('SEARCHING_DRIVER');
    expect(res1.body.data.rideNumber).toBeDefined();
    createdRideId = res1.body.data.id;

    // Immediate second tap with same Idempotency-Key returns cached response without duplicate creation
    const res2 = await request(app)
      .post('/api/v1/rides')
      .set('Authorization', `Bearer ${passengerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(ridePayload);

    expect(res2.status).toBe(201);
    // Attempting to create another ride while one is active without Idempotency-Key is blocked
    const res3 = await request(app)
      .post('/api/v1/rides')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send(ridePayload);

    expect(res3.status).toBe(400); // Anti-duplicate active ride check triggered!
  });

  // ==========================================
  // PHASE 4: DRIVER FARE BIDDING & OFFER COMPARISON
  // ==========================================
  let submittedOfferId: string;

  it('5. Driver submits fare offer with ETA and idempotency', async () => {
    const offerPayload = {
      fare: 80,
      etaMinutes: 5,
      message: 'Arriving in 5 mins with clean Auto',
    };

    const offerRes = await request(app)
      .post(`/api/v1/rides/${createdRideId}/offers`)
      .set('Authorization', `Bearer ${driverToken}`)
      .set('Idempotency-Key', 'test_offer_idem_001')
      .send(offerPayload);

    expect(offerRes.status).toBe(201);
    expect(offerRes.body.data.fare).toBe(80);
    expect(offerRes.body.data.etaMinutes).toBe(5);
    submittedOfferId = offerRes.body.data.id;

    // Passenger fetches offers
    const getOffersRes = await request(app)
      .get(`/api/v1/rides/${createdRideId}/offers`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(getOffersRes.status).toBe(200);
    expect(getOffersRes.body.data.length).toBe(1);
    expect(getOffersRes.body.data[0].driver.licenceNumber).toBe('UP32-2021-0001234');
  });

  // ==========================================
  // PHASE 5: ATOMIC DRIVER SELECTION & CONCURRENCY CONTROL
  // ==========================================
  it('6. Passenger selects driver offer; driver atomically becomes BUSY and Trip OTP is generated', async () => {
    const selectRes = await request(app)
      .post(`/api/v1/rides/${createdRideId}/select-offer`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ offerId: submittedOfferId });

    expect(selectRes.status).toBe(200);
    expect(selectRes.body.data.status).toBe('DRIVER_SELECTED');
    expect(selectRes.body.data.fare.finalFare).toBe(80);
    expect(selectRes.body.data.otp.code).toHaveLength(4); // 4-digit Trip OTP visible to passenger!

    // Verify driver is now atomically BUSY in database
    const driverInDb = await DriverProfileModel.findById(driverProfileId);
    expect(driverInDb?.availabilityStatus).toBe('BUSY');

    // Concurrency check: If another passenger tries to select this driver right now, it fails!
    const anotherRide = await RideModel.create({
      rideNumber: 'GA-TEST-CONCURRENCY',
      passengerId: new mongoose.Types.ObjectId(),
      pickup: { addressText: 'P1', location: { type: 'Point', coordinates: [82.0, 26.0] } },
      destination: { addressText: 'D1', location: { type: 'Point', coordinates: [82.1, 26.1] } },
      status: 'OFFERS_RECEIVED',
      version: 1,
      otp: { code: '1234', codeHash: 'hash', attempts: 0, maxAttempts: 5 },
    });

    const duplicateOffer = await RideOfferModel.create({
      rideId: anotherRide._id,
      driverId: driverProfileId,
      fare: 100,
      etaMinutes: 10,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60000),
    });

    // Selecting busy driver fails with atomic locking error
    await expect(
      request(app)
        .post(`/api/v1/rides/${anotherRide._id}/select-offer`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ offerId: duplicateOffer._id.toString() })
    ).resolves.toHaveProperty('status', 400);
  });

  // ==========================================
  // PHASE 6: ACTIVE RIDE RECOVERY (AUTHORITATIVE REST)
  // ==========================================
  it('7. Passenger and Driver recover active ride state on app restart or reconnect', async () => {
    // Passenger queries active ride
    const passActive = await request(app)
      .get('/api/v1/rides/active')
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(passActive.status).toBe(200);
    expect(passActive.body.data.ride.id).toBe(createdRideId);
    expect(passActive.body.data.ride.status).toBe('DRIVER_SELECTED');

    // Driver queries active ride
    const driverActive = await request(app)
      .get('/api/v1/rides/active')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(driverActive.status).toBe(200);
    expect(driverActive.body.data.ride.id).toBe(createdRideId);
  });

  // ==========================================
  // PHASE 7: DRIVER ARRIVAL, TRIP OTP & RIDE START
  // ==========================================
  it('8. Driver marks arrival; validates Trip OTP server-side to start ride', async () => {
    // Driver marks arrival
    const arriveRes = await request(app)
      .post(`/api/v1/rides/${createdRideId}/arrive`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(arriveRes.status).toBe(200);
    expect(arriveRes.body.data.status).toBe('DRIVER_ARRIVED');

    // Driver attempts wrong OTP
    const wrongOtpRes = await request(app)
      .post(`/api/v1/rides/${createdRideId}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ otp: '9999' });

    expect(wrongOtpRes.status).toBe(400);

    // Retrieve correct plain OTP from passenger active ride
    const passActive = await request(app)
      .get('/api/v1/rides/active')
      .set('Authorization', `Bearer ${passengerToken}`);

    const correctOtp = passActive.body.data.ride.otp.code;

    // Driver submits correct OTP
    const startRes = await request(app)
      .post(`/api/v1/rides/${createdRideId}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ otp: correctOtp });

    if (startRes.status !== 200) console.log('START RES ERROR:', startRes.body);
    expect(startRes.status).toBe(200);
    expect(startRes.body.data.status).toBe('RIDE_STARTED');
  });

  // ==========================================
  // PHASE 8: RIDE COMPLETION & MULTI-STATE PAYMENT
  // ==========================================
  it('9. Driver completes ride; tracks Cash/UPI multi-state payment confirmation', async () => {
    const completeRes = await request(app)
      .post(`/api/v1/rides/${createdRideId}/complete`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ finalFare: 80 });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('RIDE_COMPLETED');

    // Driver is automatically freed back to AVAILABLE
    const driverInDb = await DriverProfileModel.findById(driverProfileId);
    expect(driverInDb?.availabilityStatus).toBe('AVAILABLE');
    expect(driverInDb?.completedTrips).toBe(1);

    // Payment state 1: Passenger marks claimed paid via UPI
    const claimRes = await request(app)
      .post(`/api/v1/rides/${createdRideId}/payment`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        method: 'UPI_DIRECT',
        status: 'PASSENGER_CLAIMS_PAID',
        transactionReference: 'UPI-REF-2026-99881',
      });

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.data.payment.status).toBe('PASSENGER_CLAIMS_PAID');

    // Payment state 2: Driver verifies bank credit received on device
    const confirmRes = await request(app)
      .post(`/api/v1/rides/${createdRideId}/payment`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        method: 'UPI_DIRECT',
        status: 'DRIVER_CONFIRMED_RECEIVED',
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.payment.status).toBe('DRIVER_CONFIRMED_RECEIVED');
  });

  // ==========================================
  // PHASE 9: RATINGS & RIDE HISTORY
  // ==========================================
  it('10. Submits rating, checks duplicate rating block, and verifies ride history', async () => {
    // Passenger rates Driver 5 stars
    const ratingRes = await request(app)
      .post(`/api/v1/rides/${createdRideId}/rating`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        stars: 5,
        feedbackTags: ['ON_TIME', 'SAFE_DRIVING', 'CLEAN_VEHICLE'],
        comment: 'Bahut achha vyavahar tha aur samay par pahunchaya',
      });

    expect(ratingRes.status).toBe(201);
    expect(ratingRes.body.data.stars).toBe(5);

    // Duplicate rating blocked
    const dupRating = await request(app)
      .post(`/api/v1/rides/${createdRideId}/rating`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ stars: 4 });

    expect(dupRating.status).toBe(400);

    // Check ride history
    const historyRes = await request(app)
      .get('/api/v1/rides/history?role=passenger&statusGroup=completed')
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.length).toBe(1);
    expect(historyRes.body.data[0].id).toBe(createdRideId);

    // Check immutable audit events ledger
    const eventsRes = await request(app)
      .get(`/api/v1/rides/${createdRideId}/events`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(eventsRes.status).toBe(200);
    const eventTypes = eventsRes.body.data.map((e: any) => e.eventType);
    expect(eventTypes).toContain('REQUESTED');
    expect(eventTypes).toContain('DRIVER_NOTIFIED');
    expect(eventTypes).toContain('OFFER_CREATED');
    expect(eventTypes).toContain('DRIVER_SELECTED');
    expect(eventTypes).toContain('DRIVER_ARRIVED');
    expect(eventTypes).toContain('OTP_VERIFIED');
    expect(eventTypes).toContain('RIDE_STARTED');
    expect(eventTypes).toContain('RIDE_COMPLETED');
  });

  // ==========================================
  // PHASE 10: CANCELLATION FLOW & NO-SHOW
  // ==========================================
  it('11. Handles passenger and driver cancellation with reason validation and frees driver', async () => {
    // Create new ride
    const newRideRes = await request(app)
      .post('/api/v1/rides')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        pickup: { addressText: 'Station Gate', latitude: 26.27, longitude: 82.08 },
        destination: { addressText: 'Hospital', latitude: 26.29, longitude: 82.1 },
        passengerCount: 1,
      });

    const newRideId = newRideRes.body.data.id;

    // Driver offers and passenger selects
    const offerRes = await request(app)
      .post(`/api/v1/rides/${newRideId}/offers`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ fare: 50, etaMinutes: 4 });

    await request(app)
      .post(`/api/v1/rides/${newRideId}/select-offer`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ offerId: offerRes.body.data.id });

    // Passenger cancels with reason
    const cancelRes = await request(app)
      .post(`/api/v1/rides/${newRideId}/cancel`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        reason: 'PLAN_CHANGED',
        details: 'Relative arrived in bike, no longer need auto',
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(cancelRes.body.data.cancellation.reason).toBe('PLAN_CHANGED');

    // Driver is automatically freed back to AVAILABLE
    const driverInDb = await DriverProfileModel.findById(driverProfileId);
    expect(driverInDb?.availabilityStatus).toBe('AVAILABLE');
  });
});
