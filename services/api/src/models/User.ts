import mongoose, { Schema, Document } from 'mongoose';
import { IUser, UserRole, UserStatus, PreferredLanguage } from '@gaon-auto/types';

export interface UserDocument extends Omit<IUser, 'id'>, Document {}

const UserSchema = new Schema<UserDocument>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['PASSENGER', 'DRIVER', 'ADMIN', 'SUPER_ADMIN'],
      default: 'PASSENGER',
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    profilePhotoUrl: {
      type: String,
      trim: true,
    },
    preferredLanguage: {
      type: String,
      enum: ['hi', 'en'],
      default: 'hi',
    },
    homeVillage: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    emergencyContacts: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        relation: { type: String, required: true },
      },
    ],
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
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'BLOCKED'],
      default: 'ACTIVE',
      index: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
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

export const UserModel = (mongoose.models.User as mongoose.Model<UserDocument>) || mongoose.model<UserDocument>('User', UserSchema);
