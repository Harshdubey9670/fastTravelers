import mongoose, { Schema, Document } from 'mongoose';
import { GeoPoint, DriverAvailabilityStatus } from '@gaon-auto/types';

export interface DriverLocationDoc extends Document {
  driverId: mongoose.Types.ObjectId;
  location: GeoPoint;
  heading?: number;
  speed?: number;
  accuracy?: number;
  isOnline: boolean;
  availabilityStatus: DriverAvailabilityStatus;
  updatedAt: Date;
}

const DriverLocationSchema = new Schema<DriverLocationDoc>(
  {
    driverId: {
      type: Schema.Types.ObjectId as any,
      ref: 'DriverProfile',
      required: true,
      unique: true,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    heading: {
      type: Number,
      min: 0,
      max: 360,
    },
    speed: {
      type: Number,
      min: 0,
    },
    accuracy: {
      type: Number,
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
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for MongoDB geospatial queries
DriverLocationSchema.index({ location: '2dsphere' });

// Compound index for querying online, available drivers with fresh location
DriverLocationSchema.index({ isOnline: 1, availabilityStatus: 1, updatedAt: -1 });

export const DriverLocationModel = (mongoose.models.DriverLocation as mongoose.Model<DriverLocationDoc>) || mongoose.model<DriverLocationDoc>('DriverLocation', DriverLocationSchema);
