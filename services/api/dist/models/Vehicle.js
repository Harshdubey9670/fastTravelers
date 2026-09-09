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
exports.VehicleModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const VehicleSchema = new mongoose_1.Schema({
    driverId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'DriverProfile',
        required: true,
        index: true,
    },
    vehicleType: {
        type: String,
        enum: ['AUTO', 'E_RICKSHAW', 'TEMPO', 'TAXI', 'GOODS_VEHICLE', 'SCHOOL_VEHICLE'],
        default: 'AUTO',
        required: true,
    },
    registrationNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
    },
    makeModel: {
        type: String,
        trim: true,
    },
    year: {
        type: Number,
    },
    vehiclePhotoUrl: {
        type: String,
        trim: true,
    },
    seatingCapacity: {
        type: Number,
        default: 3,
        min: 1,
        max: 10,
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
exports.VehicleModel = mongoose_1.default.models.Vehicle || mongoose_1.default.model('Vehicle', VehicleSchema);
//# sourceMappingURL=Vehicle.js.map