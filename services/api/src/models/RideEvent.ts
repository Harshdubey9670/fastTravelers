import mongoose, { Schema, Document } from 'mongoose';
import { IRideEvent, RideEventType } from '@gaon-auto/types';

export interface RideEventDoc extends Omit<IRideEvent, 'id'>, Document {}

const RideEventSchema = new Schema<RideEventDoc>(
  {
    rideId: {
      type: Schema.Types.ObjectId as any,
      ref: 'Ride',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        'REQUESTED',
        'DRIVER_NOTIFIED',
        'OFFER_CREATED',
        'DRIVER_SELECTED',
        'DRIVER_EN_ROUTE',
        'DRIVER_ARRIVED',
        'OTP_VERIFIED',
        'RIDE_STARTED',
        'RIDE_COMPLETED',
        'PASSENGER_CANCELLED',
        'DRIVER_CANCELLED',
        'EXPIRED',
        'NO_DRIVER_FOUND',
      ],
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId as any,
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ['PASSENGER', 'DRIVER', 'ADMIN', 'SYSTEM'],
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Immutable audit event
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for chronological event replay per ride
RideEventSchema.index({ rideId: 1, createdAt: 1 });

export const RideEventModel = (mongoose.models.RideEvent as mongoose.Model<RideEventDoc>) || mongoose.model<RideEventDoc>('RideEvent', RideEventSchema);
