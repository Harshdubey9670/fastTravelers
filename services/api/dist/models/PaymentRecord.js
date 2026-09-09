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
exports.ReportModel = exports.PaymentRecordModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PaymentRecordSchema = new mongoose_1.Schema({
    rideId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Ride',
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
}, {
    timestamps: true,
});
exports.PaymentRecordModel = mongoose_1.default.models.PaymentRecord || mongoose_1.default.model('PaymentRecord', PaymentRecordSchema);
const ReportSchema = new mongoose_1.Schema({
    reporterId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    reportedUserId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    rideId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
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
});
exports.ReportModel = mongoose_1.default.models.Report || mongoose_1.default.model('Report', ReportSchema);
//# sourceMappingURL=PaymentRecord.js.map