import { Router } from 'express';
import { authenticate, AuthRequest, requireRole } from '../middlewares/auth.middleware.js';
import { submitReportSchema } from '@gaon-auto/validation';
import { ReportModel } from '../models/PaymentRecord.js';
import { adminService } from '../services/admin.service.js';
import { LocalPlaceModel } from '../models/LocalPlace.js';
import { createLocalPlaceSchema, adminVerifyDriverSchema } from '@gaon-auto/validation';
import { RideModel } from '../models/Ride.js';

// ==========================================
// REPORT ROUTES
// ==========================================

export const reportRouter = Router();
reportRouter.use(authenticate);

reportRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const validated = submitReportSchema.parse(req.body);
    const report = await ReportModel.create({
      reporterId: req.user!.id,
      reportedUserId: validated.reportedUserId,
      rideId: validated.rideId,
      category: validated.category,
      description: validated.description,
      status: 'OPEN',
    });

    return res.status(201).json({
      success: true,
      data: report.toJSON(),
      message: 'Report submitted. Our support team will review this incident.',
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

export const adminRouter = Router();
adminRouter.use(authenticate);
adminRouter.use(requireRole('ADMIN', 'SUPER_ADMIN'));

// Admin Dashboard Stats
adminRouter.get('/stats', async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// Admin Drivers List
adminRouter.get('/drivers', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const drivers = await adminService.getDrivers(status);
    return res.status(200).json({ success: true, data: drivers });
  } catch (err) {
    next(err);
  }
});

// Verify / Reject / Suspend Driver
adminRouter.patch('/drivers/:id/verify', async (req: AuthRequest, res, next) => {
  try {
    const validated = adminVerifyDriverSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const result = await adminService.verifyDriver(
      req.user!.id,
      req.params.id,
      validated.status,
      validated.verificationNotes,
      ip
    );
    return res.status(200).json({
      success: true,
      data: result,
      message: `Driver status successfully changed to ${validated.status}`,
    });
  } catch (err) {
    next(err);
  }
});

// List Rides
adminRouter.get('/rides', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string || '50', 10);
    const rides = await RideModel.find()
      .populate('passengerId')
      .populate({
        path: 'driverId',
        populate: [{ path: 'userId' }, { path: 'vehicle' }],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      data: rides.map((r: any) => ({ ...r, id: r._id.toString() })),
    });
  } catch (err) {
    next(err);
  }
});

// Route Analytics
adminRouter.get('/analytics', async (req, res, next) => {
  try {
    const analytics = await adminService.getRouteAnalytics();
    return res.status(200).json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

// Add Local Place / Landmark
adminRouter.post('/places', async (req, res, next) => {
  try {
    const validated = createLocalPlaceSchema.parse(req.body);
    const place = await LocalPlaceModel.create({
      nameEn: validated.nameEn,
      nameHi: validated.nameHi,
      placeType: validated.placeType,
      district: validated.district,
      tehsil: validated.tehsil,
      state: validated.state,
      location: {
        type: 'Point',
        coordinates: [validated.longitude, validated.latitude],
      },
      description: validated.description,
      aliases: validated.aliases,
      popularRank: validated.popularRank,
    });
    return res.status(201).json({
      success: true,
      data: place.toJSON(),
      message: 'Local place created successfully',
    });
  } catch (err) {
    next(err);
  }
});

// List Reports
adminRouter.get('/reports', async (req, res, next) => {
  try {
    const reports = await ReportModel.find()
      .populate('reporterId')
      .populate('reportedUserId')
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
});
