"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const User_js_1 = require("../models/User.js");
const DriverProfile_js_1 = require("../models/DriverProfile.js");
const Vehicle_js_1 = require("../models/Vehicle.js");
const OperatingArea_js_1 = require("../models/OperatingArea.js");
const validation_1 = require("@gaon-auto/validation");
const auth_service_js_1 = require("../services/auth.service.js");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.authenticate);
// Get current profile
router.get('/profile', async (req, res, next) => {
    try {
        const user = await User_js_1.UserModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
        }
        let driverProfile = null;
        if (user.role === 'DRIVER') {
            const dp = await DriverProfile_js_1.DriverProfileModel.findOne({ userId: user._id });
            if (dp) {
                const vehicle = await Vehicle_js_1.VehicleModel.findOne({ driverId: dp._id });
                driverProfile = { ...dp.toJSON(), vehicle: vehicle ? vehicle.toJSON() : undefined };
            }
        }
        return res.status(200).json({
            success: true,
            data: { user: user.toJSON(), driverProfile },
        });
    }
    catch (err) {
        next(err);
    }
});
// Update profile
router.patch('/profile', async (req, res, next) => {
    try {
        const validated = validation_1.updateProfileSchema.parse(req.body);
        const user = await User_js_1.UserModel.findByIdAndUpdate(req.user.id, { $set: validated }, { new: true });
        return res.status(200).json({
            success: true,
            data: user?.toJSON(),
            message: 'Profile updated successfully',
        });
    }
    catch (err) {
        next(err);
    }
});
// Register device push token
router.post('/device-token', async (req, res, next) => {
    try {
        const validated = validation_1.registerDeviceTokenSchema.parse(req.body);
        await auth_service_js_1.authService.registerDeviceToken(req.user.id, validated.token, validated.platform, validated.deviceId);
        return res.status(200).json({
            success: true,
            data: { registered: true },
        });
    }
    catch (err) {
        next(err);
    }
});
// Saved places
router.get('/saved-places', async (req, res, next) => {
    try {
        const places = await OperatingArea_js_1.SavedPlaceModel.find({ userId: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: places.map((p) => p.toJSON()),
        });
    }
    catch (err) {
        next(err);
    }
});
router.post('/saved-places', async (req, res, next) => {
    try {
        const validated = validation_1.savePlaceSchema.parse(req.body);
        const place = await OperatingArea_js_1.SavedPlaceModel.create({
            userId: req.user.id,
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
    }
    catch (err) {
        next(err);
    }
});
router.delete('/saved-places/:id', async (req, res, next) => {
    try {
        await OperatingArea_js_1.SavedPlaceModel.deleteOne({ _id: req.params.id, userId: req.user.id });
        return res.status(200).json({
            success: true,
            data: { deleted: true },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=user.routes.js.map