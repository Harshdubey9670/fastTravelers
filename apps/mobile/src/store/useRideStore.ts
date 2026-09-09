import { create } from 'zustand';
import {
  IRide,
  IRideOffer,
  IRideMessage,
  LocationPayload,
  PaymentMethod,
} from '@gaon-auto/types';
import { api } from '../services/api';
import { socketService } from '../services/socket';

interface RideState {
  activeRide: IRide | null;
  offers: IRideOffer[];
  chatMessages: IRideMessage[];
  driverLocation: { latitude: number; longitude: number; heading?: number } | null;
  isLoading: boolean;
  error: string | null;
  isReconciling: boolean;

  // Actions
  reconcileActiveRide: () => Promise<void>;
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
      } else {
        // Only clear if no current active ride
        if (get().activeRide?.status === 'RIDE_COMPLETED' || get().activeRide?.status === 'CANCELLED') {
          // Keep completed ride state for payment/rating until dismissed
        } else {
          set({ activeRide: null, offers: [], chatMessages: [] });
        }
      }
    } catch (err: any) {
      console.warn('[RideStore] Reconcile active ride failed:', err.message);
    } finally {
      set({ isReconciling: false });
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
      }
    };

    const onDriverArrived = (data: { ride: IRide }) => {
      if (get().activeRide?.id === data.ride.id) {
        set({ activeRide: data.ride });
      }
    };

    const onRideStarted = (data: { ride: IRide }) => {
      if (get().activeRide?.id === data.ride.id) {
        set({ activeRide: data.ride });
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

    const onDriverLocation = (data: { driverId: string; latitude: number; longitude: number; heading?: number }) => {
      set({
        driverLocation: {
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
        },
      });
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
    socket.on('driver:location_updated', onDriverLocation);
    socket.on('chat:message', onChatMessage);

    // Auto reconnect hook
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
      socket.off('driver:location_updated', onDriverLocation);
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
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
