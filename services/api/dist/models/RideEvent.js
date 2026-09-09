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
exports.RideEventModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const RideEventSchema = new mongoose_1.Schema({
    rideId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Ride',
        required: true,
        index: true,
    },
    eventType: {
        type: String,
        enum: [
            'REQUESTED',
            'DRIVER_NOTIFIED',
            'OFFER_CREATED',
            'DRIVER_SELECTED',
            'DRIVER_EN_ROUTE',
            'DRIVER_ARRIVED',
            'OTP_VERIFIED',
            'RIDE_STARTED',
            'RIDE_COMPLETED',
            'PASSENGER_CANCELLED',
            'DRIVER_CANCELLED',
            'EXPIRED',
            'NO_DRIVER_FOUND',
        ],
        required: true,
        index: true,
    },
    actorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    actorRole: {
        type: String,
        enum: ['PASSENGER', 'DRIVER', 'ADMIN', 'SYSTEM'],
        required: true,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, {
    timestamps: false, // Immutable audit event
    toJSON: {
        virtuals: true,
        transform: (_, ret) => {
            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
// Compound index for chronological event replay per ride
RideEventSchema.index({ rideId: 1, createdAt: 1 });
exports.RideEventModel = mongoose_1.default.models.RideEvent || mongoose_1.default.model('RideEvent', RideEventSchema);
//# sourceMappingURL=RideEvent.js.map