import mongoose, { Schema, Document } from 'mongoose';
import { IDriverProfile, DriverVerificationStatus, DriverAvailabilityStatus } from '@gaon-auto/types';

export interface DriverProfileDocument extends Omit<IDriverProfile, 'id' | 'vehicle' | 'user'>, Document {}

const DriverProfileSchema = new Schema<DriverProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING',
      index: true,
    },
    verificationNotes: {
      type: String,
      trim: true,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
    },
    licenceNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    licenceExpiry: {
      type: Date,
    },
    upiId: {
      type: String,
      trim: true,
    },
    upiQrUrl: {
      type: String,
      trim: true,
    },
    operatingAreaId: {
      type: Schema.Types.ObjectId as any,
      ref: 'OperatingArea',
      index: true,
    },
    totalTrips: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedTrips: {
      type: Number,
      default: 0,
      min: 0,
    },
    cancelledTrips: {
      type: Number,
      default: 0,
      min: 0,
    },
    ratingAverage: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },
    availabilityStatus: {
      type: String,
      enum: ['OFFLINE', 'AVAILABLE', 'BUSY', 'SUSPENDED'],
      default: 'OFFLINE',
      index: true,
    },
    lastLocationUpdateAt: {
      type: Date,
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
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual for vehicle association
DriverProfileSchema.virtual('vehicle', {
  ref: 'Vehicle',
  localField: '_id',
  foreignField: 'driverId',
  justOne: true,
});

// High-speed index for dispatch eligibility checks
DriverProfileSchema.index({ isOnline: 1, availabilityStatus: 1, verificationStatus: 1 });

export const DriverProfileModel = (mongoose.models.DriverProfile as mongoose.Model<DriverProfileDocument>) || mongoose.model<DriverProfileDocument>('DriverProfile', DriverProfileSchema);
