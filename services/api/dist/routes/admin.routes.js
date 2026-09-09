"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = exports.reportRouter = void 0;
const express_1 = require("express");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const validation_1 = require("@gaon-auto/validation");
const PaymentRecord_js_1 = require("../models/PaymentRecord.js");
const admin_service_js_1 = require("../services/admin.service.js");
const LocalPlace_js_1 = require("../models/LocalPlace.js");
const validation_2 = require("@gaon-auto/validation");
const Ride_js_1 = require("../models/Ride.js");
// ==========================================
// REPORT ROUTES
// ==========================================
exports.reportRouter = (0, express_1.Router)();
exports.reportRouter.use(auth_middleware_js_1.authenticate);
exports.reportRouter.post('/', async (req, res, next) => {
    try {
        const validated = validation_1.submitReportSchema.parse(req.body);
        const report = await PaymentRecord_js_1.ReportModel.create({
            reporterId: req.user.id,
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
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// ADMIN ROUTES
// ==========================================
exports.adminRouter = (0, express_1.Router)();
exports.adminRouter.use(auth_middleware_js_1.authenticate);
exports.adminRouter.use((0, auth_middleware_js_1.requireRole)('ADMIN', 'SUPER_ADMIN'));
// Admin Dashboard Stats
exports.adminRouter.get('/stats', async (req, res, next) => {
    try {
        const stats = await admin_service_js_1.adminService.getDashboardStats();
        return res.status(200).json({ success: true, data: stats });
    }
    catch (err) {
        next(err);
    }
});
// Admin Drivers List
exports.adminRouter.get('/drivers', async (req, res, next) => {
    try {
        const status = req.query.status;
        const drivers = await admin_service_js_1.adminService.getDrivers(status);
        return res.status(200).json({ success: true, data: drivers });
    }
    catch (err) {
        next(err);
    }
});
// Verify / Reject / Suspend Driver
exports.adminRouter.patch('/drivers/:id/verify', async (req, res, next) => {
    try {
        const validated = validation_2.adminVerifyDriverSchema.parse(req.body);
        const ip = req.ip || req.socket.remoteAddress;
        const result = await admin_service_js_1.adminService.verifyDriver(req.user.id, req.params.id, validated.status, validated.verificationNotes, ip);
        return res.status(200).json({
            success: true,
            data: result,
            message: `Driver status successfully changed to ${validated.status}`,
        });
    }
    catch (err) {
        next(err);
    }
});
// List Rides
exports.adminRouter.get('/rides', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit || '50', 10);
        const rides = await Ride_js_1.RideModel.find()
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
            data: rides.map((r) => ({ ...r, id: r._id.toString() })),
        });
    }
    catch (err) {
        next(err);
    }
});
// Route Analytics
exports.adminRouter.get('/analytics', async (req, res, next) => {
    try {
        const analytics = await admin_service_js_1.adminService.getRouteAnalytics();
        return res.status(200).json({ success: true, data: analytics });
    }
    catch (err) {
        next(err);
    }
});
// Add Local Place / Landmark
exports.adminRouter.post('/places', async (req, res, next) => {
    try {
        const validated = validation_2.createLocalPlaceSchema.parse(req.body);
        const place = await LocalPlace_js_1.LocalPlaceModel.create({
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
    }
    catch (err) {
        next(err);
    }
});
// List Reports
exports.adminRouter.get('/reports', async (req, res, next) => {
    try {
        const reports = await PaymentRecord_js_1.ReportModel.find()
            .populate('reporterId')
            .populate('reportedUserId')
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json({ success: true, data: reports });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=admin.routes.js.map