import { create } from 'zustand';
import {
  IRide,
  IRideOffer,
  IRideMessage,
  LocationPayload,
  PaymentMethod,
  RouteStatus,
  RouteCoordinate,
} from '@gaon-auto/types';
import { decodePolyline, calculateDistanceMeters } from '@gaon-auto/utils';
import { SYSTEM_CONFIG } from '@gaon-auto/config';
import { api } from '../services/api';
import { socketService } from '../services/socket';

interface RideState {
  activeRide: IRide | null;
  offers: IRideOffer[];
  chatMessages: IRideMessage[];
  driverLocation: { latitude: number; longitude: number; heading?: number; timestamp?: number } | null;
  routeStatus: RouteStatus;
  routeCoordinates: RouteCoordinate[];
  roadDistanceMeters?: number;
  roadDurationSeconds?: number;
  lastRouteOrigin: RouteCoordinate | null;
  isLoading: boolean;
  error: string | null;
  isReconciling: boolean;

  // Actions
  reconcileActiveRide: () => Promise<void>;
  fetchRoute: (force?: boolean) => Promise<void>;
  createRide: (params: {
    pickup: LocationPayload;
    destination: LocationPayload;
    passengerCount?: number;
    vehiclePreference?: 'ANY' | 'AUTO' | 'E_RICKSHAW';
    luggageDescription?: string;
  }) => Promise<IRide>;
  selectOffer: (offerId: string) => Promise<boolean>;
  cancelRide: (reason: string) => Promise<boolean>;
  recordPayment: (method: PaymentMethod, status?: string) => Promise<boolean>;
  submitRating: (stars: number, feedbackTags: string[], comment?: string) => Promise<boolean>;
  sendChatMessage: (text: string, quickReplyCode?: string) => Promise<boolean>;
  setupSocketListeners: () => () => void;
  resetActiveRide: () => void;
  clearError: () => void;
}

