import mongoose from 'mongoose';
import { DriverVerificationStatus } from '@gaon-auto/types';
export declare class AdminService {
    /**
     * Retrieves overall system metrics for the administrative dashboard.
     */
    getDashboardStats(): Promise<{
        totalUsers: number;
        totalDrivers: number;
        pendingDrivers: number;
        onlineDrivers: number;
        activeRides: number;
        completedToday: number;
        cancelledToday: number;
        openReports: number;
    }>;
    /**
     * Lists drivers with optional status filter.
     */
    getDrivers(status?: string): Promise<any[]>;
    /**
     * Verifies, rejects, or suspends a driver. Logs an immutable admin audit log.
     */
    verifyDriver(adminId: string, driverId: string, status: DriverVerificationStatus, verificationNotes?: string, ipAddress?: string): Promise<mongoose.FlattenMaps<import("../models/DriverProfile.js").DriverProfileDocument> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Returns popular route analytics and stats.
     */
    getRouteAnalytics(): Promise<{
        popularPickups: any[];
        popularDestinations: any[];
        cancellationReasons: any[];
    }>;
}
export declare const adminService: AdminService;
//# sourceMappingURL=admin.service.d.ts.map