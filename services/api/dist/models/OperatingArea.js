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
exports.SavedPlaceModel = exports.OperatingAreaModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const OperatingAreaSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    district: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    state: {
        type: String,
        required: true,
        trim: true,
        default: 'Uttar Pradesh',
    },
    centerPoint: {
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
    radiusKm: {
        type: Number,
        default: 10,
        min: 1,
        max: 50,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    minFare: {
        type: Number,
        default: 30,
        min: 10,
    },
    baseFarePerKm: {
        type: Number,
        default: 12,
        min: 5,
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
OperatingAreaSchema.index({ centerPoint: '2dsphere' });
exports.OperatingAreaModel = mongoose_1.default.models.OperatingArea || mongoose_1.default.model('OperatingArea', OperatingAreaSchema);
const SavedPlaceSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    label: {
        type: String,
        enum: ['Home', 'College', 'Office', 'Mama ka ghar', 'Nani ka ghar', 'Market', 'Custom'],
        required: true,
    },
    customLabel: {
        type: String,
        trim: true,
        maxlength: 40,
    },
    addressText: {
        type: String,
        required: true,
        trim: true,
    },
    landmark: {
        type: String,
        trim: true,
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
SavedPlaceSchema.index({ userId: 1, label: 1 });
SavedPlaceSchema.index({ location: '2dsphere' });
exports.SavedPlaceModel = mongoose_1.default.models.SavedPlace || mongoose_1.default.model('SavedPlace', SavedPlaceSchema);
//# sourceMappingURL=OperatingArea.js.map