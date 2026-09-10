import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Colors } from '../theme/colors';
import { AutoRickshawMarker } from './AutoRickshawMarker';
import { SYSTEM_CONFIG } from '@gaon-auto/config';
import { RouteStatus, RouteCoordinate } from '@gaon-auto/types';

// Conditionally import MapView from react-native-maps for native platforms
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const MapsModule = require('react-native-maps');
  MapView = MapsModule.default || MapsModule;
  Marker = MapsModule.Marker;
  Polyline = MapsModule.Polyline;
  PROVIDER_GOOGLE = MapsModule.PROVIDER_GOOGLE;
} catch (err) {
  // Graceful fallback for non-native / web environments
  MapView = null;
}

export interface LiveRideMapProps {
  mode: 'passenger' | 'driver';
  pickup?: {
    latitude: number;
    longitude: number;
    addressText?: string;
  } | null;
  destination?: {
    latitude?: number | null;
    longitude?: number | null;
    addressText?: string;
  } | null;
  driverLocation?: {
    latitude: number;
    longitude: number;
    heading?: number;
    timestamp?: number;
  } | null;
  vehicleType?: string;
  routeStatus?: RouteStatus;
  routeCoordinates?: RouteCoordinate[];
  roadDistanceMeters?: number;
  roadDurationSeconds?: number;
  language?: 'hi' | 'en';
  height?: number;
  onRefreshRoute?: () => void;
}

