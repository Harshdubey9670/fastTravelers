import { create } from 'zustand';
import {
  IRide,
  IRideOffer,
  DriverAvailabilityStatus,
  RouteStatus,
  RouteCoordinate,
} from '@gaon-auto/types';
import { decodePolyline, calculateDistanceMeters } from '@gaon-auto/utils';
import { SYSTEM_CONFIG } from '@gaon-auto/config';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { locationService } from '../services/location';

interface DriverRequestItem {
  ride: IRide;
  distanceMeters: number;
  receivedAt: number;
}

interface DriverState {
  isOnline: boolean;
  availabilityStatus: DriverAvailabilityStatus;
  incomingRequests: DriverRequestItem[];
  activeTrip: IRide | null;
  activeOffer: IRideOffer | null;
  driverCurrentLocation: { latitude: number; longitude: number; heading?: number } | null;
  routeStatus: RouteStatus;
  routeCoordinates: RouteCoordinate[];
  roadDistanceMeters?: number;
  roadDurationSeconds?: number;
  lastRouteOrigin: RouteCoordinate | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setOnlineStatus: (isOnline: boolean) => Promise<boolean>;
  fetchDriverRoute: (force?: boolean) => Promise<void>;
  submitBid: (rideId: string, fare: number, etaMinutes: number, message?: string) => Promise<boolean>;
  dismissRequest: (rideId: string) => void;
  markArrived: () => Promise<boolean>;
  startTrip: (otp: string) => Promise<boolean>;
  completeTrip: (finalFare?: number) => Promise<boolean>;
  confirmPaymentReceived: () => Promise<boolean>;
  cancelTrip: (reason: string) => Promise<boolean>;
  reconcileDriverActiveRide: () => Promise<void>;
  setupDriverSocketListeners: () => () => void;
  clearError: () => void;
}

