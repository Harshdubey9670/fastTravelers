import { RideStatus, VehicleType } from '@gaon-auto/types';
export declare const SYSTEM_CONFIG: {
    readonly OTP_LENGTH: 6;
    readonly OTP_EXPIRY_SECONDS: 300;
    readonly OTP_RESEND_COOLDOWN_SECONDS: 60;
    readonly OTP_MAX_VERIFY_ATTEMPTS: 3;
    readonly ACCESS_TOKEN_EXPIRY_SECONDS: 900;
    readonly REFRESH_TOKEN_EXPIRY_DAYS: 30;
    readonly TRIP_OTP_LENGTH: 4;
    readonly TRIP_OTP_MAX_ATTEMPTS: 5;
    readonly TRIP_OTP_EXPIRY_SECONDS: 1800;
    readonly INITIAL_SEARCH_RADIUS_KM: 3;
    readonly MAX_SEARCH_RADIUS_KM: 10;
    readonly RADIUS_EXPANSION_STEP_KM: 2;
    readonly MAX_DRIVERS_CONTACTED_PER_RIDE: 10;
    readonly RIDE_SEARCH_TIMEOUT_SECONDS: 120;
    readonly DRIVER_INVITATION_TIMEOUT_SECONDS: 45;
    readonly FARE_OFFER_TIMEOUT_SECONDS: 90;
    readonly DRIVER_LOCATION_IDLE_INTERVAL_MS: 15000;
    readonly DRIVER_LOCATION_ACTIVE_INTERVAL_MS: 5000;
    readonly DRIVER_LOCATION_MIN_DISTANCE_METERS: 10;
    readonly DRIVER_STALE_LOCATION_THRESHOLD_MS: 120000;
    readonly IDEMPOTENCY_TTL_SECONDS: 86400;
};
export declare const ALLOWED_RIDE_TRANSITIONS: Record<RideStatus, RideStatus[]>;
export declare function canTransitionRide(current: RideStatus, target: RideStatus): boolean;
export declare const PASSENGER_CANCELLATION_REASONS: readonly [{
    readonly code: "PLAN_CHANGED";
    readonly en: "Plan changed";
    readonly hi: "योजना बदल गई";
}, {
    readonly code: "DRIVER_TOO_FAR";
    readonly en: "Driver is too far";
    readonly hi: "ड्राइवर बहुत दूर है";
}, {
    readonly code: "BOOKED_ACCIDENTALLY";
    readonly en: "Booked accidentally";
    readonly hi: "गलती से बुक हो गया";
}, {
    readonly code: "DRIVER_ASKED_EXTRA_MONEY";
    readonly en: "Driver asked extra money";
    readonly hi: "ड्राइवर ने अतिरिक्त पैसे मांगे";
}, {
    readonly code: "DRIVER_DELAYED";
    readonly en: "Driver is heavily delayed";
    readonly hi: "ड्राइवर बहुत देर कर रहा है";
}, {
    readonly code: "OTHER";
    readonly en: "Other reason";
    readonly hi: "अन्य कारण";
}];
export declare const DRIVER_CANCELLATION_REASONS: readonly [{
    readonly code: "PASSENGER_UNAVAILABLE";
    readonly en: "Passenger unavailable / No show";
    readonly hi: "सवारी नहीं मिली";
}, {
    readonly code: "VEHICLE_PROBLEM";
    readonly en: "Vehicle breakdown / puncture";
    readonly hi: "गाड़ी खराब / पंचर";
}, {
    readonly code: "EMERGENCY";
    readonly en: "Personal emergency";
    readonly hi: "आपातकालीन स्थिति";
}, {
    readonly code: "WRONG_PICKUP_LOCATION";
    readonly en: "Incorrect pickup information";
    readonly hi: "पिकअप की गलत जानकारी";
}, {
    readonly code: "OTHER";
    readonly en: "Other reason";
    readonly hi: "अन्य कारण";
}];
export declare const QUICK_CHAT_MESSAGES: readonly [{
    readonly code: "WAIT_OUTSIDE";
    readonly en: "I am waiting outside";
    readonly hi: "मैं बाहर खड़ा हूँ";
}, {
    readonly code: "WHERE_ARE_YOU";
    readonly en: "Where have you reached?";
    readonly hi: "आप कहाँ पहुँचे?";
}, {
    readonly code: "WAIT_5_MINS";
    readonly en: "Please wait for 5 minutes";
    readonly hi: "5 मिनट रुकिए";
}, {
    readonly code: "ON_THE_WAY";
    readonly en: "I am on the way";
    readonly hi: "रास्ते में हूँ";
}, {
    readonly code: "REACHED_LANDMARK";
    readonly en: "Reached near landmark";
    readonly hi: "लैंडमार्क के पास पहुँच गया";
}];
export declare const DRIVER_RATING_TAGS: readonly [{
    readonly code: "ON_TIME";
    readonly en: "On time";
    readonly hi: "समय पर पहुंचे";
}, {
    readonly code: "GOOD_BEHAVIOUR";
    readonly en: "Good behaviour";
    readonly hi: "अच्छा व्यवहार";
}, {
    readonly code: "CLEAN_VEHICLE";
    readonly en: "Clean vehicle";
    readonly hi: "साफ़ गाड़ी";
}, {
    readonly code: "SAFE_DRIVING";
    readonly en: "Safe driving";
    readonly hi: "सुरक्षित ड्राइविंग";
}, {
    readonly code: "ASKED_EXTRA_FARE";
    readonly en: "Asked extra fare";
    readonly hi: "अतिरिक्त किराया माँगा";
}, {
    readonly code: "UNSAFE_BEHAVIOUR";
    readonly en: "Unsafe behaviour";
    readonly hi: "असुरक्षित व्यवहार";
}];
export declare const PASSENGER_RATING_TAGS: readonly [{
    readonly code: "ON_TIME";
    readonly en: "Ready on time";
    readonly hi: "समय पर तैयार";
}, {
    readonly code: "POLITE";
    readonly en: "Polite behaviour";
    readonly hi: "विनम्र व्यवहार";
}, {
    readonly code: "PROMPT_PAYMENT";
    readonly en: "Prompt payment";
    readonly hi: "तुरंत भुगतान";
}, {
    readonly code: "CLEANLINESS";
    readonly en: "Kept vehicle clean";
    readonly hi: "गाड़ी साफ़ रखी";
}, {
    readonly code: "LATE_BOARDING";
    readonly en: "Delayed boarding";
    readonly hi: "बैठने में देरी की";
}];
export declare const VEHICLE_CONFIG: Record<VehicleType, {
    labelEn: string;
    labelHi: string;
    capacity: number;
}>;
//# sourceMappingURL=index.d.ts.map