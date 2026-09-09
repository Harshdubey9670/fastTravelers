import mongoose, { Schema, Document } from 'mongoose';
import { IRideOffer, RideOfferStatus } from '@gaon-auto/types';

export interface RideOfferModelDoc extends Omit<IRideOffer, 'id' | 'driver'>, Document {}

const RideOfferSchema = new Schema<RideOfferModelDoc>(
  {
    rideId: {
      type: Schema.Types.ObjectId as any,
      ref: 'Ride',
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId as any,
      ref: 'DriverProfile',
      required: true,
      index: true,
    },
    fare: {
      type: Number,
      required: true,
      min: 10,
    },
    etaMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SELECTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'],
      default: 'PENDING',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
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
        if (ret.driverId && typeof ret.driverId === 'object') {
          ret.driver = ret.driverId;
        }
        return ret;
      },
    },
  }
);

// Prevent same driver from creating multiple active offers on same ride
RideOfferSchema.index({ rideId: 1, driverId: 1 }, { unique: true });

export const RideOfferModel = (mongoose.models.RideOffer as mongoose.Model<RideOfferModelDoc>) || mongoose.model<RideOfferModelDoc>('RideOffer', RideOfferSchema);
