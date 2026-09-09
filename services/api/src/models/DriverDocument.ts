import mongoose, { Schema, Document } from 'mongoose';
import { IDriverDocument, DocumentType } from '@gaon-auto/types';

export interface DriverDocumentModelDoc extends Omit<IDriverDocument, 'id'>, Document {}

const DriverDocumentSchema = new Schema<DriverDocumentModelDoc>(
  {
    driverId: {
      type: Schema.Types.ObjectId as any,
      ref: 'DriverProfile',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: ['AADHAAR_FRONT', 'AADHAAR_BACK', 'DRIVING_LICENCE', 'VEHICLE_RC', 'VEHICLE_INSURANCE', 'VEHICLE_PHOTO'],
      required: true,
    },
    fileKey: {
      type: String,
      required: true,
      // Stored path in private storage; NEVER exposed as a public URL
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
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

// Compound index to quickly find driver documents by type
DriverDocumentSchema.index({ driverId: 1, documentType: 1 });

export const DriverDocumentModel = (mongoose.models.DriverDocument as mongoose.Model<DriverDocumentModelDoc>) || mongoose.model<DriverDocumentModelDoc>('DriverDocument', DriverDocumentSchema);
