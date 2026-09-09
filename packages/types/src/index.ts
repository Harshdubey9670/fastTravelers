// ==========================================
// USER & AUTH TYPES
// ==========================================

export type UserRole = 'PASSENGER' | 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';

export type PreferredLanguage = 'hi' | 'en';

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface IUser {
  id: string;
  phone: string; // E.164 format: +91XXXXXXXXXX
  role: UserRole;
  name?: string;
  profilePhotoUrl?: string;
  preferredLanguage: PreferredLanguage;
  homeVillage?: string;
  emergencyContacts: EmergencyContact[];
  ratingAverage: number;
  ratingCount: number;
  status: UserStatus;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
}

export interface AuthResponse {
  user: IUser;
  tokens: AuthTokens;
  driverProfile?: IDriverProfile;
}

// ==========================================
// DRIVER & VEHICLE TYPES
// ==========================================

export type DriverVerificationStatus = 
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export type DriverAvailabilityStatus = 
  | 'OFFLINE'
  | 'AVAILABLE'
  | 'BUSY'
  | 'SUSPENDED';

export type VehicleType = 
  | 'AUTO'
  | 'E_RICKSHAW'
  | 'TEMPO'
  | 'TAXI'
  | 'GOODS_VEHICLE'
  | 'SCHOOL_VEHICLE';

