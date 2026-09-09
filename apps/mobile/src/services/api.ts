import { ApiClient } from '@gaon-auto/api-client';
import { Platform } from 'react-native';

// In local dev on Android Emulator, localhost is 10.0.2.2. On iOS simulator or web it is localhost.
const defaultHost = Platform.OS === 'android' ? 'http://10.0.2.2:5050' : 'http://localhost:5050';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || defaultHost;


let currentAccessToken: string | null = null;
let currentRefreshToken: string | null = null;

export const setAuthTokens = (tokens: { accessToken: string | null; refreshToken: string | null }) => {
  currentAccessToken = tokens.accessToken;
  currentRefreshToken = tokens.refreshToken;
};

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => currentAccessToken,
  getRefreshToken: () => currentRefreshToken,
  onTokensRefreshed: (tokens) => {
    currentAccessToken = tokens.accessToken;
    currentRefreshToken = tokens.refreshToken;
  },
  onAuthExpired: () => {
    currentAccessToken = null;
    currentRefreshToken = null;
  },
});
