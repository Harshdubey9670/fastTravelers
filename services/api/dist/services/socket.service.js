"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../config/env.js");
const Ride_js_1 = require("../models/Ride.js");
const DriverProfile_js_1 = require("../models/DriverProfile.js");
class SocketService {
    io = null;
    init(httpServer) {
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: '*', // Configured for mobile app and web admin
                methods: ['GET', 'POST'],
            },
            pingTimeout: 20000,
            pingInterval: 10000,
        });
        // JWT Authentication Middleware for Sockets
        this.io.use((socket, next) => {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers['authorization']?.replace(/^Bearer\s+/i, '');
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            try {
                const decoded = jsonwebtoken_1.default.verify(token, env_js_1.ENV.JWT_ACCESS_SECRET);
                socket.userId = decoded.sub;
                socket.userRole = decoded.role;
                return next();
            }
            catch {
                return next(new Error('Invalid authentication token'));
            }
        });
        this.io.on('connection', async (socket) => {
            const userId = socket.userId;
            const userRole = socket.userRole;
            // Join user's private notification channel
            socket.join(`user:${userId}`);
            if (userRole === 'DRIVER') {
                const dp = await DriverProfile_js_1.DriverProfileModel.findOne({ userId });
                if (dp) {
                    socket.driverId = dp._id.toString();
                    socket.join(`driver:${dp._id}`);
                    socket.join('drivers:online');
                }
            }
            console.log(`[Socket] Client connected: ${socket.id} (User: ${userId}, Role: ${userRole})`);
            // Handle joining active ride room (with strict participant ownership authorization)
            socket.on('join:ride', async ({ rideId }, callback) => {
                try {
                    const ride = await Ride_js_1.RideModel.findById(rideId);
                    if (!ride) {
                        return callback({ success: false, error: 'Ride not found' });
                    }
                    const isPassenger = ride.passengerId.toString() === userId;
                    const isDriver = socket.driverId && ride.driverId?.toString() === socket.driverId;
                    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
                    // Prevent unauthorized snooping on rides
                    if (!isPassenger && !isDriver && !isAdmin) {
                        return callback({ success: false, error: 'Unauthorized to subscribe to this ride' });
                    }
                    socket.join(`ride:${rideId}`);
                    return callback({ success: true });
                }
                catch (err) {
                    return callback({ success: false, error: err.message });
                }
            });
            socket.on('leave:ride', ({ rideId }) => {
                socket.leave(`ride:${rideId}`);
            });
            socket.on('disconnect', (reason) => {
                console.log(`[Socket] Client disconnected: ${socket.id} (Reason: ${reason})`);
            });
        });
        console.log('[Socket] Socket.IO server initialized.');
    }
    /**
     * Broadcasts a new ride request to targeted driver user IDs.
     */
    broadcastNewRideRequest(ride, driverIds, distanceMeters = 0) {
        if (!this.io)
            return;
        driverIds.forEach((driverId) => {
            this.io.to(`driver:${driverId}`).emit('ride:new_request', {
                ride,
                distanceMeters,
            });
        });
    }
    /**
     * Sends a driver fare offer to the passenger in realtime.
     */
    sendOfferToPassenger(passengerUserId, rideId, offer) {
        if (!this.io)
            return;
        this.io.to(`user:${passengerUserId}`).emit('ride:offer_received', {
            rideId,
            offer,
        });
    }
    /**
     * Broadcasts event to all authorized participants in the ride room (passenger + selected driver).
     */
    broadcastToRide(rideId, event, data) {
        if (!this.io)
            return;
        this.io.to(`ride:${rideId}`).emit(event, data);
    }
    /**
     * Sends direct event to specific user.
     */
    sendToUser(userId, event, data) {
        if (!this.io)
            return;
        this.io.to(`user:${userId}`).emit(event, data);
    }
    /**
     * Sends direct event to specific driver.
     */
    sendToDriver(driverId, event, data) {
        if (!this.io)
            return;
        this.io.to(`driver:${driverId}`).emit(event, data);
    }
}
exports.SocketService = SocketService;
exports.socketService = new SocketService();
//# sourceMappingURL=socket.service.js.map