import { z } from 'zod';
export declare const phoneSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const requestOtpSchema: z.ZodObject<{
    phone: z.ZodEffects<z.ZodString, string, string>;
    role: z.ZodDefault<z.ZodEnum<["PASSENGER", "DRIVER", "ADMIN", "SUPER_ADMIN"]>>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    role: "PASSENGER" | "DRIVER" | "ADMIN" | "SUPER_ADMIN";
}, {
    phone: string;
    role?: "PASSENGER" | "DRIVER" | "ADMIN" | "SUPER_ADMIN" | undefined;
}>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export declare const verifyOtpSchema: z.ZodObject<{
    phone: z.ZodEffects<z.ZodString, string, string>;
    otp: z.ZodString;
    deviceInfo: z.ZodOptional<z.ZodObject<{
        platform: z.ZodDefault<z.ZodEnum<["android", "ios", "web"]>>;
        deviceId: z.ZodOptional<z.ZodString>;
        deviceName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        platform: "android" | "ios" | "web";
        deviceId?: string | undefined;
        deviceName?: string | undefined;
    }, {
        platform?: "android" | "ios" | "web" | undefined;
        deviceId?: string | undefined;
        deviceName?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    otp: string;
    deviceInfo?: {
        platform: "android" | "ios" | "web";
        deviceId?: string | undefined;
        deviceName?: string | undefined;
    } | undefined;
}, {
    phone: string;
    otp: string;
    deviceInfo?: {
        platform?: "android" | "ios" | "web" | undefined;
        deviceId?: string | undefined;
        deviceName?: string | undefined;
    } | undefined;
}>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export declare const registerDeviceTokenSchema: z.ZodObject<{
    token: z.ZodString;
    platform: z.ZodDefault<z.ZodEnum<["android", "ios", "web"]>>;
    deviceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    platform: "android" | "ios" | "web";
    token: string;
    deviceId?: string | undefined;
}, {
    token: string;
    platform?: "android" | "ios" | "web" | undefined;
    deviceId?: string | undefined;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    profilePhotoUrl: z.ZodOptional<z.ZodString>;
    preferredLanguage: z.ZodOptional<z.ZodEnum<["hi", "en"]>>;
    homeVillage: z.ZodOptional<z.ZodString>;
    emergencyContacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        phone: z.ZodEffects<z.ZodString, string, string>;
        relation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        phone: string;
        name: string;
        relation: string;
    }, {
        phone: string;
        name: string;
        relation: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    profilePhotoUrl?: string | undefined;
    preferredLanguage?: "hi" | "en" | undefined;
    homeVillage?: string | undefined;
    emergencyContacts?: {
        phone: string;
        name: string;
        relation: string;
    }[] | undefined;
}, {
    name?: string | undefined;
    profilePhotoUrl?: string | undefined;
    preferredLanguage?: "hi" | "en" | undefined;
    homeVillage?: string | undefined;
    emergencyContacts?: {
        phone: string;
        name: string;
        relation: string;
    }[] | undefined;
}>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export declare const savePlaceSchema: z.ZodObject<{
    label: z.ZodEnum<["Home", "College", "Office", "Mama ka ghar", "Nani ka ghar", "Market", "Custom"]>;
    customLabel: z.ZodOptional<z.ZodString>;
    addressText: z.ZodString;
    landmark: z.ZodOptional<z.ZodString>;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    label: "Home" | "College" | "Office" | "Mama ka ghar" | "Nani ka ghar" | "Market" | "Custom";
    addressText: string;
    latitude: number;
    longitude: number;
    customLabel?: string | undefined;
    landmark?: string | undefined;
}, {
    label: "Home" | "College" | "Office" | "Mama ka ghar" | "Nani ka ghar" | "Market" | "Custom";
    addressText: string;
    latitude: number;
    longitude: number;
    customLabel?: string | undefined;
    landmark?: string | undefined;
}>;
export type SavePlaceInput = z.infer<typeof savePlaceSchema>;
export declare const driverOnboardingSchema: z.ZodObject<{
    name: z.ZodString;
    licenceNumber: z.ZodString;
    licenceExpiry: z.ZodOptional<z.ZodString>;
    upiId: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    vehicle: z.ZodObject<{
        vehicleType: z.ZodEnum<["AUTO", "E_RICKSHAW", "TEMPO", "TAXI", "GOODS_VEHICLE", "SCHOOL_VEHICLE"]>;
        registrationNumber: z.ZodString;
        makeModel: z.ZodOptional<z.ZodString>;
        year: z.ZodOptional<z.ZodNumber>;
        seatingCapacity: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        vehicleType: "AUTO" | "E_RICKSHAW" | "TEMPO" | "TAXI" | "GOODS_VEHICLE" | "SCHOOL_VEHICLE";
        registrationNumber: string;
        seatingCapacity: number;
        makeModel?: string | undefined;
        year?: number | undefined;
    }, {
        vehicleType: "AUTO" | "E_RICKSHAW" | "TEMPO" | "TAXI" | "GOODS_VEHICLE" | "SCHOOL_VEHICLE";
        registrationNumber: string;
        makeModel?: string | undefined;
        year?: number | undefined;
        seatingCapacity?: number | undefined;
    }>;
    operatingAreaId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    licenceNumber: string;
    vehicle: {
        vehicleType: "AUTO" | "E_RICKSHAW" | "TEMPO" | "TAXI" | "GOODS_VEHICLE" | "SCHOOL_VEHICLE";
        registrationNumber: string;
        seatingCapacity: number;
        makeModel?: string | undefined;
        year?: number | undefined;
    };
    licenceExpiry?: string | undefined;
    upiId?: string | undefined;
    operatingAreaId?: string | undefined;
}, {
    name: string;
    licenceNumber: string;
    vehicle: {
        vehicleType: "AUTO" | "E_RICKSHAW" | "TEMPO" | "TAXI" | "GOODS_VEHICLE" | "SCHOOL_VEHICLE";
        registrationNumber: string;
        makeModel?: string | undefined;
        year?: number | undefined;
        seatingCapacity?: number | undefined;
    };
    licenceExpiry?: string | undefined;
    upiId?: string | undefined;
    operatingAreaId?: string | undefined;
}>;
export type DriverOnboardingInput = z.infer<typeof driverOnboardingSchema>;
export declare const updateDriverAvailabilitySchema: z.ZodObject<{
    isOnline: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    isOnline: boolean;
}, {
    isOnline: boolean;
}>;
export declare const updateDriverLocationSchema: z.ZodObject<{
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    heading: z.ZodOptional<z.ZodNumber>;
    speed: z.ZodOptional<z.ZodNumber>;
    accuracy: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    latitude: number;
    longitude: number;
    heading?: number | undefined;
    speed?: number | undefined;
    accuracy?: number | undefined;
}, {
    latitude: number;
    longitude: number;
    heading?: number | undefined;
    speed?: number | undefined;
    accuracy?: number | undefined;
}>;
export type UpdateDriverLocationInput = z.infer<typeof updateDriverLocationSchema>;
export declare const createRideSchema: z.ZodObject<{
    pickup: z.ZodObject<{
        addressText: z.ZodString;
        landmark: z.ZodOptional<z.ZodString>;
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        addressText: string;
        latitude: number;
        longitude: number;
        landmark?: string | undefined;
    }, {
        addressText: string;
        latitude: number;
        longitude: number;
        landmark?: string | undefined;
    }>;
    destination: z.ZodObject<{
        addressText: z.ZodString;
        landmark: z.ZodOptional<z.ZodString>;
        latitude: z.ZodOptional<z.ZodNumber>;
        longitude: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        addressText: string;
        landmark?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
    }, {
        addressText: string;
        landmark?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
    }>;
    passengerCount: z.ZodDefault<z.ZodNumber>;
    luggageDescription: z.ZodOptional<z.ZodString>;
    passengerNote: z.ZodOptional<z.ZodString>;
    vehiclePreference: z.ZodDefault<z.ZodEnum<["ANY", "AUTO", "E_RICKSHAW"]>>;
}, "strip", z.ZodTypeAny, {
    pickup: {
        addressText: string;
        latitude: number;
        longitude: number;
        landmark?: string | undefined;
    };
    destination: {
        addressText: string;
        landmark?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
    };
    passengerCount: number;
    vehiclePreference: "AUTO" | "E_RICKSHAW" | "ANY";
    luggageDescription?: string | undefined;
    passengerNote?: string | undefined;
}, {
    pickup: {
        addressText: string;
        latitude: number;
        longitude: number;
        landmark?: string | undefined;
    };
    destination: {
        addressText: string;
        landmark?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
    };
    passengerCount?: number | undefined;
    luggageDescription?: string | undefined;
    passengerNote?: string | undefined;
    vehiclePreference?: "AUTO" | "E_RICKSHAW" | "ANY" | undefined;
}>;
export type CreateRideInput = z.infer<typeof createRideSchema>;
export declare const submitOfferSchema: z.ZodObject<{
    fare: z.ZodNumber;
    etaMinutes: z.ZodNumber;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fare: number;
    etaMinutes: number;
    message?: string | undefined;
}, {
    fare: number;
    etaMinutes: number;
    message?: string | undefined;
}>;
export type SubmitOfferInput = z.infer<typeof submitOfferSchema>;
export declare const selectOfferSchema: z.ZodObject<{
    offerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    offerId: string;
}, {
    offerId: string;
}>;
export type SelectOfferInput = z.infer<typeof selectOfferSchema>;
export declare const verifyTripOtpSchema: z.ZodObject<{
    otp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    otp: string;
}, {
    otp: string;
}>;
export type VerifyTripOtpInput = z.infer<typeof verifyTripOtpSchema>;
export declare const cancelRideSchema: z.ZodObject<{
    reason: z.ZodString;
    details: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    details?: string | undefined;
}, {
    reason: string;
    details?: string | undefined;
}>;
export type CancelRideInput = z.infer<typeof cancelRideSchema>;
export declare const completeRideSchema: z.ZodObject<{
    finalFare: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    finalFare?: number | undefined;
}, {
    finalFare?: number | undefined;
}>;
export declare const recordPaymentSchema: z.ZodObject<{
    method: z.ZodEnum<["CASH", "UPI_DIRECT"]>;
    status: z.ZodEnum<["PENDING", "PASSENGER_CLAIMS_PAID", "DRIVER_CONFIRMED_RECEIVED", "DISPUTED"]>;
    transactionReference: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "PASSENGER_CLAIMS_PAID" | "DRIVER_CONFIRMED_RECEIVED" | "DISPUTED";
    method: "CASH" | "UPI_DIRECT";
    transactionReference?: string | undefined;
}, {
    status: "PENDING" | "PASSENGER_CLAIMS_PAID" | "DRIVER_CONFIRMED_RECEIVED" | "DISPUTED";
    method: "CASH" | "UPI_DIRECT";
    transactionReference?: string | undefined;
}>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export declare const submitRatingSchema: z.ZodObject<{
    stars: z.ZodNumber;
    feedbackTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    comment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    stars: number;
    feedbackTags: string[];
    comment?: string | undefined;
}, {
    stars: number;
    feedbackTags?: string[] | undefined;
    comment?: string | undefined;
}>;
export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;
export declare const submitReportSchema: z.ZodObject<{
    reportedUserId: z.ZodString;
    rideId: z.ZodOptional<z.ZodString>;
    category: z.ZodEnum<["OVERCHARGING", "RUDE_BEHAVIOUR", "RECKLESS_DRIVING", "VEHICLE_CONDITION", "PASSENGER_NO_SHOW", "DRIVER_NO_SHOW", "HARASSMENT", "OTHER"]>;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reportedUserId: string;
    category: "OVERCHARGING" | "RUDE_BEHAVIOUR" | "RECKLESS_DRIVING" | "VEHICLE_CONDITION" | "PASSENGER_NO_SHOW" | "DRIVER_NO_SHOW" | "HARASSMENT" | "OTHER";
    description: string;
    rideId?: string | undefined;
}, {
    reportedUserId: string;
    category: "OVERCHARGING" | "RUDE_BEHAVIOUR" | "RECKLESS_DRIVING" | "VEHICLE_CONDITION" | "PASSENGER_NO_SHOW" | "DRIVER_NO_SHOW" | "HARASSMENT" | "OTHER";
    description: string;
    rideId?: string | undefined;
}>;
export type SubmitReportInput = z.infer<typeof submitReportSchema>;
export declare const adminVerifyDriverSchema: z.ZodObject<{
    status: z.ZodEnum<["APPROVED", "REJECTED", "SUSPENDED"]>;
    verificationNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "APPROVED" | "REJECTED" | "SUSPENDED";
    verificationNotes?: string | undefined;
}, {
    status: "APPROVED" | "REJECTED" | "SUSPENDED";
    verificationNotes?: string | undefined;
}>;
export declare const createLocalPlaceSchema: z.ZodObject<{
    nameEn: z.ZodString;
    nameHi: z.ZodString;
    placeType: z.ZodEnum<["VILLAGE", "MARKET", "HOSPITAL", "SCHOOL", "COLLEGE", "TEMPLE", "RAILWAY_STATION", "BUS_STAND", "GOVERNMENT_OFFICE", "AUTO_STAND", "LANDMARK", "OTHER"]>;
    district: z.ZodString;
    tehsil: z.ZodOptional<z.ZodString>;
    state: z.ZodDefault<z.ZodString>;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
    aliases: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    popularRank: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    latitude: number;
    longitude: number;
    nameEn: string;
    nameHi: string;
    placeType: "OTHER" | "VILLAGE" | "MARKET" | "HOSPITAL" | "SCHOOL" | "COLLEGE" | "TEMPLE" | "RAILWAY_STATION" | "BUS_STAND" | "GOVERNMENT_OFFICE" | "AUTO_STAND" | "LANDMARK";
    district: string;
    state: string;
    aliases: string[];
    popularRank: number;
    description?: string | undefined;
    tehsil?: string | undefined;
}, {
    latitude: number;
    longitude: number;
    nameEn: string;
    nameHi: string;
    placeType: "OTHER" | "VILLAGE" | "MARKET" | "HOSPITAL" | "SCHOOL" | "COLLEGE" | "TEMPLE" | "RAILWAY_STATION" | "BUS_STAND" | "GOVERNMENT_OFFICE" | "AUTO_STAND" | "LANDMARK";
    district: string;
    description?: string | undefined;
    tehsil?: string | undefined;
    state?: string | undefined;
    aliases?: string[] | undefined;
    popularRank?: number | undefined;
}>;
export declare const createOperatingAreaSchema: z.ZodObject<{
    name: z.ZodString;
    district: z.ZodString;
    state: z.ZodDefault<z.ZodString>;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    radiusKm: z.ZodDefault<z.ZodNumber>;
    minFare: z.ZodDefault<z.ZodNumber>;
    baseFarePerKm: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    latitude: number;
    longitude: number;
    district: string;
    state: string;
    radiusKm: number;
    minFare: number;
    baseFarePerKm: number;
}, {
    name: string;
    latitude: number;
    longitude: number;
    district: string;
    state?: string | undefined;
    radiusKm?: number | undefined;
    minFare?: number | undefined;
    baseFarePerKm?: number | undefined;
}>;
//# sourceMappingURL=index.d.ts.map