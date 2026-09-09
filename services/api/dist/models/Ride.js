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
exports.RideModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const RideLocationSchema = new mongoose_1.Schema({
    addressText: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
        },
    },
}, { _id: false });
const RideSchema = new mongoose_1.Schema({
    rideNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    passengerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    driverId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'DriverProfile',
        index: true,
    },
    selectedOfferId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'RideOffer',
    },
    pickup: {
        type: RideLocationSchema,
        required: true,
    },
    destination: {
        type: RideLocationSchema,
        required: true,
    },
    passengerCount: {
        type: Number,
        default: 1,
        min: 1,
        max: 6,
    },
    luggageDescription: {
        type: String,
        trim: true,
    },
    passengerNote: {
        type: String,
        trim: true,
    },
    vehiclePreference: {
        type: String,
        enum: ['ANY', 'AUTO', 'E_RICKSHAW'],
        default: 'ANY',
    },
    status: {
        type: String,
        enum: [
            'REQUESTED',
            'SEARCHING_DRIVER',
            'OFFERS_RECEIVED',
            'DRIVER_SELECTED',
            'DRIVER_EN_ROUTE',
            'DRIVER_ARRIVED',
            'RIDE_READY',
            'RIDE_STARTED',
            'RIDE_COMPLETED',
            'CANCELLED',
            'EXPIRED',
            'NO_DRIVER_FOUND',
        ],
        default: 'REQUESTED',
        index: true,
    },
    version: {
        type: Number,
        default: 1,
        // Optimistic concurrency control to prevent stale client state overwriting database state
    },
    otp: {
        code: { type: String, required: true },
        codeHash: { type: String, required: true },
        attempts: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 5 },
        verifiedAt: { type: Date },
    },
    fare: {
        estimatedMin: { type: Number },
        estimatedMax: { type: Number },
        finalFare: { type: Number },
        currency: { type: String, default: 'INR' },
    },
    payment: {
        method: {
            type: String,
            enum: ['CASH', 'UPI_DIRECT'],
            default: 'CASH',
        },
        status: {
            type: String,
            enum: [
                'PENDING',
                'PASSENGER_CLAIMS_PAID',
                'DRIVER_CONFIRMED_RECEIVED',
                'GATEWAY_VERIFIED',
                'DISPUTED',
                'NOT_APPLICABLE',
            ],
            default: 'PENDING',
            index: true,
        },
        paidAt: { type: Date },
        transactionReference: { type: String, trim: true },
    },
    timestamps: {
        requestedAt: { type: Date, default: Date.now },
        searchingAt: { type: Date },
        offersReceivedAt: { type: Date },
        driverSelectedAt: { type: Date },
        driverEnRouteAt: { type: Date },
        driverArrivedAt: { type: Date },
        rideStartedAt: { type: Date },
        completedAt: { type: Date },
        cancelledAt: { type: Date },
        expiredAt: { type: Date },
    },
    cancellation: {
        cancelledBy: {
            type: String,
            enum: ['PASSENGER', 'DRIVER', 'SYSTEM', 'ADMIN'],
        },
        reason: { type: String },
        details: { type: String },
        cancelledAt: { type: Date },
    },
    routeMetrics: {
        distanceMeters: { type: Number },
        durationSeconds: { type: Number },
        distanceStatus: {
            type: String,
            enum: ['CALCULATED', 'UNKNOWN'],
            default: 'CALCULATED',
        },
    },
    searchRadiusKm: {
        type: Number,
        default: 3.0,
    },
    contactedDriversCount: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_, ret) => {
            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.__v;
            // Strip codeHash from output
            if (ret.otp) {
                delete ret.otp.codeHash;
            }
            return ret;
        },
    },
});
// Indexes for high performance
RideSchema.index({ 'pickup.location': '2dsphere' });
RideSchema.index({ passengerId: 1, status: 1 });
RideSchema.index({ driverId: 1, status: 1 });
RideSchema.index({ status: 1, createdAt: -1 });
exports.RideModel = mongoose_1.default.models.Ride || mongoose_1.default.model('Ride', RideSchema);
//# sourceMappingURL=Ride.js.map