export const useDriverStore = create<DriverState>((set, get) => ({
  isOnline: false,
  availabilityStatus: 'OFFLINE',
  incomingRequests: [],
  activeTrip: null,
  activeOffer: null,
  driverCurrentLocation: null,
  routeStatus: 'UNAVAILABLE',
  routeCoordinates: [],
  roadDistanceMeters: undefined,
  roadDurationSeconds: undefined,
  lastRouteOrigin: null,
  isLoading: false,
  error: null,

  fetchDriverRoute: async (force = false) => {
    const { activeTrip, driverCurrentLocation, lastRouteOrigin } = get();
    if (!activeTrip) return;

    let origin: RouteCoordinate | null = null;
    let destination: RouteCoordinate | null = null;

    if (driverCurrentLocation) {
      origin = {
        latitude: driverCurrentLocation.latitude,
        longitude: driverCurrentLocation.longitude,
      };
    }

    const isBeforeTrip = ['DRIVER_SELECTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'RIDE_READY'].includes(
      activeTrip.status
    );
    const isStarted = activeTrip.status === 'RIDE_STARTED';

    if (isBeforeTrip) {
      // Route Driver -> Pickup spot
      if (activeTrip.pickup?.location?.coordinates && activeTrip.pickup.location.coordinates.length === 2) {
        destination = {
          latitude: activeTrip.pickup.location.coordinates[1],
          longitude: activeTrip.pickup.location.coordinates[0],
        };
      }
    } else if (isStarted) {
      // Route Driver -> Destination (ONLY if destination coordinates exist! Rule 14)
      if (
        activeTrip.destination?.location?.coordinates &&
        activeTrip.destination.location.coordinates.length === 2 &&
        typeof activeTrip.destination.location.coordinates[1] === 'number' &&
        typeof activeTrip.destination.location.coordinates[0] === 'number'
      ) {
        destination = {
          latitude: activeTrip.destination.location.coordinates[1],
          longitude: activeTrip.destination.location.coordinates[0],
        };
      }
    }

    if (!origin || !destination) {
      set({
        routeStatus: 'UNAVAILABLE',
        routeCoordinates: [],
        roadDistanceMeters: undefined,
        roadDurationSeconds: undefined,
      });
      return;
    }

    if (!force && lastRouteOrigin) {
      const moved = calculateDistanceMeters(
        lastRouteOrigin.latitude,
        lastRouteOrigin.longitude,
        origin.latitude,
        origin.longitude
      );
      if (moved < SYSTEM_CONFIG.ROUTE_RECALC_MIN_DISTANCE_METERS) {
        return;
      }
    }

    try {
      const res = await api.computeRoute({ origin, destination });
      if (res && res.status === 'AVAILABLE' && res.encodedPolyline) {
        const decoded = decodePolyline(res.encodedPolyline);
        set({
          routeStatus: 'AVAILABLE',
          routeCoordinates: decoded,
          roadDistanceMeters: res.distanceMeters,
          roadDurationSeconds: res.durationSeconds,
          lastRouteOrigin: origin,
        });
      } else {
        set({
          routeStatus: 'UNAVAILABLE',
          routeCoordinates: [],
          roadDistanceMeters: undefined,
          roadDurationSeconds: undefined,
        });
      }
    } catch {
      set({
        routeStatus: 'UNAVAILABLE',
        routeCoordinates: [],
        roadDistanceMeters: undefined,
        roadDurationSeconds: undefined,
      });
    }
  },

  setOnlineStatus: async (isOnline: boolean) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.updateAvailability(isOnline);
      set({
        isOnline: res.isOnline,
        availabilityStatus: res.availabilityStatus as DriverAvailabilityStatus,
        isLoading: false,
      });

      if (res.isOnline) {
        locationService.startDriverLocationTracking((coords) => {
          set({
            driverCurrentLocation: {
              latitude: coords.latitude,
              longitude: coords.longitude,
              heading: coords.heading || undefined,
            },
          });
          get().fetchDriverRoute(false);
        });
      } else {
        locationService.stopDriverLocationTracking();
      }

      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Failed to update online status',
      });
      return false;
    }
  },


  submitBid: async (rideId: string, fare: number, etaMinutes: number, message?: string) => {
    set({ isLoading: true, error: null });
    try {
      const offer = await api.submitOffer(rideId, { fare, etaMinutes, message });
      set({
        activeOffer: offer,
        isLoading: false,
        // Remove from incoming requests list
        incomingRequests: get().incomingRequests.filter((req) => req.ride.id !== rideId),
      });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to submit bid' });
      return false;
    }
  },

  dismissRequest: (rideId: string) => {
    set({
      incomingRequests: get().incomingRequests.filter((req) => req.ride.id !== rideId),
    });
  },

  markArrived: async () => {
    const trip = get().activeTrip;
    if (!trip) return false;

    set({ isLoading: true, error: null });
    try {
      const updated = await api.markDriverArrived(trip.id);
      set({ activeTrip: updated, isLoading: false });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to update arrival' });
      return false;
    }
  },

  startTrip: async (otp: string) => {
    const trip = get().activeTrip;
    if (!trip) return false;

    set({ isLoading: true, error: null });
    try {
      const updated = await api.startRide(trip.id, otp);
      set({ activeTrip: updated, isLoading: false });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Incorrect OTP' });
      return false;
    }
  },

  completeTrip: async (finalFare?: number) => {
    const trip = get().activeTrip;
    if (!trip) return false;

    set({ isLoading: true, error: null });
    try {
      const updated = await api.completeRide(trip.id, finalFare);
      set({ activeTrip: updated, isLoading: false });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to complete trip' });
      return false;
    }
  },

  confirmPaymentReceived: async () => {
    const trip = get().activeTrip;
    if (!trip) return false;

    try {
      const updated = await api.recordPayment(trip.id, {
        method: trip.payment?.method || 'CASH',
        status: 'DRIVER_CONFIRMED_RECEIVED',
      });
      set({ activeTrip: updated });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Failed to confirm payment' });
      return false;
    }
  },

  cancelTrip: async (reason: string) => {
    const trip = get().activeTrip;
    if (!trip) return false;

    set({ isLoading: true, error: null });
    try {
      const updated = await api.cancelRide(trip.id, reason);
      set({ activeTrip: updated, isLoading: false });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to cancel trip' });
      return false;
    }
  },

  reconcileDriverActiveRide: async () => {
    try {
      const data = await api.getActiveRide();
      if (data.ride) {
        set({ activeTrip: data.ride });
        socketService.joinRide(data.ride.id);
      } else {
        if (get().activeTrip?.status === 'RIDE_COMPLETED') {
          // Keep completed state until driver closes summary
        } else {
          set({ activeTrip: null, activeOffer: null });
        }
      }
    } catch (err: any) {
      console.warn('[DriverStore] Reconcile active ride failed:', err.message);
    }
  },

  setupDriverSocketListeners: () => {
    const socket = socketService.getSocket();
    if (!socket) return () => {};

    const onNewRequest = (data: { ride: IRide; distanceMeters: number }) => {
      // If driver is online and not already in an active trip
      if (get().isOnline && !get().activeTrip) {
        const item: DriverRequestItem = {
          ride: data.ride,
          distanceMeters: data.distanceMeters,
          receivedAt: Date.now(),
        };
        set((state) => ({
          incomingRequests: [item, ...state.incomingRequests.filter((r) => r.ride.id !== data.ride.id)],
        }));
      }
    };

    const onDriverSelected = (data: { ride: IRide; offer: IRideOffer }) => {
      set({
        activeTrip: data.ride,
        activeOffer: data.offer,
        incomingRequests: [], // Clear other incoming requests
      });
      socketService.joinRide(data.ride.id);
    };

    const onRideCancelled = (data: { ride: IRide }) => {
      if (get().activeTrip?.id === data.ride.id) {
        set({ activeTrip: data.ride });
      }
    };

    socket.on('ride:new_request', onNewRequest);
    socket.on('ride:driver_selected', onDriverSelected);
    socket.on('ride:cancelled', onRideCancelled);

    const unsubReconnect = socketService.onReconnect(() => {
      get().reconcileDriverActiveRide();
    });

    return () => {
      socket.off('ride:new_request', onNewRequest);
      socket.off('ride:driver_selected', onDriverSelected);
      socket.off('ride:cancelled', onRideCancelled);
      unsubReconnect();
    };
  },

  clearError: () => set({ error: null }),
}));
