import mongoose, { Schema, Document } from 'mongoose';
import { IReport, PaymentMethod, PaymentStatus, ReportCategory, ReportStatus } from '@gaon-auto/types';

// ==========================================
// PAYMENT RECORD
// ==========================================

export interface PaymentRecordDoc extends Document {
  rideId: mongoose.Types.ObjectId;
  passengerId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  passengerClaimedAt?: Date;
  driverConfirmedAt?: Date;
  gatewayVerifiedAt?: Date;
  transactionReference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRecordSchema = new Schema<PaymentRecordDoc>(
  {
    rideId: {
      type: Schema.Types.ObjectId as any,
      ref: 'Ride',
      required: true,
      unique: true,
      index: true,
    },
    passengerId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId as any,
      ref: 'DriverProfile',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ['CASH', 'UPI_DIRECT'],
      default: 'CASH',
      required: true,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'PASSENGER_CLAIMS_PAID',
        'DRIVER_CONFIRMED_RECEIVED',
        'GATEWAY_VERIFIED',
        'DISPUTED',
      ],
      default: 'PENDING',
      required: true,
      index: true,
    },
    passengerClaimedAt: {
      type: Date,
    },
    driverConfirmedAt: {
      type: Date,
    },
    gatewayVerifiedAt: {
      type: Date,
    },
    transactionReference: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PaymentRecordModel = (mongoose.models.PaymentRecord as mongoose.Model<PaymentRecordDoc>) || mongoose.model<PaymentRecordDoc>('PaymentRecord', PaymentRecordSchema);

// ==========================================
// REPORT & DISPUTE
// ==========================================

export interface ReportDoc extends Omit<IReport, 'id'>, Document {}

const ReportSchema = new Schema<ReportDoc>(
  {
    reporterId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    reportedUserId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    rideId: {
      type: Schema.Types.ObjectId as any,
      ref: 'Ride',
      index: true,
    },
    category: {
      type: String,
      enum: [
        'OVERCHARGING',
        'RUDE_BEHAVIOUR',
        'RECKLESS_DRIVING',
        'VEHICLE_CONDITION',
        'PASSENGER_NO_SHOW',
        'DRIVER_NO_SHOW',
        'HARASSMENT',
        'OTHER',
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'],
      default: 'OPEN',
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    resolutionAction: {
      type: String,
      trim: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
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

export const ReportModel = (mongoose.models.Report as mongoose.Model<ReportDoc>) || mongoose.model<ReportDoc>('Report', ReportSchema);
