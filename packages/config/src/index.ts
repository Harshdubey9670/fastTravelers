import { RideStatus, VehicleType } from '@gaon-auto/types';

// ==========================================
// OPERATIONAL CONSTANTS & TIMEOUTS
// ==========================================

export const SYSTEM_CONFIG = {
  // Authentication & OTP
  OTP_LENGTH: 6,
  OTP_EXPIRY_SECONDS: 300, // 5 minutes
  OTP_RESEND_COOLDOWN_SECONDS: 60, // 1 minute
  OTP_MAX_VERIFY_ATTEMPTS: 3,
  ACCESS_TOKEN_EXPIRY_SECONDS: 900, // 15 minutes
  REFRESH_TOKEN_EXPIRY_DAYS: 30,

  // Trip OTP (4 digits, passenger gives to driver to start trip)
  TRIP_OTP_LENGTH: 4,
  TRIP_OTP_MAX_ATTEMPTS: 5,
  TRIP_OTP_EXPIRY_SECONDS: 1800, // 30 minutes

  // Search & Radius
  INITIAL_SEARCH_RADIUS_KM: 3.0,
  MAX_SEARCH_RADIUS_KM: 10.0,
  RADIUS_EXPANSION_STEP_KM: 2.0,
  MAX_DRIVERS_CONTACTED_PER_RIDE: 10,

  // Ride timeouts
  RIDE_SEARCH_TIMEOUT_SECONDS: 120, // 2 minutes
  DRIVER_INVITATION_TIMEOUT_SECONDS: 45, // 45 seconds for driver to accept/bid
  FARE_OFFER_TIMEOUT_SECONDS: 90, // 90 seconds for passenger to pick an offer

  // Location update intervals & thresholds (Rule 6)
  DRIVER_LOCATION_IDLE_INTERVAL_MS: 15000, // 15 seconds when idle ONLINE
  DRIVER_LOCATION_ACTIVE_INTERVAL_MS: 5000, // 5 seconds when en-route / in-ride
  DRIVER_LOCATION_MIN_DISTANCE_METERS: 10, // Must move at least 10m to emit
  DRIVER_LOCATION_THROTTLE_MS: 3000, // Server-side throttle: minimum 3s between accepted location updates per driver
  DRIVER_LOCATION_STALE_DISPLAY_MS: 30000, // 30 seconds threshold for UI "Driver location updating..." (Rule 9)
  DRIVER_STALE_LOCATION_THRESHOLD_MS: 120000, // 2 minutes without update considered offline/stale in database
  ROUTE_RECALC_MIN_DISTANCE_METERS: 150, // Only recalculate route if driver moves >150m off prior origin (Rule 12)
  ROUTE_CACHE_TTL_MS: 60000, // 60s cache for Google Routes API responses

  // Idempotency
  IDEMPOTENCY_TTL_SECONDS: 86400, // 24 hours
} as const;

// ==========================================
// RIDE STATE MACHINE TRANSITIONS
// ==========================================

export const ALLOWED_RIDE_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  REQUESTED: ['SEARCHING_DRIVER', 'CANCELLED'],
  SEARCHING_DRIVER: ['OFFERS_RECEIVED', 'NO_DRIVER_FOUND', 'CANCELLED', 'EXPIRED'],
  OFFERS_RECEIVED: ['DRIVER_SELECTED', 'NO_DRIVER_FOUND', 'CANCELLED', 'EXPIRED'],
  DRIVER_SELECTED: ['DRIVER_EN_ROUTE', 'CANCELLED'],
  DRIVER_EN_ROUTE: ['DRIVER_ARRIVED', 'CANCELLED'],
  DRIVER_ARRIVED: ['RIDE_READY', 'CANCELLED'],
  RIDE_READY: ['RIDE_STARTED', 'CANCELLED'],
  RIDE_STARTED: ['RIDE_COMPLETED', 'CANCELLED'],
  RIDE_COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
  NO_DRIVER_FOUND: ['SEARCHING_DRIVER'], // Allow retry
};

