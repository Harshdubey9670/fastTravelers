import { Router } from 'express';
import { authenticate, AuthRequest, requireRole, requireRideParticipant } from '../middlewares/auth.middleware.js';
import { idempotencyMiddleware } from '../middlewares/idempotency.middleware.js';
import { rideService } from '../services/ride.service.js';
import {
  createRideSchema,
  submitOfferSchema,
  selectOfferSchema,
  verifyTripOtpSchema,
  cancelRideSchema,
  completeRideSchema,
  recordPaymentSchema,
  submitRatingSchema,
} from '@gaon-auto/validation';
import { RideModel } from '../models/Ride.js';
import { RideOfferModel } from '../models/RideOffer.js';
import { RideEventModel } from '../models/RideEvent.js';
import { RatingModel } from '../models/Rating.js';
import { DriverProfileModel } from '../models/DriverProfile.js';
import { UserModel } from '../models/User.js';

const router = Router();
router.use(authenticate);
router.use(idempotencyMiddleware());

// 1. Create Ride Request (Passenger)
router.post('/', requireRole('PASSENGER'), async (req: AuthRequest, res, next) => {
  try {
    const validated = createRideSchema.parse(req.body);
    const ride = await rideService.createRide(req.user!.id, validated);
    return res.status(201).json({
      success: true,
      data: ride,
      message: 'Ride request created. Searching for nearby available drivers.',
    });
  } catch (err) {
    next(err);
  }
});

