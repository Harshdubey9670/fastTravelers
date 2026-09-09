import { AuthResponse, IUser, IDriverProfile, IRide, IRideOffer, IRideMessage, ISavedPlace, ILocalPlace, IRating, IReport, IRideEvent } from '@gaon-auto/types';
export interface ApiClientConfig {
    baseUrl: string;
    getAccessToken: () => Promise<string | null> | string | null;
    getRefreshToken: () => Promise<string | null> | string | null;
    onTokensRefreshed?: (tokens: {
        accessToken: string;
        refreshToken: string;
    }) => void;
    onAuthExpired?: () => void;
}
export declare class ApiError extends Error {
    code: string;
    status: number;
    details?: any | undefined;
    constructor(code: string, message: string, status: number, details?: any | undefined);
}
export declare class ApiClient {
    private baseUrl;
    private getAccessToken;
    private getRefreshToken;
    private onTokensRefreshed?;
    private onAuthExpired?;
    private isRefreshing;
    private refreshSubscribers;
    constructor(config: ApiClientConfig);
    private request;
    private handleTokenRefresh;
    requestOtp(phone: string, role?: 'PASSENGER' | 'DRIVER'): Promise<{
        cooldownSeconds: number;
        devOtp?: string;
    }>;
    verifyOtp(phone: string, otp: string, deviceInfo?: any): Promise<AuthResponse>;
    logout(): Promise<{
        message: string;
    }>;
    registerDeviceToken(token: string, platform?: 'android' | 'ios' | 'web', deviceId?: string): Promise<{
        registered: boolean;
    }>;
    getProfile(): Promise<{
        user: IUser;
        driverProfile?: IDriverProfile;
    }>;
    updateProfile(data: Partial<IUser>): Promise<IUser>;
    getSavedPlaces(): Promise<ISavedPlace[]>;
    addSavedPlace(data: Omit<ISavedPlace, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<ISavedPlace>;
    deleteSavedPlace(placeId: string): Promise<{
        deleted: boolean;
    }>;
    registerDriver(data: any): Promise<IDriverProfile>;
    getDriverProfile(): Promise<IDriverProfile>;
    updateAvailability(isOnline: boolean): Promise<{
        isOnline: boolean;
        availabilityStatus: string;
    }>;
    updateLocation(data: {
        latitude: number;
        longitude: number;
        heading?: number;
        speed?: number;
        accuracy?: number;
    }): Promise<{
        updated: boolean;
    }>;
    createRide(data: any, idempotencyKey?: string): Promise<IRide>;
    getActiveRide(): Promise<{
        ride: IRide | null;
        offers: IRideOffer[];
        chatMessages: IRideMessage[];
    }>;
    getRide(rideId: string): Promise<IRide>;
    submitOffer(rideId: string, data: {
        fare: number;
        etaMinutes: number;
        message?: string;
    }, idempotencyKey?: string): Promise<IRideOffer>;
    getOffers(rideId: string): Promise<IRideOffer[]>;
    selectOffer(rideId: string, offerId: string, idempotencyKey?: string): Promise<IRide>;
    markDriverArrived(rideId: string, idempotencyKey?: string): Promise<IRide>;
    startRide(rideId: string, otp: string, idempotencyKey?: string): Promise<IRide>;
    completeRide(rideId: string, finalFare?: number, idempotencyKey?: string): Promise<IRide>;
    recordPayment(rideId: string, data: {
        method: 'CASH' | 'UPI_DIRECT';
        status: string;
        transactionReference?: string;
    }, idempotencyKey?: string): Promise<IRide>;
    cancelRide(rideId: string, reason: string, details?: string, idempotencyKey?: string): Promise<IRide>;
    getRideHistory(role?: 'passenger' | 'driver', statusGroup?: 'active' | 'completed' | 'cancelled' | 'all'): Promise<IRide[]>;
    getRideEvents(rideId: string): Promise<IRideEvent[]>;
    searchPlaces(query: string, latitude?: number, longitude?: number): Promise<ILocalPlace[]>;
    getPopularPlaces(district?: string): Promise<ILocalPlace[]>;
    submitRating(rideId: string, data: {
        stars: number;
        feedbackTags?: string[];
        comment?: string;
    }): Promise<IRating>;
    submitReport(data: {
        reportedUserId: string;
        rideId?: string;
        category: string;
        description: string;
    }): Promise<IReport>;
    adminGetStats(): Promise<any>;
    adminGetDrivers(status?: string): Promise<IDriverProfile[]>;
    adminVerifyDriver(driverId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED', verificationNotes?: string): Promise<IDriverProfile>;
    adminGetRides(limit?: number): Promise<IRide[]>;
    adminGetAnalytics(): Promise<any>;
}
//# sourceMappingURL=index.d.ts.map