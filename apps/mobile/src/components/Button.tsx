import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '../theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'danger' | 'secondary' | 'outline';
  size?: 'normal' | 'large' | 'small';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'normal',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return '#334155';
    switch (variant) {
      case 'primary':
        return Colors.primary;
      case 'accent':
        return Colors.accent;
      case 'danger':
        return Colors.danger;
      case 'secondary':
        return Colors.cardBg;
      case 'outline':
        return 'transparent';
      default:
        return Colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return '#94A3B8';
    switch (variant) {
      case 'outline':
        return Colors.primary;
      case 'secondary':
        return Colors.textPrimary;
      default:
        return Colors.white;
    }
  };

  const getMinHeight = () => {
    if (size === 'large') return 60;
    if (size === 'small') return 40;
    return 52;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || isLoading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          minHeight: getMinHeight(),
          borderWidth: variant === 'outline' ? 2 : 0,
          borderColor: variant === 'outline' ? Colors.primary : undefined,
        },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: size === 'large' ? 18 : size === 'small' ? 14 : 16,
                marginLeft: icon ? 8 : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
