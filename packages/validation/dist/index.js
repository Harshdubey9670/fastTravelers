"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOperatingAreaSchema = exports.createLocalPlaceSchema = exports.adminVerifyDriverSchema = exports.submitReportSchema = exports.submitRatingSchema = exports.recordPaymentSchema = exports.completeRideSchema = exports.cancelRideSchema = exports.verifyTripOtpSchema = exports.selectOfferSchema = exports.submitOfferSchema = exports.createRideSchema = exports.updateDriverLocationSchema = exports.updateDriverAvailabilitySchema = exports.driverOnboardingSchema = exports.savePlaceSchema = exports.updateProfileSchema = exports.registerDeviceTokenSchema = exports.refreshTokenSchema = exports.verifyOtpSchema = exports.requestOtpSchema = exports.phoneSchema = void 0;
const zod_1 = require("zod");
const utils_1 = require("@gaon-auto/utils");
// ==========================================
// PHONE NUMBER CUSTOM VALIDATOR
// ==========================================
exports.phoneSchema = zod_1.z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .transform((val, ctx) => {
    const norm = (0, utils_1.normalizeIndianPhoneNumber)(val);
    if (!norm.isValid) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: norm.error || 'Invalid Indian phone number',
        });
        return val;
    }
    return norm.canonical;
});
// ==========================================
// AUTHENTICATION SCHEMAS
// ==========================================
exports.requestOtpSchema = zod_1.z.object({
    phone: exports.phoneSchema,
    role: zod_1.z.enum(['PASSENGER', 'DRIVER', 'ADMIN', 'SUPER_ADMIN']).default('PASSENGER'),
});
exports.verifyOtpSchema = zod_1.z.object({
    phone: exports.phoneSchema,
    otp: zod_1.z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
    deviceInfo: zod_1.z.object({
        platform: zod_1.z.enum(['android', 'ios', 'web']).default('android'),
        deviceId: zod_1.z.string().optional(),
        deviceName: zod_1.z.string().optional(),
    }).optional(),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.registerDeviceTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Push token is required'),
    platform: zod_1.z.enum(['android', 'ios', 'web']).default('android'),
    deviceId: zod_1.z.string().optional(),
});
// ==========================================
// USER & PROFILE SCHEMAS
// ==========================================
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(60).optional(),
    profilePhotoUrl: zod_1.z.string().url().optional(),
    preferredLanguage: zod_1.z.enum(['hi', 'en']).optional(),
    homeVillage: zod_1.z.string().max(100).optional(),
    emergencyContacts: zod_1.z
        .array(zod_1.z.object({
        name: zod_1.z.string().min(1, 'Contact name required'),
        phone: exports.phoneSchema,
        relation: zod_1.z.string().min(1, 'Relation required'),
    }))
        .max(5)
        .optional(),
});
exports.savePlaceSchema = zod_1.z.object({
    label: zod_1.z.enum(['Home', 'College', 'Office', 'Mama ka ghar', 'Nani ka ghar', 'Market', 'Custom']),
    customLabel: zod_1.z.string().max(40).optional(),
    addressText: zod_1.z.string().min(3, 'Address is required').max(200),
    landmark: zod_1.z.string().max(100).optional(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
});
// ==========================================
// DRIVER ONBOARDING & STATUS SCHEMAS
// ==========================================
exports.driverOnboardingSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Full name required').max(60),
    licenceNumber: zod_1.z.string().min(5, 'Valid driving licence number required').max(30),
    licenceExpiry: zod_1.z.string().optional(), // ISO date
    upiId: zod_1.z.string().regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, 'Invalid UPI ID format').optional().or(zod_1.z.literal('')),
    vehicle: zod_1.z.object({
        vehicleType: zod_1.z.enum(['AUTO', 'E_RICKSHAW', 'TEMPO', 'TAXI', 'GOODS_VEHICLE', 'SCHOOL_VEHICLE']),
        registrationNumber: zod_1.z.string().min(4, 'Registration number required').max(20).toUpperCase(),
        makeModel: zod_1.z.string().max(50).optional(),
        year: zod_1.z.number().int().min(2000).max(new Date().getFullYear() + 1).optional(),
        seatingCapacity: zod_1.z.number().int().min(1).max(10).default(3),
    }),
    operatingAreaId: zod_1.z.string().optional(),
});
exports.updateDriverAvailabilitySchema = zod_1.z.object({
    isOnline: zod_1.z.boolean(),
});
exports.updateDriverLocationSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    heading: zod_1.z.number().min(0).max(360).optional(),
    speed: zod_1.z.number().min(0).optional(),
    accuracy: zod_1.z.number().min(0).optional(),
});
// ==========================================
// RIDE LIFECYCLE SCHEMAS
// ==========================================
const locationPayloadSchema = zod_1.z.object({
    addressText: zod_1.z.string().min(2, 'Address or landmark is required').max(200),
    landmark: zod_1.z.string().max(100).optional(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
});
const destinationLocationPayloadSchema = zod_1.z.object({
    addressText: zod_1.z.string().min(2, 'Address or landmark is required').max(200),
    landmark: zod_1.z.string().max(100).optional(),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
});
exports.createRideSchema = zod_1.z.object({
    pickup: locationPayloadSchema,
    destination: destinationLocationPayloadSchema,
    passengerCount: zod_1.z.number().int().min(1).max(6).default(1),
    luggageDescription: zod_1.z.string().max(100).optional(),
    passengerNote: zod_1.z.string().max(200).optional(),
    vehiclePreference: zod_1.z.enum(['ANY', 'AUTO', 'E_RICKSHAW']).default('ANY'),
});
exports.submitOfferSchema = zod_1.z.object({
    fare: zod_1.z.number().int().min(10, 'Minimum fare is ₹10').max(5000, 'Maximum fare is ₹5000'),
    etaMinutes: zod_1.z.number().int().min(1, 'ETA must be at least 1 min').max(60, 'ETA must be under 60 mins'),
    message: zod_1.z.string().max(100).optional(),
});
exports.selectOfferSchema = zod_1.z.object({
    offerId: zod_1.z.string().min(1, 'Offer ID is required'),
});
exports.verifyTripOtpSchema = zod_1.z.object({
    otp: zod_1.z.string().length(4, 'Trip OTP must be 4 digits').regex(/^\d+$/, 'OTP must be numeric'),
});
exports.cancelRideSchema = zod_1.z.object({
    reason: zod_1.z.string().min(2, 'Cancellation reason is required').max(100),
    details: zod_1.z.string().max(200).optional(),
});
exports.completeRideSchema = zod_1.z.object({
    finalFare: zod_1.z.number().int().min(10).max(5000).optional(),
});
exports.recordPaymentSchema = zod_1.z.object({
    method: zod_1.z.enum(['CASH', 'UPI_DIRECT']),
    status: zod_1.z.enum(['PENDING', 'PASSENGER_CLAIMS_PAID', 'DRIVER_CONFIRMED_RECEIVED', 'DISPUTED']),
    transactionReference: zod_1.z.string().max(100).optional(),
});
exports.submitRatingSchema = zod_1.z.object({
    stars: zod_1.z.number().int().min(1, 'Minimum rating is 1 star').max(5, 'Maximum rating is 5 stars'),
    feedbackTags: zod_1.z.array(zod_1.z.string()).max(5).default([]),
    comment: zod_1.z.string().max(300).optional(),
});
exports.submitReportSchema = zod_1.z.object({
    reportedUserId: zod_1.z.string().min(1, 'Reported user ID required'),
    rideId: zod_1.z.string().optional(),
    category: zod_1.z.enum([
        'OVERCHARGING',
        'RUDE_BEHAVIOUR',
        'RECKLESS_DRIVING',
        'VEHICLE_CONDITION',
        'PASSENGER_NO_SHOW',
        'DRIVER_NO_SHOW',
        'HARASSMENT',
        'OTHER',
    ]),
    description: zod_1.z.string().min(5, 'Description must be at least 5 characters').max(500),
});
// ==========================================
// ADMIN SCHEMAS
// ==========================================
exports.adminVerifyDriverSchema = zod_1.z.object({
    status: zod_1.z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
    verificationNotes: zod_1.z.string().max(300).optional(),
});
exports.createLocalPlaceSchema = zod_1.z.object({
    nameEn: zod_1.z.string().min(2).max(100),
    nameHi: zod_1.z.string().min(2).max(100),
    placeType: zod_1.z.enum([
        'VILLAGE',
        'MARKET',
        'HOSPITAL',
        'SCHOOL',
        'COLLEGE',
        'TEMPLE',
        'RAILWAY_STATION',
        'BUS_STAND',
        'GOVERNMENT_OFFICE',
        'AUTO_STAND',
        'LANDMARK',
        'OTHER',
    ]),
    district: zod_1.z.string().min(2).max(60),
    tehsil: zod_1.z.string().max(60).optional(),
    state: zod_1.z.string().min(2).max(60).default('Uttar Pradesh'),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    description: zod_1.z.string().max(200).optional(),
    aliases: zod_1.z.array(zod_1.z.string()).default([]),
    popularRank: zod_1.z.number().int().min(0).max(100).default(0),
});
exports.createOperatingAreaSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(60),
    district: zod_1.z.string().min(2).max(60),
    state: zod_1.z.string().min(2).max(60).default('Uttar Pradesh'),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    radiusKm: zod_1.z.number().min(1).max(50).default(10),
    minFare: zod_1.z.number().min(10).default(30),
    baseFarePerKm: zod_1.z.number().min(5).default(12),
});
//# sourceMappingURL=index.js.map