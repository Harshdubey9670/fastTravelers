import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { useDriverStore } from '../../store/useDriverStore';
import { translations } from '../../i18n/translations';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { NetworkBanner } from '../../components/NetworkBanner';

interface DriverActiveRideScreenProps {
  onTripFinished: () => void;
}

export const DriverActiveRideScreen: React.FC<DriverActiveRideScreenProps> = ({
  onTripFinished,
}) => {
  const { language } = useAuthStore();
  const t = translations[language];
  const {
    activeTrip,
    markArrived,
    startTrip,
    completeTrip,
    confirmPaymentReceived,
    isLoading,
    error,
    clearError,
  } = useDriverStore();

  const [otpInput, setOtpInput] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  if (!activeTrip) {
    return (
      <View style={styles.container}>
        <Header showSos={false} />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{t.loading}</Text>
        </View>
      </View>
    );
  }

  const passenger = activeTrip.passenger;
  const passengerPhone = passenger?.phone || '+919876543210';
  const passengerName = passenger?.name || (language === 'hi' ? 'सवारी' : 'Passenger');
  const fare = activeTrip.fare?.finalFare || activeTrip.selectedOffer?.fare || 60;
  const status = activeTrip.status;

  const handleCallPassenger = () => {
    Linking.openURL(`tel:${passengerPhone}`);
  };

  const handleArrived = async () => {
    clearError();
    await markArrived();
  };

  const handleStartRide = async () => {
    clearError();
    if (otpInput.length < 4) return;
    await startTrip(otpInput);
  };

  const handleCompleteRide = async () => {
    clearError();
    await completeTrip(fare);
  };

  const handleConfirmCash = async () => {
    await confirmPaymentReceived();
    setIsFinishing(true);
    setTimeout(() => {
      onTripFinished();
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <Header
        title={t.driverModeTitle}
        showSos={false}
      />
      <NetworkBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Stage Indicator Banner */}
        <View style={styles.stageBanner}>
          <Text style={styles.stageEmoji}>
            {status === 'RIDE_COMPLETED'
              ? '🏁'
              : status === 'RIDE_STARTED'
              ? '🚀'
              : status === 'DRIVER_ARRIVED'
              ? '📍'
              : '🛺'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.stageTitle}>
              {status === 'RIDE_COMPLETED'
                ? t.rideCompleted
                : status === 'RIDE_STARTED'
                ? t.rideStarted
                : status === 'DRIVER_ARRIVED'
                ? t.driverArrived
                : t.enRoutePickup}
            </Text>
            <Text style={styles.stageSub}>
              {language === 'hi'
                ? 'सवारी आईडी: ' + (activeTrip.rideNumber || activeTrip.id)
                : 'Ride ID: ' + (activeTrip.rideNumber || activeTrip.id)}
            </Text>
          </View>
        </View>

        {/* Passenger Contact Card */}
        <Card style={styles.passengerCard}>
          <View style={styles.passengerRow}>
            <View style={styles.passengerAvatar}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.passengerNameText}>{passengerName}</Text>
              <Text style={styles.passengerCountText}>
                {activeTrip.passengerCount || 1} {language === 'hi' ? 'सवारी' : 'Passengers'}
              </Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={handleCallPassenger}>
              <Text style={styles.callBtnIcon}>📞</Text>
              <Text style={styles.callBtnText}>कॉल करें</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Route Details Card */}
        <Card style={styles.routeCard}>
          <View style={styles.routeRow}>
            <Text style={styles.routeDot}>🟢</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>{t.pickupLocation}</Text>
              <Text style={styles.routeAddress}>{activeTrip.pickup.addressText}</Text>
            </View>
          </View>

          <View style={styles.routeDivider} />

          <View style={styles.routeRow}>
            <Text style={styles.routeDot}>🔴</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>{t.dropLocation}</Text>
              <Text style={styles.routeAddress}>{activeTrip.destination.addressText}</Text>
            </View>
          </View>

          {activeTrip.luggageDescription ? (
            <Text style={styles.luggageNote}>
              📦 {t.luggageNote}: {activeTrip.luggageDescription}
            </Text>
          ) : null}
        </Card>

        {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

        {/* ACTION WORKFLOW CONTROLS BASED ON STATE */}

        {/* STEP 1: Driver En Route -> Arrived */}
        {status === 'DRIVER_SELECTED' || status === 'DRIVER_EN_ROUTE' ? (
          <Button
            title={`📍 ${t.iHaveArrived}`}
            variant="accent"
            onPress={handleArrived}
            isLoading={isLoading}
            size="large"
            style={{ marginTop: 16 }}
          />
        ) : null}

        {/* STEP 2: Driver Arrived -> Enter Passenger OTP */}
        {status === 'DRIVER_ARRIVED' ? (
          <Card style={styles.otpCard} variant="highlight">
            <Text style={styles.otpCardTitle}>🔑 {t.enterPassengerOtp}</Text>
            <Text style={styles.otpCardSub}>
              {language === 'hi'
                ? 'सवारी से 4 अंकों का कोड पूछकर यहाँ दर्ज करें:'
                : 'Ask passenger for 4-digit OTP to start trip:'}
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="••••"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              value={otpInput}
              onChangeText={(v) => setOtpInput(v.replace(/\D/g, ''))}
            />

            <Button
              title={`🚀 ${t.startTrip}`}
              variant="primary"
              onPress={handleStartRide}
              disabled={otpInput.length < 4}
              isLoading={isLoading}
              size="large"
              style={{ marginTop: 12 }}
            />
          </Card>
        ) : null}

        {/* STEP 3: Ride In Progress -> Complete Ride */}
        {status === 'RIDE_STARTED' ? (
          <Card style={styles.tripProgressCard}>
            <Text style={styles.fareHighlight}>किराया: ₹{fare}</Text>
            <Text style={styles.progressHint}>
              {language === 'hi'
                ? 'गंतव्य पर पहुँचने के बाद सवारी समाप्त करें'
                : 'Complete trip after reaching the drop location'}
            </Text>
            <Button
              title={`🏁 ${t.completeTrip}`}
              variant="accent"
              onPress={handleCompleteRide}
              isLoading={isLoading}
              size="large"
              style={{ marginTop: 16 }}
            />
          </Card>
        ) : null}

        {/* STEP 4: Ride Completed -> Payment Settlement */}
        {status === 'RIDE_COMPLETED' ? (
          <Card style={styles.paymentConfirmCard} variant="highlight">
            <Text style={styles.paymentDueLabel}>{t.paymentDue}</Text>
            <Text style={styles.fareBigAmount}>₹{fare}</Text>

            {activeTrip.payment?.status === 'PASSENGER_CLAIMS_PAID' ? (
              <Badge
                label={`🔔 ${language === 'hi' ? 'सवारी ने नकद/UPI भुगतान का दावा किया' : 'Passenger claimed payment'}`}
                variant="warning"
                style={{ alignSelf: 'center', marginBottom: 16 }}
              />
            ) : null}

            {activeTrip.payment?.status === 'DRIVER_CONFIRMED_RECEIVED' || isFinishing ? (
              <Badge
                label={`✅ ${language === 'hi' ? 'भुगतान प्राप्त हो गया' : 'Payment Confirmed'}`}
                variant="success"
                style={{ alignSelf: 'center', marginBottom: 16 }}
              />
            ) : (
              <Button
                title={`💰 ${t.confirmCashReceived}`}
                variant="accent"
                onPress={handleConfirmCash}
                isLoading={isLoading}
                size="large"
                style={{ width: '100%' }}
              />
            )}

            <Button
              title={language === 'hi' ? 'डैशबोर्ड पर वापस जाएं' : 'Return to Dashboard'}
              variant="secondary"
              onPress={onTripFinished}
              style={{ width: '100%', marginTop: 12 }}
            />
          </Card>
        ) : null}
      </ScrollView>
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
  stageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceBg,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: 12,
  },
  stageEmoji: {
    fontSize: 32,
  },
  stageTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.white,
  },
  stageSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  passengerCard: {
    padding: 14,
    marginBottom: 16,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  passengerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  passengerNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  passengerCountText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  callBtn: {
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  callBtnIcon: {
    fontSize: 16,
  },
  callBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
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
  routeDot: {
    fontSize: 14,
    marginTop: 2,
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
  routeDivider: {
    width: 2,
    height: 18,
    backgroundColor: Colors.cardBorder,
    marginLeft: 6,
    marginVertical: 4,
  },
  luggageNote: {
    marginTop: 10,
    color: Colors.sunlightYellow,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpCard: {
    padding: 18,
    alignItems: 'center',
  },
  otpCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.white,
  },
  otpCardSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  otpInput: {
    backgroundColor: Colors.inputBg,
    color: Colors.white,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    width: 160,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    letterSpacing: 10,
    marginBottom: 8,
  },
  tripProgressCard: {
    alignItems: 'center',
    padding: 20,
  },
  fareHighlight: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.accent,
  },
  progressHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  paymentConfirmCard: {
    alignItems: 'center',
    padding: 20,
  },
  paymentDueLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  fareBigAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.accent,
    marginVertical: 8,
  },
});
