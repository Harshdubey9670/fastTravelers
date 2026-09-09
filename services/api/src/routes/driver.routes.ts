import { Router } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest, requireRole } from '../middlewares/auth.middleware.js';
import { driverService } from '../services/driver.service.js';
import { storageService } from '../services/storage.service.js';
import { DriverProfileModel } from '../models/DriverProfile.js';
import { VehicleModel } from '../models/Vehicle.js';
import { DriverDocumentModel } from '../models/DriverDocument.js';
import {
  driverOnboardingSchema,
  updateDriverAvailabilitySchema,
  updateDriverLocationSchema,
} from '@gaon-auto/validation';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

const router = Router();
router.use(authenticate);

// Driver onboarding
router.post('/register', async (req: AuthRequest, res, next) => {
  try {
    const validated = driverOnboardingSchema.parse(req.body);
    const result = await driverService.onboardDriver(req.user!.id, validated);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Driver onboarding details submitted successfully',
    });
  } catch (err) {
    next(err);
  }
});

// Driver own profile
router.get('/me', requireRole('DRIVER', 'ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const dp = await DriverProfileModel.findOne({ userId: req.user!.id });
    if (!dp) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Driver profile not found' } });
    }

    const vehicle = await VehicleModel.findOne({ driverId: dp._id });
    const documents = await DriverDocumentModel.find({ driverId: dp._id }).select('-fileKey'); // Do not expose fileKey

    return res.status(200).json({
      success: true,
      data: {
        ...dp.toJSON(),
        vehicle: vehicle ? vehicle.toJSON() : undefined,
        documents: documents.map((d) => d.toJSON()),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Toggle Online/Offline
router.patch('/availability', requireRole('DRIVER'), async (req: AuthRequest, res, next) => {
  try {
    const validated = updateDriverAvailabilitySchema.parse(req.body);
    const result = await driverService.setAvailability(req.user!.id, validated.isOnline);
    return res.status(200).json({
      success: true,
      data: result,
      message: `Driver is now ${result.isOnline ? 'Online and Available' : 'Offline'}`,
    });
  } catch (err) {
    next(err);
  }
});

// Update location
router.post('/location', requireRole('DRIVER'), async (req: AuthRequest, res, next) => {
  try {
    const validated = updateDriverLocationSchema.parse(req.body);
    const result = await driverService.updateLocation(
      req.user!.id,
      validated.latitude,
      validated.longitude,
      validated.heading,
      validated.speed,
      validated.accuracy
    );
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// Upload protected document
router.post('/documents', requireRole('DRIVER'), upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    const documentType = req.body.documentType;
    if (!documentType || !req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Document file and documentType are required.' },
      });
    }

    const doc = await driverService.uploadDocument(
      req.user!.id,
      documentType,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    return res.status(201).json({
      success: true,
      data: doc,
      message: 'Document uploaded securely for admin verification.',
    });
  } catch (err) {
    next(err);
  }
});

// Protected document streaming (Authorized access only: Driver owner or Admin)
router.get('/:driverId/documents/:docId', async (req: AuthRequest, res, next) => {
  try {
    const { driverId, docId } = req.params;
    const dp = await DriverProfileModel.findById(driverId);
    if (!dp) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Driver not found' } });
    }

    // Role check: Admin or the driver who owns the document
    const isOwner = dp.userId.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: You cannot view this sensitive document.' },
      });
    }

    const doc = await DriverDocumentModel.findOne({ _id: docId, driverId: dp._id });
    if (!doc) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
    const stream = storageService.getReadStream(doc.fileKey);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;
