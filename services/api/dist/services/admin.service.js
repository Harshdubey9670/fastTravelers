"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminService = exports.AdminService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const index_js_1 = require("../models/index.js");
const socket_service_js_1 = require("./socket.service.js");
class AdminService {
    /**
     * Retrieves overall system metrics for the administrative dashboard.
     */
    async getDashboardStats() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [totalUsers, totalDrivers, pendingDrivers, onlineDrivers, activeRides, completedToday, cancelledToday, openReports,] = await Promise.all([
            index_js_1.UserModel.countDocuments({ role: 'PASSENGER' }),
            index_js_1.DriverProfileModel.countDocuments({ verificationStatus: 'APPROVED' }),
            index_js_1.DriverProfileModel.countDocuments({ verificationStatus: 'PENDING' }),
            index_js_1.DriverProfileModel.countDocuments({ isOnline: true, availabilityStatus: 'AVAILABLE' }),
            index_js_1.RideModel.countDocuments({
                status: {
                    $in: [
                        'REQUESTED',
                        'SEARCHING_DRIVER',
                        'OFFERS_RECEIVED',
                        'DRIVER_SELECTED',
                        'DRIVER_EN_ROUTE',
                        'DRIVER_ARRIVED',
                        'RIDE_READY',
                        'RIDE_STARTED',
                    ],
                },
            }),
            index_js_1.RideModel.countDocuments({
                status: 'RIDE_COMPLETED',
                'timestamps.completedAt': { $gte: todayStart },
            }),
            index_js_1.RideModel.countDocuments({
                status: 'CANCELLED',
                'timestamps.cancelledAt': { $gte: todayStart },
            }),
            index_js_1.ReportModel.countDocuments({ status: 'OPEN' }),
        ]);
        return {
            totalUsers,
            totalDrivers,
            pendingDrivers,
            onlineDrivers,
            activeRides,
            completedToday,
            cancelledToday,
            openReports,
        };
    }
    /**
     * Lists drivers with optional status filter.
     */
    async getDrivers(status) {
        const filter = {};
        if (status) {
            filter.verificationStatus = status;
        }
        const drivers = await index_js_1.DriverProfileModel.find(filter)
            .populate('userId')
            .sort({ createdAt: -1 })
            .lean();
        const driverIds = drivers.map((d) => d._id);
        const vehicles = await index_js_1.VehicleModel.find({ driverId: { $in: driverIds } }).lean();
        const documents = await index_js_1.DriverDocumentModel.find({ driverId: { $in: driverIds } }).lean();
        const vehicleMap = new Map(vehicles.map((v) => [v.driverId.toString(), v]));
        const documentMap = new Map();
        documents.forEach((doc) => {
            const k = doc.driverId.toString();
            if (!documentMap.has(k))
                documentMap.set(k, []);
            documentMap.get(k).push(doc);
        });
        return drivers.map((d) => ({
            ...d,
            id: d._id.toString(),
            vehicle: vehicleMap.get(d._id.toString()),
            documents: documentMap.get(d._id.toString()) || [],
        }));
    }
    /**
     * Verifies, rejects, or suspends a driver. Logs an immutable admin audit log.
     */
    async verifyDriver(adminId, driverId, status, verificationNotes, ipAddress) {
        const driver = await index_js_1.DriverProfileModel.findById(driverId);
        if (!driver)
            throw new Error('Driver not found');
        const previousStatus = driver.verificationStatus;
        driver.verificationStatus = status;
        driver.verificationNotes = verificationNotes;
        if (status === 'APPROVED') {
            driver.approvedAt = new Date();
            driver.approvedBy = new mongoose_1.default.Types.ObjectId(adminId);
        }
        else if (status === 'SUSPENDED' || status === 'REJECTED') {
            driver.isOnline = false;
            driver.availabilityStatus = 'SUSPENDED';
        }
        await driver.save();
        // Log admin audit action
        await index_js_1.AdminAuditLogModel.create({
            adminId: new mongoose_1.default.Types.ObjectId(adminId),
            action: `DRIVER_${status}`,
            targetEntity: 'DriverProfile',
            targetId: driverId,
            changes: { previousStatus, newStatus: status, verificationNotes },
            ipAddress,
        });
        // Notify driver in realtime
        socket_service_js_1.socketService.sendToDriver(driver._id.toString(), 'notification:new', {
            id: new mongoose_1.default.Types.ObjectId().toString(),
            title: `Account Verification: ${status}`,
            body: verificationNotes || `Your driver profile status has been updated to ${status}.`,
            type: 'VERIFICATION_UPDATE',
        });
        return driver.toJSON();
    }
    /**
     * Returns popular route analytics and stats.
     */
    async getRouteAnalytics() {
        const popularPickups = await index_js_1.RideModel.aggregate([
            { $group: { _id: '$pickup.addressText', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);
        const popularDestinations = await index_js_1.RideModel.aggregate([
            { $group: { _id: '$destination.addressText', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);
        const cancellationReasons = await index_js_1.RideModel.aggregate([
            { $match: { status: 'CANCELLED', 'cancellation.reason': { $exists: true } } },
            { $group: { _id: '$cancellation.reason', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);
        return {
            popularPickups,
            popularDestinations,
            cancellationReasons,
        };
    }
}
exports.AdminService = AdminService;
exports.adminService = new AdminService();
//# sourceMappingURL=admin.service.js.map