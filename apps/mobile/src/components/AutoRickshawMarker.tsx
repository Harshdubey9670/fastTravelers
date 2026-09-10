import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface AutoRickshawMarkerProps {
  heading?: number | null;
  size?: number;
  vehicleType?: 'AUTO' | 'E_RICKSHAW' | string;
}

export const AutoRickshawMarker: React.FC<AutoRickshawMarkerProps> = ({
  heading = 0,
  size = 42,
  vehicleType = 'AUTO',
}) => {
  const rotation = typeof heading === 'number' && !isNaN(heading) ? heading : 0;
  const isElectric = vehicleType === 'E_RICKSHAW';
  const primaryColor = isElectric ? '#10B981' : '#FFB703'; // Emerald for E-Rickshaw, Amber Yellow for Auto
  const roofColor = isElectric ? '#065F46' : '#1E293B'; // Dark canopy

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer Pulse Ring */}
      <View
        style={[
          styles.pulseRing,
          {
            borderColor: primaryColor,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />

      {/* Rotating Auto-Rickshaw SVG Asset */}
      <View
        style={[
          styles.svgWrapper,
          {
            transform: [{ rotate: `${rotation}deg` }],
          },
        ]}
      >
        <Svg width={size * 0.75} height={size * 0.75} viewBox="0 0 48 48" fill="none">
          {/* Shadow */}
          <Circle cx="24" cy="24" r="20" fill="rgba(0,0,0,0.35)" />

          {/* Vehicle Body Base (Aerodynamic top-down silhouette) */}
          <Path
            d="M 24 6 C 18 6 14 12 14 20 L 14 36 C 14 40 18 42 24 42 C 30 42 34 40 34 36 L 34 20 C 34 12 30 6 24 6 Z"
            fill={primaryColor}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />

          {/* Windshield / Front Glass */}
          <Path
            d="M 18 14 C 20 11 28 11 30 14 L 29 18 C 26 17 22 17 19 18 Z"
            fill="#38BDF8"
            opacity="0.9"
          />

          {/* Canopy / Roof */}
          <Rect
            x="17"
            y="20"
            width="14"
            height="18"
            rx="3"
            fill={roofColor}
          />

          {/* Headlight / Direction Indicator Tip */}
          <Path
            d="M 23 4 L 25 4 L 24 7 Z"
            fill="#FACC15"
          />

          {/* Side Wheels (Left and Right rear) */}
          <Rect x="11" y="28" width="3" height="8" rx="1.5" fill="#0F172A" />
          <Rect x="34" y="28" width="3" height="8" rx="1.5" fill="#0F172A" />
          {/* Front Wheel */}
          <Rect x="22.5" y="7" width="3" height="5" rx="1.5" fill="#0F172A" />
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1.5,
    opacity: 0.4,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
