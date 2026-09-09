import { z } from 'zod';
import { normalizeIndianPhoneNumber } from '@gaon-auto/utils';

// ==========================================
// PHONE NUMBER CUSTOM VALIDATOR
// ==========================================

export const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .transform((val, ctx) => {
    const norm = normalizeIndianPhoneNumber(val);
    if (!norm.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: norm.error || 'Invalid Indian phone number',
      });
      return val;
    }
    return norm.canonical;
  });

// ==========================================
// AUTHENTICATION SCHEMAS
// ==========================================

export const requestOtpSchema = z.object({
  phone: phoneSchema,
  role: z.enum(['PASSENGER', 'DRIVER', 'ADMIN', 'SUPER_ADMIN']).default('PASSENGER'),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
  deviceInfo: z.object({
    platform: z.enum(['android', 'ios', 'web']).default('android'),
    deviceId: z.string().optional(),
    deviceName: z.string().optional(),
  }).optional(),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const registerDeviceTokenSchema = z.object({
  token: z.string().min(1, 'Push token is required'),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
  deviceId: z.string().optional(),
});

// ==========================================
// USER & PROFILE SCHEMAS
// ==========================================

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60).optional(),
  profilePhotoUrl: z.string().url().optional(),
  preferredLanguage: z.enum(['hi', 'en']).optional(),
  homeVillage: z.string().max(100).optional(),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string().min(1, 'Contact name required'),
        phone: phoneSchema,
        relation: z.string().min(1, 'Relation required'),
      })
    )
    .max(5)
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const savePlaceSchema = z.object({
  label: z.enum(['Home', 'College', 'Office', 'Mama ka ghar', 'Nani ka ghar', 'Market', 'Custom']),
  customLabel: z.string().max(40).optional(),
  addressText: z.string().min(3, 'Address is required').max(200),
  landmark: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type SavePlaceInput = z.infer<typeof savePlaceSchema>;

// ==========================================
// DRIVER ONBOARDING & STATUS SCHEMAS
// ==========================================

export const driverOnboardingSchema = z.object({
  name: z.string().min(2, 'Full name required').max(60),
  licenceNumber: z.string().min(5, 'Valid driving licence number required').max(30),
  licenceExpiry: z.string().optional(), // ISO date
  upiId: z.string().regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, 'Invalid UPI ID format').optional().or(z.literal('')),
  vehicle: z.object({
    vehicleType: z.enum(['AUTO', 'E_RICKSHAW', 'TEMPO', 'TAXI', 'GOODS_VEHICLE', 'SCHOOL_VEHICLE']),
    registrationNumber: z.string().min(4, 'Registration number required').max(20).toUpperCase(),
    makeModel: z.string().max(50).optional(),
    year: z.number().int().min(2000).max(new Date().getFullYear() + 1).optional(),
    seatingCapacity: z.number().int().min(1).max(10).default(3),
  }),
  operatingAreaId: z.string().optional(),
});

export type DriverOnboardingInput = z.infer<typeof driverOnboardingSchema>;

export const updateDriverAvailabilitySchema = z.object({
  isOnline: z.boolean(),
});

export const updateDriverLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  accuracy: z.number().min(0).optional(),
});

export type UpdateDriverLocationInput = z.infer<typeof updateDriverLocationSchema>;

// ==========================================
// RIDE LIFECYCLE SCHEMAS
// ==========================================

const locationPayloadSchema = z.object({
  addressText: z.string().min(2, 'Address or landmark is required').max(200),
  landmark: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const destinationLocationPayloadSchema = z.object({
  addressText: z.string().min(2, 'Address or landmark is required').max(200),
  landmark: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const createRideSchema = z.object({
  pickup: locationPayloadSchema,
  destination: destinationLocationPayloadSchema,
  passengerCount: z.number().int().min(1).max(6).default(1),
  luggageDescription: z.string().max(100).optional(),
  passengerNote: z.string().max(200).optional(),
  vehiclePreference: z.enum(['ANY', 'AUTO', 'E_RICKSHAW']).default('ANY'),
});

export type CreateRideInput = z.infer<typeof createRideSchema>;

export const submitOfferSchema = z.object({
  fare: z.number().int().min(10, 'Minimum fare is ₹10').max(5000, 'Maximum fare is ₹5000'),
  etaMinutes: z.number().int().min(1, 'ETA must be at least 1 min').max(60, 'ETA must be under 60 mins'),
  message: z.string().max(100).optional(),
});

export type SubmitOfferInput = z.infer<typeof submitOfferSchema>;

export const selectOfferSchema = z.object({
  offerId: z.string().min(1, 'Offer ID is required'),
});

export type SelectOfferInput = z.infer<typeof selectOfferSchema>;

export const verifyTripOtpSchema = z.object({
  otp: z.string().length(4, 'Trip OTP must be 4 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

export type VerifyTripOtpInput = z.infer<typeof verifyTripOtpSchema>;

export const cancelRideSchema = z.object({
  reason: z.string().min(2, 'Cancellation reason is required').max(100),
  details: z.string().max(200).optional(),
});

export type CancelRideInput = z.infer<typeof cancelRideSchema>;

export const completeRideSchema = z.object({
  finalFare: z.number().int().min(10).max(5000).optional(),
});

export const recordPaymentSchema = z.object({
  method: z.enum(['CASH', 'UPI_DIRECT']),
  status: z.enum(['PENDING', 'PASSENGER_CLAIMS_PAID', 'DRIVER_CONFIRMED_RECEIVED', 'DISPUTED']),
  transactionReference: z.string().max(100).optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const submitRatingSchema = z.object({
  stars: z.number().int().min(1, 'Minimum rating is 1 star').max(5, 'Maximum rating is 5 stars'),
  feedbackTags: z.array(z.string()).max(5).default([]),
  comment: z.string().max(300).optional(),
});

export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;

export const submitReportSchema = z.object({
  reportedUserId: z.string().min(1, 'Reported user ID required'),
  rideId: z.string().optional(),
  category: z.enum([
    'OVERCHARGING',
    'RUDE_BEHAVIOUR',
    'RECKLESS_DRIVING',
    'VEHICLE_CONDITION',
    'PASSENGER_NO_SHOW',
    'DRIVER_NO_SHOW',
    'HARASSMENT',
    'OTHER',
  ]),
  description: z.string().min(5, 'Description must be at least 5 characters').max(500),
});

export type SubmitReportInput = z.infer<typeof submitReportSchema>;

// ==========================================
// ADMIN SCHEMAS
// ==========================================

export const adminVerifyDriverSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
  verificationNotes: z.string().max(300).optional(),
});

export const createLocalPlaceSchema = z.object({
  nameEn: z.string().min(2).max(100),
  nameHi: z.string().min(2).max(100),
  placeType: z.enum([
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
  district: z.string().min(2).max(60),
  tehsil: z.string().max(60).optional(),
  state: z.string().min(2).max(60).default('Uttar Pradesh'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  description: z.string().max(200).optional(),
  aliases: z.array(z.string()).default([]),
  popularRank: z.number().int().min(0).max(100).default(0),
});

export const createOperatingAreaSchema = z.object({
  name: z.string().min(2).max(60),
  district: z.string().min(2).max(60),
  state: z.string().min(2).max(60).default('Uttar Pradesh'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(50).default(10),
  minFare: z.number().min(10).default(30),
  baseFarePerKm: z.number().min(5).default(12),
});
