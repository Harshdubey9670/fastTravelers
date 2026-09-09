import { create } from 'zustand';
import { IUser, IDriverProfile, AuthTokens, UserRole } from '@gaon-auto/types';
import { api, setAuthTokens } from '../services/api';
import { socketService } from '../services/socket';
import { Language } from '../i18n/translations';

interface AuthState {
  user: IUser | null;
  tokens: AuthTokens | null;
  driverProfile: IDriverProfile | null;
  currentRole: 'PASSENGER' | 'DRIVER';
  language: Language;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  devOtpHint: string | null;

  // Actions
  setLanguage: (lang: Language) => void;
  setCurrentRole: (role: 'PASSENGER' | 'DRIVER') => void;
  requestOtp: (phone: string, role?: 'PASSENGER' | 'DRIVER') => Promise<{ cooldownSeconds: number; devOtp?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  loadProfile: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  driverProfile: null,
  currentRole: 'PASSENGER',
  language: 'hi', // Default to Hindi for rural accessibility
  isAuthenticated: false,
  isLoading: false,
  error: null,
  devOtpHint: null,

  setLanguage: (language: Language) => set({ language }),

  setCurrentRole: (role: 'PASSENGER' | 'DRIVER') => set({ currentRole: role }),

  requestOtp: async (phone: string, role = get().currentRole) => {
    set({ isLoading: true, error: null, devOtpHint: null });
    try {
      const res = await api.requestOtp(phone, role);
      if (res.devOtp) {
        set({ devOtpHint: res.devOtp });
      }
      set({ isLoading: false });
      return res;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to send OTP' });
      throw err;
    }
  },

  verifyOtp: async (phone: string, otp: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.verifyOtp(phone, otp, {
        client: 'GaonAutoMobileApp',
      });

      const userRole = res.user.role === 'DRIVER' ? 'DRIVER' : 'PASSENGER';

      setAuthTokens({
        accessToken: res.tokens.accessToken,
        refreshToken: res.tokens.refreshToken,
      });

      socketService.connect(res.tokens.accessToken);

      set({
        user: res.user,
        tokens: res.tokens,
        driverProfile: res.driverProfile || null,
        currentRole: userRole,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'OTP verification failed' });
      return false;
    }
  },

  loadProfile: async () => {
    try {
      const profile = await api.getProfile();
      set({
        user: profile.user,
        driverProfile: profile.driverProfile || get().driverProfile,
      });
    } catch (err: any) {
      console.warn('[AuthStore] Failed to load profile:', err.message);
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('[AuthStore] Logout API error:', err);
    } finally {
      socketService.disconnect();
      setAuthTokens({ accessToken: null, refreshToken: null });
      set({
        user: null,
        tokens: null,
        driverProfile: null,
        isAuthenticated: false,
        devOtpHint: null,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
