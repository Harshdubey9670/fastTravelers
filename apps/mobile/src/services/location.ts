import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { api } from './api';
import { socketService } from './socket';

export interface UserCoords {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export type LocationPermissionState = 'UNDETERMINED' | 'GRANTED' | 'DENIED' | 'SERVICES_DISABLED';

export const DRIVER_BACKGROUND_TASK_NAME = 'GAON_AUTO_DRIVER_BACKGROUND_LOCATION';

let onCoordsUpdateCallback: ((coords: UserCoords) => void) | null = null;

// Register the background location task if not already defined (Step 11)
if (!TaskManager.isTaskDefined(DRIVER_BACKGROUND_TASK_NAME)) {
  TaskManager.defineTask(DRIVER_BACKGROUND_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
      console.warn('[LocationService] Background location error:', error.message);
      return;
    }
    if (data && data.locations && data.locations.length > 0) {
      const loc = data.locations[data.locations.length - 1];
      const heading = typeof loc.coords.heading === 'number' ? loc.coords.heading : undefined;
      const speed = typeof loc.coords.speed === 'number' ? loc.coords.speed : undefined;
      const accuracy = typeof loc.coords.accuracy === 'number' ? loc.coords.accuracy : undefined;

      const coords: UserCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        heading,
        speed,
        accuracy,
      };

      // Stream to socket and REST during screen lock / background
      socketService.updateDriverLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading,
        speed,
        accuracy,
      });

      api.updateLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading,
        speed,
        accuracy,
      }).catch(() => {});

      if (onCoordsUpdateCallback) {
        onCoordsUpdateCallback(coords);
      }
    }
  });
}

class LocationService {
  private watcherSubscription: Location.LocationSubscription | null = null;
  private lastUpdateTime = 0;
  private minIntervalMs = 5000; // Throttle to every 5s min to protect battery

  /**
   * Checks and requests foreground location permissions.
   */
  async requestPermission(): Promise<{ status: LocationPermissionState; error?: string }> {
    try {
      const isServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isServicesEnabled) {
        return { status: 'SERVICES_DISABLED', error: 'GPS is disabled on device. Please enable Location Services.' };
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { status: 'DENIED', error: 'Location permission was denied.' };
      }

      return { status: 'GRANTED' };
    } catch (err: any) {
      return { status: 'DENIED', error: err.message || 'Failed to request location permission' };
    }
  }

  /**
   * Gets the current user GPS coordinates.
   */
  async getCurrentLocation(): Promise<UserCoords | null> {
    try {
      const perm = await this.requestPermission();
      if (perm.status !== 'GRANTED') {
        console.warn('[LocationService] Cannot get location:', perm.error);
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        heading: loc.coords.heading,
        speed: loc.coords.speed,
      };
    } catch (err: any) {
      console.warn('[LocationService] getCurrentLocation error:', err.message);
      return null;
    }
  }

  /**
   * Reverse geocodes coordinates to a human-readable village / landmark address.
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results && results.length > 0) {
        const item = results[0];
        const parts = [
          item.name,
          item.street,
          item.district || item.subregion,
          item.city || item.region,
        ].filter(Boolean);
        return parts.join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
    } catch (err) {
      console.warn('[LocationService] reverseGeocode failed:', err);
    }
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  /**
   * Starts tracking driver GPS in foreground and streaming coordinates to backend.
   * Also activates Android foreground service for screen-locked tracking (Step 11).
   */
  async startDriverLocationTracking(onCoordsUpdate?: (coords: UserCoords) => void) {
    if (onCoordsUpdate) {
      onCoordsUpdateCallback = onCoordsUpdate;
    }

    if (this.watcherSubscription) {
      return; // Already tracking
    }

    const perm = await this.requestPermission();
    if (perm.status !== 'GRANTED') {
      console.warn('[LocationService] Driver location tracking denied:', perm.error);
      return;
    }

    // Try starting native background task with Android foreground service (Step 11)
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_TASK_NAME);
      if (!hasStarted) {
        await Location.startLocationUpdatesAsync(DRIVER_BACKGROUND_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // 5 seconds
          distanceInterval: 10, // 10 meters movement
          foregroundService: {
            notificationTitle: 'Gaon Auto चालक साथी',
            notificationBody: 'लाइव लोकेशन सक्रिय है / Live ride tracking active',
            notificationColor: '#FF6B00',
          },
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
        });
        console.log('[LocationService] Background location service started.');
      }
    } catch (bgErr: any) {
      console.log('[LocationService] Background updates fallback to foreground watcher:', bgErr.message);
    }

    try {
      this.watcherSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // 5 seconds
          distanceInterval: 10, // 10 meters movement
        },
        (loc) => {
          const coords: UserCoords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading || undefined,
            speed: loc.coords.speed || undefined,
            accuracy: loc.coords.accuracy || undefined,
          };

          const now = Date.now();
          if (now - this.lastUpdateTime >= this.minIntervalMs) {
            this.lastUpdateTime = now;

            // Stream over Socket.IO if connected
            socketService.updateDriverLocation({
              latitude: coords.latitude,
              longitude: coords.longitude,
              heading: coords.heading || undefined,
              speed: coords.speed || undefined,
              accuracy: coords.accuracy || undefined,
            });

            // Also persist via REST for durability
            api.updateLocation({
              latitude: coords.latitude,
              longitude: coords.longitude,
              heading: coords.heading || undefined,
              speed: coords.speed || undefined,
              accuracy: coords.accuracy || undefined,
            }).catch(() => {});
          }

          if (onCoordsUpdate) {
            onCoordsUpdate(coords);
          }
        }
      );
      console.log('[LocationService] Driver GPS tracking started.');
    } catch (err) {
      console.warn('[LocationService] Error watching position:', err);
    }
  }

  /**
   * Stops driver GPS tracking when going offline.
   */
  stopDriverLocationTracking() {
    onCoordsUpdateCallback = null;

    if (this.watcherSubscription) {
      this.watcherSubscription.remove();
      this.watcherSubscription = null;
      console.log('[LocationService] Driver GPS tracking stopped.');
    }

    Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_TASK_NAME)
      .then((started) => {
        if (started) {
          Location.stopLocationUpdatesAsync(DRIVER_BACKGROUND_TASK_NAME).catch(() => {});
        }
      })
      .catch(() => {});
  }
}

export const locationService = new LocationService();
