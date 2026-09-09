import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { IRide } from '@gaon-auto/types';

interface SOSModalProps {
  visible: boolean;
  onClose: () => void;
  activeRide?: IRide | null;
}

export const SOSModal: React.FC<SOSModalProps> = ({ visible, onClose, activeRide }) => {
  const { language, user } = useAuthStore();

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const isHindi = language === 'hi';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>🚨 {isHindi ? 'आपातकालीन मदद (SOS)' : 'Emergency Assistance (SOS)'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            {isHindi
              ? 'यदि आप किसी खतरे में हैं, तो तुरंत नीचे दिए गए नंबरों पर संपर्क करें:'
              : 'If you are in danger or need immediate help, contact below services:'}
          </Text>

          {/* Quick Helplines */}
          <View style={styles.actionCol}>
            <TouchableOpacity
              style={[styles.callBtn, { backgroundColor: Colors.danger }]}
              onPress={() => handleCall('112')}
            >
              <Text style={styles.callIcon}>📞</Text>
              <View>
                <Text style={styles.callTitle}>112 - {isHindi ? 'राष्ट्रीय आपातकालीन सेवा' : 'National Emergency'}</Text>
                <Text style={styles.callDesc}>{isHindi ? 'पुलिस / एम्बुलेंस / फायर' : 'Police / Ambulance / Fire'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.callBtn, { backgroundColor: '#B91C1C' }]}
              onPress={() => handleCall('100')}
            >
              <Text style={styles.callIcon}>👮</Text>
              <View>
                <Text style={styles.callTitle}>100 - {isHindi ? 'पुलिस सहायता' : 'Police Control Room'}</Text>
                <Text style={styles.callDesc}>{isHindi ? 'तत्काल नजदीकी थाना' : 'Immediate Police Dispatch'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.callBtn, { backgroundColor: '#1E40AF' }]}
              onPress={() => handleCall('108')}
            >
              <Text style={styles.callIcon}>🚑</Text>
              <View>
                <Text style={styles.callTitle}>108 - {isHindi ? 'एम्बुलेंस सेवा' : 'Emergency Ambulance'}</Text>
                <Text style={styles.callDesc}>{isHindi ? 'चिकित्सा सहायता' : 'Medical Help'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Active Trip Info */}
          {activeRide ? (
            <View style={styles.tripInfoBox}>
              <Text style={styles.tripInfoTitle}>
                {isHindi ? 'सवारी विवरण (सत्यापन हेतु):' : 'Active Ride Details (For Verification):'}
              </Text>
              <Text style={styles.tripInfoText}>
                {isHindi ? 'सवारी आईडी:' : 'Ride ID:'} {activeRide.rideNumber || activeRide.id}
              </Text>
              <Text style={styles.tripInfoText}>
                {isHindi ? 'पिकअप:' : 'Pickup:'} {activeRide.pickup.addressText}
              </Text>
              <Text style={styles.tripInfoText}>
                {isHindi ? 'गंतव्य:' : 'Drop:'} {activeRide.destination.addressText}
              </Text>
              {activeRide.driver ? (
                <Text style={styles.tripInfoText}>
                  {isHindi ? 'चालक:' : 'Driver:'} {activeRide.driver.user?.name || 'Partner'} ({activeRide.driver.vehicle?.registrationNumber || 'Auto'})
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Emergency contacts configured by user */}
          {user?.emergencyContacts && user.emergencyContacts.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.contactTitle}>
                {isHindi ? 'व्यक्तिगत आपातकालीन संपर्क:' : 'Personal Emergency Contacts:'}
              </Text>
              {user.emergencyContacts.map((c, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.personalContactBtn}
                  onPress={() => handleCall(c.phone)}
                >
                  <Text style={styles.personalName}>{c.name} ({c.relation})</Text>
                  <Text style={styles.personalPhone}>📞 {c.phone}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: Colors.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.danger,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.danger,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: Colors.textSecondary,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  actionCol: {
    gap: 10,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  callIcon: {
    fontSize: 24,
  },
  callTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.white,
  },
  callDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  tripInfoBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tripInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sunlightYellow,
    marginBottom: 4,
  },
  tripInfoText: {
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  personalContactBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceBg,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 6,
  },
  personalName: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  personalPhone: {
    color: Colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
});
