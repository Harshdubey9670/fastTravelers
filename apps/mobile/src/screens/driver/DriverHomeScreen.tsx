import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
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

interface DriverHomeScreenProps {
  onActiveTripOpened: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
}

export const DriverHomeScreen: React.FC<DriverHomeScreenProps> = ({
  onActiveTripOpened,
  onOpenHistory,
  onOpenProfile,
}) => {
  const { language, user, driverProfile } = useAuthStore();
  const t = translations[language];
  const {
    isOnline,
    setOnlineStatus,
    incomingRequests,
    submitBid,
    dismissRequest,
    activeTrip,
    reconcileDriverActiveRide,
    isLoading,
    error,
  } = useDriverStore();

  const [biddingRideId, setBiddingRideId] = useState<string | null>(null);
  const [fareQuote, setFareQuote] = useState('60');
  const [etaMins, setEtaMins] = useState(5);

  useEffect(() => {
    reconcileDriverActiveRide();
  }, []);

  // If already in active trip, navigate directly
  useEffect(() => {
    if (
      activeTrip &&
      activeTrip.status !== 'RIDE_COMPLETED' &&
      activeTrip.status !== 'CANCELLED'
    ) {
      onActiveTripOpened();
    }
  }, [activeTrip?.status]);

  const handleToggleOnline = async (val: boolean) => {
    await setOnlineStatus(val);
  };

  const handleSendOffer = async (rideId: string) => {
    const numFare = parseInt(fareQuote, 10) || 50;
    const ok = await submitBid(rideId, numFare, etaMins);
    if (ok) {
      setBiddingRideId(null);
    }
  };

  const isVerified = driverProfile?.verificationStatus === 'APPROVED';

  return (
    <View style={styles.container}>
      <Header
        title={t.driverModeTitle}
        showSos={false}
      />
      <NetworkBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation Shortcut Row */}
        <View style={styles.topNavRow}>
          <TouchableOpacity style={styles.navShortcutBtn} onPress={onOpenHistory}>
            <Text style={styles.navShortcutText}>🕒 {language === 'hi' ? 'मेरी सवारियाँ' : 'My Trips'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navShortcutBtn} onPress={onOpenProfile}>
            <Text style={styles.navShortcutText}>👤 {language === 'hi' ? 'चालक प्रोफ़ाइल' : 'Profile'}</Text>
          </TouchableOpacity>
        </View>

        {/* Verification Status Banner */}
        <View style={styles.verificationBox}>
          {isVerified ? (
            <Badge label={`🛡️ ${t.verificationApproved}`} variant="success" />
          ) : (
            <Badge label={`⚠️ ${t.verificationPending}`} variant="warning" />
          )}
          <Text style={styles.vehicleRegText}>
            {driverProfile?.vehicle?.registrationNumber || (language === 'hi' ? 'वाहन पंजीकृत नहीं' : 'No vehicle registered')}
          </Text>
        </View>

        {/* Giant Online/Offline Duty Switch Card */}
        <Card
          style={[
            styles.dutyCard,
            isOnline ? styles.dutyCardOnline : styles.dutyCardOffline,
          ]}
        >
          <View style={styles.dutyHeader}>
            <View>
              <Text style={styles.dutyStatusText}>
                {isOnline ? t.onlineStatus : t.offlineStatus}
              </Text>
              <Text style={styles.dutySubText}>
                {isOnline ? t.onlineNotice : t.offlineNotice}
              </Text>
            </View>

            <Switch
              trackColor={{ false: '#334155', true: Colors.accentDark }}
              thumbColor={isOnline ? Colors.brightGreen : '#94A3B8'}
              value={isOnline}
              onValueChange={handleToggleOnline}
              disabled={isLoading}
              style={{ transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }] }}
            />
          </View>
        </Card>

        {/* Today's Stats Card */}
        <Card style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>{t.todayEarnings}</Text>
            <Text style={styles.statEarning}>₹{(driverProfile as any)?.todayEarnings || 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>{t.todayTrips}</Text>
            <Text style={styles.statTrips}>{(driverProfile as any)?.completedTrips || 0} {t.trips}</Text>
          </View>
        </Card>

        {/* Incoming Requests Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            🔔 {t.incomingRequests} ({incomingRequests.length})
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

        {incomingRequests.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>{isOnline ? '📡' : '💤'}</Text>
            <Text style={styles.emptyText}>
              {isOnline
                ? (language === 'hi' ? 'नए सवारी अनुरोध की प्रतीक्षा में...' : 'Waiting for new ride requests...')
                : t.offlineNotice}
            </Text>
          </Card>
        ) : (
          incomingRequests.map((item) => {
            const ride = item.ride;
            const isBiddingThis = biddingRideId === ride.id;
            const distKm = (item.distanceMeters / 1000).toFixed(1);

            return (
              <Card key={ride.id} style={styles.requestCard} variant="highlight">
                <View style={styles.requestTopRow}>
                  <Badge label={`📍 ~${distKm} km दूर`} variant="primary" />
                  <Text style={styles.passengerCountBadge}>
                    {ride.passengerCount || 1} 👤 सवारी
                  </Text>
                </View>

                {/* Pickup and Drop Details */}
                <View style={styles.routeBox}>
                  <Text style={styles.routeText} numberOfLines={1}>
                    🟢 {t.pickupAt} <Text style={styles.boldText}>{ride.pickup.addressText}</Text>
                  </Text>
                  <Text style={styles.routeText} numberOfLines={1}>
                    🔴 {t.dropAt} <Text style={styles.boldText}>{ride.destination.addressText}</Text>
                  </Text>
                  {ride.luggageDescription ? (
                    <Text style={styles.luggageNoteText}>
                      📦 {ride.luggageDescription}
                    </Text>
                  ) : null}
                </View>

                {/* Bidding Controls */}
                {isBiddingThis ? (
                  <View style={styles.bidForm}>
                    <Text style={styles.bidFormLabel}>{t.enterBidFare}</Text>
                    {/* Custom Fare Input & Quick suggestions */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 }}>
                      <Text style={{ color: Colors.accent, fontSize: 20, fontWeight: '800' }}>₹</Text>
                      <TextInput
                        style={{
                          backgroundColor: Colors.cardBg,
                          color: Colors.white,
                          borderWidth: 1.5,
                          borderColor: Colors.accent,
                          borderRadius: 10,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          fontSize: 20,
                          fontWeight: '800',
                          minWidth: 100,
                        }}
                        keyboardType="numeric"
                        value={fareQuote}
                        onChangeText={setFareQuote}
                        placeholder="किराया"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={styles.quickFareRow}>
                      {['40', '50', '60', '65', '80', '100'].map((f) => (
                        <TouchableOpacity
                          key={f}
                          style={[styles.fareChip, fareQuote === f && styles.fareChipActive]}
                          onPress={() => setFareQuote(f)}
                        >
                          <Text style={[styles.fareChipText, fareQuote === f && styles.fareChipTextActive]}>
                            ₹{f}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* ETA Selection */}
                    <Text style={styles.bidFormLabel}>{t.selectEta}</Text>
                    <View style={styles.etaRow}>
                      {[3, 5, 8, 12].map((mins) => (
                        <TouchableOpacity
                          key={mins}
                          style={[styles.etaChip, etaMins === mins && styles.etaChipActive]}
                          onPress={() => setEtaMins(mins)}
                        >
                          <Text style={[styles.etaChipText, etaMins === mins && styles.etaChipTextActive]}>
                            {mins} {t.mins}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.bidActionsRow}>
                      <Button
                        title={t.sendOffer}
                        variant="accent"
                        onPress={() => handleSendOffer(ride.id)}
                        isLoading={isLoading}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title={t.skipRequest}
                        variant="secondary"
                        onPress={() => setBiddingRideId(null)}
                        style={{ paddingHorizontal: 16 }}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.actionRow}>
                    <Button
                      title={`⚡ ${t.sendOffer} (₹${fareQuote})`}
                      variant="primary"
                      onPress={() => setBiddingRideId(ride.id)}
                      style={{ flex: 1 }}
                    />
                    <TouchableOpacity
                      style={styles.skipBtn}
                      onPress={() => dismissRequest(ride.id)}
                    >
                      <Text style={styles.skipBtnText}>{t.skipRequest}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
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
  verificationBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleRegText: {
    color: Colors.sunlightYellow,
    fontSize: 14,
    fontWeight: '800',
  },
  dutyCard: {
    padding: 18,
    marginBottom: 16,
    borderWidth: 2,
  },
  dutyCardOnline: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  dutyCardOffline: {
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  dutyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dutyStatusText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
  },
  dutySubText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    maxWidth: 220,
  },
  statsCard: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statEarning: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.accent,
  },
  statTrips: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.sunlightYellow,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.cardBorder,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  requestCard: {
    marginBottom: 16,
    padding: 16,
  },
  requestTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  passengerCountBadge: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  routeBox: {
    backgroundColor: Colors.surfaceBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  routeText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  boldText: {
    color: Colors.white,
    fontWeight: '700',
  },
  luggageNoteText: {
    color: Colors.sunlightYellow,
    fontSize: 12,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipBtnText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  bidForm: {
    backgroundColor: Colors.surfaceBg,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  bidFormLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  quickFareRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fareChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  fareChipActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
  },
  fareChipText: {
    color: Colors.textSecondary,
    fontWeight: '800',
    fontSize: 14,
  },
  fareChipTextActive: {
    color: Colors.white,
  },
  etaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  etaChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  etaChipActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  etaChipText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
  etaChipTextActive: {
    color: Colors.white,
  },
  bidActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
});
