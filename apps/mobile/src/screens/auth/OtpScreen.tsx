import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { translations } from '../../i18n/translations';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';

interface OtpScreenProps {
  phone: string;
  onChangeNumber: () => void;
  onSuccess: () => void;
}

export const OtpScreen: React.FC<OtpScreenProps> = ({
  phone,
  onChangeNumber,
  onSuccess,
}) => {
  const { language, verifyOtp, requestOtp, devOtpHint, isLoading, error, clearError } = useAuthStore();
  const t = translations[language];

  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Autofill dev OTP if available for smooth demonstration
  useEffect(() => {
    if (devOtpHint) {
      setOtp(devOtpHint);
    }
  }, [devOtpHint]);

  const handleVerify = async () => {
    clearError();
    if (otp.length < 6) return;
    const ok = await verifyOtp(phone, otp);
    if (ok) {
      onSuccess();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      const res = await requestOtp(phone);
      setCooldown(res.cooldownSeconds || 60);
      if (res.devOtp) {
        setOtp(res.devOtp);
      }
    } catch {
      // Handled in store
    }
  };

  return (
    <View style={styles.container}>
      <Header showBack onBack={onChangeNumber} showSos={false} />
      <KeyboardAvoidingView
        style={{ flex: 1, padding: 20, justifyContent: 'center' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{t.verifyOtp}</Text>
          <Text style={styles.subtitle}>
            {t.otpSentTo} <Text style={styles.phoneHighlight}>+91 {phone.slice(-10)}</Text>
          </Text>

          {/* Dev OTP Helper Banner */}
          {devOtpHint ? (
            <TouchableOpacity
              style={styles.devOtpBox}
              onPress={() => setOtp(devOtpHint)}
            >
              <Text style={styles.devOtpLabel}>⚡ {t.devOtpHint}</Text>
              <Text style={styles.devOtpCode}>{devOtpHint} (टैप करें)</Text>
            </TouchableOpacity>
          ) : null}

          {/* OTP Input */}
          <TextInput
            style={styles.otpInput}
            placeholder="• • • • • •"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(val) => setOtp(val.replace(/\D/g, ''))}
            autoFocus
          />

          {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

          {/* Resend Row */}
          <View style={styles.resendRow}>
            {cooldown > 0 ? (
              <Text style={styles.timerText}>
                {t.resendOtp} ({cooldown}s)
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendBtnText}>{t.resendOtp}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onChangeNumber}>
              <Text style={styles.changeNumberText}>{t.changeNumber}</Text>
            </TouchableOpacity>
          </View>

          <Button
            title={t.verifyOtp}
            onPress={handleVerify}
            size="large"
            disabled={otp.length < 6}
            isLoading={isLoading}
            style={{ marginTop: 20 }}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  phoneHighlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  devOtpBox: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    borderWidth: 1.5,
    borderColor: Colors.sunlightYellow,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  devOtpLabel: {
    color: Colors.sunlightYellow,
    fontSize: 13,
    fontWeight: '700',
  },
  devOtpCode: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  otpInput: {
    backgroundColor: Colors.inputBg,
    color: Colors.white,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
    letterSpacing: 12,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  timerText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  resendBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  changeNumberText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    marginTop: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
