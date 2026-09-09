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
exports.RatingModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const RatingSchema = new mongoose_1.Schema({
    rideId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Ride',
        required: true,
        index: true,
    },
    fromUserId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    toUserId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    fromRole: {
        type: String,
        enum: ['PASSENGER', 'DRIVER'],
        required: true,
    },
    toRole: {
        type: String,
        enum: ['PASSENGER', 'DRIVER'],
        required: true,
    },
    stars: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    feedbackTags: [
        {
            type: String,
            trim: true,
        },
    ],
    comment: {
        type: String,
        trim: true,
        maxlength: 300,
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
RatingSchema.index({ rideId: 1, fromUserId: 1 }, { unique: true });
exports.RatingModel = mongoose_1.default.models.Rating || mongoose_1.default.model('Rating', RatingSchema);
//# sourceMappingURL=Rating.js.map