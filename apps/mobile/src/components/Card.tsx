import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'highlight' | 'warning' | 'danger';
}


export const Card: React.FC<CardProps> = ({ children, style, variant = 'default' }) => {
  const getBorderColor = () => {
    switch (variant) {
      case 'highlight':
        return Colors.primary;
      case 'warning':
        return Colors.warning;
      case 'danger':
        return Colors.danger;
      default:
        return Colors.cardBorder;
    }
  };

  return (
    <View style={[styles.card, { borderColor: getBorderColor() }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
    marginBottom: 12,
  },
});
