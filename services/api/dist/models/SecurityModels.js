"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavouriteDriverModel = exports.AdminAuditLogModel = exports.IdempotencyRecordModel = exports.DeviceTokenModel = exports.RefreshSessionModel = exports.OTPModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const OTPSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
exports.OTPModel = mongoose_1.default.models.OTP || mongoose_1.default.model('OTP', OTPSchema);
const RefreshSessionSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: true });
exports.RefreshSessionModel = mongoose_1.default.models.RefreshSession || mongoose_1.default.model('RefreshSession', RefreshSessionSchema);
const DeviceTokenSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: true });
exports.DeviceTokenModel = mongoose_1.default.models.DeviceToken || mongoose_1.default.model('DeviceToken', DeviceTokenSchema);
const IdempotencyRecordSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: '24h' }, // 24-hour TTL index for deduplication cache
    },
}, { timestamps: true });
exports.IdempotencyRecordModel = mongoose_1.default.models.IdempotencyRecord || mongoose_1.default.model('IdempotencyRecord', IdempotencyRecordSchema);
const AdminAuditLogSchema = new mongoose_1.Schema({
    adminId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.Mixed,
    },
    ipAddress: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: -1,
    },
}, { timestamps: false });
exports.AdminAuditLogModel = mongoose_1.default.models.AdminAuditLog || mongoose_1.default.model('AdminAuditLog', AdminAuditLogSchema);
const FavouriteDriverSchema = new mongoose_1.Schema({
    passengerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    driverId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'DriverProfile',
        required: true,
        index: true,
    },
    note: {
        type: String,
        trim: true,
        maxlength: 100,
    },
}, { timestamps: true });
FavouriteDriverSchema.index({ passengerId: 1, driverId: 1 }, { unique: true });
exports.FavouriteDriverModel = mongoose_1.default.models.FavouriteDriver || mongoose_1.default.model('FavouriteDriver', FavouriteDriverSchema);
//# sourceMappingURL=SecurityModels.js.map