import mongoose, { Schema, Document } from 'mongoose';
import { IRideMessage, IRating } from '@gaon-auto/types';

// ==========================================
// RIDE MESSAGE (CHAT)
// ==========================================

export interface RideMessageDoc extends Omit<IRideMessage, 'id'>, Document {}

const RideMessageSchema = new Schema<RideMessageDoc>(
  {
    rideId: {
      type: Schema.Types.ObjectId as any,
      ref: 'Ride',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['PASSENGER', 'DRIVER'],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    quickReplyCode: {
      type: String,
      trim: true,
    },
    readAt: {
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
  }
);

RideMessageSchema.index({ rideId: 1, createdAt: 1 });

export const RideMessageModel = (mongoose.models.RideMessage as mongoose.Model<RideMessageDoc>) || mongoose.model<RideMessageDoc>('RideMessage', RideMessageSchema);

