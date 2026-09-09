import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { translations } from '../i18n/translations';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  onSosPress?: () => void;
  showSos?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  onSosPress,
  showSos = true,
}) => {
  const { language, setLanguage, currentRole, setCurrentRole, isAuthenticated } = useAuthStore();
  const t = translations[language];

  const toggleLanguage = () => {
    setLanguage(language === 'hi' ? 'en' : 'hi');
  };

  const toggleRole = () => {
    setCurrentRole(currentRole === 'PASSENGER' ? 'DRIVER' : 'PASSENGER');
  };

  return (
    <View style={styles.header}>
      <View style={styles.leftRow}>
        {showBack && onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        ) : null}
        <View>
          <Text style={styles.logoText}>
            🛺 <Text style={styles.brandPrimary}>{t.appName}</Text>
          </Text>
          {title ? <Text style={styles.screenTitle}>{title}</Text> : null}
        </View>
      </View>

      <View style={styles.rightRow}>
        {/* Language switch button */}
        <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
          <Text style={styles.langText}>
            {language === 'hi' ? 'English' : 'हिन्दी'}
          </Text>
        </TouchableOpacity>

        {/* Role toggle badge if authenticated */}
        {isAuthenticated ? (
          <TouchableOpacity onPress={toggleRole} style={styles.roleButton}>
            <Text style={styles.roleText}>
              {currentRole === 'PASSENGER' ? 'सवारी' : 'चालक'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* SOS Button */}
        {showSos && onSosPress ? (
          <TouchableOpacity onPress={onSosPress} style={styles.sosButton}>
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  backText: {
    color: Colors.white,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '600',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
  },
  brandPrimary: {
    color: Colors.primary,
  },
  screenTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langButton: {
    backgroundColor: Colors.cardBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  langText: {
    color: Colors.sunlightYellow,
    fontWeight: '700',
    fontSize: 13,
  },
  roleButton: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  roleText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  sosButton: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  sosText: {
    color: Colors.white,
    fontWeight: '900',
    fontSize: 13,
  },
});