export interface IVehicle {
  id: string;
  driverId: string;
  vehicleType: VehicleType;
  registrationNumber: string;
  makeModel?: string;
  year?: number;
  vehiclePhotoUrl?: string;
  seatingCapacity: number;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentType = 
  | 'AADHAAR_FRONT'
  | 'AADHAAR_BACK'
  | 'DRIVING_LICENCE'
  | 'VEHICLE_RC'
  | 'VEHICLE_INSURANCE'
  | 'VEHICLE_PHOTO';

export interface IDriverDocument {
  id: string;
  driverId: string;
  documentType: DocumentType;
  fileKey: string; // Secure storage path / object key (NEVER public URL)
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDriverProfile {
  id: string;
  userId: string;
  verificationStatus: DriverVerificationStatus;
  verificationNotes?: string;
  approvedAt?: Date;
  approvedBy?: string;
  licenceNumber: string;
  licenceExpiry?: Date;
  upiId?: string;
  upiQrUrl?: string;
  operatingAreaId?: string;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  ratingAverage: number;
  ratingCount: number;
  isOnline: boolean;
  availabilityStatus: DriverAvailabilityStatus;
  lastLocationUpdateAt?: Date;
  vehicle?: IVehicle;
  user?: IUser;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// LOCATION & LANDMARK TYPES
// ==========================================

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface LocationPayload {
  addressText: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
}

export type PlaceType = 
  | 'VILLAGE'
  | 'MARKET'
  | 'HOSPITAL'
  | 'SCHOOL'
  | 'COLLEGE'
  | 'TEMPLE'
  | 'RAILWAY_STATION'
  | 'BUS_STAND'
  | 'GOVERNMENT_OFFICE'
  | 'AUTO_STAND'
  | 'LANDMARK'
  | 'OTHER';

export interface ILocalPlace {
  id: string;
  nameEn: string;
  nameHi: string;
  placeType: PlaceType;
  district: string;
  tehsil?: string;
  state: string;
  location: GeoPoint;
  description?: string;
  aliases: string[];
  isVerified: boolean;
  popularRank: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISavedPlace {
  id: string;
  userId: string;
  label: 'Home' | 'College' | 'Office' | 'Mama ka ghar' | 'Nani ka ghar' | 'Market' | 'Custom';
  customLabel?: string;
  addressText: string;
  landmark?: string;
  location: GeoPoint;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOperatingArea {
  id: string;
  name: string;
  district: string;
  state: string;
  centerPoint: GeoPoint;
  radiusKm: number;
  isActive: boolean;
  minFare: number;
  baseFarePerKm: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// RIDE STATE MACHINE & OFFERS
// ==========================================

export type RideStatus = 
  | 'REQUESTED'
  | 'SEARCHING_DRIVER'
  | 'OFFERS_RECEIVED'
  | 'DRIVER_SELECTED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_ARRIVED'
  | 'RIDE_READY'
  | 'RIDE_STARTED'
  | 'RIDE_COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'NO_DRIVER_FOUND';

export type RideOfferStatus = 
  | 'PENDING'
  | 'SELECTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'WITHDRAWN';

export type PaymentMethod = 'CASH' | 'UPI_DIRECT';

export type PaymentStatus = 
  | 'PENDING'
  | 'PASSENGER_CLAIMS_PAID'
  | 'DRIVER_CONFIRMED_RECEIVED'
  | 'GATEWAY_VERIFIED'
  | 'DISPUTED'
  | 'NOT_APPLICABLE';

export type RideCancellationActor = 'PASSENGER' | 'DRIVER' | 'SYSTEM' | 'ADMIN';

export interface IRideOffer {
  id: string;
  rideId: string;
  driverId: string;
  driver?: IDriverProfile;
  fare: number;
  etaMinutes: number;
  message?: string;
  status: RideOfferStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface IRideLocation {
  addressText: string;
  landmark?: string;
  location?: GeoPoint;
}

export interface IRouteMetrics {
  distanceMeters?: number;
  durationSeconds?: number;
  distanceStatus: 'CALCULATED' | 'UNKNOWN';
}

export interface IRide {
  id: string;
  rideNumber: string; // e.g. GA-20260907-XXXX
  passengerId: string;
  passenger?: IUser;
  driverId?: string;
  driver?: IDriverProfile;
  selectedOfferId?: string;
  selectedOffer?: IRideOffer;
  pickup: IRideLocation;
  destination: IRideLocation;
  passengerCount: number;
  luggageDescription?: string;
  passengerNote?: string;
  vehiclePreference: 'ANY' | 'AUTO' | 'E_RICKSHAW';
  status: RideStatus;
  version: number; // Optimistic concurrency control
  otp: {
    code: string; // 4-digit code shown to passenger
    attempts: number;
    maxAttempts: number;
    verifiedAt?: Date;
  };
  fare: {
    estimatedMin?: number;
    estimatedMax?: number;
    finalFare?: number;
    currency: 'INR';
  };
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    paidAt?: Date;
    transactionReference?: string;
  };
  timestamps: {
    requestedAt: Date;
    searchingAt?: Date;
    offersReceivedAt?: Date;
    driverSelectedAt?: Date;
    driverEnRouteAt?: Date;
    driverArrivedAt?: Date;
    rideStartedAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    expiredAt?: Date;
  };
  cancellation?: {
    cancelledBy: RideCancellationActor;
    reason: string;
    details?: string;
    cancelledAt: Date;
  };
  routeMetrics?: IRouteMetrics;
  searchRadiusKm: number;
  contactedDriversCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// RIDE AUDIT EVENT LEDGER
// ==========================================

export type RideEventType = 
  | 'REQUESTED'
  | 'DRIVER_NOTIFIED'
  | 'OFFER_CREATED'
  | 'DRIVER_SELECTED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_ARRIVED'
  | 'OTP_VERIFIED'
  | 'RIDE_STARTED'
  | 'RIDE_COMPLETED'
  | 'PASSENGER_CANCELLED'
  | 'DRIVER_CANCELLED'
  | 'EXPIRED'
  | 'NO_DRIVER_FOUND';

export interface IRideEvent {
  id: string;
  rideId: string;
  eventType: RideEventType;
  actorId: string;
  actorRole: 'PASSENGER' | 'DRIVER' | 'ADMIN' | 'SYSTEM';
  metadata?: Record<string, any>;
  createdAt: Date;
}

// ==========================================
// CHAT, RATINGS & DISPUTES
// ==========================================

export interface IRideMessage {
  id: string;
  rideId: string;
  senderId: string;
  senderRole: 'PASSENGER' | 'DRIVER';
  text: string;
  quickReplyCode?: string;
  readAt?: Date;
  createdAt: Date;
}

export interface IRating {
  id: string;
  rideId: string;
  fromUserId: string;
  toUserId: string;
  fromRole: 'PASSENGER' | 'DRIVER';
  toRole: 'PASSENGER' | 'DRIVER';
  stars: number; // 1 to 5
  feedbackTags: string[];
  comment?: string;
  createdAt: Date;
}

export type ReportCategory = 
  | 'OVERCHARGING'
  | 'RUDE_BEHAVIOUR'
  | 'RECKLESS_DRIVING'
  | 'VEHICLE_CONDITION'
  | 'PASSENGER_NO_SHOW'
  | 'DRIVER_NO_SHOW'
  | 'HARASSMENT'
  | 'OTHER';

export type ReportStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface IReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  rideId?: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  adminNotes?: string;
  resolutionAction?: string;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// SOCKET.IO EVENT MAPS
// ==========================================

export interface ServerToClientEvents {
  // Ride events
  'ride:new_request': (data: { ride: IRide; distanceMeters: number }) => void;
  'ride:offer_received': (data: { rideId: string; offer: IRideOffer }) => void;
  'ride:driver_selected': (data: { ride: IRide; offer: IRideOffer }) => void;
  'ride:offer_rejected': (data: { offerId: string; rideId: string }) => void;
  'ride:driver_en_route': (data: { ride: IRide }) => void;
  'ride:driver_arrived': (data: { ride: IRide }) => void;
  'ride:started': (data: { ride: IRide }) => void;
  'ride:completed': (data: { ride: IRide }) => void;
  'ride:cancelled': (data: { ride: IRide; reason: string; cancelledBy: RideCancellationActor }) => void;
  'ride:no_driver_found': (data: { rideId: string }) => void;
  'ride:radius_expanded': (data: {
    rideId: string;
    searchRadiusKm: number;
    contactedDriversCount: number;
  }) => void;

  // Driver location stream
  'driver:location_updated': (data: {
    driverId: string;
    latitude: number;
    longitude: number;
    heading?: number;
    updatedAt: string;
  }) => void;

  // In-ride chat
  'chat:message': (message: IRideMessage) => void;

  // System notification
  'notification:new': (notification: {
    id: string;
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
  }) => void;
}

export interface ClientToServerEvents {
  'join:ride': (data: { rideId: string }, callback: (res: { success: boolean; error?: string }) => void) => void;
  'leave:ride': (data: { rideId: string }) => void;
  'driver:update_location': (data: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
  }) => void;
  'chat:send': (
    data: { rideId: string; text: string; quickReplyCode?: string },
    callback: (res: { success: boolean; message?: IRideMessage; error?: string }) => void
  ) => void;
}

// ==========================================
// API RESPONSE STANDARD WRAPPER
// ==========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
