import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { useRideStore } from '../../store/useRideStore';
import { translations } from '../../i18n/translations';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';

interface PaymentRatingScreenProps {
  onFinished: () => void;
}

export const PaymentRatingScreen: React.FC<PaymentRatingScreenProps> = ({ onFinished }) => {
  const { language } = useAuthStore();
  const t = translations[language];
  const { activeRide, recordPayment, submitRating, resetActiveRide, isLoading } = useRideStore();

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI_DIRECT'>('CASH');
  const [hasPaid, setHasPaid] = useState(
    activeRide?.payment?.status === 'PASSENGER_CLAIMS_PAID' ||
    activeRide?.payment?.status === 'DRIVER_CONFIRMED_RECEIVED'
  );

  const [stars, setStars] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const fare = activeRide?.fare?.finalFare || activeRide?.selectedOffer?.fare || 60;
  const driver = activeRide?.driver;
  const upiId = driver?.upiId || 'gaonauto.partner@upi';

  const feedbackTags = [
    { key: 'POLITE', label: t.politeDriver },
    { key: 'CLEAN', label: t.cleanVehicle },
    { key: 'SAFE', label: t.safeDriving },
    { key: 'FAIR_PRICE', label: t.fairPrice },
  ];

  const handlePayClick = async () => {
    await recordPayment(paymentMethod, 'PASSENGER_CLAIMS_PAID');
    setHasPaid(true);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((x) => x !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmitAll = async () => {
    if (!hasPaid) {
      await recordPayment(paymentMethod, 'PASSENGER_CLAIMS_PAID');
    }
    await submitRating(stars, selectedTags, comment);
    setIsSubmitted(true);
    setTimeout(() => {
      resetActiveRide();
      onFinished();
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <Header showSos={false} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Ride Finished Celebration Banner */}
        <View style={styles.celebrationBox}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationTitle}>{t.rideCompleted}</Text>
          <Text style={styles.celebrationSubtitle}>
            {language === 'hi' ? 'गाँव ऑटो के साथ यात्रा करने के लिए धन्यवाद!' : 'Thank you for riding with Gaon Auto!'}
          </Text>
        </View>

        {/* Fare Payment Card */}
        <Card style={styles.fareCard} variant="highlight">
          <Text style={styles.fareDueLabel}>{t.paymentDue}</Text>
          <Text style={styles.fareDueAmount}>₹{fare}</Text>

          {/* Payment Method Selector */}
          <View style={styles.paymentMethodRow}>
            <TouchableOpacity
              style={[
                styles.methodTab,
                paymentMethod === 'CASH' && styles.methodTabActive,
              ]}
              onPress={() => setPaymentMethod('CASH')}
            >
              <Text style={styles.methodEmoji}>💵</Text>
              <Text
                style={[
                  styles.methodText,
                  paymentMethod === 'CASH' && styles.methodTextActive,
                ]}
              >
                {t.cashPayment}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodTab,
                paymentMethod === 'UPI_DIRECT' && styles.methodTabActive,
              ]}
              onPress={() => setPaymentMethod('UPI_DIRECT')}
            >
              <Text style={styles.methodEmoji}>📱</Text>
              <Text
                style={[
                  styles.methodText,
                  paymentMethod === 'UPI_DIRECT' && styles.methodTextActive,
                ]}
              >
                {t.upiPayment}
              </Text>
            </TouchableOpacity>
          </View>

          {paymentMethod === 'UPI_DIRECT' ? (
            <View style={styles.upiBox}>
              <Text style={styles.upiTitle}>
                {language === 'hi' ? 'चालक की UPI आईडी:' : "Driver's UPI ID:"}
              </Text>
              <Text style={styles.upiIdText}>{upiId}</Text>
              <Text style={styles.upiHint}>
                {language === 'hi'
                  ? 'अपने PhonePe, GPay या Paytm ऐप से ₹' + fare + ' भेजें'
                  : 'Pay ₹' + fare + ' using any UPI app (GPay / PhonePe / Paytm)'}
              </Text>
            </View>
          ) : null}

          {/* Payment Status indicator / Button */}
          {activeRide?.payment?.status === 'DRIVER_CONFIRMED_RECEIVED' ? (
            <Badge
              label={`✅ ${language === 'hi' ? 'चालक द्वारा भुगतान प्राप्त' : 'Payment Confirmed by Driver'}`}
              variant="success"
              style={{ alignSelf: 'center', marginTop: 12 }}
            />
          ) : hasPaid ? (
            <Badge
              label={`⏳ ${t.waitingDriverConfirm}`}
              variant="warning"
              style={{ alignSelf: 'center', marginTop: 12 }}
            />
          ) : (
            <Button
              title={t.iHavePaid}
              variant="accent"
              onPress={handlePayClick}
              size="normal"
              style={{ marginTop: 16 }}
            />
          )}
        </Card>

        {/* Driver Rating Card */}
        <Card style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>⭐ {t.rateDriver}</Text>
          <Text style={styles.ratingSubtitle}>
            {driver?.user?.name || (language === 'hi' ? 'चालक साथी' : 'Driver Partner')}
          </Text>

          {/* Star selector */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((starVal) => (
              <TouchableOpacity
                key={starVal}
                onPress={() => setStars(starVal)}
                style={styles.starBtn}
              >
                <Text
                  style={[
                    styles.starIcon,
                    starVal <= stars ? styles.starFilled : styles.starEmpty,
                  ]}
                >
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Feedback tags */}
          <View style={styles.tagsContainer}>
            {feedbackTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.key);
              return (
                <TouchableOpacity
                  key={tag.key}
                  style={[styles.tagChip, isSelected && styles.tagChipActive]}
                  onPress={() => toggleTag(tag.key)}
                >
                  <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Optional comment */}
          <TextInput
            style={styles.commentInput}
            placeholder={language === 'hi' ? 'कोई अन्य सुझाव या टिप्पणी (वैकल्पिक)...' : 'Additional feedback (optional)...'}
            placeholderTextColor={Colors.textMuted}
            value={comment}
            onChangeText={setComment}
          />

          <Button
            title={isSubmitted ? (language === 'hi' ? 'सफल! धन्यवाद्' : 'Submitted! Thank you') : t.submitFeedback}
            variant="primary"
            onPress={handleSubmitAll}
            isLoading={isLoading}
            size="large"
            style={{ marginTop: 16 }}
          />
        </Card>
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
    paddingBottom: 36,
  },
  celebrationBox: {
    alignItems: 'center',
    marginVertical: 16,
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
  },
  celebrationSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  fareCard: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 16,
  },
  fareDueLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  fareDueAmount: {
    fontSize: 44,
    fontWeight: '900',
    color: Colors.accent,
    marginVertical: 8,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  methodTab: {
    flex: 1,
    backgroundColor: Colors.surfaceBg,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  methodTabActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Colors.accent,
  },
  methodEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  methodText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  methodTextActive: {
    color: Colors.white,
  },
  upiBox: {
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
  },
  upiTitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  upiIdText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sunlightYellow,
    marginVertical: 4,
  },
  upiHint: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  ratingCard: {
    padding: 20,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'center',
  },
  ratingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 12,
  },
  starBtn: {
    padding: 4,
  },
  starIcon: {
    fontSize: 36,
  },
  starFilled: {
    color: Colors.sunlightYellow,
  },
  starEmpty: {
    color: Colors.cardBorder,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 12,
  },
  tagChip: {
    backgroundColor: Colors.surfaceBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  tagChipActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
    borderColor: Colors.primary,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tagTextActive: {
    color: Colors.white,
  },
  commentInput: {
    backgroundColor: Colors.inputBg,
    color: Colors.white,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginTop: 8,
  },
});
