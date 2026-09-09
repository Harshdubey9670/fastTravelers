import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { translations } from '../../i18n/translations';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { isValidIndianMobile } from '@gaon-auto/utils';

interface LoginScreenProps {
  onOtpRequested: (phone: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onOtpRequested }) => {
  const { language, currentRole, setCurrentRole, requestOtp, isLoading, error, clearError } = useAuthStore();
  const t = translations[language];

  const [phone, setPhone] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSendOtp = async () => {
    setValidationError('');
    clearError();

    const cleanPhone = phone.trim();
    if (!isValidIndianMobile(cleanPhone)) {
      setValidationError(t.invalidPhone);
      return;
    }

    try {
      await requestOtp(cleanPhone, currentRole);
      onOtpRequested(cleanPhone);
    } catch (err) {
      // Error handled in store
    }
  };

  return (
    <View style={styles.container}>
      <Header showSos={false} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Welcome Banner */}
          <View style={styles.bannerBox}>
            <Text style={styles.bannerEmoji}>🛺</Text>
            <Text style={styles.bannerTitle}>{t.appName}</Text>
            <Text style={styles.bannerSubtitle}>{t.tagline}</Text>
          </View>

          {/* Role Selection Tabs */}
          <View style={styles.roleCard}>
            <Text style={styles.roleTitle}>{t.roleSelectTitle}</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleTab,
                  currentRole === 'PASSENGER' && styles.activePassengerTab,
                ]}
                onPress={() => setCurrentRole('PASSENGER')}
              >
                <Text style={styles.tabEmoji}>👤</Text>
                <Text
                  style={[
                    styles.roleTabText,
                    currentRole === 'PASSENGER' && styles.activeTabText,
                  ]}
                >
                  {t.passenger}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleTab,
                  currentRole === 'DRIVER' && styles.activeDriverTab,
                ]}
                onPress={() => setCurrentRole('DRIVER')}
              >
                <Text style={styles.tabEmoji}>🛺</Text>
                <Text
                  style={[
                    styles.roleTabText,
                    currentRole === 'DRIVER' && styles.activeTabText,
                  ]}
                >
                  {t.driver}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Phone Input Box */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t.loginTitle}</Text>
            <Text style={styles.inputSubLabel}>{t.loginSubtitle}</Text>

            <View style={styles.phoneInputRow}>
              <View style={styles.countryCodeBox}>
                <Text style={styles.flagEmoji}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>

              <TextInput
                style={styles.phoneInput}
                placeholder={t.phonePlaceholder}
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(val) => {
                  setPhone(val.replace(/\D/g, ''));
                  setValidationError('');
                }}
              />
            </View>

            {validationError ? (
              <Text style={styles.errorText}>⚠️ {validationError}</Text>
            ) : null}

            {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

            <Button
              title={t.getOtp}
              onPress={handleSendOtp}
              size="large"
              isLoading={isLoading}
              style={{ marginTop: 20 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
  },
  bannerBox: {
    alignItems: 'center',
    marginVertical: 24,
  },
  bannerEmoji: {
    fontSize: 54,
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  roleCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    marginBottom: 20,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceBg,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  activePassengerTab: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: Colors.primary,
  },
  activeDriverTab: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Colors.accent,
  },
  tabEmoji: {
    fontSize: 20,
  },
  roleTabText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.white,
  },
  inputContainer: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 4,
  },
  inputSubLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    gap: 6,
  },
  flagEmoji: {
    fontSize: 18,
  },
  countryCodeText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    letterSpacing: 1,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    marginTop: 10,
    fontWeight: '600',
  },
});
