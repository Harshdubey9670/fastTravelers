import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useRideStore } from '../store/useRideStore';
import { useDriverStore } from '../store/useDriverStore';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { PassengerHomeScreen } from '../screens/passenger/PassengerHomeScreen';
import { SearchingRideScreen } from '../screens/passenger/SearchingRideScreen';
import { OffersScreen } from '../screens/passenger/OffersScreen';
import { ActiveRideScreen } from '../screens/passenger/ActiveRideScreen';
import { PaymentRatingScreen } from '../screens/passenger/PaymentRatingScreen';
import { DriverHomeScreen } from '../screens/driver/DriverHomeScreen';
import { DriverOnboardingScreen } from '../screens/driver/DriverOnboardingScreen';
import { DriverActiveRideScreen } from '../screens/driver/DriverActiveRideScreen';
import { HistoryScreen } from '../screens/shared/HistoryScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

type PassengerNavState =
  | 'HOME'
  | 'SEARCHING'
  | 'OFFERS'
  | 'ACTIVE_RIDE'
  | 'PAYMENT_RATING'
  | 'HISTORY'
  | 'PROFILE';

type DriverNavState =
  | 'ONBOARDING'
  | 'DASHBOARD'
  | 'ACTIVE_TRIP'
  | 'HISTORY'
  | 'PROFILE';

export default function RootNavigator() {
  const { isAuthenticated, currentRole, loadProfile, driverProfile } = useAuthStore();
  const { activeRide, reconcileActiveRide, setupSocketListeners } = useRideStore();
  const { activeTrip, reconcileDriverActiveRide, setupDriverSocketListeners } = useDriverStore();

  const [loginPhone, setLoginPhone] = useState<string | null>(null);
  const [passengerScreen, setPassengerScreen] = useState<PassengerNavState>('HOME');
  const [driverScreen, setDriverScreen] = useState<DriverNavState>('DASHBOARD');

  // Load profile and setup socket listeners when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
      const unsubRide = setupSocketListeners();
      const unsubDriver = setupDriverSocketListeners();

      if (currentRole === 'PASSENGER') {
        reconcileActiveRide();
      } else {
        reconcileDriverActiveRide();
      }

      return () => {
        unsubRide();
        unsubDriver();
      };
    }
  }, [isAuthenticated, currentRole]);

  // Synchronize passenger screen state with authoritative backend active ride
  useEffect(() => {
    if (!isAuthenticated || currentRole !== 'PASSENGER') return;

    if (!activeRide) {
      if (passengerScreen !== 'HISTORY' && passengerScreen !== 'PROFILE') {
        setPassengerScreen('HOME');
      }
      return;
    }

    switch (activeRide.status) {
      case 'SEARCHING_DRIVER':
        setPassengerScreen('SEARCHING');
        break;
      case 'OFFERS_RECEIVED':
        setPassengerScreen('OFFERS');
        break;
      case 'DRIVER_SELECTED':
      case 'DRIVER_EN_ROUTE':
      case 'DRIVER_ARRIVED':
      case 'RIDE_STARTED':
        setPassengerScreen('ACTIVE_RIDE');
        break;
      case 'RIDE_COMPLETED':
        setPassengerScreen('PAYMENT_RATING');
        break;
      case 'CANCELLED':
      case 'EXPIRED':
      case 'NO_DRIVER_FOUND':
        // If searching and no driver found, stay on searching to show retry
        if (passengerScreen !== 'SEARCHING') {
          setPassengerScreen('HOME');
        }
        break;
      default:
        break;
    }
  }, [activeRide?.status, isAuthenticated, currentRole]);

  // Synchronize driver screen state with authoritative backend active ride
  useEffect(() => {
    if (!isAuthenticated || currentRole !== 'DRIVER') return;

    if (
      activeTrip &&
      activeTrip.status !== 'CANCELLED' &&
      activeTrip.status !== 'EXPIRED'
    ) {
      setDriverScreen('ACTIVE_TRIP');
    } else {
      if (driverScreen !== 'HISTORY' && driverScreen !== 'PROFILE') {
        setDriverScreen('DASHBOARD');
      }
    }
  }, [activeTrip?.status, isAuthenticated, currentRole]);

  // ==========================================
  // 1. AUTH FLOW (If not authenticated)
  // ==========================================
  if (!isAuthenticated) {
    if (loginPhone) {
      return (
        <OtpScreen
          phone={loginPhone}
          onChangeNumber={() => setLoginPhone(null)}
          onSuccess={() => setLoginPhone(null)}
        />
      );
    }
    return (
      <LoginScreen
        onOtpRequested={(phone) => setLoginPhone(phone)}
      />
    );
  }

  // ==========================================
  // 2. DRIVER FLOW
  // ==========================================
  if (currentRole === 'DRIVER') {
    const isApproved = driverProfile?.verificationStatus === 'APPROVED';

    if (!isApproved || driverScreen === 'ONBOARDING') {
      return (
        <DriverOnboardingScreen
          onSuccess={() => setDriverScreen('DASHBOARD')}
        />
      );
    }

    switch (driverScreen) {
      case 'ACTIVE_TRIP':
        return (
          <DriverActiveRideScreen
            onTripFinished={() => setDriverScreen('DASHBOARD')}
          />
        );
      case 'HISTORY':
        return (
          <HistoryScreen
            onBack={() => setDriverScreen('DASHBOARD')}
          />
        );
      case 'PROFILE':
        return (
          <ProfileScreen
            onBack={() => setDriverScreen('DASHBOARD')}
          />
        );
      default:
        return (
          <DriverHomeScreen
            onActiveTripOpened={() => setDriverScreen('ACTIVE_TRIP')}
            onOpenHistory={() => setDriverScreen('HISTORY')}
            onOpenProfile={() => setDriverScreen('PROFILE')}
          />
        );
    }
  }

  // ==========================================
  // 3. PASSENGER FLOW
  // ==========================================
  switch (passengerScreen) {
    case 'SEARCHING':
      return (
        <SearchingRideScreen
          onOffersReceived={() => setPassengerScreen('OFFERS')}
          onCancelled={() => setPassengerScreen('HOME')}
        />
      );
    case 'OFFERS':
      return (
        <OffersScreen
          onOfferSelected={() => setPassengerScreen('ACTIVE_RIDE')}
          onCancel={() => setPassengerScreen('HOME')}
        />
      );
    case 'ACTIVE_RIDE':
      return (
        <ActiveRideScreen
          onRideCompleted={() => setPassengerScreen('PAYMENT_RATING')}
          onRideCancelled={() => setPassengerScreen('HOME')}
        />
      );
    case 'PAYMENT_RATING':
      return (
        <PaymentRatingScreen
          onFinished={() => setPassengerScreen('HOME')}
        />
      );
    case 'HISTORY':
      return (
        <HistoryScreen
          onBack={() => setPassengerScreen('HOME')}
        />
      );
    case 'PROFILE':
      return (
        <ProfileScreen
          onBack={() => setPassengerScreen('HOME')}
        />
      );
    default:
      return (
        <PassengerHomeScreen
          onRideCreated={() => setPassengerScreen('SEARCHING')}
          onOpenHistory={() => setPassengerScreen('HISTORY')}
          onOpenProfile={() => setPassengerScreen('PROFILE')}
        />
      );
  }
}
