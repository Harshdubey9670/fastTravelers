import mongoose, { Schema, Document } from 'mongoose';
import { ILocalPlace, PlaceType } from '@gaon-auto/types';

export interface LocalPlaceDoc extends Omit<ILocalPlace, 'id'>, Document {}

const LocalPlaceSchema = new Schema<LocalPlaceDoc>(
  {
    nameEn: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    nameHi: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    placeType: {
      type: String,
      enum: [
        'VILLAGE',
        'MARKET',
        'HOSPITAL',
        'SCHOOL',
        'COLLEGE',
        'TEMPLE',
        'RAILWAY_STATION',
        'BUS_STAND',
        'GOVERNMENT_OFFICE',
        'AUTO_STAND',
        'LANDMARK',
        'OTHER',
      ],
      required: true,
      index: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    tehsil: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      default: 'Uttar Pradesh',
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
    description: {
      type: String,
      trim: true,
    },
    aliases: [
      {
        type: String,
        trim: true,
      },
    ],
    isVerified: {
      type: Boolean,
      default: true,
      index: true,
    },
    popularRank: {
      type: Number,
      default: 0,
      index: -1,
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

LocalPlaceSchema.index({ location: '2dsphere' });
LocalPlaceSchema.index({ nameEn: 'text', nameHi: 'text', aliases: 'text' });

export const LocalPlaceModel = (mongoose.models.LocalPlace as mongoose.Model<LocalPlaceDoc>) || mongoose.model<LocalPlaceDoc>('LocalPlace', LocalPlaceSchema);