export const LiveRideMap: React.FC<LiveRideMapProps> = ({
  mode,
  pickup,
  destination,
  driverLocation,
  vehicleType = 'AUTO',
  routeStatus = 'UNAVAILABLE',
  routeCoordinates = [],
  roadDistanceMeters,
  roadDurationSeconds,
  language = 'hi',
  height = 300,
  onRefreshRoute,
}) => {
  const mapRef = useRef<any>(null);

  const [permissionStatus, setPermissionStatus] = useState<
    'UNDETERMINED' | 'GRANTED' | 'DENIED' | 'SERVICES_DISABLED'
  >('UNDETERMINED');
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  // Default coordinate center (Lucknow / Uttar Pradesh region or pickup)
  const initialLat = pickup?.latitude || driverLocation?.latitude || 26.8467;
  const initialLng = pickup?.longitude || driverLocation?.longitude || 80.9462;

  // Stale driver location check (Rule 9: > 30s is stale)
  const isDriverStale = Boolean(
    driverLocation?.timestamp &&
      Date.now() - driverLocation.timestamp > SYSTEM_CONFIG.DRIVER_LOCATION_STALE_DISPLAY_MS
  );

  /**
   * Checks & requests location permissions (Rule 15 & MyLocationDemoActivity)
   */
  const requestLocation = useCallback(async () => {
    setIsLocating(true);
    setPermissionMessage(null);

    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setPermissionStatus('SERVICES_DISABLED');
        setPermissionMessage(
          language === 'hi'
            ? 'GPS सेवा बंद है। कृपया सेटिंग्स से लोकेशन ऑन करें।'
            : 'GPS service is disabled. Please turn on Location in Settings.'
        );
        setIsLocating(false);
        return null;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionStatus('DENIED');
        setPermissionMessage(
          language === 'hi'
            ? 'लोकेशन अनुमति अस्वीकृत है।'
            : 'Location permission was denied.'
        );
        setIsLocating(false);
        return null;
      }

      setPermissionStatus('GRANTED');
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setUserLocation(coords);
      setIsLocating(false);
      return coords;
    } catch (err: any) {
      setPermissionStatus('DENIED');
      setPermissionMessage(
        language === 'hi' ? 'स्थान प्राप्त नहीं हो सका' : 'Could not retrieve location'
      );
      setIsLocating(false);
      return null;
    }
  }, [language]);

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  /**
   * "My Location" Button Handler (MyLocationDemoActivity logic)
   * Requests permission if needed and centers camera to current GPS location.
   */
  const handleMyLocationPress = async () => {
    const coords = await requestLocation();
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        700
      );
    }
  };

  /**
   * "Fit Both / Overview" Button Handler
   * Fits driver location and pickup/destination inside the visible viewport.
   */
  const handleFitBothPress = () => {
    if (!mapRef.current) return;

    const pointsToFit: Array<{ latitude: number; longitude: number }> = [];

    if (driverLocation?.latitude && driverLocation?.longitude) {
      pointsToFit.push({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
      });
    }

    if (pickup?.latitude && pickup?.longitude) {
      pointsToFit.push({
        latitude: pickup.latitude,
        longitude: pickup.longitude,
      });
    }

    if (destination?.latitude && destination?.longitude) {
      pointsToFit.push({
        latitude: destination.latitude,
        longitude: destination.longitude,
      });
    }

    if (pointsToFit.length >= 2) {
      mapRef.current.fitToCoordinates(pointsToFit, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    } else if (pointsToFit.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: pointsToFit[0].latitude,
          longitude: pointsToFit[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        600
      );
    }
  };

  /**
   * Open External Google Maps for turn-by-turn spoken navigation (Rule 10 & 11)
   */
  const handleOpenGoogleNavigation = () => {
    const target =
      mode === 'driver' && destination?.latitude && destination?.longitude
        ? destination
        : pickup;

    if (!target || !target.latitude || !target.longitude) return;

    const url = Platform.select({
      ios: `maps://app?daddr=${target.latitude},${target.longitude}&dirflg=d`,
      android: `google.navigation:q=${target.latitude},${target.longitude}&mode=d`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}&travelmode=driving`,
    });

    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}&travelmode=driving`
      );
    });
  };

  // Check if destination coordinates genuinely exist (Rule 14)
  const hasValidDestinationCoords = Boolean(
    destination?.latitude &&
      destination?.longitude &&
      typeof destination.latitude === 'number' &&
      typeof destination.longitude === 'number'
  );

  // Format road ETA and distance
  const etaMinutes =
    roadDurationSeconds && roadDurationSeconds > 0
      ? Math.ceil(roadDurationSeconds / 60)
      : null;

  const distanceKmText =
    roadDistanceMeters && roadDistanceMeters > 0
      ? roadDistanceMeters < 1000
        ? `${roadDistanceMeters} m`
        : `${(roadDistanceMeters / 1000).toFixed(1)} km`
      : null;

  // Render Web / Fallback view if native MapView is not available
  if (!MapView || Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackTitle}>
            🗺️ {language === 'hi' ? 'लाइव लोकेशन मैप' : 'Live Location Map'}
          </Text>

          {/* Status Indicators */}
          <View style={styles.fallbackPillRow}>
            {driverLocation ? (
              <View style={styles.liveIndicator}>
                <View style={styles.liveGreenDot} />
                <Text style={styles.liveText}>
                  {language === 'hi' ? 'चालक लाइव' : 'Driver Live'}:{' '}
                  {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}
                </Text>
              </View>
            ) : null}

            {isDriverStale ? (
              <View style={styles.staleBanner}>
                <Text style={styles.staleText}>
                  ⚠️{' '}
                  {language === 'hi'
                    ? 'चालक का स्थान अपडेट हो रहा है...'
                    : 'Driver location updating...'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Route Status */}
          {routeStatus === 'AVAILABLE' && (distanceKmText || etaMinutes) ? (
            <View style={styles.routeAvailablePill}>
              <Text style={styles.routeAvailableText}>
                🛣️ {distanceKmText} • ~{etaMinutes} {language === 'hi' ? 'मिनट' : 'mins'} (Road)
              </Text>
            </View>
          ) : (
            <View style={styles.routeUnavailablePill}>
              <Text style={styles.routeUnavailableText}>
                ℹ️ {language === 'hi' ? 'मार्ग जानकारी अनुपलब्ध' : 'Route information unavailable'}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.fallbackActionRow}>
            <TouchableOpacity style={styles.controlBtn} onPress={handleMyLocationPress}>
              <Text style={styles.controlBtnText}>🎯 {language === 'hi' ? 'मेरा स्थान' : 'My Location'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={handleOpenGoogleNavigation}>
              <Text style={styles.controlBtnText}>↗️ {language === 'hi' ? 'गूगल मैप्स नेविगेशन' : 'Google Maps'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Render Native Google Maps
  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: initialLat,
          longitude: initialLng,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
        showsUserLocation={permissionStatus === 'GRANTED'}
        showsMyLocationButton={false}
        showsCompass={true}
        loadingEnabled={true}
      >
        {/* Passenger Pickup Marker (🟢) */}
        {pickup?.latitude && pickup?.longitude ? (
          <Marker
            coordinate={{
              latitude: pickup.latitude,
              longitude: pickup.longitude,
            }}
            title={language === 'hi' ? 'पिकअप स्थान' : 'Pickup Location'}
            description={pickup.addressText || ''}
            pinColor="#10B981"
          />
        ) : null}

        {/* Destination Marker (🔴) - ONLY when coordinates exist (Rule 14) */}
        {hasValidDestinationCoords ? (
          <Marker
            coordinate={{
              latitude: destination!.latitude!,
              longitude: destination!.longitude!,
            }}
            title={language === 'hi' ? 'गंतव्य' : 'Destination'}
            description={destination!.addressText || ''}
            pinColor="#EF4444"
          />
        ) : null}

        {/* Live Driver Marker (🛺 Auto / E-Rickshaw with Heading) */}
        {driverLocation?.latitude && driverLocation?.longitude ? (
          <Marker
            coordinate={{
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            title={language === 'hi' ? 'चालक साथी' : 'Driver Partner'}
          >
            <AutoRickshawMarker
              heading={driverLocation.heading}
              vehicleType={vehicleType}
            />
          </Marker>
        ) : null}

        {/* Road Route Polyline - ONLY when routeStatus === 'AVAILABLE' (Rules 3 & 4) */}
        {routeStatus === 'AVAILABLE' && routeCoordinates.length > 0 ? (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#3B82F6"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
      </MapView>

      {/* Top Banner: Route Status / Stale Driver Notice */}
      <View style={styles.topOverlayContainer}>
        {isDriverStale ? (
          <View style={styles.staleBanner}>
            <Text style={styles.staleText}>
              ⏳{' '}
              {language === 'hi'
                ? 'चालक का स्थान अपडेट हो रहा है...'
                : 'Driver location updating...'}
            </Text>
          </View>
        ) : null}

        {routeStatus === 'AVAILABLE' && (distanceKmText || etaMinutes) ? (
          <View style={styles.routeAvailablePill}>
            <Text style={styles.routeAvailableText}>
              🛣️ {distanceKmText} • ~{etaMinutes} {language === 'hi' ? 'मिनट' : 'mins'}
            </Text>
          </View>
        ) : (
          <View style={styles.routeUnavailablePill}>
            <Text style={styles.routeUnavailableText}>
              ℹ️ {language === 'hi' ? 'मार्ग जानकारी अनुपलब्ध' : 'Route information unavailable'}
            </Text>
          </View>
        )}
      </View>

      {/* Floating Controls: Fit Both, My Location, External Navigation */}
      <View style={styles.controlsContainer}>
        {/* Fit Both Button */}
        <TouchableOpacity
          style={styles.floatingBtn}
          onPress={handleFitBothPress}
          activeOpacity={0.8}
        >
          <Text style={styles.floatingBtnText}>🔍</Text>
        </TouchableOpacity>

        {/* My Location Button (MyLocationDemoActivity) */}
        <TouchableOpacity
          style={styles.floatingBtn}
          onPress={handleMyLocationPress}
          disabled={isLocating}
          activeOpacity={0.8}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.floatingBtnText}>🎯</Text>
          )}
        </TouchableOpacity>

        {/* External Google Navigation for Turn-by-Turn GPS */}
        <TouchableOpacity
          style={[styles.floatingBtn, styles.navBtn]}
          onPress={handleOpenGoogleNavigation}
          activeOpacity={0.8}
        >
          <Text style={styles.navBtnText}>↗️</Text>
        </TouchableOpacity>
      </View>

      {/* Permission message banner if denied/disabled */}
      {permissionMessage ? (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>{permissionMessage}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#151D2C',
    position: 'relative',
    marginVertical: 12,
  },
  topOverlayContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    alignItems: 'flex-start',
    zIndex: 10,
    gap: 6,
  },
  staleBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  staleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  routeAvailablePill: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderColor: '#3B82F6',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  routeAvailableText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  routeUnavailablePill: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  routeUnavailableText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    zIndex: 10,
    gap: 8,
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingBtnText: {
    fontSize: 18,
  },
  navBtn: {
    backgroundColor: '#FF6B00',
    borderColor: '#E05300',
  },
  navBtnText: {
    fontSize: 18,
  },
  permissionBanner: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 70,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  permissionText: {
    color: '#FACC15',
    fontSize: 11,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  fallbackPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
    justifyContent: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  liveGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  fallbackActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  controlBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  controlBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
});
