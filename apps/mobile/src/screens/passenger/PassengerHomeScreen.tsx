import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { useRideStore } from '../../store/useRideStore';
import { translations } from '../../i18n/translations';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { SOSModal } from '../../components/SOSModal';
import { NetworkBanner } from '../../components/NetworkBanner';
import { api } from '../../services/api';
import { locationService } from '../../services/location';
import { ILocalPlace, LocationPayload } from '@gaon-auto/types';


interface PassengerHomeScreenProps {
  onRideCreated: () => void;
  onOpenProfile: () => void;
  onOpenHistory: () => void;
}

export const PassengerHomeScreen: React.FC<PassengerHomeScreenProps> = ({
  onRideCreated,
  onOpenProfile,
  onOpenHistory,
}) => {
  const { language } = useAuthStore();
  const t = translations[language];
  const { createRide, isLoading, error, activeRide, reconcileActiveRide } = useRideStore();

  const [pickupText, setPickupText] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropText, setDropText] = useState('');
  const [dropCoords, setDropCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [vehiclePref, setVehiclePref] = useState<'ANY' | 'AUTO' | 'E_RICKSHAW'>('ANY');
  const [passengersCount, setPassengersCount] = useState(1);
  const [luggageNote, setLuggageNote] = useState('');
  const [popularPlaces, setPopularPlaces] = useState<ILocalPlace[]>([]);
  const [showSos, setShowSos] = useState(false);

  const fetchCurrentLocation = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const coords = await locationService.getCurrentLocation();
      if (coords) {
        setPickupCoords({ lat: coords.latitude, lng: coords.longitude });
        const addr = await locationService.reverseGeocode(coords.latitude, coords.longitude);
        setPickupText(addr);
      } else {
        setGpsError(
          language === 'hi'
            ? 'GPS स्थान प्राप्त नहीं हो सका। कृपया लोकेशन अनुमति दें।'
            : 'Could not fetch GPS. Please grant location permissions.'
        );
      }
    } catch {
      setGpsError('GPS error');
    } finally {
      setGpsLoading(false);
    }
  };

  // Load popular local landmarks and check active ride & request GPS
  useEffect(() => {
    reconcileActiveRide();
    fetchCurrentLocation();
    api.getPopularPlaces().then((places) => {
      if (places && places.length > 0) {
        setPopularPlaces(places);
      }
    }).catch(() => {});
  }, []);


  // Preset saved places for fast rural selection
  const savedPlaces = [
    { label: t.mamaGhar, address: 'Mama ka Ghar, Rampur Khurd', lat: 26.86, lng: 80.96 },
    { label: t.mandi, address: 'Kisan Sabzi Mandi, Main Road', lat: 26.84, lng: 80.94 },
    { label: t.hospital, address: 'Community Health Centre (CHC)', lat: 26.85, lng: 80.93 },
    { label: t.railwayStation, address: 'Town Junction Railway Station', lat: 26.83, lng: 80.92 },
  ];

  const handleBook = async () => {
    if (!pickupText.trim() || !dropText.trim()) {
      setGpsError(
        language === 'hi'
          ? 'कृपया पिकअप और गंतव्य दोनों स्थान भरें।'
          : 'Please enter both pickup and destination locations.'
      );
      return;
    }

    // Pickup requires valid coordinates for driver dispatch matching
    const effectivePickupCoords = pickupCoords || { lat: 26.8467, lng: 80.9462 };

    const pickup: LocationPayload = {
      addressText: pickupText.trim(),
      latitude: effectivePickupCoords.lat,
      longitude: effectivePickupCoords.lng,
    };

    // Destination coordinates: only include if genuinely known/selected (e.g. from landmark chip or saved place)
    // Do NOT invent fake coordinates or copy pickup coordinates for manual text-only destinations!
    const destination: LocationPayload = {
      addressText: dropText.trim(),
      latitude: dropCoords ? dropCoords.lat : undefined,
      longitude: dropCoords ? dropCoords.lng : undefined,
    };

    try {
      await createRide({
        pickup,
        destination,
        passengerCount: passengersCount,
        vehiclePreference: vehiclePref,
        luggageDescription: luggageNote.trim() || undefined,
      });
      onRideCreated();
    } catch {
      // Handled in store
    }
  };


  return (
    <View style={styles.container}>
      <Header
        showSos
        onSosPress={() => setShowSos(true)}
      />
      <NetworkBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation Shortcut Row */}
        <View style={styles.topNavRow}>
          <TouchableOpacity style={styles.navShortcutBtn} onPress={onOpenHistory}>
            <Text style={styles.navShortcutText}>🕒 {language === 'hi' ? 'पुरानी यात्राएँ' : 'Ride History'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navShortcutBtn} onPress={onOpenProfile}>
            <Text style={styles.navShortcutText}>👤 {language === 'hi' ? 'मेरी प्रोफ़ाइल' : 'Profile'}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Saved Places Carousel / Chips */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⭐ {t.savedPlaces}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {savedPlaces.map((place, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.placeChip}
              onPress={() => {
                setDropText(place.address);
                setDropCoords({ lat: place.lat, lng: place.lng });
              }}
            >
              <Text style={styles.placeChipLabel}>{place.label}</Text>
              <Text style={styles.placeChipAddress} numberOfLines={1}>
                {place.address}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Pickup & Destination Form Card */}
        <Card style={styles.formCard}>
          <Text style={styles.cardHeaderTitle}>📍 {t.whereTo}</Text>

          {/* Pickup Input */}
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.label}>{t.pickupLocation}</Text>
              <TouchableOpacity onPress={fetchCurrentLocation} disabled={gpsLoading} style={{ padding: 2 }}>
                <Text style={{ color: Colors.accent, fontSize: 12, fontWeight: '700' }}>
                  {gpsLoading ? '📡 ' + (language === 'hi' ? 'स्थान खोज रहे हैं...' : 'Locating...') : '📍 ' + (language === 'hi' ? 'वर्तमान GPS स्थान लें' : 'Current GPS')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputBox}>
              <Text style={styles.inputIcon}>🟢</Text>
              <TextInput
                style={styles.textInput}
                value={pickupText}
                onChangeText={setPickupText}
                placeholder={t.pickupLocation}
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            {gpsError ? <Text style={{ color: Colors.warning, fontSize: 11, marginTop: 4, fontWeight: '600' }}>⚠️ {gpsError}</Text> : null}
          </View>


          {/* Destination Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.dropLocation}</Text>
            <View style={styles.inputBox}>
              <Text style={styles.inputIcon}>🔴</Text>
              <TextInput
                style={styles.textInput}
                value={dropText}
                onChangeText={(text) => {
                  setDropText(text);
                  setDropCoords(null);
                }}
                placeholder={t.dropLocation}
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          {/* Popular Landmarks helper */}
          {popularPlaces.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.subLabel}>🏛️ {t.selectLandmark}:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                {popularPlaces.slice(0, 5).map((p, idx) => (
                  <TouchableOpacity
                    key={p.id || (p as any)._id || p.nameEn || idx}
                    style={styles.smallLandmarkChip}
                    onPress={() => {
                      setDropText(language === 'hi' ? p.nameHi : p.nameEn);
                      setDropCoords({ lat: p.location.coordinates[1], lng: p.location.coordinates[0] });
                    }}
                  >
                    <Text style={styles.smallLandmarkText}>
                      {language === 'hi' ? p.nameHi : p.nameEn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Vehicle Preference */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.vehiclePreference}</Text>
            <View style={styles.prefRow}>
              <TouchableOpacity
                style={[styles.prefTab, vehiclePref === 'ANY' && styles.prefTabActive]}
                onPress={() => setVehiclePref('ANY')}
              >
                <Text style={styles.prefEmoji}>🛺⚡</Text>
                <Text style={[styles.prefText, vehiclePref === 'ANY' && styles.prefTextActive]}>
                  {t.anyVehicle}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.prefTab, vehiclePref === 'AUTO' && styles.prefTabActive]}
                onPress={() => setVehiclePref('AUTO')}
              >
                <Text style={styles.prefEmoji}>🛺</Text>
                <Text style={[styles.prefText, vehiclePref === 'AUTO' && styles.prefTextActive]}>
                  {t.autoRickshaw}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.prefTab, vehiclePref === 'E_RICKSHAW' && styles.prefTabActive]}
                onPress={() => setVehiclePref('E_RICKSHAW')}
              >
                <Text style={styles.prefEmoji}>🔋</Text>
                <Text style={[styles.prefText, vehiclePref === 'E_RICKSHAW' && styles.prefTextActive]}>
                  {t.eRickshaw}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Passenger count selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.passengersCount}</Text>
            <View style={styles.counterRow}>
              {[1, 2, 3, 4].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.counterBtn, passengersCount === num && styles.counterBtnActive]}
                  onPress={() => setPassengersCount(num)}
                >
                  <Text style={[styles.counterText, passengersCount === num && styles.counterTextActive]}>
                    {num} 👤
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Luggage Note Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.luggageNote}</Text>
            <TextInput
              style={styles.luggageInput}
              placeholder={t.luggagePlaceholder}
              placeholderTextColor={Colors.textMuted}
              value={luggageNote}
              onChangeText={setLuggageNote}
            />
          </View>

          {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

          <Button
            title={t.requestRide}
            onPress={handleBook}
            size="large"
            isLoading={isLoading}
            style={{ marginTop: 12 }}
          />
        </Card>
      </ScrollView>

      <SOSModal
        visible={showSos}
        onClose={() => setShowSos(false)}
        activeRide={activeRide}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navShortcutBtn: {
    backgroundColor: Colors.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  navShortcutText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.sunlightYellow,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 12,
  },
  placeChip: {
    backgroundColor: Colors.cardBg,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minWidth: 140,
    maxWidth: 180,
  },
  placeChipLabel: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 4,
  },
  placeChipAddress: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  formCard: {
    marginTop: 4,
  },
  cardHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 12,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: Colors.white,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  smallLandmarkChip: {
    backgroundColor: Colors.surfaceBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  smallLandmarkText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  prefRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prefTab: {
    flex: 1,
    backgroundColor: Colors.surfaceBg,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  prefTabActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: Colors.primary,
  },
  prefEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  prefText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  prefTextActive: {
    color: Colors.white,
  },
  counterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  counterBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceBg,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  counterBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Colors.accent,
  },
  counterText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  counterTextActive: {
    color: Colors.white,
  },
  luggageInput: {
    backgroundColor: Colors.inputBg,
    color: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
});
