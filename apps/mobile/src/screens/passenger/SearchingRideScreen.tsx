import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { useRideStore } from '../../store/useRideStore';
import { translations } from '../../i18n/translations';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { SOSModal } from '../../components/SOSModal';

interface SearchingRideScreenProps {
  onOffersReceived: () => void;
  onCancelled: () => void;
}

export const SearchingRideScreen: React.FC<SearchingRideScreenProps> = ({
  onOffersReceived,
  onCancelled,
}) => {
  const { language } = useAuthStore();
  const t = translations[language];
  const { activeRide, offers, cancelRide, isLoading } = useRideStore();

  const [timeLeft, setTimeLeft] = useState(120);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [showSos, setShowSos] = useState(false);

  // Radar pulsing animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Check if offers have arrived
  useEffect(() => {
    if (offers && offers.length > 0) {
      onOffersReceived();
    }
    if (activeRide?.status === 'OFFERS_RECEIVED' || activeRide?.status === 'DRIVER_SELECTED') {
      onOffersReceived();
    }
  }, [offers, activeRide?.status]);

  const handleCancel = async () => {
    await cancelRide('Passenger cancelled search');
    onCancelled();
  };

  const isNoDriver = activeRide?.status === 'NO_DRIVER_FOUND' || timeLeft === 0;

  return (
    <View style={styles.container}>
      <Header
        showSos
        onSosPress={() => setShowSos(true)}
      />

      <View style={styles.content}>
        {/* Radar Visual */}
        <View style={styles.radarContainer}>
          <Animated.View
            style={[
              styles.radarCircle,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.4],
                  outputRange: [0.8, 0.2],
                }),
              },
            ]}
          />
          <View style={styles.centerPill}>
            <Text style={styles.centerEmoji}>🛺</Text>
          </View>
        </View>

        {/* Searching Status */}
        <Text style={styles.title}>
          {isNoDriver ? t.noDriverFound : t.searchingTitle}
        </Text>

        {/* Stats Card */}
        <Card style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t.searchRadius}</Text>
            <Text style={styles.statValue}>
              {activeRide?.searchRadiusKm || 3.0} km
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t.contactedDrivers}</Text>
            <Text style={styles.statValueHighlight}>
              {activeRide?.contactedDriversCount || 0}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t.timeRemaining}</Text>
            <Text style={styles.statValue}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        </Card>

        {/* Trip Destination Card */}
        {activeRide ? (
          <Card style={styles.routeCard}>
            <Text style={styles.routeText} numberOfLines={1}>
              🟢 {activeRide.pickup.addressText}
            </Text>
            <Text style={styles.routeDivider}>↓</Text>
            <Text style={styles.routeText} numberOfLines={1}>
              🔴 {activeRide.destination.addressText}
            </Text>
          </Card>
        ) : null}

        {isNoDriver ? (
          <Button
            title={t.tryAgain}
            variant="accent"
            onPress={onCancelled}
            size="large"
            style={{ width: '100%', marginTop: 20 }}
          />
        ) : (
          <Button
            title={t.cancelSearch}
            variant="danger"
            onPress={handleCancel}
            isLoading={isLoading}
            size="large"
            style={{ width: '100%', marginTop: 20 }}
          />
        )}
      </View>

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
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  radarCircle: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 107, 0, 0.25)',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  centerPill: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    elevation: 6,
  },
  centerEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 20,
  },
  statsCard: {
    width: '100%',
    padding: 16,
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  statValueHighlight: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.sunlightYellow,
  },
  routeCard: {
    width: '100%',
    marginTop: 12,
    padding: 14,
  },
  routeText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  routeDivider: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
    marginVertical: 2,
  },
});
