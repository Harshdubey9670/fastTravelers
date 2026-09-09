import mongoose from 'mongoose';
import {
  DriverProfileModel,
  UserModel,
  VehicleModel,
  DriverDocumentModel,
  RideModel,
  RideEventModel,
  LocalPlaceModel,
  OperatingAreaModel,
  AdminAuditLogModel,
  ReportModel,
} from '../models/index.js';
import { DriverVerificationStatus } from '@gaon-auto/types';
import { socketService } from './socket.service.js';

export class AdminService {
  /**
   * Retrieves overall system metrics for the administrative dashboard.
   */
  async getDashboardStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalDrivers,
      pendingDrivers,
      onlineDrivers,
      activeRides,
      completedToday,
      cancelledToday,
      openReports,
    ] = await Promise.all([
      UserModel.countDocuments({ role: 'PASSENGER' }),
      DriverProfileModel.countDocuments({ verificationStatus: 'APPROVED' }),
      DriverProfileModel.countDocuments({ verificationStatus: 'PENDING' }),
      DriverProfileModel.countDocuments({ isOnline: true, availabilityStatus: 'AVAILABLE' }),
      RideModel.countDocuments({
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
      RideModel.countDocuments({
        status: 'RIDE_COMPLETED',
        'timestamps.completedAt': { $gte: todayStart },
      }),
      RideModel.countDocuments({
        status: 'CANCELLED',
        'timestamps.cancelledAt': { $gte: todayStart },
      }),
      ReportModel.countDocuments({ status: 'OPEN' }),
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
  async getDrivers(status?: string): Promise<any[]> {
    const filter: any = {};
    if (status) {
      filter.verificationStatus = status;
    }
    const drivers = await DriverProfileModel.find(filter)
      .populate('userId')
      .sort({ createdAt: -1 })
      .lean();

    const driverIds = drivers.map((d) => d._id);
    const vehicles = await VehicleModel.find({ driverId: { $in: driverIds } }).lean();
    const documents = await DriverDocumentModel.find({ driverId: { $in: driverIds } }).lean();

    const vehicleMap = new Map(vehicles.map((v) => [v.driverId.toString(), v]));
    const documentMap = new Map<string, any[]>();
    documents.forEach((doc) => {
      const k = doc.driverId.toString();
      if (!documentMap.has(k)) documentMap.set(k, []);
      documentMap.get(k)!.push(doc);
    });

    return drivers.map((d: any) => ({
      ...d,
      id: d._id.toString(),
      vehicle: vehicleMap.get(d._id.toString()),
      documents: documentMap.get(d._id.toString()) || [],
    }));
  }

  /**
   * Verifies, rejects, or suspends a driver. Logs an immutable admin audit log.
   */
  async verifyDriver(
    adminId: string,
    driverId: string,
    status: DriverVerificationStatus,
    verificationNotes?: string,
    ipAddress?: string
  ) {
    const driver = await DriverProfileModel.findById(driverId);
    if (!driver) throw new Error('Driver not found');

    const previousStatus = driver.verificationStatus;
    driver.verificationStatus = status;
    driver.verificationNotes = verificationNotes;
    if (status === 'APPROVED') {
      driver.approvedAt = new Date();
      driver.approvedBy = new mongoose.Types.ObjectId(adminId) as any;
    } else if (status === 'SUSPENDED' || status === 'REJECTED') {
      driver.isOnline = false;
      driver.availabilityStatus = 'SUSPENDED';
    }
    await driver.save();

    // Log admin audit action
    await AdminAuditLogModel.create({
      adminId: new mongoose.Types.ObjectId(adminId),
      action: `DRIVER_${status}`,
      targetEntity: 'DriverProfile',
      targetId: driverId,
      changes: { previousStatus, newStatus: status, verificationNotes },
      ipAddress,
    });

    // Notify driver in realtime
    socketService.sendToDriver(driver._id.toString(), 'notification:new', {
      id: new mongoose.Types.ObjectId().toString(),
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
    const popularPickups = await RideModel.aggregate([
      { $group: { _id: '$pickup.addressText', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const popularDestinations = await RideModel.aggregate([
      { $group: { _id: '$destination.addressText', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const cancellationReasons = await RideModel.aggregate([
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

export const adminService = new AdminService();
