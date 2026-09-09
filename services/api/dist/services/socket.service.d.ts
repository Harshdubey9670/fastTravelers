import { Server as HttpServer } from 'http';
import { ServerToClientEvents, IRide, IRideOffer } from '@gaon-auto/types';
export declare class SocketService {
    private io;
    init(httpServer: HttpServer): void;
    /**
     * Broadcasts a new ride request to targeted driver user IDs.
     */
    broadcastNewRideRequest(ride: IRide, driverIds: string[], distanceMeters?: number): void;
    /**
     * Sends a driver fare offer to the passenger in realtime.
     */
    sendOfferToPassenger(passengerUserId: string, rideId: string, offer: IRideOffer): void;
    /**
     * Broadcasts event to all authorized participants in the ride room (passenger + selected driver).
     */
    broadcastToRide(rideId: string, event: keyof ServerToClientEvents, data: any): void;
    /**
     * Sends direct event to specific user.
     */
    sendToUser(userId: string, event: keyof ServerToClientEvents, data: any): void;
    /**
     * Sends direct event to specific driver.
     */
    sendToDriver(driverId: string, event: keyof ServerToClientEvents, data: any): void;
}
export declare const socketService: SocketService;
//# sourceMappingURL=socket.service.d.ts.map