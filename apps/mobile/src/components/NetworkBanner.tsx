import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { socketService } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';

export const NetworkBanner: React.FC = () => {
  const { language, isAuthenticated } = useAuthStore();
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const conn = socketService.getIsConnected();
      setIsConnected(conn);
    }, 2000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (isConnected || !isAuthenticated) {
    return null;
  }

  const message =
    language === 'hi'
      ? 'नेटवर्क कमजोर है... सर्वर से पुनः जुड़ रहे हैं (सवारी सुरक्षित है)'
      : 'Weak network... Reconnecting to server (Ride is safe)';

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠️ {message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.warning,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
});
