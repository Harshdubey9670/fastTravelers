import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { ServerToClientEvents, ClientToServerEvents, IRide, IRideOffer, IRideMessage } from '@gaon-auto/types';
import { isValidCoordinate } from '@gaon-auto/utils';
import { SYSTEM_CONFIG } from '@gaon-auto/config';
import { RideModel } from '../models/Ride.js';
import { DriverProfileModel } from '../models/DriverProfile.js';
import { DriverLocationModel } from '../models/DriverLocation.js';

interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userId?: string;
  userRole?: string;
  driverId?: string;
}

export class SocketService {
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
  private driverLastUpdateMap = new Map<string, number>();

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

          // Reconcile and push latest authoritative driver location if active
          if (
            ride.driverId &&
            ['DRIVER_SELECTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'RIDE_READY', 'RIDE_STARTED'].includes(
              ride.status
            )
          ) {
            DriverLocationModel.findOne({ driverId: ride.driverId })
              .lean()
              .then((latestLoc) => {
                if (latestLoc && latestLoc.location?.coordinates) {
                  const [lng, lat] = latestLoc.location.coordinates;
                  socket.emit('driver:location', {
                    driverId: ride.driverId!.toString(),
                    rideId: ride._id.toString(),
                    latitude: lat,
                    longitude: lng,
                    heading: latestLoc.heading,
                    timestamp: new Date(latestLoc.updatedAt).getTime(),
                  });
                }
              })
              .catch(() => {});
          }

          return callback({ success: true });
        } catch (err: any) {
          return callback({ success: false, error: err.message });
        }
      });

      // Handle driver GPS stream with strict validation, rate limiting & ride-room isolation (Rules 5 & 6)
      socket.on('driver:update_location', async (data) => {
        if (socket.userRole !== 'DRIVER' || !socket.driverId) {
          return;
        }

        const { latitude, longitude, heading, speed, accuracy, timestamp } = data;
        if (!isValidCoordinate(latitude, longitude)) {
          return;
        }

        const now = Date.now();
        const ts =
          typeof timestamp === 'number' && timestamp > 0 && Math.abs(now - timestamp) < 120000
            ? timestamp
            : now;

        // Server-side throttle (minimum DRIVER_LOCATION_THROTTLE_MS between updates)
        const lastUpdate = this.driverLastUpdateMap.get(socket.driverId);
        if (lastUpdate && now - lastUpdate < SYSTEM_CONFIG.DRIVER_LOCATION_THROTTLE_MS) {
          return;
        }
        this.driverLastUpdateMap.set(socket.driverId, now);

        // Authoritatively persist driver location in DB
        await DriverLocationModel.findOneAndUpdate(
          { driverId: socket.driverId },
          {
            $set: {
              location: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
              isOnline: true,
              heading: typeof heading === 'number' ? heading : undefined,
              speed: typeof speed === 'number' ? speed : undefined,
              accuracy: typeof accuracy === 'number' ? accuracy : undefined,
              updatedAt: new Date(ts),
            },
            $setOnInsert: {
              driverId: socket.driverId,
              availabilityStatus: 'AVAILABLE',
            },
          },
          { upsert: true }
        ).catch((err) => {
          console.error('[Socket] DriverLocation upsert error:', err);
        });

        // Find active ride belonging to this driver
        const activeRide = await RideModel.findOne({
          driverId: socket.driverId,
          status: {
            $in: ['DRIVER_SELECTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'RIDE_READY', 'RIDE_STARTED'],
          },
        });

        // Broadcast ONLY to participants authorized in that ride room
        if (activeRide) {
          this.io?.to(`ride:${activeRide._id.toString()}`).emit('driver:location', {
            driverId: socket.driverId,
            rideId: activeRide._id.toString(),
            latitude,
            longitude,
            heading,
            timestamp: ts,
          });

          this.io?.to(`ride:${activeRide._id.toString()}`).emit('driver:location_updated', {
            driverId: socket.driverId,
            latitude,
            longitude,
            heading,
            updatedAt: new Date(ts).toISOString(),
          });
        }
      });

      socket.on('leave:ride', ({ rideId }) => {
        socket.leave(`ride:${rideId}`);
      });

      socket.on('disconnect', (reason) => {
        if (socket.driverId) {
          this.driverLastUpdateMap.delete(socket.driverId);
        }
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
