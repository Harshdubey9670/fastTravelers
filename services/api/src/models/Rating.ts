import mongoose, { Schema, Document } from 'mongoose';
import { IRating } from '@gaon-auto/types';

export interface RatingDoc extends Omit<IRating, 'id'>, Document {}

const RatingSchema = new Schema<RatingDoc>(
  {
    rideId: {
      type: Schema.Types.ObjectId as any,
      ref: 'Ride',
      required: true,
      index: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    fromRole: {
      type: String,
      enum: ['PASSENGER', 'DRIVER'],
      required: true,
    },
    toRole: {
      type: String,
      enum: ['PASSENGER', 'DRIVER'],
      required: true,
    },
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedbackTags: [
      {
        type: String,
        trim: true,
      },
    ],
    comment: {
      type: String,
      trim: true,
      maxlength: 300,
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

RatingSchema.index({ rideId: 1, fromUserId: 1 }, { unique: true });

export const RatingModel = (mongoose.models.Rating as mongoose.Model<RatingDoc>) || mongoose.model<RatingDoc>('Rating', RatingSchema);
