import mongoose, { Schema, Document } from 'mongoose';

// ==========================================
// 1. OTP MODEL (WITH TTL INDEX)
// ==========================================

export interface OTPDoc extends Document {
  phone: string;
  codeHash: string;
  purpose: 'LOGIN' | 'REGISTER';
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  resendCooldownUntil: Date;
  verifiedAt?: Date;
  createdAt: Date;
}

const OTPSchema = new Schema<OTPDoc>(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['LOGIN', 'REGISTER'],
      default: 'LOGIN',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '5m' }, // TTL index: MongoDB automatically purges expired OTPs
    },
    resendCooldownUntil: {
      type: Date,
      required: true,
    },
    verifiedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const OTPModel = (mongoose.models.OTP as mongoose.Model<OTPDoc>) || mongoose.model<OTPDoc>('OTP', OTPSchema);

// ==========================================
// 2. REFRESH SESSION (WITH TTL INDEX)
// ==========================================

export interface RefreshSessionDoc extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  deviceInfo?: {
    platform?: string;
    deviceId?: string;
    deviceName?: string;
  };
  ipAddress?: string;
  userAgent?: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const RefreshSessionSchema = new Schema<RefreshSessionDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceInfo: {
      platform: { type: String, default: 'android' },
      deviceId: { type: String },
      deviceName: { type: String },
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '30d' }, // TTL index: Expire session after 30 days
    },
  },
  { timestamps: true }
);

export const RefreshSessionModel = (mongoose.models.RefreshSession as mongoose.Model<RefreshSessionDoc>) || mongoose.model<RefreshSessionDoc>('RefreshSession', RefreshSessionSchema);

// ==========================================
// 3. DEVICE PUSH TOKEN LIFECYCLE
// ==========================================

export interface DeviceTokenDoc extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: 'android' | 'ios' | 'web';
  deviceId?: string;
  lastUsedAt: Date;
  createdAt: Date;
}

const DeviceTokenSchema = new Schema<DeviceTokenDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'web'],
      default: 'android',
    },
    deviceId: {
      type: String,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const DeviceTokenModel = (mongoose.models.DeviceToken as mongoose.Model<DeviceTokenDoc>) || mongoose.model<DeviceTokenDoc>('DeviceToken', DeviceTokenSchema);

// ==========================================
// 4. REQUEST IDEMPOTENCY RECORD (WITH TTL)
// ==========================================

export interface IdempotencyRecordDoc extends Document {
  key: string; // From Idempotency-Key HTTP header
  endpoint: string;
  userId?: mongoose.Types.ObjectId;
  payloadHash: string;
  responseStatus: number;
  responseBody: any;
  expiresAt: Date;
  createdAt: Date;
}

const IdempotencyRecordSchema = new Schema<IdempotencyRecordDoc>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
    },
    payloadHash: {
      type: String,
      required: true,
    },
    responseStatus: {
      type: Number,
      required: true,
    },
    responseBody: {
      type: Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '24h' }, // 24-hour TTL index for deduplication cache
    },
  },
  { timestamps: true }
);

export const IdempotencyRecordModel = (mongoose.models.IdempotencyRecord as mongoose.Model<IdempotencyRecordDoc>) || mongoose.model<IdempotencyRecordDoc>('IdempotencyRecord', IdempotencyRecordSchema);

// ==========================================
// 5. ADMIN AUDIT LOG
// ==========================================

export interface AdminAuditLogDoc extends Document {
  adminId: mongoose.Types.ObjectId;
  action: string;
  targetEntity: string;
  targetId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema<AdminAuditLogDoc>(
  {
    adminId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetEntity: {
      type: String,
      required: true,
    },
    targetId: {
      type: String,
      required: true,
    },
    changes: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: -1,
    },
  },
  { timestamps: false }
);

export const AdminAuditLogModel = (mongoose.models.AdminAuditLog as mongoose.Model<AdminAuditLogDoc>) || mongoose.model<AdminAuditLogDoc>('AdminAuditLog', AdminAuditLogSchema);

// ==========================================
// 6. FAVOURITE DRIVERS
// ==========================================

export interface FavouriteDriverDoc extends Document {
  passengerId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  note?: string;
  createdAt: Date;
}

const FavouriteDriverSchema = new Schema<FavouriteDriverDoc>(
  {
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
    note: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  { timestamps: true }
);

FavouriteDriverSchema.index({ passengerId: 1, driverId: 1 }, { unique: true });

export const FavouriteDriverModel = (mongoose.models.FavouriteDriver as mongoose.Model<FavouriteDriverDoc>) || mongoose.model<FavouriteDriverDoc>('FavouriteDriver', FavouriteDriverSchema);
