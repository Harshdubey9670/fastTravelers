"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = exports.ApiError = void 0;
const utils_1 = require("@gaon-auto/utils");
class ApiError extends Error {
    code;
    status;
    details;
    constructor(code, message, status, details) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
class ApiClient {
    baseUrl;
    getAccessToken;
    getRefreshToken;
    onTokensRefreshed;
    onAuthExpired;
    isRefreshing = false;
    refreshSubscribers = [];
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.getAccessToken = config.getAccessToken;
        this.getRefreshToken = config.getRefreshToken;
        this.onTokensRefreshed = config.onTokensRefreshed;
        this.onAuthExpired = config.onAuthExpired;
    }
    async request(endpoint, options = {}) {
        const { idempotencyKey, retryOn401 = true, ...fetchOptions } = options;
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(fetchOptions.headers || {}),
        };
        const token = await this.getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        if (idempotencyKey) {
            headers['Idempotency-Key'] = idempotencyKey;
        }
        let response;
        try {
            response = await fetch(url, {
                ...fetchOptions,
                headers,
            });
        }
        catch (err) {
            throw new ApiError('NETWORK_ERROR', err.message || 'Unable to reach server. Please check internet connection.', 0);
        }
        // Handle 401 Unauthorized with automatic token refresh
        if (response.status === 401 && retryOn401) {
            const refreshedToken = await this.handleTokenRefresh();
            if (refreshedToken) {
                return this.request(endpoint, {
                    ...options,
                    retryOn401: false,
                });
            }
        }
        const json = (await response.json().catch(() => ({
            success: false,
            error: { code: 'INVALID_JSON', message: `Server returned non-JSON response (${response.status})` },
        })));
        if (!response.ok || !json.success) {
            const errCode = json.error?.code || `HTTP_${response.status}`;
            const errMsg = json.error?.message || response.statusText || 'An unexpected error occurred';
            throw new ApiError(errCode, errMsg, response.status, json.error?.details);
        }
        return json.data;
    }
    async handleTokenRefresh() {
        if (this.isRefreshing) {
            return new Promise((resolve) => {
                this.refreshSubscribers.push(resolve);
            });
        }
        this.isRefreshing = true;
        try {
            const refreshToken = await this.getRefreshToken();
            if (!refreshToken) {
                this.onAuthExpired?.();
                return null;
            }
            const res = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });
            if (!res.ok) {
                this.onAuthExpired?.();
                return null;
            }
            const json = (await res.json());
            if (json.success && json.data?.tokens?.accessToken) {
                this.onTokensRefreshed?.({
                    accessToken: json.data.tokens.accessToken,
                    refreshToken: json.data.tokens.refreshToken,
                });
                const newToken = json.data.tokens.accessToken;
                this.refreshSubscribers.forEach((cb) => cb(newToken));
                this.refreshSubscribers = [];
                return newToken;
            }
            else {
                this.onAuthExpired?.();
                return null;
            }
        }
        catch {
            this.onAuthExpired?.();
            return null;
        }
        finally {
            this.isRefreshing = false;
        }
    }
    // ==========================================
    // AUTH ENDPOINTS
    // ==========================================
    async requestOtp(phone, role = 'PASSENGER') {
        return this.request('/api/v1/auth/request-otp', {
            method: 'POST',
            body: JSON.stringify({ phone, role }),
            retryOn401: false,
        });
    }
    async verifyOtp(phone, otp, deviceInfo) {
        return this.request('/api/v1/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ phone, otp, deviceInfo }),
            retryOn401: false,
        });
    }
    async logout() {
        const refreshToken = await this.getRefreshToken();
        return this.request('/api/v1/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        });
    }
    async registerDeviceToken(token, platform = 'android', deviceId) {
        return this.request('/api/v1/users/device-token', {
            method: 'POST',
            body: JSON.stringify({ token, platform, deviceId }),
        });
    }
    // ==========================================
    // USER & PROFILE
    // ==========================================
    async getProfile() {
        return this.request('/api/v1/users/profile');
    }
    async updateProfile(data) {
        return this.request('/api/v1/users/profile', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
    async getSavedPlaces() {
        return this.request('/api/v1/users/saved-places');
    }
    async addSavedPlace(data) {
        return this.request('/api/v1/users/saved-places', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async deleteSavedPlace(placeId) {
        return this.request(`/api/v1/users/saved-places/${placeId}`, {
            method: 'DELETE',
        });
    }
    // ==========================================
    // DRIVER ENDPOINTS
    // ==========================================
    async registerDriver(data) {
        return this.request('/api/v1/drivers/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async getDriverProfile() {
        return this.request('/api/v1/drivers/me');
    }
    async updateAvailability(isOnline) {
        return this.request('/api/v1/drivers/availability', {
            method: 'PATCH',
            body: JSON.stringify({ isOnline }),
        });
    }
    async updateLocation(data) {
        return this.request('/api/v1/drivers/location', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    // ==========================================
    // RIDE ENDPOINTS (WITH IDEMPOTENCY)
    // ==========================================
    async createRide(data, idempotencyKey = (0, utils_1.generateRandomToken)(16)) {
        return this.request('/api/v1/rides', {
            method: 'POST',
            body: JSON.stringify(data),
            idempotencyKey,
        });
    }
    async getActiveRide() {
        return this.request('/api/v1/rides/active');
    }
    async getRide(rideId) {
        return this.request(`/api/v1/rides/${rideId}`);
    }
    async submitOffer(rideId, data, idempotencyKey = (0, utils_1.generateRandomToken)(16)) {
        return this.request(`/api/v1/rides/${rideId}/offers`, {
            method: 'POST',
            body: JSON.stringify(data),
            idempotencyKey,
        });
    }
    async getOffers(rideId) {
        return this.request(`/api/v1/rides/${rideId}/offers`);
    }
    async selectOffer(rideId, offerId, idempotencyKey = (0, utils_1.generateRandomToken)(16)) {
        return this.request(`/api/v1/rides/${rideId}/select-offer`, {
            method: 'POST',
            body: JSON.stringify({ offerId }),
            idempotencyKey,
        });
    }
    async markDriverArrived(rideId, idempotencyKey = (0, utils_1.generateRandomToken)(16)) {
        return this.request(`/api/v1/rides/${rideId}/arrive`, {
            method: 'POST',
            idempotencyKey,
        });
    }
    async startRide(rideId, otp, idempotencyKey = (0, utils_1.generateRandomToken)(16)) {
        return this.request(`/api/v1/rides/${rideId}/start`, {
            method: 'POST',
            body: JSON.stringify({ otp }),
            idempotencyKey,
        });
    }
    async completeRide(rideId, finalFare, idempotencyKey = (0, utils_1.generateRandomToken)(16)) {
        return this.request(`/api/v1/rides/${rideId}/complete`, {
            method: 'POST',
            body: JSON.stringify({ finalFare }),
            idempotencyKey,
        });
    }
    async recordPayment(rideId, data, idempotencyKey = (0, utils_1.generateRandomToken)(16)) {
        return this.request(`/api/v1/rides/${rideId}/payment`, {
            method: 'POST',
            body: JSON.stringify(data),
            idempotencyKey,
        });
    }
    async cancelRide(rideId, reason, details, idempotencyKey = (0, utils_1.generateRandomToken)(16)) {
        return this.request(`/api/v1/rides/${rideId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason, details }),
            idempotencyKey,
        });
    }
    async getRideHistory(role = 'passenger', statusGroup = 'all') {
        return this.request(`/api/v1/rides/history?role=${role}&statusGroup=${statusGroup}`);
    }
    async getRideEvents(rideId) {
        return this.request(`/api/v1/rides/${rideId}/events`);
    }
    // ==========================================
    // LOCATIONS & LANDMARKS
    // ==========================================
    async searchPlaces(query, latitude, longitude) {
        const params = new URLSearchParams({ q: query });
        if (latitude && longitude) {
            params.append('lat', latitude.toString());
            params.append('lng', longitude.toString());
        }
        return this.request(`/api/v1/locations/search?${params.toString()}`);
    }
    async getPopularPlaces(district) {
        const params = district ? `?district=${encodeURIComponent(district)}` : '';
        return this.request(`/api/v1/locations/popular${params}`);
    }
    // ==========================================
    // RATINGS & REPORTS
    // ==========================================
    async submitRating(rideId, data) {
        return this.request(`/api/v1/rides/${rideId}/rating`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async submitReport(data) {
        return this.request('/api/v1/reports', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    // ==========================================
    // ADMIN ENDPOINTS
    // ==========================================
    async adminGetStats() {
        return this.request('/api/v1/admin/stats');
    }
    async adminGetDrivers(status) {
        const params = status ? `?status=${status}` : '';
        return this.request(`/api/v1/admin/drivers${params}`);
    }
    async adminVerifyDriver(driverId, status, verificationNotes) {
        return this.request(`/api/v1/admin/drivers/${driverId}/verify`, {
            method: 'PATCH',
            body: JSON.stringify({ status, verificationNotes }),
        });
    }
    async adminGetRides(limit = 50) {
        return this.request(`/api/v1/admin/rides?limit=${limit}`);
    }
    async adminGetAnalytics() {
        return this.request('/api/v1/admin/analytics');
    }
}
exports.ApiClient = ApiClient;
//# sourceMappingURL=index.js.map