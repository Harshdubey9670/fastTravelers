import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../theme/colors';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', style, textStyle }) => {
  const getStyles = () => {
    switch (variant) {
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: Colors.accent, border: Colors.accent };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: Colors.warning, border: Colors.warning };
      case 'danger':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: Colors.danger, border: Colors.danger };
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: Colors.info, border: Colors.info };
      case 'primary':
        return { bg: 'rgba(255, 107, 0, 0.15)', text: Colors.primary, border: Colors.primary };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: Colors.textSecondary, border: Colors.cardBorder };
    }
  };

  const colors = getStyles();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg, borderColor: colors.border },
        style,
      ]}
    >
      <Text style={[styles.label, { color: colors.text }, textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
