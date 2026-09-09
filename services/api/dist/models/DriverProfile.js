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
exports.DriverProfileModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const DriverProfileSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    verificationStatus: {
        type: String,
        enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'],
        default: 'PENDING',
        index: true,
    },
    verificationNotes: {
        type: String,
        trim: true,
    },
    approvedAt: {
        type: Date,
    },
    approvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    licenceNumber: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
    },
    licenceExpiry: {
        type: Date,
    },
    upiId: {
        type: String,
        trim: true,
    },
    upiQrUrl: {
        type: String,
        trim: true,
    },
    operatingAreaId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'OperatingArea',
        index: true,
    },
    totalTrips: {
        type: Number,
        default: 0,
        min: 0,
    },
    completedTrips: {
        type: Number,
        default: 0,
        min: 0,
    },
    cancelledTrips: {
        type: Number,
        default: 0,
        min: 0,
    },
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
    isOnline: {
        type: Boolean,
        default: false,
        index: true,
    },
    availabilityStatus: {
        type: String,
        enum: ['OFFLINE', 'AVAILABLE', 'BUSY', 'SUSPENDED'],
        default: 'OFFLINE',
        index: true,
    },
    lastLocationUpdateAt: {
        type: Date,
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_, ret) => {
            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
    toObject: { virtuals: true },
});
// Virtual for vehicle association
DriverProfileSchema.virtual('vehicle', {
    ref: 'Vehicle',
    localField: '_id',
    foreignField: 'driverId',
    justOne: true,
});
// High-speed index for dispatch eligibility checks
DriverProfileSchema.index({ isOnline: 1, availabilityStatus: 1, verificationStatus: 1 });
exports.DriverProfileModel = mongoose_1.default.models.DriverProfile || mongoose_1.default.model('DriverProfile', DriverProfileSchema);
//# sourceMappingURL=DriverProfile.js.map