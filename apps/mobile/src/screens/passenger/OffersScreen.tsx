import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { useRideStore } from '../../store/useRideStore';
import { translations } from '../../i18n/translations';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { SOSModal } from '../../components/SOSModal';

interface OffersScreenProps {
  onOfferSelected: () => void;
  onCancel: () => void;
}

export const OffersScreen: React.FC<OffersScreenProps> = ({
  onOfferSelected,
  onCancel,
}) => {
  const { language } = useAuthStore();
  const t = translations[language];
  const { activeRide, offers, selectOffer, cancelRide, isLoading, error } = useRideStore();

  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [showSos, setShowSos] = useState(false);

  // If driver already selected, advance immediately
  useEffect(() => {
    if (
      activeRide?.status === 'DRIVER_SELECTED' ||
      activeRide?.status === 'DRIVER_EN_ROUTE' ||
      activeRide?.status === 'DRIVER_ARRIVED' ||
      activeRide?.status === 'RIDE_STARTED'
    ) {
      onOfferSelected();
    }
  }, [activeRide?.status]);

  const handleSelect = async (offerId: string) => {
    setSelectingId(offerId);
    const ok = await selectOffer(offerId);
    setSelectingId(null);
    if (ok) {
      onOfferSelected();
    }
  };

  const handleCancelRide = async () => {
    await cancelRide('Passenger cancelled on offers screen');
    onCancel();
  };

  return (
    <View style={styles.container}>
      <Header
        title={t.offersTitle}
        showSos
        onSosPress={() => setShowSos(true)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBox}>
          <Text style={styles.title}>🏷️ {t.offersTitle}</Text>
          <Text style={styles.subtitle}>{t.offersSubtitle}</Text>
        </View>

        {error ? <Text style={styles.errorBanner}>⚠️ {error}</Text> : null}

        {offers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>⏳</Text>
            <Text style={styles.emptyText}>
              {language === 'hi'
                ? 'चालकों के प्रस्तावों की प्रतीक्षा कर रहे हैं...'
                : 'Waiting for driver bids...'}
            </Text>
          </Card>
        ) : (
          offers.map((offer) => {
            const isAuto = offer.driver?.vehicle?.vehicleType !== 'E_RICKSHAW';
            const isSelectingThis = selectingId === offer.id;

            return (
              <Card key={offer.id} style={styles.offerCard} variant="highlight">
                <View style={styles.cardTopRow}>
                  <View style={styles.driverMeta}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarEmoji}>{isAuto ? '🛺' : '🔋'}</Text>
                    </View>
                    <View>
                      <Text style={styles.driverName}>
                        {offer.driver?.user?.name || (language === 'hi' ? 'ऑटो चालक साथी' : 'Driver Partner')}
                      </Text>
                      <View style={styles.ratingRow}>
                        {offer.driver?.ratingCount && offer.driver.ratingCount > 0 ? (
                          <>
                            <Text style={styles.ratingStar}>★</Text>
                            <Text style={styles.ratingScore}>
                              {offer.driver.ratingAverage.toFixed(1)}
                            </Text>
                            <Text style={styles.tripsCount}>
                              ({offer.driver.completedTrips || 0} {t.trips})
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.tripsCount}>
                            ⭐ {language === 'hi' ? 'नया चालक' : 'New Driver'} ({offer.driver?.completedTrips || 0} {t.trips})
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Quoted Fare */}
                  <View style={styles.fareBox}>
                    <Text style={styles.fareAmount}>₹{offer.fare}</Text>
                    <Text style={styles.fareLabel}>{t.fare}</Text>
                  </View>
                </View>

                {/* Middle details: Vehicle, ETA, message */}
                <View style={styles.cardMidRow}>
                  <Badge
                    label={
                      isAuto
                        ? (language === 'hi' ? 'सीएनजी ऑटो' : 'CNG Auto')
                        : (language === 'hi' ? 'ई-रिक्शा' : 'e-Rickshaw')
                    }
                    variant="info"
                  />
                  <Badge
                    label={`⏱️ ${offer.etaMinutes} ${t.mins}`}
                    variant="warning"
                  />
                  {offer.driver?.vehicle?.registrationNumber ? (
                    <Badge
                      label={offer.driver.vehicle.registrationNumber}
                      variant="neutral"
                    />
                  ) : null}
                </View>

                {offer.message ? (
                  <Text style={styles.driverMessage}>
                    💬 "{offer.message}"
                  </Text>
                ) : null}

                {/* Action button */}
                <Button
                  title={t.acceptRide}
                  variant="accent"
                  onPress={() => handleSelect(offer.id)}
                  isLoading={isSelectingThis}
                  disabled={isLoading}
                  style={styles.acceptButton}
                />
              </Card>
            );
          })
        )}

        <Button
          title={t.cancelSearch}
          variant="secondary"
          onPress={handleCancelRide}
          style={{ marginTop: 12, marginBottom: 24 }}
        />
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
  },
  headerBox: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: Colors.danger,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  offerCard: {
    marginBottom: 16,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingStar: {
    color: Colors.sunlightYellow,
    fontSize: 14,
    fontWeight: 'bold',
  },
  ratingScore: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  tripsCount: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  fareBox: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  fareAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.accent,
  },
  fareLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  cardMidRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  driverMessage: {
    color: Colors.sunlightYellow,
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  acceptButton: {
    marginTop: 4,
  },
});
