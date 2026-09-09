import mongoose, { Schema, Document } from 'mongoose';
import { IVehicle, VehicleType } from '@gaon-auto/types';

export interface VehicleModelDocument extends Omit<IVehicle, 'id'>, Document {}

const VehicleSchema = new Schema<VehicleModelDocument>(
  {
    driverId: {
      type: Schema.Types.ObjectId as any,
      ref: 'DriverProfile',
      required: true,
      index: true,
    },
    vehicleType: {
      type: String,
      enum: ['AUTO', 'E_RICKSHAW', 'TEMPO', 'TAXI', 'GOODS_VEHICLE', 'SCHOOL_VEHICLE'],
      default: 'AUTO',
      required: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    makeModel: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
    },
    vehiclePhotoUrl: {
      type: String,
      trim: true,
    },
    seatingCapacity: {
      type: Number,
      default: 3,
      min: 1,
      max: 10,
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

export const VehicleModel = (mongoose.models.Vehicle as mongoose.Model<VehicleModelDocument>) || mongoose.model<VehicleModelDocument>('Vehicle', VehicleSchema);
