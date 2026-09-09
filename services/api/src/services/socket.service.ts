import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { ServerToClientEvents, ClientToServerEvents, IRide, IRideOffer, IRideMessage } from '@gaon-auto/types';
import { RideModel } from '../models/Ride.js';
import { DriverProfileModel } from '../models/DriverProfile.js';

interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userId?: string;
  userRole?: string;
  driverId?: string;
}

export class SocketService {
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

  init(httpServer: HttpServer) {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
      cors: {
        origin: '*', // Configured for mobile app and web admin
        methods: ['GET', 'POST'],
      },
      pingTimeout: 20000,
      pingInterval: 10000,
    });

    // JWT Authentication Middleware for Sockets
    this.io.use((socket: AuthenticatedSocket, next) => {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers['authorization']?.replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      try {
        const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET) as { sub: string; role: string };
        socket.userId = decoded.sub;
        socket.userRole = decoded.role;
        return next();
      } catch {
        return next(new Error('Invalid authentication token'));
      }
    });

    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      const userId = socket.userId!;
      const userRole = socket.userRole!;

      // Join user's private notification channel
      socket.join(`user:${userId}`);

      if (userRole === 'DRIVER') {
        const dp = await DriverProfileModel.findOne({ userId });
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
          const ride = await RideModel.findById(rideId);
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
        } catch (err: any) {
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
  broadcastNewRideRequest(ride: IRide, driverIds: string[], distanceMeters = 0) {
    if (!this.io) return;
    driverIds.forEach((driverId) => {
      this.io!.to(`driver:${driverId}`).emit('ride:new_request', {
        ride,
        distanceMeters,
      });
    });
  }

  /**
   * Sends a driver fare offer to the passenger in realtime.
   */
  sendOfferToPassenger(passengerUserId: string, rideId: string, offer: IRideOffer) {
    if (!this.io) return;
    this.io.to(`user:${passengerUserId}`).emit('ride:offer_received', {
      rideId,
      offer,
    });
  }

  /**
   * Broadcasts event to all authorized participants in the ride room (passenger + selected driver).
   */
  broadcastToRide(rideId: string, event: keyof ServerToClientEvents, data: any) {
    if (!this.io) return;
    (this.io.to(`ride:${rideId}`) as any).emit(event, data);
  }

  /**
   * Sends direct event to specific user.
   */
  sendToUser(userId: string, event: keyof ServerToClientEvents, data: any) {
    if (!this.io) return;
    (this.io.to(`user:${userId}`) as any).emit(event, data);
  }

  /**
   * Sends direct event to specific driver.
   */
  sendToDriver(driverId: string, event: keyof ServerToClientEvents, data: any) {
    if (!this.io) return;
    (this.io.to(`driver:${driverId}`) as any).emit(event, data);
  }
}

export const socketService = new SocketService();
