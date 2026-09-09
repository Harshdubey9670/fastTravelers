import mongoose from 'mongoose';
import { CreateRideInput, SubmitOfferInput } from '@gaon-auto/validation';
import { RideCancellationActor, PaymentMethod, PaymentStatus } from '@gaon-auto/types';
export declare class RideService {
    /**
     * Creates a ride request with anti-duplicate active ride validation.
     */
    createRide(passengerId: string, input: CreateRideInput): Promise<mongoose.FlattenMaps<import("../models/Ride.js").RideModelDocument> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Driver submits a fare and ETA offer for a ride.
     */
    submitOffer(driverUserId: string, rideId: string, input: SubmitOfferInput): Promise<any>;
    /**
     * Passenger selects a driver offer.
     * STRICT ATOMIC LOCKING TO PREVENT DOUBLE BOOKING RACE CONDITIONS.
     */
    selectOffer(passengerUserId: string, rideId: string, offerId: string): Promise<any>;
    /**
     * Driver marks that they have arrived at the passenger pickup point.
     */
    markDriverArrived(driverUserId: string, rideId: string): Promise<any>;
    /**
     * Driver enters Trip OTP to start ride. Verified securely server-side.
     */
    startRide(driverUserId: string, rideId: string, inputOtp: string): Promise<any>;
    /**
     * Completes the ride, records final fare, frees the driver.
     */
    completeRide(driverUserId: string, rideId: string, finalFare?: number): Promise<any>;
    /**
     * Records payment with explicit multi-state confirmation.
     */
    recordPayment(userId: string, userRole: string, rideId: string, method: PaymentMethod, status: PaymentStatus, transactionReference?: string): Promise<any>;
    /**
     * Cancels a ride with reason logging and actor tracking.
     */
    cancelRide(userId: string, actorRole: RideCancellationActor, rideId: string, reason: string, details?: string): Promise<any>;
    /**
     * Authoritative Active Ride Recovery.
     * Returns current in-flight ride for reconnect / cold-start reconciliation.
     */
    getActiveRide(userId: string, role: string): Promise<{
        ride: any;
        offers: (mongoose.FlattenMaps<import("../models/RideOffer.js").RideOfferModelDoc> & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        chatMessages: (mongoose.FlattenMaps<import("../models/RideMessage.js").RideMessageDoc> & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    /**
     * Helper to populate full ride details.
     */
    getRideById(rideId: string): Promise<any>;
    /**
     * Progressive Search Radius Expansion:
     * Expands search radius (e.g. 3km -> 5km -> 7km -> 10km) and broadcasts to newly eligible drivers.
     */
    expandSearchRadius(rideId: string): Promise<any>;
}
export declare const rideService: RideService;
//# sourceMappingURL=ride.service.d.ts.map