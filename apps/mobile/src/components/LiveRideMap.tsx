import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
import { PickupPinMarker, DestinationPinMarker } from './MapPinMarkers';
import { SYSTEM_CONFIG } from '@gaon-auto/config';
import { RouteStatus, RouteCoordinate } from '@gaon-auto/types';

// Conditionally load MapLibre for native platforms with graceful web/fallback support
let MapLibreGL: any = null;

try {
  const MLRN = require('@maplibre/maplibre-react-native');
  MapLibreGL = MLRN.default || MLRN;
} catch (err) {
  MapLibreGL = null;
}

/**
 * Resolves map tile / style JSON URL (Step 4)
 * Priority:
 * 1. EXPO_PUBLIC_MAP_STYLE_URL or MAP_STYLE_URL (custom hosted style)
 * 2. EXPO_PUBLIC_MAPTILER_API_KEY (MapTiler Streets style)
 * 3. Default fallback: MapLibre Demotiles (completely open, free, no API key required)
 */
export const getMapStyleUrl = (): string => {
  const customUrl =
    process.env.EXPO_PUBLIC_MAP_STYLE_URL ||
    (typeof process !== 'undefined' && (process.env as any)?.MAP_STYLE_URL);
  if (customUrl) {
    return customUrl;
  }

  const maptilerKey =
    process.env.EXPO_PUBLIC_MAPTILER_API_KEY ||
    (typeof process !== 'undefined' && (process.env as any)?.MAPTILER_API_KEY);
  if (maptilerKey) {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`;
  }

  // Completely open, free style that works out-of-the-box for development and testing
  return 'https://demotiles.maplibre.org/style.json';
};

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
  const cameraRef = useRef<any>(null);

  const [permissionStatus, setPermissionStatus] = useState<
    'UNDETERMINED' | 'GRANTED' | 'DENIED' | 'SERVICES_DISABLED'
  >('UNDETERMINED');
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  const mapStyle = useMemo(() => getMapStyleUrl(), []);

  // Default coordinate center (Lucknow / Uttar Pradesh region or pickup)
  const initialLat = pickup?.latitude || driverLocation?.latitude || 26.8467;
  const initialLng = pickup?.longitude || driverLocation?.longitude || 80.9462;

  // Stale driver location check (> 30s is stale)
  const isDriverStale = Boolean(
    driverLocation?.timestamp &&
      Date.now() - driverLocation.timestamp > SYSTEM_CONFIG.DRIVER_LOCATION_STALE_DISPLAY_MS
  );

  /**
   * Checks & requests location permissions (via expo-location)
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
   * "My Location" Button Handler
   * Requests permission if needed and centers camera to current GPS location.
   */
  const handleMyLocationPress = async () => {
    const coords = await requestLocation();
    if (coords && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [coords.longitude, coords.latitude],
        zoomLevel: 15.5,
        animationDuration: 700,
      });
    }
  };

  /**
   * "Fit Both / Overview" Button Handler
   * Fits driver location and pickup/destination inside the visible viewport.
   */
  const handleFitBothPress = () => {
    if (!cameraRef.current) return;

    const points: Array<[number, number]> = [];

    if (driverLocation?.latitude && driverLocation?.longitude) {
      points.push([driverLocation.longitude, driverLocation.latitude]);
    }

    if (pickup?.latitude && pickup?.longitude) {
      points.push([pickup.longitude, pickup.latitude]);
    }

    if (hasValidDestinationCoords) {
      points.push([destination!.longitude!, destination!.latitude!]);
    }

    if (points.length >= 2) {
      let minLng = points[0][0];
      let maxLng = points[0][0];
      let minLat = points[0][1];
      let maxLat = points[0][1];

      for (const [lng, lat] of points) {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }

      // Add minimum padding margin if coordinates are very close
      if (maxLng - minLng < 0.005) {
        maxLng += 0.003;
        minLng -= 0.003;
      }
      if (maxLat - minLat < 0.005) {
        maxLat += 0.003;
        minLat -= 0.003;
      }

      cameraRef.current.fitBounds(
        [maxLng, maxLat],
        [minLng, minLat],
        [50, 50, 50, 50],
        800
      );
    } else if (points.length === 1) {
      cameraRef.current.setCamera({
        centerCoordinate: points[0],
        zoomLevel: 15,
        animationDuration: 600,
      });
    }
  };

  /**
   * Open External Navigation (Step 11)
   * Uses Linking.canOpenURL() to open native Google Maps or fallback without crashing.
   * Does NOT require Google Maps Platform API key.
   */
  const handleOpenExternalNavigation = async () => {
    const target =
      mode === 'driver' && destination?.latitude && destination?.longitude
        ? destination
        : pickup;

    if (!target || !target.latitude || !target.longitude) return;

    const lat = target.latitude;
    const lng = target.longitude;

    const nativeGoogleMapsUrl = `google.navigation:q=${lat},${lng}&mode=d`;
    const iosMapsUrl = `maps://app?daddr=${lat},${lng}&dirflg=d`;
    const browserGoogleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    const osmWebUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${lat}%2C${lng}`;

    try {
      if (Platform.OS === 'android') {
        const canOpenNative = await Linking.canOpenURL(nativeGoogleMapsUrl);
        if (canOpenNative) {
          await Linking.openURL(nativeGoogleMapsUrl);
          return;
        }
      } else if (Platform.OS === 'ios') {
        const canOpenIos = await Linking.canOpenURL(iosMapsUrl);
        if (canOpenIos) {
          await Linking.openURL(iosMapsUrl);
          return;
        }
      }

      const canOpenBrowser = await Linking.canOpenURL(browserGoogleUrl);
      if (canOpenBrowser) {
        await Linking.openURL(browserGoogleUrl);
      } else {
        await Linking.openURL(osmWebUrl);
      }
    } catch (err) {
      console.warn('[LiveRideMap] Navigation launch error:', err);
      Linking.openURL(browserGoogleUrl).catch(() => {});
    }
  };

  // Check if destination coordinates genuinely exist (Step 10)
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

  // Build GeoJSON Feature for route polyline
  const routeGeoJSON = useMemo(() => {
    if (routeStatus !== 'AVAILABLE' || routeCoordinates.length < 2) {
      return null;
    }

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: routeCoordinates.map((c) => [c.longitude, c.latitude]),
      },
    };
  }, [routeStatus, routeCoordinates]);

  // Render Web / Fallback view if native MapLibre is not available
  if (!MapLibreGL || Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackTitle}>
            🗺️ {language === 'hi' ? 'लाइव लोकेशन मैप (MapLibre)' : 'Live Location Map (MapLibre)'}
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

          {/* Destination Text (Step 10: show text even when coords missing) */}
          {destination?.addressText ? (
            <View style={styles.destinationTextBanner}>
              <Text style={styles.destinationTextLabel}>
                🏁 {destination.addressText}
                {!hasValidDestinationCoords
                  ? ` (${language === 'hi' ? 'स्थान केवल नाम से' : 'Approximate / Named Only'})`
                  : ''}
              </Text>
            </View>
          ) : null}

          {/* Route Status */}
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

          {/* Action Buttons */}
          <View style={styles.fallbackActionRow}>
            <TouchableOpacity style={styles.controlBtn} onPress={handleMyLocationPress}>
              <Text style={styles.controlBtnText}>
                🎯 {language === 'hi' ? 'मेरा स्थान' : 'My Location'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={handleOpenExternalNavigation}>
              <Text style={styles.controlBtnText}>
                ↗️ {language === 'hi' ? 'नेविगेशन' : 'Navigation'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Render Native MapLibre Map
  return (
    <View style={[styles.container, { height }]}>
      <MapLibreGL.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL={mapStyle}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [initialLng, initialLat],
            zoomLevel: 14,
          }}
        />

        {/* Current User Location (via expo-location / MapLibre user location) */}
        {permissionStatus === 'GRANTED' && (
          <MapLibreGL.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
          />
        )}

        {/* Passenger Pickup Marker (Visual SVG Pin Component) */}
        {pickup?.latitude && pickup?.longitude ? (
          <MapLibreGL.PointAnnotation
            id="pickup-point"
            coordinate={[pickup.longitude, pickup.latitude]}
            title={language === 'hi' ? 'पिकअप' : 'Pickup'}
          >
            <PickupPinMarker
              language={language}
              title={language === 'hi' ? 'पिकअप' : 'Pickup'}
            />
          </MapLibreGL.PointAnnotation>
        ) : null}

        {/* Destination Marker - ONLY when valid coordinates exist (Step 10) */}
        {hasValidDestinationCoords ? (
          <MapLibreGL.PointAnnotation
            id="destination-point"
            coordinate={[destination!.longitude!, destination!.latitude!]}
            title={language === 'hi' ? 'गंतव्य' : 'Destination'}
          >
            <DestinationPinMarker
              language={language}
              title={language === 'hi' ? 'गंतव्य' : 'Destination'}
            />
          </MapLibreGL.PointAnnotation>
        ) : null}

        {/* Live Driver Marker (🛺 Auto / E-Rickshaw with Dynamic Heading) */}
        {driverLocation?.latitude && driverLocation?.longitude ? (
          <MapLibreGL.PointAnnotation
            id="driver-point"
            coordinate={[driverLocation.longitude, driverLocation.latitude]}
            title={language === 'hi' ? 'चालक साथी' : 'Driver Partner'}
          >
            <AutoRickshawMarker
              heading={driverLocation.heading}
              vehicleType={vehicleType}
            />
          </MapLibreGL.PointAnnotation>
        ) : null}

        {/* Road Route Polyline - GeoJSON ShapeSource & LineLayer (Step 3 & 5) */}
        {routeGeoJSON ? (
          <MapLibreGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
            <MapLibreGL.LineLayer
              id="routeLine"
              style={{
                lineColor: '#3B82F6',
                lineWidth: 5,
                lineCap: 'round',
                lineJoin: 'round',
                lineOpacity: 0.9,
              }}
            />
          </MapLibreGL.ShapeSource>
        ) : null}
      </MapLibreGL.MapView>

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

        {/* Step 10: If destination coordinates missing, display address text notice */}
        {destination?.addressText && !hasValidDestinationCoords ? (
          <View style={styles.destinationNoticePill}>
            <Text style={styles.destinationNoticeText}>
              🏁 {destination.addressText} ({language === 'hi' ? 'नाम से' : 'Named Only'})
            </Text>
          </View>
        ) : null}
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

        {/* My Location Button */}
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

        {/* External Turn-by-Turn Navigation (Step 11) */}
        <TouchableOpacity
          style={[styles.floatingBtn, styles.navBtn]}
          onPress={handleOpenExternalNavigation}
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
  destinationNoticePill: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderColor: '#475569',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  destinationNoticeText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
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
  destinationTextBanner: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  destinationTextLabel: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '500',
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