export const useRideStore = create<RideState>((set, get) => ({
  activeRide: null,
  offers: [],
  chatMessages: [],
  driverLocation: null,
  routeStatus: 'UNAVAILABLE',
  routeCoordinates: [],
  roadDistanceMeters: undefined,
  roadDurationSeconds: undefined,
  lastRouteOrigin: null,
  isLoading: false,
  error: null,
  isReconciling: false,

  reconcileActiveRide: async () => {
    set({ isReconciling: true });
    try {
      const data = await api.getActiveRide();
      if (data.ride) {
        set({
          activeRide: data.ride,
          offers: data.offers || [],
          chatMessages: data.chatMessages || [],
        });
        // Also join socket room for this ride
        socketService.joinRide(data.ride.id);
        get().fetchRoute(true);
      } else {
        // Only clear if no current active ride
        if (get().activeRide?.status === 'RIDE_COMPLETED' || get().activeRide?.status === 'CANCELLED') {
          // Keep completed ride state for payment/rating until dismissed
        } else {
          set({
            activeRide: null,
            offers: [],
            chatMessages: [],
            driverLocation: null,
            routeStatus: 'UNAVAILABLE',
            routeCoordinates: [],
            roadDistanceMeters: undefined,
            roadDurationSeconds: undefined,
          });
        }
      }
    } catch (err: any) {
      console.warn('[RideStore] Reconcile active ride failed:', err.message);
    } finally {
      set({ isReconciling: false });
    }
  },

  fetchRoute: async (force = false) => {
    const { activeRide, driverLocation, lastRouteOrigin } = get();
    if (!activeRide) return;

    let origin: RouteCoordinate | null = null;
    let destination: RouteCoordinate | null = null;

    const isApproaching = ['DRIVER_SELECTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'RIDE_READY'].includes(
      activeRide.status
    );
    const isStarted = activeRide.status === 'RIDE_STARTED';

    if (isApproaching) {
      if (driverLocation) {
        origin = { latitude: driverLocation.latitude, longitude: driverLocation.longitude };
      }
      if (activeRide.pickup?.location?.coordinates && activeRide.pickup.location.coordinates.length === 2) {
        destination = {
          latitude: activeRide.pickup.location.coordinates[1],
          longitude: activeRide.pickup.location.coordinates[0],
        };
      }
    } else if (isStarted) {
      if (driverLocation) {
        origin = { latitude: driverLocation.latitude, longitude: driverLocation.longitude };
      } else if (activeRide.pickup?.location?.coordinates && activeRide.pickup.location.coordinates.length === 2) {
        origin = {
          latitude: activeRide.pickup.location.coordinates[1],
          longitude: activeRide.pickup.location.coordinates[0],
        };
      }

      // Destination coordinates ONLY if genuinely set (Rule 14)
      if (
        activeRide.destination?.location?.coordinates &&
        activeRide.destination.location.coordinates.length === 2 &&
        typeof activeRide.destination.location.coordinates[1] === 'number' &&
        typeof activeRide.destination.location.coordinates[0] === 'number'
      ) {
        destination = {
          latitude: activeRide.destination.location.coordinates[1],
          longitude: activeRide.destination.location.coordinates[0],
        };
      }
    }

    // If either origin or destination is missing or unverified, routeStatus is UNAVAILABLE (Rule 4 & 14)
    if (!origin || !destination) {
      set({
        routeStatus: 'UNAVAILABLE',
        routeCoordinates: [],
        roadDistanceMeters: undefined,
        roadDurationSeconds: undefined,
      });
      return;
    }

    // Distance threshold check: don't call Google Routes API on every single tick (Rule 12)
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

  createRide: async (params) => {
    set({ isLoading: true, error: null, offers: [], chatMessages: [] });
    try {
      const ride = await api.createRide({
        pickup: params.pickup,
        destination: params.destination,
        passengerCount: params.passengerCount || 1,
        vehiclePreference: params.vehiclePreference || 'ANY',
        luggageDescription: params.luggageDescription,
      });

      set({ activeRide: ride, isLoading: false });
      socketService.joinRide(ride.id);
      return ride;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to request ride' });
      throw err;
    }
  },

  selectOffer: async (offerId: string) => {
    const current = get().activeRide;
    if (!current) return false;

    set({ isLoading: true, error: null });
    try {
      const updatedRide = await api.selectOffer(current.id, offerId);
      set({ activeRide: updatedRide, isLoading: false });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to select offer' });
      return false;
    }
  },

  cancelRide: async (reason: string) => {
    const current = get().activeRide;
    if (!current) return false;

    set({ isLoading: true, error: null });
    try {
      const updatedRide = await api.cancelRide(current.id, reason);
      set({ activeRide: updatedRide, isLoading: false });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to cancel ride' });
      return false;
    }
  },

  recordPayment: async (method: PaymentMethod, status = 'PASSENGER_CLAIMS_PAID') => {
    const current = get().activeRide;
    if (!current) return false;

    try {
      const updatedRide = await api.recordPayment(current.id, {
        method,
        status,
      });
      set({ activeRide: updatedRide });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Payment recording failed' });
      return false;
    }
  },

  submitRating: async (stars: number, feedbackTags: string[], comment?: string) => {
    const current = get().activeRide;
    if (!current) return false;

    try {
      await api.submitRating(current.id, { stars, feedbackTags, comment });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Failed to submit rating' });
      return false;
    }
  },

  sendChatMessage: async (text: string, quickReplyCode?: string) => {
    const current = get().activeRide;
    if (!current) return false;

    const success = await socketService.sendChatMessage(current.id, text, quickReplyCode);
    return success;
  },

  setupSocketListeners: () => {
    const socket = socketService.getSocket();
    if (!socket) return () => {};

    const onOfferReceived = (data: { rideId: string; offer: IRideOffer }) => {
      if (get().activeRide?.id === data.rideId) {
        set((state) => {
          const exists = state.offers.some((o) => o.id === data.offer.id);
          const newOffers = exists
            ? state.offers.map((o) => (o.id === data.offer.id ? data.offer : o))
            : [...state.offers, data.offer];
          return {
            offers: newOffers,
            activeRide: state.activeRide
              ? { ...state.activeRide, status: 'OFFERS_RECEIVED' }
              : null,
          };
        });
      }
    };

    const onDriverSelected = (data: { ride: IRide; offer: IRideOffer }) => {
      if (get().activeRide?.id === data.ride.id) {
        set({ activeRide: data.ride });
        get().fetchRoute(true);
      }
    };

    const onOfferRejected = (data: { offerId: string; rideId: string }) => {
      set((state) => ({
        offers: state.offers.filter((o) => o.id !== data.offerId),
      }));
    };

    const onDriverEnRoute = (data: { ride: IRide }) => {
      if (get().activeRide?.id === data.ride.id) {
        set({ activeRide: data.ride });
        get().fetchRoute(true);
      }
    };

    const onDriverArrived = (data: { ride: IRide }) => {
      if (get().activeRide?.id === data.ride.id) {
        set({ activeRide: data.ride });
      }
    };

    const onRideStarted = (data: { ride: IRide }) => {
      if (get().activeRide?.id === data.ride.id) {
        set({ activeRide: data.ride, lastRouteOrigin: null });
        get().fetchRoute(true);
      }
    };

    const onRideCompleted = (data: { ride: IRide }) => {
      if (get().activeRide?.id === data.ride.id) {
        set({ activeRide: data.ride });
      }
    };

    const onRideCancelled = (data: { ride: IRide }) => {
      if (get().activeRide?.id === data.ride.id) {
        set({ activeRide: data.ride });
      }
    };

    const onNoDriverFound = (data: { rideId: string }) => {
      if (get().activeRide?.id === data.rideId) {
        set((state) => ({
          activeRide: state.activeRide
            ? { ...state.activeRide, status: 'NO_DRIVER_FOUND' }
            : null,
        }));
      }
    };

    const onDriverLocation = (data: {
      driverId: string;
      rideId?: string;
      latitude: number;
      longitude: number;
      heading?: number;
      timestamp?: number;
    }) => {
      const active = get().activeRide;
      if (data.rideId && active && active.id !== data.rideId) {
        return; // Ignore updates from other rides (Rule 5)
      }
      set({
        driverLocation: {
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
        },
      });

      // Recalculate route only when meaningful movement occurs (Rule 12)
      get().fetchRoute(false);
    };

    const onChatMessage = (msg: IRideMessage) => {
      set((state) => ({
        chatMessages: [...state.chatMessages, msg],
      }));
    };

    const onRadiusExpanded = (data: { rideId: string; searchRadiusKm: number; contactedDriversCount: number }) => {
      if (get().activeRide?.id === data.rideId) {
        set((state) => ({
          activeRide: state.activeRide
            ? {
                ...state.activeRide,
                searchRadiusKm: data.searchRadiusKm,
                contactedDriversCount: data.contactedDriversCount,
              }
            : null,
        }));
      }
    };

    socket.on('ride:offer_received', onOfferReceived);
    socket.on('ride:driver_selected', onDriverSelected);
    socket.on('ride:offer_rejected', onOfferRejected);
    socket.on('ride:driver_en_route', onDriverEnRoute);
    socket.on('ride:driver_arrived', onDriverArrived);
    socket.on('ride:started', onRideStarted);
    socket.on('ride:completed', onRideCompleted);
    socket.on('ride:cancelled', onRideCancelled);
    socket.on('ride:radius_expanded', onRadiusExpanded);
    socket.on('ride:no_driver_found', onNoDriverFound);
    socket.on('driver:location' as any, onDriverLocation as any);
    socket.on('driver:location_updated', onDriverLocation as any);
    socket.on('chat:message', onChatMessage);

    // Auto reconnect hook (Rule 16: fetch authoritative active ride & reconcile)
    const unsubReconnect = socketService.onReconnect(() => {
      get().reconcileActiveRide();
    });

    return () => {
      socket.off('ride:offer_received', onOfferReceived);
      socket.off('ride:driver_selected', onDriverSelected);
      socket.off('ride:offer_rejected', onOfferRejected);
      socket.off('ride:driver_en_route', onDriverEnRoute);
      socket.off('ride:driver_arrived', onDriverArrived);
      socket.off('ride:started', onRideStarted);
      socket.off('ride:completed', onRideCompleted);
      socket.off('ride:cancelled', onRideCancelled);
      socket.off('ride:radius_expanded', onRadiusExpanded);
      socket.off('ride:no_driver_found', onNoDriverFound);
      socket.off('driver:location' as any, onDriverLocation as any);
      socket.off('driver:location_updated', onDriverLocation as any);
      socket.off('chat:message', onChatMessage);
      unsubReconnect();
    };
  },

  resetActiveRide: () => {
    set({
      activeRide: null,
      offers: [],
      chatMessages: [],
      driverLocation: null,
      routeStatus: 'UNAVAILABLE',
      routeCoordinates: [],
      roadDistanceMeters: undefined,
      roadDurationSeconds: undefined,
      lastRouteOrigin: null,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