export function canTransitionRide(current: RideStatus, target: RideStatus): boolean {
  const allowed = ALLOWED_RIDE_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

// ==========================================
// CANCELLATION REASONS
// ==========================================

export const PASSENGER_CANCELLATION_REASONS = [
  { code: 'PLAN_CHANGED', en: 'Plan changed', hi: 'योजना बदल गई' },
  { code: 'DRIVER_TOO_FAR', en: 'Driver is too far', hi: 'ड्राइवर बहुत दूर है' },
  { code: 'BOOKED_ACCIDENTALLY', en: 'Booked accidentally', hi: 'गलती से बुक हो गया' },
  { code: 'DRIVER_ASKED_EXTRA_MONEY', en: 'Driver asked extra money', hi: 'ड्राइवर ने अतिरिक्त पैसे मांगे' },
  { code: 'DRIVER_DELAYED', en: 'Driver is heavily delayed', hi: 'ड्राइवर बहुत देर कर रहा है' },
  { code: 'OTHER', en: 'Other reason', hi: 'अन्य कारण' },
] as const;

export const DRIVER_CANCELLATION_REASONS = [
  { code: 'PASSENGER_UNAVAILABLE', en: 'Passenger unavailable / No show', hi: 'सवारी नहीं मिली' },
  { code: 'VEHICLE_PROBLEM', en: 'Vehicle breakdown / puncture', hi: 'गाड़ी खराब / पंचर' },
  { code: 'EMERGENCY', en: 'Personal emergency', hi: 'आपातकालीन स्थिति' },
  { code: 'WRONG_PICKUP_LOCATION', en: 'Incorrect pickup information', hi: 'पिकअप की गलत जानकारी' },
  { code: 'OTHER', en: 'Other reason', hi: 'अन्य कारण' },
] as const;

// ==========================================
// QUICK CHAT RESPONSES
// ==========================================

export const QUICK_CHAT_MESSAGES = [
  { code: 'WAIT_OUTSIDE', en: "I am waiting outside", hi: 'मैं बाहर खड़ा हूँ' },
  { code: 'WHERE_ARE_YOU', en: 'Where have you reached?', hi: 'आप कहाँ पहुँचे?' },
  { code: 'WAIT_5_MINS', en: 'Please wait for 5 minutes', hi: '5 मिनट रुकिए' },
  { code: 'ON_THE_WAY', en: 'I am on the way', hi: 'रास्ते में हूँ' },
  { code: 'REACHED_LANDMARK', en: 'Reached near landmark', hi: 'लैंडमार्क के पास पहुँच गया' },
] as const;

// ==========================================
// RATING FEEDBACK TAGS
// ==========================================

export const DRIVER_RATING_TAGS = [
  { code: 'ON_TIME', en: 'On time', hi: 'समय पर पहुंचे' },
  { code: 'GOOD_BEHAVIOUR', en: 'Good behaviour', hi: 'अच्छा व्यवहार' },
  { code: 'CLEAN_VEHICLE', en: 'Clean vehicle', hi: 'साफ़ गाड़ी' },
  { code: 'SAFE_DRIVING', en: 'Safe driving', hi: 'सुरक्षित ड्राइविंग' },
  { code: 'ASKED_EXTRA_FARE', en: 'Asked extra fare', hi: 'अतिरिक्त किराया माँगा' },
  { code: 'UNSAFE_BEHAVIOUR', en: 'Unsafe behaviour', hi: 'असुरक्षित व्यवहार' },
] as const;

export const PASSENGER_RATING_TAGS = [
  { code: 'ON_TIME', en: 'Ready on time', hi: 'समय पर तैयार' },
  { code: 'POLITE', en: 'Polite behaviour', hi: 'विनम्र व्यवहार' },
  { code: 'PROMPT_PAYMENT', en: 'Prompt payment', hi: 'तुरंत भुगतान' },
  { code: 'CLEANLINESS', en: 'Kept vehicle clean', hi: 'गाड़ी साफ़ रखी' },
  { code: 'LATE_BOARDING', en: 'Delayed boarding', hi: 'बैठने में देरी की' },
] as const;

// ==========================================
// VEHICLE CONFIGURATION
// ==========================================

export const VEHICLE_CONFIG: Record<VehicleType, { labelEn: string; labelHi: string; capacity: number }> = {
  AUTO: { labelEn: 'Auto Rickshaw', labelHi: 'ऑटो रिक्शा', capacity: 3 },
  E_RICKSHAW: { labelEn: 'e-Rickshaw', labelHi: 'ई-रिक्शा', capacity: 4 },
  TEMPO: { labelEn: 'Tempo', labelHi: 'टेम्पो', capacity: 6 },
  TAXI: { labelEn: 'Taxi / Cab', labelHi: 'टैक्सी', capacity: 4 },
  GOODS_VEHICLE: { labelEn: 'Goods Auto / Loader', labelHi: 'माल ढोने वाला ऑटो', capacity: 1 },
  SCHOOL_VEHICLE: { labelEn: 'School Van / Auto', labelHi: 'स्कूल ऑटो', capacity: 6 },
};
