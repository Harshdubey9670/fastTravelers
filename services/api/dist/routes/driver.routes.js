"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const driver_service_js_1 = require("../services/driver.service.js");
const storage_service_js_1 = require("../services/storage.service.js");
const DriverProfile_js_1 = require("../models/DriverProfile.js");
const Vehicle_js_1 = require("../models/Vehicle.js");
const DriverDocument_js_1 = require("../models/DriverDocument.js");
const validation_1 = require("@gaon-auto/validation");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.authenticate);
// Driver onboarding
router.post('/register', async (req, res, next) => {
    try {
        const validated = validation_1.driverOnboardingSchema.parse(req.body);
        const result = await driver_service_js_1.driverService.onboardDriver(req.user.id, validated);
        return res.status(200).json({
            success: true,
            data: result,
            message: 'Driver onboarding details submitted successfully',
        });
    }
    catch (err) {
        next(err);
    }
});
// Driver own profile
router.get('/me', (0, auth_middleware_js_1.requireRole)('DRIVER', 'ADMIN'), async (req, res, next) => {
    try {
        const dp = await DriverProfile_js_1.DriverProfileModel.findOne({ userId: req.user.id });
        if (!dp) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Driver profile not found' } });
        }
        const vehicle = await Vehicle_js_1.VehicleModel.findOne({ driverId: dp._id });
        const documents = await DriverDocument_js_1.DriverDocumentModel.find({ driverId: dp._id }).select('-fileKey'); // Do not expose fileKey
        return res.status(200).json({
            success: true,
            data: {
                ...dp.toJSON(),
                vehicle: vehicle ? vehicle.toJSON() : undefined,
                documents: documents.map((d) => d.toJSON()),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// Toggle Online/Offline
router.patch('/availability', (0, auth_middleware_js_1.requireRole)('DRIVER'), async (req, res, next) => {
    try {
        const validated = validation_1.updateDriverAvailabilitySchema.parse(req.body);
        const result = await driver_service_js_1.driverService.setAvailability(req.user.id, validated.isOnline);
        return res.status(200).json({
            success: true,
            data: result,
            message: `Driver is now ${result.isOnline ? 'Online and Available' : 'Offline'}`,
        });
    }
    catch (err) {
        next(err);
    }
});
// Update location
router.post('/location', (0, auth_middleware_js_1.requireRole)('DRIVER'), async (req, res, next) => {
    try {
        const validated = validation_1.updateDriverLocationSchema.parse(req.body);
        const result = await driver_service_js_1.driverService.updateLocation(req.user.id, validated.latitude, validated.longitude, validated.heading, validated.speed, validated.accuracy);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (err) {
        next(err);
    }
});
// Upload protected document
router.post('/documents', (0, auth_middleware_js_1.requireRole)('DRIVER'), upload.single('file'), async (req, res, next) => {
    try {
        const documentType = req.body.documentType;
        if (!documentType || !req.file) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_PAYLOAD', message: 'Document file and documentType are required.' },
            });
        }
        const doc = await driver_service_js_1.driverService.uploadDocument(req.user.id, documentType, req.file.buffer, req.file.originalname, req.file.mimetype);
        return res.status(201).json({
            success: true,
            data: doc,
            message: 'Document uploaded securely for admin verification.',
        });
    }
    catch (err) {
        next(err);
    }
});
// Protected document streaming (Authorized access only: Driver owner or Admin)
router.get('/:driverId/documents/:docId', async (req, res, next) => {
    try {
        const { driverId, docId } = req.params;
        const dp = await DriverProfile_js_1.DriverProfileModel.findById(driverId);
        if (!dp) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Driver not found' } });
        }
        // Role check: Admin or the driver who owns the document
        const isOwner = dp.userId.toString() === req.user.id;
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied: You cannot view this sensitive document.' },
            });
        }
        const doc = await DriverDocument_js_1.DriverDocumentModel.findOne({ _id: docId, driverId: dp._id });
        if (!doc) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
        }
        res.setHeader('Content-Type', doc.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
        const stream = storage_service_js_1.storageService.getReadStream(doc.fileKey);
        stream.pipe(res);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=driver.routes.js.map