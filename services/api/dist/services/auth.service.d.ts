import { AuthResponse, UserRole } from '@gaon-auto/types';
export declare class AuthService {
    /**
     * Requests a login or registration OTP for an Indian mobile number.
     */
    requestOtp(rawPhone: string, role?: UserRole): Promise<{
        cooldownSeconds: number;
        devOtp?: string;
    }>;
    /**
     * Verifies an OTP and issues access/refresh tokens.
     */
    verifyOtp(rawPhone: string, inputOtp: string, deviceInfo?: any, ipAddress?: string, userAgent?: string): Promise<AuthResponse>;
    /**
     * Refreshes access and refresh tokens using a valid refresh token.
     */
    refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Logs out user by revoking refresh session.
     */
    logout(userId: string, refreshToken?: string, removePushToken?: boolean): Promise<void>;
    /**
     * Registers a device push notification token.
     */
    registerDeviceToken(userId: string, token: string, platform: 'android' | 'ios' | 'web', deviceId?: string): Promise<void>;
    private generateTokens;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map