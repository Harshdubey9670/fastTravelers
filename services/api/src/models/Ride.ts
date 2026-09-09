import mongoose, { Schema, Document } from 'mongoose';
import {
  IRide,
  RideStatus,
  PaymentMethod,
  PaymentStatus,
  RideCancellationActor,
} from '@gaon-auto/types';

export interface RideModelDocument extends Omit<IRide, 'id' | 'passenger' | 'driver' | 'selectedOffer'>, Document {
  otp: {
    code: string;
    codeHash: string;
    attempts: number;
    maxAttempts: number;
    verifiedAt?: Date;
  };
}

const GeoPointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  { _id: false }
);

const RideLocationSchema = new Schema(
  {
    addressText: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    location: {
      type: GeoPointSchema,
      required: false,
      default: undefined,
    },
  },
  { _id: false }
);

const RideSchema = new Schema<RideModelDocument>(
  {
    rideNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    passengerId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId as any,
      ref: 'DriverProfile',
      index: true,
    },
    selectedOfferId: {
      type: Schema.Types.ObjectId as any,
      ref: 'RideOffer',
    },
    pickup: {
      type: RideLocationSchema,
      required: true,
    },
    destination: {
      type: RideLocationSchema,
      required: true,
    },
    passengerCount: {
      type: Number,
      default: 1,
      min: 1,
      max: 6,
    },
    luggageDescription: {
      type: String,
      trim: true,
    },
    passengerNote: {
      type: String,
      trim: true,
    },
    vehiclePreference: {
      type: String,
      enum: ['ANY', 'AUTO', 'E_RICKSHAW'],
      default: 'ANY',
    },
    status: {
      type: String,
      enum: [
        'REQUESTED',
        'SEARCHING_DRIVER',
        'OFFERS_RECEIVED',
        'DRIVER_SELECTED',
        'DRIVER_EN_ROUTE',
        'DRIVER_ARRIVED',
        'RIDE_READY',
        'RIDE_STARTED',
        'RIDE_COMPLETED',
        'CANCELLED',
        'EXPIRED',
        'NO_DRIVER_FOUND',
      ],
      default: 'REQUESTED',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
      // Optimistic concurrency control to prevent stale client state overwriting database state
    },
    otp: {
      code: { type: String, required: true },
      codeHash: { type: String, required: true },
      attempts: { type: Number, default: 0 },
      maxAttempts: { type: Number, default: 5 },
      verifiedAt: { type: Date },
    },
    fare: {
      estimatedMin: { type: Number },
      estimatedMax: { type: Number },
      finalFare: { type: Number },
      currency: { type: String, default: 'INR' },
    },
    payment: {
      method: {
        type: String,
        enum: ['CASH', 'UPI_DIRECT'],
        default: 'CASH',
      },
      status: {
        type: String,
        enum: [
          'PENDING',
          'PASSENGER_CLAIMS_PAID',
          'DRIVER_CONFIRMED_RECEIVED',
          'GATEWAY_VERIFIED',
          'DISPUTED',
          'NOT_APPLICABLE',
        ],
        default: 'PENDING',
        index: true,
      },
      paidAt: { type: Date },
      transactionReference: { type: String, trim: true },
    },
    timestamps: {
      requestedAt: { type: Date, default: Date.now },
      searchingAt: { type: Date },
      offersReceivedAt: { type: Date },
      driverSelectedAt: { type: Date },
      driverEnRouteAt: { type: Date },
      driverArrivedAt: { type: Date },
      rideStartedAt: { type: Date },
      completedAt: { type: Date },
      cancelledAt: { type: Date },
      expiredAt: { type: Date },
    },
    cancellation: {
      cancelledBy: {
        type: String,
        enum: ['PASSENGER', 'DRIVER', 'SYSTEM', 'ADMIN'],
      },
      reason: { type: String },
      details: { type: String },
      cancelledAt: { type: Date },
    },
    routeMetrics: {
      distanceMeters: { type: Number },
      durationSeconds: { type: Number },
      distanceStatus: {
        type: String,
        enum: ['CALCULATED', 'UNKNOWN'],
        default: 'CALCULATED',
      },
    },
    searchRadiusKm: {
      type: Number,
      default: 3.0,
    },
    contactedDriversCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        // Strip codeHash from output
        if (ret.otp) {
          delete ret.otp.codeHash;
        }
        return ret;
      },
    },
  }
);

// Indexes for high performance
RideSchema.index({ 'pickup.location': '2dsphere' });
RideSchema.index({ passengerId: 1, status: 1 });
RideSchema.index({ driverId: 1, status: 1 });
RideSchema.index({ status: 1, createdAt: -1 });

export const RideModel = (mongoose.models.Ride as mongoose.Model<RideModelDocument>) || mongoose.model<RideModelDocument>('Ride', RideSchema);
