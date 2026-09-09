import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or local dir
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gaon_auto',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_gaon_auto_2026_super_secure_key',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_gaon_auto_2026_super_secure_key',
  
  // SMS Configuration
  SMS_PROVIDER: (process.env.SMS_PROVIDER || 'MOCK').toUpperCase(),
  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY || '',
  MSG91_SENDER_ID: process.env.MSG91_SENDER_ID || '',
  MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID || '',
  FAST2SMS_API_KEY: process.env.FAST2SMS_API_KEY || '',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',

  // Storage
  STORAGE_TYPE: (process.env.STORAGE_TYPE || 'LOCAL').toUpperCase(),
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'data/uploads'),

  // Configurable operational limits
  INITIAL_SEARCH_RADIUS_KM: parseFloat(process.env.INITIAL_SEARCH_RADIUS_KM || '3.0'),
  MAX_SEARCH_RADIUS_KM: parseFloat(process.env.MAX_SEARCH_RADIUS_KM || '10.0'),
  RADIUS_EXPANSION_STEP_KM: parseFloat(process.env.RADIUS_EXPANSION_STEP_KM || '2.0'),
  MAX_DRIVERS_CONTACTED_PER_RIDE: parseInt(process.env.MAX_DRIVERS_CONTACTED_PER_RIDE || '10', 10),
  RIDE_SEARCH_TIMEOUT_SECONDS: parseInt(process.env.RIDE_SEARCH_TIMEOUT_SECONDS || '120', 10),
  FARE_OFFER_TIMEOUT_SECONDS: parseInt(process.env.FARE_OFFER_TIMEOUT_SECONDS || '90', 10),
};

// ==========================================
// PRODUCTION SAFETY AUDIT GUARD
// ==========================================
if (ENV.NODE_ENV === 'production') {
  if (ENV.SMS_PROVIDER === 'MOCK') {
    throw new Error(
      'FATAL CONFIGURATION ERROR: Mock SMS provider cannot be used in production environment. Configure a certified SMS provider (MSG91, FAST2SMS, TWILIO).'
    );
  }
  if (
    ENV.JWT_ACCESS_SECRET === 'dev_jwt_access_secret_gaon_auto_2026_super_secure_key' ||
    ENV.JWT_REFRESH_SECRET === 'dev_jwt_refresh_secret_gaon_auto_2026_super_secure_key'
  ) {
    throw new Error(
      'FATAL SECURITY ERROR: Default development JWT secrets detected in production. Set strong production JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.'
    );
  }
}
