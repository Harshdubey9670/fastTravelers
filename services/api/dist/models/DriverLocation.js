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
exports.DriverLocationModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const DriverLocationSchema = new mongoose_1.Schema({
    driverId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'DriverProfile',
        required: true,
        unique: true,
        index: true,
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
            required: true,
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
        },
    },
    heading: {
        type: Number,
        min: 0,
        max: 360,
    },
    speed: {
        type: Number,
        min: 0,
    },
    accuracy: {
        type: Number,
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
}, {
    timestamps: true,
});
// 2dsphere index for MongoDB geospatial queries
DriverLocationSchema.index({ location: '2dsphere' });
// Compound index for querying online, available drivers with fresh location
DriverLocationSchema.index({ isOnline: 1, availabilityStatus: 1, updatedAt: -1 });
exports.DriverLocationModel = mongoose_1.default.models.DriverLocation || mongoose_1.default.model('DriverLocation', DriverLocationSchema);
//# sourceMappingURL=DriverLocation.js.map