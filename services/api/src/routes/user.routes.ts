import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware.js';
import { UserModel } from '../models/User.js';
import { DriverProfileModel } from '../models/DriverProfile.js';
import { VehicleModel } from '../models/Vehicle.js';
import { SavedPlaceModel } from '../models/OperatingArea.js';
import { updateProfileSchema, savePlaceSchema, registerDeviceTokenSchema } from '@gaon-auto/validation';
import { authService } from '../services/auth.service.js';

const router = Router();
router.use(authenticate);

// Get current profile
router.get('/profile', async (req: AuthRequest, res, next) => {
  try {
    const user = await UserModel.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    let driverProfile = null;
    if (user.role === 'DRIVER') {
      const dp = await DriverProfileModel.findOne({ userId: user._id });
      if (dp) {
        const vehicle = await VehicleModel.findOne({ driverId: dp._id });
        driverProfile = { ...dp.toJSON(), vehicle: vehicle ? vehicle.toJSON() : undefined };
      }
    }

    return res.status(200).json({
      success: true,
      data: { user: user.toJSON(), driverProfile },
    });
  } catch (err) {
    next(err);
  }
});

// Update profile
router.patch('/profile', async (req: AuthRequest, res, next) => {
  try {
    const validated = updateProfileSchema.parse(req.body);
    const user = await UserModel.findByIdAndUpdate(req.user!.id, { $set: validated }, { new: true });
    return res.status(200).json({
      success: true,
      data: user?.toJSON(),
      message: 'Profile updated successfully',
    });
  } catch (err) {
    next(err);
  }
});

// Register device push token
router.post('/device-token', async (req: AuthRequest, res, next) => {
  try {
    const validated = registerDeviceTokenSchema.parse(req.body);
    await authService.registerDeviceToken(
      req.user!.id,
      validated.token,
      validated.platform,
      validated.deviceId
    );
    return res.status(200).json({
      success: true,
      data: { registered: true },
    });
  } catch (err) {
    next(err);
  }
});

// Saved places
router.get('/saved-places', async (req: AuthRequest, res, next) => {
  try {
    const places = await SavedPlaceModel.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: places.map((p) => p.toJSON()),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/saved-places', async (req: AuthRequest, res, next) => {
  try {
    const validated = savePlaceSchema.parse(req.body);
    const place = await SavedPlaceModel.create({
      userId: req.user!.id,
      label: validated.label,
      customLabel: validated.customLabel,
      addressText: validated.addressText,
      landmark: validated.landmark,
      location: {
        type: 'Point',
        coordinates: [validated.longitude, validated.latitude],
      },
    });
    return res.status(201).json({
      success: true,
      data: place.toJSON(),
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/saved-places/:id', async (req: AuthRequest, res, next) => {
  try {
    await SavedPlaceModel.deleteOne({ _id: req.params.id, userId: req.user!.id });
    return res.status(200).json({
      success: true,
      data: { deleted: true },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
