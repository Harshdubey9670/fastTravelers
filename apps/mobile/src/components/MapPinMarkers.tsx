import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface MarkerProps {
  language?: 'hi' | 'en';
  title?: string;
}

/**
 * Visual SVG Pin Marker for Pickup Location (Emerald Green Theme)
 */
export const PickupPinMarker: React.FC<MarkerProps> = ({ language = 'hi', title }) => {
  const label = title || (language === 'hi' ? 'पिकअप' : 'Pickup');

  return (
    <View style={styles.container}>
      {/* Pill Badge */}
      <View style={[styles.badge, styles.pickupBadge]}>
        <View style={styles.greenDot} />
        <Text style={styles.badgeText}>{label}</Text>
      </View>

      {/* SVG Pin Icon */}
      <Svg width={36} height={42} viewBox="0 0 36 42" fill="none">
        {/* Pin Shadow */}
        <Circle cx="18" cy="38" r="4" fill="rgba(0,0,0,0.3)" />

        {/* Pin Body */}
        <Path
          d="M 18 2 C 10.27 2 4 8.27 4 16 C 4 25.5 18 38 18 38 C 18 38 32 25.5 32 16 C 32 8.27 25.73 2 18 2 Z"
          fill="#10B981"
          stroke="#FFFFFF"
          strokeWidth="2"
        />

        {/* Inner Target Center */}
        <Circle cx="18" cy="16" r="6" fill="#FFFFFF" />
        <Circle cx="18" cy="16" r="3" fill="#065F46" />
      </Svg>
    </View>
  );
};

/**
 * Visual SVG Pin Marker for Destination Location (Ruby Red Theme)
 */
export const DestinationPinMarker: React.FC<MarkerProps> = ({ language = 'hi', title }) => {
  const label = title || (language === 'hi' ? 'गंतव्य' : 'Destination');

  return (
    <View style={styles.container}>
      {/* Pill Badge */}
      <View style={[styles.badge, styles.destBadge]}>
        <View style={styles.redDot} />
        <Text style={styles.badgeText}>{label}</Text>
      </View>

      {/* SVG Pin Icon */}
      <Svg width={36} height={42} viewBox="0 0 36 42" fill="none">
        {/* Pin Shadow */}
        <Circle cx="18" cy="38" r="4" fill="rgba(0,0,0,0.3)" />

        {/* Pin Body */}
        <Path
          d="M 18 2 C 10.27 2 4 8.27 4 16 C 4 25.5 18 38 18 38 C 18 38 32 25.5 32 16 C 32 8.27 25.73 2 18 2 Z"
          fill="#EF4444"
          stroke="#FFFFFF"
          strokeWidth="2"
        />

        {/* Inner Target Center */}
        <Circle cx="18" cy="16" r="6" fill="#FFFFFF" />
        <Circle cx="18" cy="16" r="3" fill="#991B1B" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: -4,
    zIndex: 2,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  pickupBadge: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  destBadge: {
    backgroundColor: '#7F1D1D',
    borderColor: '#EF4444',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
    marginRight: 4,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F87171',
    marginRight: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
