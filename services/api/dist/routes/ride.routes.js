"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const idempotency_middleware_js_1 = require("../middlewares/idempotency.middleware.js");
const ride_service_js_1 = require("../services/ride.service.js");
const validation_1 = require("@gaon-auto/validation");
const Ride_js_1 = require("../models/Ride.js");
const RideOffer_js_1 = require("../models/RideOffer.js");
const RideEvent_js_1 = require("../models/RideEvent.js");
const Rating_js_1 = require("../models/Rating.js");
const DriverProfile_js_1 = require("../models/DriverProfile.js");
const User_js_1 = require("../models/User.js");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.authenticate);
router.use((0, idempotency_middleware_js_1.idempotencyMiddleware)());
// 1. Create Ride Request (Passenger)
router.post('/', (0, auth_middleware_js_1.requireRole)('PASSENGER'), async (req, res, next) => {
    try {
        const validated = validation_1.createRideSchema.parse(req.body);
        const ride = await ride_service_js_1.rideService.createRide(req.user.id, validated);
        return res.status(201).json({
            success: true,
            data: ride,
            message: 'Ride request created. Searching for nearby available drivers.',
        });
    }
    catch (err) {
        next(err);
    }
});
// 1b. Progressive Search Radius Expansion
router.post('/:id/expand-radius', async (req, res, next) => {
    try {
        const ride = await ride_service_js_1.rideService.expandSearchRadius(req.params.id);
        return res.status(200).json({
            success: true,
            data: ride,
        });
    }
    catch (err) {
        next(err);
    }
});
// 2. Authoritative Active Ride Recovery (Reconnect, Cold-start, Crash recovery)
router.get('/active', async (req, res, next) => {
    try {
        const result = await ride_service_js_1.rideService.getActiveRide(req.user.id, req.user.role);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (err) {
        next(err);
    }
});
// 3. Ride History
router.get('/history', async (req, res, next) => {
    try {
        const role = req.query.role === 'driver' ? 'driver' : 'passenger';
        const statusGroup = req.query.statusGroup || 'all';
        const filter = {};
        if (role === 'driver') {
            const dp = await DriverProfile_js_1.DriverProfileModel.findOne({ userId: req.user.id });
            if (!dp)
                return res.status(200).json({ success: true, data: [] });
            filter.driverId = dp._id;
        }
        else {
            filter.passengerId = req.user.id;
        }
        if (statusGroup === 'completed') {
            filter.status = 'RIDE_COMPLETED';
        }
        else if (statusGroup === 'cancelled') {
            filter.status = 'CANCELLED';
        }
        else if (statusGroup === 'active') {
            filter.status = { $nin: ['RIDE_COMPLETED', 'CANCELLED', 'EXPIRED', 'NO_DRIVER_FOUND'] };
        }
        const rides = await Ride_js_1.RideModel.find(filter)
            .populate('passengerId')
            .populate({
            path: 'driverId',
            populate: [{ path: 'userId' }, { path: 'vehicle' }],
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        return res.status(200).json({
            success: true,
            data: rides.map((r) => ({ ...r, id: r._id.toString() })),
        });
    }
    catch (err) {
        next(err);
    }
});
// 4. Get Specific Ride by ID
router.get('/:id', auth_middleware_js_1.requireRideParticipant, async (req, res, next) => {
    try {
        const ride = await ride_service_js_1.rideService.getRideById(req.params.id);
        return res.status(200).json({
            success: true,
            data: ride,
        });
    }
    catch (err) {
        next(err);
    }
});
// 5. Driver Submits Fare Offer
router.post('/:id/offers', (0, auth_middleware_js_1.requireRole)('DRIVER'), async (req, res, next) => {
    try {
        const validated = validation_1.submitOfferSchema.parse(req.body);
        const offer = await ride_service_js_1.rideService.submitOffer(req.user.id, req.params.id, validated);
        return res.status(201).json({
            success: true,
            data: offer,
            message: 'Offer submitted successfully to passenger.',
        });
    }
    catch (err) {
        next(err);
    }
});
// 6. Get Offers for Ride
router.get('/:id/offers', auth_middleware_js_1.requireRideParticipant, async (req, res, next) => {
    try {
        const offers = await RideOffer_js_1.RideOfferModel.find({ rideId: req.params.id })
            .populate({
            path: 'driverId',
            populate: [{ path: 'userId' }, { path: 'vehicle' }],
        })
            .sort({ fare: 1, etaMinutes: 1 });
        return res.status(200).json({
            success: true,
            data: offers.map((o) => o.toJSON()),
        });
    }
    catch (err) {
        next(err);
    }
});
// 7. Passenger Selects Driver Offer (Atomic lock)
router.post('/:id/select-offer', (0, auth_middleware_js_1.requireRole)('PASSENGER'), async (req, res, next) => {
    try {
        const validated = validation_1.selectOfferSchema.parse(req.body);
        const ride = await ride_service_js_1.rideService.selectOffer(req.user.id, req.params.id, validated.offerId);
        return res.status(200).json({
            success: true,
            data: ride,
            message: 'Driver selected successfully. Driver is en-route.',
        });
    }
    catch (err) {
        next(err);
    }
});
// 8. Driver Marks Arrival ("I have arrived")
router.post('/:id/arrive', (0, auth_middleware_js_1.requireRole)('DRIVER'), async (req, res, next) => {
    try {
        const ride = await ride_service_js_1.rideService.markDriverArrived(req.user.id, req.params.id);
        return res.status(200).json({
            success: true,
            data: ride,
            message: 'Arrival marked. Passenger notified.',
        });
    }
    catch (err) {
        next(err);
    }
});
// 9. Driver Enters Trip OTP to Start Ride
router.post('/:id/start', (0, auth_middleware_js_1.requireRole)('DRIVER'), async (req, res, next) => {
    try {
        const validated = validation_1.verifyTripOtpSchema.parse(req.body);
        const ride = await ride_service_js_1.rideService.startRide(req.user.id, req.params.id, validated.otp);
        return res.status(200).json({
            success: true,
            data: ride,
            message: 'Trip OTP verified. Ride started!',
        });
    }
    catch (err) {
        next(err);
    }
});
// 10. Driver Completes Ride
router.post('/:id/complete', (0, auth_middleware_js_1.requireRole)('DRIVER'), async (req, res, next) => {
    try {
        const validated = validation_1.completeRideSchema.parse(req.body);
        const ride = await ride_service_js_1.rideService.completeRide(req.user.id, req.params.id, validated.finalFare);
        return res.status(200).json({
            success: true,
            data: ride,
            message: 'Ride completed successfully.',
        });
    }
    catch (err) {
        next(err);
    }
});
// 11. Multi-State Payment Recording
router.post('/:id/payment', auth_middleware_js_1.requireRideParticipant, async (req, res, next) => {
    try {
        const validated = validation_1.recordPaymentSchema.parse(req.body);
        const ride = await ride_service_js_1.rideService.recordPayment(req.user.id, req.user.role, req.params.id, validated.method, validated.status, validated.transactionReference);
        return res.status(200).json({
            success: true,
            data: ride,
            message: 'Payment status recorded successfully.',
        });
    }
    catch (err) {
        next(err);
    }
});
// 12. Cancel Ride
router.post('/:id/cancel', auth_middleware_js_1.requireRideParticipant, async (req, res, next) => {
    try {
        const validated = validation_1.cancelRideSchema.parse(req.body);
        const actorRole = req.user.role === 'DRIVER' ? 'DRIVER' : 'PASSENGER';
        const ride = await ride_service_js_1.rideService.cancelRide(req.user.id, actorRole, req.params.id, validated.reason, validated.details);
        return res.status(200).json({
            success: true,
            data: ride,
            message: 'Ride cancelled.',
        });
    }
    catch (err) {
        next(err);
    }
});
// 13. Rating
router.post('/:id/rating', auth_middleware_js_1.requireRideParticipant, async (req, res, next) => {
    try {
        const validated = validation_1.submitRatingSchema.parse(req.body);
        const ride = await Ride_js_1.RideModel.findById(req.params.id);
        if (!ride)
            throw new Error('Ride not found');
        const isPassenger = ride.passengerId.toString() === req.user.id;
        const fromRole = isPassenger ? 'PASSENGER' : 'DRIVER';
        const toRole = isPassenger ? 'DRIVER' : 'PASSENGER';
        const toUserId = isPassenger
            ? (await DriverProfile_js_1.DriverProfileModel.findById(ride.driverId))?.userId
            : ride.passengerId;
        if (!toUserId)
            throw new Error('Recipient user not found');
        const rating = await Rating_js_1.RatingModel.create({
            rideId: ride._id,
            fromUserId: req.user.id,
            toUserId,
            fromRole,
            toRole,
            stars: validated.stars,
            feedbackTags: validated.feedbackTags,
            comment: validated.comment,
        });
        // Update recipient user / driver average rating
        const allRatings = await Rating_js_1.RatingModel.find({ toUserId });
        const avg = allRatings.reduce((sum, r) => sum + r.stars, 0) / (allRatings.length || 1);
        await User_js_1.UserModel.findByIdAndUpdate(toUserId, {
            ratingAverage: Number(avg.toFixed(1)),
            ratingCount: allRatings.length,
        });
        if (toRole === 'DRIVER') {
            await DriverProfile_js_1.DriverProfileModel.findOneAndUpdate({ userId: toUserId }, { ratingAverage: Number(avg.toFixed(1)), ratingCount: allRatings.length });
        }
        return res.status(201).json({
            success: true,
            data: rating.toJSON(),
            message: 'Thank you for your rating!',
        });
    }
    catch (err) {
        next(err);
    }
});
// 14. Audit Events Ledger
router.get('/:id/events', auth_middleware_js_1.requireRideParticipant, async (req, res, next) => {
    try {
        const events = await RideEvent_js_1.RideEventModel.find({ rideId: req.params.id }).sort({ createdAt: 1 }).lean();
        return res.status(200).json({
            success: true,
            data: events.map((e) => ({ ...e, id: e._id.toString() })),
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=ride.routes.js.map