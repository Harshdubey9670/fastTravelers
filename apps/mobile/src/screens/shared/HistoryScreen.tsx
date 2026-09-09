import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { translations } from '../../i18n/translations';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { api } from '../../services/api';
import { IRide } from '@gaon-auto/types';

interface HistoryScreenProps {
  onBack: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onBack }) => {
  const { language, currentRole } = useAuthStore();
  const t = translations[language];

  const [rides, setRides] = useState<IRide[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [filter, currentRole]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const roleParam = currentRole === 'DRIVER' ? 'driver' : 'passenger';
      const data = await api.getRideHistory(roleParam, filter);
      setRides(data || []);
    } catch {
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  const isHindi = language === 'hi';

  return (
    <View style={styles.container}>
      <Header
        showBack
        onBack={onBack}
        title={isHindi ? 'यात्रा इतिहास' : 'Ride History'}
        showSos={false}
      />

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.tabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>
            {isHindi ? 'सभी' : 'All'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, filter === 'completed' && styles.tabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.tabText, filter === 'completed' && styles.tabTextActive]}>
            {isHindi ? 'पूरी हुई' : 'Completed'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, filter === 'cancelled' && styles.tabActive]}
          onPress={() => setFilter('cancelled')}
        >
          <Text style={[styles.tabText, filter === 'cancelled' && styles.tabTextActive]}>
            {isHindi ? 'रद्द' : 'Cancelled'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
        ) : rides.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📜</Text>
            <Text style={styles.emptyText}>
              {isHindi ? 'कोई यात्रा रिकॉर्ड नहीं मिला' : 'No ride records found'}
            </Text>
          </Card>
        ) : (
          rides.map((ride) => {
            const isCompleted = ride.status === 'RIDE_COMPLETED';
            const isCancelled = ride.status === 'CANCELLED';
            const fare = ride.fare?.finalFare || ride.selectedOffer?.fare || 60;
            const dateStr = ride.createdAt
              ? new Date(ride.createdAt).toLocaleDateString('hi-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            return (
              <Card key={ride.id} style={styles.rideCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.rideNumber}>
                    {ride.rideNumber || ride.id.slice(-8)}
                  </Text>
                  <Badge
                    label={
                      isCompleted
                        ? (isHindi ? 'पूरी हुई' : 'Completed')
                        : isCancelled
                        ? (isHindi ? 'रद्द' : 'Cancelled')
                        : ride.status
                    }
                    variant={isCompleted ? 'success' : isCancelled ? 'danger' : 'warning'}
                  />
                </View>

                <Text style={styles.dateText}>{dateStr}</Text>

                <View style={styles.routeContainer}>
                  <Text style={styles.routeText} numberOfLines={1}>
                    🟢 {ride.pickup.addressText}
                  </Text>
                  <Text style={styles.routeText} numberOfLines={1}>
                    🔴 {ride.destination.addressText}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.fareText}>₹{fare}</Text>
                  <Text style={styles.paymentMethodText}>
                    {ride.payment?.method === 'UPI_DIRECT' ? '📱 UPI' : '💵 नकद (Cash)'}
                  </Text>
                </View>
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
  tabRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: Colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.surfaceBg,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: Colors.white,
  },
  scrollContent: {
    padding: 16,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  rideCard: {
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rideNumber: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  dateText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  routeContainer: {
    gap: 4,
    backgroundColor: Colors.surfaceBg,
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  routeText: {
    color: Colors.textPrimary,
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  fareText: {
    color: Colors.accent,
    fontSize: 18,
    fontWeight: '900',
  },
  paymentMethodText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
});
