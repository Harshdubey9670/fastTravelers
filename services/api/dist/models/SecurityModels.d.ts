import mongoose, { Document } from 'mongoose';
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
export declare const OTPModel: mongoose.Model<OTPDoc, {}, {}, {}, mongoose.Document<unknown, {}, OTPDoc, {}, {}> & OTPDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
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
export declare const RefreshSessionModel: mongoose.Model<RefreshSessionDoc, {}, {}, {}, mongoose.Document<unknown, {}, RefreshSessionDoc, {}, {}> & RefreshSessionDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface DeviceTokenDoc extends Document {
    userId: mongoose.Types.ObjectId;
    token: string;
    platform: 'android' | 'ios' | 'web';
    deviceId?: string;
    lastUsedAt: Date;
    createdAt: Date;
}
export declare const DeviceTokenModel: mongoose.Model<DeviceTokenDoc, {}, {}, {}, mongoose.Document<unknown, {}, DeviceTokenDoc, {}, {}> & DeviceTokenDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface IdempotencyRecordDoc extends Document {
    key: string;
    endpoint: string;
    userId?: mongoose.Types.ObjectId;
    payloadHash: string;
    responseStatus: number;
    responseBody: any;
    expiresAt: Date;
    createdAt: Date;
}
export declare const IdempotencyRecordModel: mongoose.Model<IdempotencyRecordDoc, {}, {}, {}, mongoose.Document<unknown, {}, IdempotencyRecordDoc, {}, {}> & IdempotencyRecordDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface AdminAuditLogDoc extends Document {
    adminId: mongoose.Types.ObjectId;
    action: string;
    targetEntity: string;
    targetId: string;
    changes?: Record<string, any>;
    ipAddress?: string;
    createdAt: Date;
}
export declare const AdminAuditLogModel: mongoose.Model<AdminAuditLogDoc, {}, {}, {}, mongoose.Document<unknown, {}, AdminAuditLogDoc, {}, {}> & AdminAuditLogDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface FavouriteDriverDoc extends Document {
    passengerId: mongoose.Types.ObjectId;
    driverId: mongoose.Types.ObjectId;
    note?: string;
    createdAt: Date;
}
export declare const FavouriteDriverModel: mongoose.Model<FavouriteDriverDoc, {}, {}, {}, mongoose.Document<unknown, {}, FavouriteDriverDoc, {}, {}> & FavouriteDriverDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SecurityModels.d.ts.map