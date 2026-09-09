import mongoose, { Schema, Document } from 'mongoose';
import { IOperatingArea, ISavedPlace } from '@gaon-auto/types';

// ==========================================
// OPERATING AREA
// ==========================================

export interface OperatingAreaDoc extends Omit<IOperatingArea, 'id'>, Document {}

const OperatingAreaSchema = new Schema<OperatingAreaDoc>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      default: 'Uttar Pradesh',
    },
    centerPoint: {
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
    radiusKm: {
      type: Number,
      default: 10,
      min: 1,
      max: 50,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    minFare: {
      type: Number,
      default: 30,
      min: 10,
    },
    baseFarePerKm: {
      type: Number,
      default: 12,
      min: 5,
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

OperatingAreaSchema.index({ centerPoint: '2dsphere' });

export const OperatingAreaModel = (mongoose.models.OperatingArea as mongoose.Model<OperatingAreaDoc>) || mongoose.model<OperatingAreaDoc>('OperatingArea', OperatingAreaSchema);

// ==========================================
// SAVED PLACE
// ==========================================

export interface SavedPlaceDoc extends Omit<ISavedPlace, 'id'>, Document {}

const SavedPlaceSchema = new Schema<SavedPlaceDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    label: {
      type: String,
      enum: ['Home', 'College', 'Office', 'Mama ka ghar', 'Nani ka ghar', 'Market', 'Custom'],
      required: true,
    },
    customLabel: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    addressText: {
      type: String,
      required: true,
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
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

SavedPlaceSchema.index({ userId: 1, label: 1 });
SavedPlaceSchema.index({ location: '2dsphere' });

export const SavedPlaceModel = (mongoose.models.SavedPlace as mongoose.Model<SavedPlaceDoc>) || mongoose.model<SavedPlaceDoc>('SavedPlace', SavedPlaceSchema);
