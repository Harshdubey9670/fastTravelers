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
import { translations } from '../../i18n/translations';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';

interface ProfileScreenProps {
  onBack: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const {
    user,
    driverProfile,
    currentRole,
    setCurrentRole,
    language,
    setLanguage,
    logout,
  } = useAuthStore();
  const t = translations[language];

  const isHindi = language === 'hi';

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <Header
        showBack
        onBack={onBack}
        title={isHindi ? 'मेरी प्रोफ़ाइल' : 'My Profile'}
        showSos={false}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>
              {currentRole === 'DRIVER' ? '🛺' : '👤'}
            </Text>
          </View>
          <Text style={styles.userName}>
            {user?.name || (isHindi ? 'उपयोगकर्ता' : 'Gaon Auto User')}
          </Text>
          <Text style={styles.userPhone}>
            {user?.phone ? `+91 ${user.phone.slice(-10)}` : '+91 9876543210'}
          </Text>
          <Badge
            label={currentRole === 'DRIVER' ? t.driver : t.passenger}
            variant="primary"
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Language Selection */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🌐 {isHindi ? 'भाषा चुनें / Language' : 'Language / भाषा'}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, language === 'hi' && styles.langBtnActive]}
              onPress={() => setLanguage('hi')}
            >
              <Text style={[styles.langText, language === 'hi' && styles.langTextActive]}>
                🇮🇳 हिन्दी (Hindi)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
              onPress={() => setLanguage('en')}
            >
              <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
                🇬🇧 English
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Mode Switcher */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🔄 {isHindi ? 'ऐप मोड बदलें' : 'Switch App Mode'}</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleBtn, currentRole === 'PASSENGER' && styles.roleBtnActive]}
              onPress={() => setCurrentRole('PASSENGER')}
            >
              <Text style={[styles.roleBtnText, currentRole === 'PASSENGER' && styles.roleBtnTextActive]}>
                👤 {t.passenger}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleBtn, currentRole === 'DRIVER' && styles.roleBtnActive]}
              onPress={() => setCurrentRole('DRIVER')}
            >
              <Text style={[styles.roleBtnText, currentRole === 'DRIVER' && styles.roleBtnTextActive]}>
                🛺 {t.driver}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Emergency Contacts Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🚨 {isHindi ? 'आपातकालीन संपर्क (SOS)' : 'Emergency Contacts'}</Text>
          <Text style={styles.sectionSubtitle}>
            {isHindi
              ? 'मुसीबत के समय इन नंबरों पर एक टैप से संपर्क किया जा सकता है'
              : 'These contacts can be called with 1-tap during emergencies'}
          </Text>

          <View style={styles.contactItem}>
            <Text style={styles.contactName}>112 (राष्ट्रीय आपातकालीन सेवा)</Text>
            <Text style={styles.contactPhone}>National Police/Medical Helpline</Text>
          </View>
        </Card>

        {/* Logout Button */}
        <Button
          title={t.logout}
          variant="danger"
          onPress={handleLogout}
          size="large"
          style={{ marginTop: 12, marginBottom: 32 }}
        />
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
  },
  userCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 12,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  userName: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
  },
  userPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  langRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceBg,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  langBtnActive: {
    borderColor: Colors.sunlightYellow,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
  },
  langText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  langTextActive: {
    color: Colors.white,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceBg,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  roleBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
  },
  roleBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  roleBtnTextActive: {
    color: Colors.white,
  },
  contactItem: {
    backgroundColor: Colors.surfaceBg,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  contactPhone: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
