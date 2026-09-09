import {
  ApiResponse,
  AuthResponse,
  IUser,
  IDriverProfile,
  IRide,
  IRideOffer,
  IRideMessage,
  ISavedPlace,
  ILocalPlace,
  IOperatingArea,
  IRating,
  IReport,
  IRideEvent,
} from '@gaon-auto/types';
import { generateRandomToken } from '@gaon-auto/utils';

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken: () => Promise<string | null> | string | null;
  getRefreshToken: () => Promise<string | null> | string | null;
  onTokensRefreshed?: (tokens: { accessToken: string; refreshToken: string }) => void;
  onAuthExpired?: () => void;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl: string;
  private getAccessToken: () => Promise<string | null> | string | null;
  private getRefreshToken: () => Promise<string | null> | string | null;
  private onTokensRefreshed?: (tokens: { accessToken: string; refreshToken: string }) => void;
  private onAuthExpired?: () => void;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getAccessToken = config.getAccessToken;
    this.getRefreshToken = config.getRefreshToken;
    this.onTokensRefreshed = config.onTokensRefreshed;
    this.onAuthExpired = config.onAuthExpired;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { idempotencyKey?: string; retryOn401?: boolean } = {}
  ): Promise<T> {
    const { idempotencyKey, retryOn401 = true, ...fetchOptions } = options;
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(fetchOptions.headers as Record<string, string> || {}),
    };

    const token = await this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });
    } catch (err: any) {
      throw new ApiError('NETWORK_ERROR', err.message || 'Unable to reach server. Please check internet connection.', 0);
    }

    // Handle 401 Unauthorized with automatic token refresh
    if (response.status === 401 && retryOn401) {
      const refreshedToken = await this.handleTokenRefresh();
      if (refreshedToken) {
        return this.request<T>(endpoint, {
          ...options,
          retryOn401: false,
        });
      }
    }

    const json = (await response.json().catch(() => ({
      success: false,
      error: { code: 'INVALID_JSON', message: `Server returned non-JSON response (${response.status})` },
    }))) as ApiResponse<T>;

    if (!response.ok || !json.success) {
      const errCode = json.error?.code || `HTTP_${response.status}`;
      const errMsg = json.error?.message || response.statusText || 'An unexpected error occurred';
      throw new ApiError(errCode, errMsg, response.status, json.error?.details);
    }

    return json.data as T;
  }

  private async handleTokenRefresh(): Promise<string | null> {
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

      const json = (await res.json()) as ApiResponse<AuthResponse>;
      if (json.success && json.data?.tokens?.accessToken) {
        this.onTokensRefreshed?.({
          accessToken: json.data.tokens.accessToken,
          refreshToken: json.data.tokens.refreshToken,
        });
        const newToken = json.data.tokens.accessToken;
        this.refreshSubscribers.forEach((cb) => cb(newToken));
        this.refreshSubscribers = [];
        return newToken;
      } else {
        this.onAuthExpired?.();
        return null;
      }
    } catch {
      this.onAuthExpired?.();
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  // ==========================================
  // AUTH ENDPOINTS
  // ==========================================

  async requestOtp(phone: string, role: 'PASSENGER' | 'DRIVER' = 'PASSENGER') {
    return this.request<{ cooldownSeconds: number; devOtp?: string }>('/api/v1/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, role }),
      retryOn401: false,
    });
  }

  async verifyOtp(phone: string, otp: string, deviceInfo?: any) {
    return this.request<AuthResponse>('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, deviceInfo }),
      retryOn401: false,
    });
  }

  async logout() {
    const refreshToken = await this.getRefreshToken();
    return this.request<{ message: string }>('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async registerDeviceToken(token: string, platform: 'android' | 'ios' | 'web' = 'android', deviceId?: string) {
    return this.request<{ registered: boolean }>('/api/v1/users/device-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform, deviceId }),
    });
  }

  // ==========================================
  // USER & PROFILE
  // ==========================================

  async getProfile() {
    return this.request<{ user: IUser; driverProfile?: IDriverProfile }>('/api/v1/users/profile');
  }

  async updateProfile(data: Partial<IUser>) {
    return this.request<IUser>('/api/v1/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getSavedPlaces() {
    return this.request<ISavedPlace[]>('/api/v1/users/saved-places');
  }

  async addSavedPlace(data: Omit<ISavedPlace, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return this.request<ISavedPlace>('/api/v1/users/saved-places', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSavedPlace(placeId: string) {
    return this.request<{ deleted: boolean }>(`/api/v1/users/saved-places/${placeId}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // DRIVER ENDPOINTS
  // ==========================================

  async registerDriver(data: any) {
    return this.request<IDriverProfile>('/api/v1/drivers/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDriverProfile() {
    return this.request<IDriverProfile>('/api/v1/drivers/me');
  }

  async updateAvailability(isOnline: boolean) {
    return this.request<{ isOnline: boolean; availabilityStatus: string }>('/api/v1/drivers/availability', {
      method: 'PATCH',
      body: JSON.stringify({ isOnline }),
    });
  }

  async updateLocation(data: { latitude: number; longitude: number; heading?: number; speed?: number; accuracy?: number }) {
    return this.request<{ updated: boolean }>('/api/v1/drivers/location', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // RIDE ENDPOINTS (WITH IDEMPOTENCY)
  // ==========================================

  async createRide(data: any, idempotencyKey = generateRandomToken(16)) {
    return this.request<IRide>('/api/v1/rides', {
      method: 'POST',
      body: JSON.stringify(data),
      idempotencyKey,
    });
  }

  async getActiveRide() {
    return this.request<{ ride: IRide | null; offers: IRideOffer[]; chatMessages: IRideMessage[] }>('/api/v1/rides/active');
  }

  async getRide(rideId: string) {
    return this.request<IRide>(`/api/v1/rides/${rideId}`);
  }

  async submitOffer(rideId: string, data: { fare: number; etaMinutes: number; message?: string }, idempotencyKey = generateRandomToken(16)) {
    return this.request<IRideOffer>(`/api/v1/rides/${rideId}/offers`, {
      method: 'POST',
      body: JSON.stringify(data),
      idempotencyKey,
    });
  }

  async getOffers(rideId: string) {
    return this.request<IRideOffer[]>(`/api/v1/rides/${rideId}/offers`);
  }

  async selectOffer(rideId: string, offerId: string, idempotencyKey = generateRandomToken(16)) {
    return this.request<IRide>(`/api/v1/rides/${rideId}/select-offer`, {
      method: 'POST',
      body: JSON.stringify({ offerId }),
      idempotencyKey,
    });
  }

  async markDriverArrived(rideId: string, idempotencyKey = generateRandomToken(16)) {
    return this.request<IRide>(`/api/v1/rides/${rideId}/arrive`, {
      method: 'POST',
      idempotencyKey,
    });
  }

  async startRide(rideId: string, otp: string, idempotencyKey = generateRandomToken(16)) {
    return this.request<IRide>(`/api/v1/rides/${rideId}/start`, {
      method: 'POST',
      body: JSON.stringify({ otp }),
      idempotencyKey,
    });
  }

  async completeRide(rideId: string, finalFare?: number, idempotencyKey = generateRandomToken(16)) {
    return this.request<IRide>(`/api/v1/rides/${rideId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ finalFare }),
      idempotencyKey,
    });
  }

  async recordPayment(rideId: string, data: { method: 'CASH' | 'UPI_DIRECT'; status: string; transactionReference?: string }, idempotencyKey = generateRandomToken(16)) {
    return this.request<IRide>(`/api/v1/rides/${rideId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
      idempotencyKey,
    });
  }

  async cancelRide(rideId: string, reason: string, details?: string, idempotencyKey = generateRandomToken(16)) {
    return this.request<IRide>(`/api/v1/rides/${rideId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
      idempotencyKey,
    });
  }

  async getRideHistory(role: 'passenger' | 'driver' = 'passenger', statusGroup: 'active' | 'completed' | 'cancelled' | 'all' = 'all') {
    return this.request<IRide[]>(`/api/v1/rides/history?role=${role}&statusGroup=${statusGroup}`);
  }

  async getRideEvents(rideId: string) {
    return this.request<IRideEvent[]>(`/api/v1/rides/${rideId}/events`);
  }

  // ==========================================
  // LOCATIONS & LANDMARKS
  // ==========================================

  async searchPlaces(query: string, latitude?: number, longitude?: number) {
    const params = new URLSearchParams({ q: query });
    if (latitude && longitude) {
      params.append('lat', latitude.toString());
      params.append('lng', longitude.toString());
    }
    return this.request<ILocalPlace[]>(`/api/v1/locations/search?${params.toString()}`);
  }

  async getPopularPlaces(district?: string) {
    const params = district ? `?district=${encodeURIComponent(district)}` : '';
    return this.request<ILocalPlace[]>(`/api/v1/locations/popular${params}`);
  }

  // ==========================================
  // RATINGS & REPORTS
  // ==========================================

  async submitRating(rideId: string, data: { stars: number; feedbackTags?: string[]; comment?: string }) {
    return this.request<IRating>(`/api/v1/rides/${rideId}/rating`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitReport(data: { reportedUserId: string; rideId?: string; category: string; description: string }) {
    return this.request<IReport>('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // ADMIN ENDPOINTS
  // ==========================================

  async adminGetStats() {
    return this.request<any>('/api/v1/admin/stats');
  }

  async adminGetDrivers(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<IDriverProfile[]>(`/api/v1/admin/drivers${params}`);
  }

  async adminVerifyDriver(driverId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED', verificationNotes?: string) {
    return this.request<IDriverProfile>(`/api/v1/admin/drivers/${driverId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status, verificationNotes }),
    });
  }

  async adminGetRides(limit = 50) {
    return this.request<IRide[]>(`/api/v1/admin/rides?limit=${limit}`);
  }

  async adminGetAnalytics() {
    return this.request<any>('/api/v1/admin/analytics');
  }
}
