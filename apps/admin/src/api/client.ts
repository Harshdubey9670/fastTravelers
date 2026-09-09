// Admin API Client for Gaon Auto Control Center

export const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5050/api/v1';

export class AdminApiClient {
  private static tokenKey = 'gaon_admin_token';
  private static userKey = 'gaon_admin_user';

  static getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  static setAuth(token: string, user: any) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  static clearAuth() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  static getCurrentUser(): any {
    const data = localStorage.getItem(this.userKey);
    return data ? JSON.parse(data) : null;
  }

  static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  }

  // Auth
  static async requestOtp(phone: string) {
    return this.request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  static async verifyOtp(phone: string, otp: string) {
    const res = await this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
    if (res.data?.token) {
      this.setAuth(res.data.token, res.data.user);
    }
    return res;
  }

  // Admin Endpoints
  static async getStats() {
    return this.request('/admin/stats');
  }

  static async getDrivers(params?: { verificationStatus?: string; isOnline?: boolean; page?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.verificationStatus) searchParams.append('verificationStatus', params.verificationStatus);
    if (params?.isOnline !== undefined) searchParams.append('isOnline', String(params.isOnline));
    if (params?.page) searchParams.append('page', String(params.page));
    const qs = searchParams.toString();
    return this.request(`/admin/drivers${qs ? `?${qs}` : ''}`);
  }

  static async verifyDriver(driverId: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
    return this.request(`/admin/drivers/${driverId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejectionReason }),
    });
  }

  static async suspendDriver(driverId: string, reason: string) {
    return this.request(`/admin/drivers/${driverId}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  static async getRides(params?: { status?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    const qs = searchParams.toString();
    return this.request(`/admin/rides${qs ? `?${qs}` : ''}`);
  }

  static async getRideTimeline(rideId: string) {
    return this.request(`/admin/rides/${rideId}/timeline`);
  }

  static async getPopularRoutes() {
    return this.request('/admin/popular-routes');
  }

  static async getAuditLogs(page = 1) {
    return this.request(`/admin/audit-logs?page=${page}`);
  }

  // Places
  static async getPlaces(query?: string) {
    return this.request(`/location/places${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  }

  static async createPlace(data: any) {
    return this.request('/location/places', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static getDocumentFileUrl(documentId: string): string {
    return `${API_BASE}/driver/documents/${documentId}/file`;
  }
}
