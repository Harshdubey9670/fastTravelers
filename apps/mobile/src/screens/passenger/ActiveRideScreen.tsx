import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { useRideStore } from '../../store/useRideStore';
import { translations } from '../../i18n/translations';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { QuickChatModal } from '../../components/QuickChatModal';
import { SOSModal } from '../../components/SOSModal';
import { NetworkBanner } from '../../components/NetworkBanner';
import { LiveRideMap } from '../../components/LiveRideMap';

interface ActiveRideScreenProps {
  onRideCompleted: () => void;
  onRideCancelled: () => void;
}

export const ActiveRideScreen: React.FC<ActiveRideScreenProps> = ({
  onRideCompleted,
  onRideCancelled,
}) => {
  const { language, user } = useAuthStore();
  const t = translations[language];
  const {
    activeRide,
    chatMessages,
    sendChatMessage,
    cancelRide,
    reconcileActiveRide,
    driverLocation,
    routeStatus,
    routeCoordinates,
    roadDistanceMeters,
    roadDurationSeconds,
    fetchRoute,
    isLoading,
  } = useRideStore();

  const [showChat, setShowChat] = useState(false);
  const [showSos, setShowSos] = useState(false);

  // Poll reconciliation periodically to guarantee zero desync
  useEffect(() => {
    const interval = setInterval(() => {
      reconcileActiveRide();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Completion / Cancellation check
  useEffect(() => {
    if (activeRide?.status === 'RIDE_COMPLETED') {
      onRideCompleted();
    } else if (activeRide?.status === 'CANCELLED') {
      onRideCancelled();
    }
  }, [activeRide?.status]);

  if (!activeRide) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{t.loading}</Text>
        </View>
      </View>
    );
  }

  const driver = activeRide.driver;
  const driverPhone = driver?.user?.phone || '';
  const driverName = driver?.user?.name || (language === 'hi' ? 'चालक साथी' : 'Driver Partner');
  const vehicleReg = driver?.vehicle?.registrationNumber || (language === 'hi' ? 'वाहन संख्या उपलब्ध नहीं' : 'Reg. unavailable');
  const vehicleType = driver?.vehicle?.vehicleType === 'E_RICKSHAW' ? '🔋 ई-रिक्शा' : '🛺 ऑटो रिक्शा';
  const fare = activeRide.fare?.finalFare || activeRide.selectedOffer?.fare || 0;
  const otpCode = activeRide.otp?.code || '••••';

  const getStatusBanner = () => {
    switch (activeRide.status) {
      case 'DRIVER_ARRIVED':
        return {
          title: t.driverArrived,
          variant: 'success' as const,
          emoji: '📍',
        };
      case 'RIDE_STARTED':
        return {
          title: t.rideStarted,
          variant: 'info' as const,
          emoji: '🚀',
        };
      default:
        return {
          title: t.rideEnRoute,
          variant: 'warning' as const,
          emoji: '🛺',
        };
    }
  };

  const statusInfo = getStatusBanner();

  const handleCallDriver = () => {
    Linking.openURL(`tel:${driverPhone}`);
  };

  const handleCancel = async () => {
    await cancelRide('Cancelled by passenger');
    onRideCancelled();
  };

  return (
    <View style={styles.container}>
      <Header
        showSos
        onSosPress={() => setShowSos(true)}
      />
      <NetworkBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Realtime Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: Colors.surfaceBg }]}>
          <Text style={styles.statusEmoji}>{statusInfo.emoji}</Text>
          <Text style={styles.statusTitle}>{statusInfo.title}</Text>
        </View>

        {/* Live Interactive Google Map (Rules 1, 9, 14) */}
        <LiveRideMap
          mode="passenger"
          pickup={
            activeRide.pickup?.location?.coordinates && activeRide.pickup.location.coordinates.length === 2
              ? {
                  latitude: activeRide.pickup.location.coordinates[1],
                  longitude: activeRide.pickup.location.coordinates[0],
                  addressText: activeRide.pickup.addressText,
                }
              : null
          }
          destination={
            activeRide.destination?.location?.coordinates &&
            activeRide.destination.location.coordinates.length === 2 &&
            typeof activeRide.destination.location.coordinates[1] === 'number'
              ? {
                  latitude: activeRide.destination.location.coordinates[1],
                  longitude: activeRide.destination.location.coordinates[0],
                  addressText: activeRide.destination.addressText,
                }
              : { addressText: activeRide.destination?.addressText }
          }
          driverLocation={driverLocation}
          vehicleType={activeRide.driver?.vehicle?.vehicleType || 'AUTO'}
          routeStatus={routeStatus}
          routeCoordinates={routeCoordinates}
          roadDistanceMeters={roadDistanceMeters}
          roadDurationSeconds={roadDurationSeconds}
          language={language}
          height={260}
          onRefreshRoute={() => fetchRoute(true)}
        />

        {/* 4-Digit Secure Trip OTP Card */}
        {activeRide.status !== 'RIDE_STARTED' ? (
          <Card style={styles.otpCard} variant="highlight">
            <Text style={styles.otpHeading}>🔒 {t.shareOtpMsg}</Text>
            <View style={styles.otpCodeContainer}>
              {otpCode.split('').map((digit, idx) => (
                <View key={idx} style={styles.otpDigitBox}>
                  <Text style={styles.otpDigitText}>{digit}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.otpNote}>
              {language === 'hi'
                ? 'गाड़ी में बैठने के बाद ही चालक को यह कोड बताएं'
                : 'Share this code only after boarding the vehicle'}
            </Text>
          </Card>
        ) : null}

        {/* Driver Profile & Vehicle Card */}
        <Card style={styles.driverCard}>
          <Text style={styles.cardSectionTitle}>👤 {t.driverDetails}</Text>
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarEmoji}>🛺</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverNameText}>{driverName}</Text>
              <Text style={styles.vehicleRegText}>{vehicleReg}</Text>
              <Text style={styles.vehicleTypeText}>{vehicleType}</Text>
            </View>
            <View style={styles.farePill}>
              <Text style={styles.farePillAmount}>₹{fare}</Text>
              <Text style={styles.farePillLabel}>{t.fare}</Text>
            </View>
          </View>

          {/* Call & Chat Action Buttons */}
          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.callBtn} onPress={handleCallDriver}>
              <Text style={styles.contactBtnEmoji}>📞</Text>
              <Text style={styles.callBtnText}>{t.callDriver}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.chatBtn} onPress={() => setShowChat(true)}>
              <Text style={styles.contactBtnEmoji}>💬</Text>
              <Text style={styles.chatBtnText}>{t.chatWithDriver}</Text>
              {chatMessages.length > 0 ? (
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>{chatMessages.length}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </Card>

        {/* Route Details Card */}
        <Card style={styles.routeCard}>
          <View style={styles.routeRow}>
            <Text style={styles.routeDotGreen}>🟢</Text>
            <View style={styles.routeTextGroup}>
              <Text style={styles.routeLabel}>{t.pickupLocation}</Text>
              <Text style={styles.routeAddress}>{activeRide.pickup.addressText}</Text>
            </View>
          </View>

          <View style={styles.routeConnector} />

          <View style={styles.routeRow}>
            <Text style={styles.routeDotRed}>🔴</Text>
            <View style={styles.routeTextGroup}>
              <Text style={styles.routeLabel}>{t.dropLocation}</Text>
              <Text style={styles.routeAddress}>{activeRide.destination.addressText}</Text>
            </View>
          </View>
        </Card>

        {/* Emergency SOS & Cancel buttons */}
        <View style={styles.actionsBottom}>
          <TouchableOpacity style={styles.sosActionBtn} onPress={() => setShowSos(true)}>
            <Text style={styles.sosActionText}>🚨 {t.sosEmergency}</Text>
          </TouchableOpacity>

          {activeRide.status !== 'RIDE_STARTED' ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={isLoading}>
              <Text style={styles.cancelBtnText}>{t.cancelRide}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      {/* Quick Chat Modal */}
      <QuickChatModal
        visible={showChat}
        onClose={() => setShowChat(false)}
        messages={chatMessages}
        currentUserId={user?.id}
        onSendMessage={sendChatMessage}
      />

      {/* SOS Modal */}
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: 12,
  },
  statusEmoji: {
    fontSize: 28,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.white,
    flex: 1,
  },
  otpCard: {
    alignItems: 'center',
    padding: 18,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderColor: Colors.primary,
    marginBottom: 16,
  },
  otpHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.sunlightYellow,
    marginBottom: 12,
  },
  otpCodeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  otpDigitBox: {
    width: 52,
    height: 60,
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  otpDigitText: {
    fontSize: 30,
    fontWeight: '900',
    color: Colors.white,
  },
  otpNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  driverCard: {
    padding: 16,
    marginBottom: 16,
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  driverAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  driverAvatarEmoji: {
    fontSize: 28,
  },
  driverNameText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
  },
  vehicleRegText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sunlightYellow,
    marginTop: 2,
  },
  vehicleTypeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  farePill: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  farePillAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.accent,
  },
  farePillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  callBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  callBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  chatBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  chatBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  contactBtnEmoji: {
    fontSize: 18,
  },
  chatBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chatBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  routeCard: {
    padding: 16,
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  routeDotGreen: {
    fontSize: 14,
    marginTop: 2,
  },
  routeDotRed: {
    fontSize: 14,
    marginTop: 2,
  },
  routeConnector: {
    width: 2,
    height: 18,
    backgroundColor: Colors.cardBorder,
    marginLeft: 6,
    marginVertical: 4,
  },
  routeTextGroup: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    marginTop: 2,
  },
  actionsBottom: {
    gap: 12,
    marginTop: 8,
  },
  sosActionBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.5,
    borderColor: Colors.danger,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sosActionText: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: '900',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