// 1b. Progressive Search Radius Expansion
router.post('/:id/expand-radius', async (req: AuthRequest, res, next) => {
  try {
    const ride = await rideService.expandSearchRadius(req.params.id);
    return res.status(200).json({
      success: true,
      data: ride,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Authoritative Active Ride Recovery (Reconnect, Cold-start, Crash recovery)
router.get('/active', async (req: AuthRequest, res, next) => {
  try {
    const result = await rideService.getActiveRide(req.user!.id, req.user!.role);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Ride History
router.get('/history', async (req: AuthRequest, res, next) => {
  try {
    const role = req.query.role === 'driver' ? 'driver' : 'passenger';
    const statusGroup = (req.query.statusGroup as string) || 'all';

    const filter: any = {};
    if (role === 'driver') {
      const dp = await DriverProfileModel.findOne({ userId: req.user!.id });
      if (!dp) return res.status(200).json({ success: true, data: [] });
      filter.driverId = dp._id;
    } else {
      filter.passengerId = req.user!.id;
    }

    if (statusGroup === 'completed') {
      filter.status = 'RIDE_COMPLETED';
    } else if (statusGroup === 'cancelled') {
      filter.status = 'CANCELLED';
    } else if (statusGroup === 'active') {
      filter.status = { $nin: ['RIDE_COMPLETED', 'CANCELLED', 'EXPIRED', 'NO_DRIVER_FOUND'] };
    }

    const rides = await RideModel.find(filter)
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
      data: rides.map((r: any) => ({ ...r, id: r._id.toString() })),
    });
  } catch (err) {
    next(err);
  }
});

// 4. Get Specific Ride by ID
router.get('/:id', requireRideParticipant, async (req: AuthRequest, res, next) => {
  try {
    const ride = await rideService.getRideById(req.params.id);
    return res.status(200).json({
      success: true,
      data: ride,
    });
  } catch (err) {
    next(err);
  }
});

// 5. Driver Submits Fare Offer
router.post('/:id/offers', requireRole('DRIVER'), async (req: AuthRequest, res, next) => {
  try {
    const validated = submitOfferSchema.parse(req.body);
    const offer = await rideService.submitOffer(req.user!.id, req.params.id, validated);
    return res.status(201).json({
      success: true,
      data: offer,
      message: 'Offer submitted successfully to passenger.',
    });
  } catch (err) {
    next(err);
  }
});

// 6. Get Offers for Ride
router.get('/:id/offers', requireRideParticipant, async (req: AuthRequest, res, next) => {
  try {
    const offers = await RideOfferModel.find({ rideId: req.params.id })
      .populate({
        path: 'driverId',
        populate: [{ path: 'userId' }, { path: 'vehicle' }],
      })
      .sort({ fare: 1, etaMinutes: 1 });

    return res.status(200).json({
      success: true,
      data: offers.map((o) => o.toJSON()),
    });
  } catch (err) {
    next(err);
  }
});

// 7. Passenger Selects Driver Offer (Atomic lock)
router.post('/:id/select-offer', requireRole('PASSENGER'), async (req: AuthRequest, res, next) => {
  try {
    const validated = selectOfferSchema.parse(req.body);
    const ride = await rideService.selectOffer(req.user!.id, req.params.id, validated.offerId);
    return res.status(200).json({
      success: true,
      data: ride,
      message: 'Driver selected successfully. Driver is en-route.',
    });
  } catch (err) {
    next(err);
  }
});

// 8. Driver Marks Arrival ("I have arrived")
router.post('/:id/arrive', requireRole('DRIVER'), async (req: AuthRequest, res, next) => {
  try {
    const ride = await rideService.markDriverArrived(req.user!.id, req.params.id);
    return res.status(200).json({
      success: true,
      data: ride,
      message: 'Arrival marked. Passenger notified.',
    });
  } catch (err) {
    next(err);
  }
});

// 9. Driver Enters Trip OTP to Start Ride
router.post('/:id/start', requireRole('DRIVER'), async (req: AuthRequest, res, next) => {
  try {
    const validated = verifyTripOtpSchema.parse(req.body);
    const ride = await rideService.startRide(req.user!.id, req.params.id, validated.otp);
    return res.status(200).json({
      success: true,
      data: ride,
      message: 'Trip OTP verified. Ride started!',
    });
  } catch (err) {
    next(err);
  }
});

// 10. Driver Completes Ride
router.post('/:id/complete', requireRole('DRIVER'), async (req: AuthRequest, res, next) => {
  try {
    const validated = completeRideSchema.parse(req.body);
    const ride = await rideService.completeRide(req.user!.id, req.params.id, validated.finalFare);
    return res.status(200).json({
      success: true,
      data: ride,
      message: 'Ride completed successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// 11. Multi-State Payment Recording
router.post('/:id/payment', requireRideParticipant, async (req: AuthRequest, res, next) => {
  try {
    const validated = recordPaymentSchema.parse(req.body);
    const ride = await rideService.recordPayment(
      req.user!.id,
      req.user!.role,
      req.params.id,
      validated.method,
      validated.status,
      validated.transactionReference
    );
    return res.status(200).json({
      success: true,
      data: ride,
      message: 'Payment status recorded successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// 12. Cancel Ride
router.post('/:id/cancel', requireRideParticipant, async (req: AuthRequest, res, next) => {
  try {
    const validated = cancelRideSchema.parse(req.body);
    const actorRole = req.user!.role === 'DRIVER' ? 'DRIVER' : 'PASSENGER';
    const ride = await rideService.cancelRide(
      req.user!.id,
      actorRole,
      req.params.id,
      validated.reason,
      validated.details
    );
    return res.status(200).json({
      success: true,
      data: ride,
      message: 'Ride cancelled.',
    });
  } catch (err) {
    next(err);
  }
});

// 13. Rating
router.post('/:id/rating', requireRideParticipant, async (req: AuthRequest, res, next) => {
  try {
    const validated = submitRatingSchema.parse(req.body);
    const ride = await RideModel.findById(req.params.id);
    if (!ride) throw new Error('Ride not found');

    const isPassenger = ride.passengerId.toString() === req.user!.id;
    const fromRole = isPassenger ? 'PASSENGER' : 'DRIVER';
    const toRole = isPassenger ? 'DRIVER' : 'PASSENGER';
    const toUserId = isPassenger
      ? (await DriverProfileModel.findById(ride.driverId))?.userId
      : ride.passengerId;

    if (!toUserId) throw new Error('Recipient user not found');

    const existingRating = await RatingModel.findOne({
      rideId: ride._id,
      fromUserId: req.user!.id,
    });
    if (existingRating) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_RATED', message: 'You have already submitted a rating for this ride.' },
      });
    }

    const rating = await RatingModel.create({
      rideId: ride._id,
      fromUserId: req.user!.id,
      toUserId,
      fromRole,
      toRole,
      stars: validated.stars,
      feedbackTags: validated.feedbackTags,
      comment: validated.comment,
    });

    // Update recipient user / driver average rating
    const allRatings = await RatingModel.find({ toUserId });
    const avg = allRatings.reduce((sum: number, r: any) => sum + r.stars, 0) / (allRatings.length || 1);

    await UserModel.findByIdAndUpdate(toUserId, {
      ratingAverage: Number(avg.toFixed(1)),
      ratingCount: allRatings.length,
    });

    if (toRole === 'DRIVER') {
      await DriverProfileModel.findOneAndUpdate(
        { userId: toUserId },
        { ratingAverage: Number(avg.toFixed(1)), ratingCount: allRatings.length }
      );
    }

    return res.status(201).json({
      success: true,
      data: rating.toJSON(),
      message: 'Thank you for your rating!',
    });
  } catch (err) {
    next(err);
  }
});

// 14. Audit Events Ledger
router.get('/:id/events', requireRideParticipant, async (req: AuthRequest, res, next) => {
  try {
    const events = await RideEventModel.find({ rideId: req.params.id }).sort({ createdAt: 1 }).lean();
    return res.status(200).json({
      success: true,
      data: events.map((e: any) => ({ ...e, id: e._id.toString() })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
