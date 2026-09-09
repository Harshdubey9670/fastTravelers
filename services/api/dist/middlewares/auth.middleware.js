"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
exports.requireRideParticipant = requireRideParticipant;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../config/env.js");
const User_js_1 = require("../models/User.js");
const DriverProfile_js_1 = require("../models/DriverProfile.js");
const Ride_js_1 = require("../models/Ride.js");
/**
 * Validates JWT Access Token on incoming requests.
 */
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication token required' },
        });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_js_1.ENV.JWT_ACCESS_SECRET);
        const user = await User_js_1.UserModel.findById(decoded.sub);
        if (!user || user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Account suspended or inactive' },
            });
        }
        let driverId;
        if (user.role === 'DRIVER') {
            const dp = await DriverProfile_js_1.DriverProfileModel.findOne({ userId: user._id });
            if (dp) {
                driverId = dp._id.toString();
            }
        }
        req.user = {
            id: user._id.toString(),
            role: user.role,
            driverId,
        };
        next();
    }
    catch {
        return res.status(401).json({
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'Invalid or expired authentication token' },
        });
    }
}
/**
 * Role-based authorization middleware.
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied: insufficient permissions' },
            });
        }
        next();
    };
}
/**
 * Ride participant ownership middleware to prevent IDOR attacks.
 */
async function requireRideParticipant(req, res, next) {
    const rideId = req.params.id || req.params.rideId;
    if (!rideId)
        return next();
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const driverId = req.user?.driverId;
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        return next();
    }
    const ride = await Ride_js_1.RideModel.findById(rideId);
    if (!ride) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Ride not found' },
        });
    }
    const isPassenger = ride.passengerId.toString() === userId;
    const isAssignedDriver = driverId && ride.driverId?.toString() === driverId;
    if (!isPassenger && !isAssignedDriver) {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Access denied: You are not a participant in this ride' },
        });
    }
    next();
}
//# sourceMappingURL=auth.middleware.js.map