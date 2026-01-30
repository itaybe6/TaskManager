import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useNotificationsStore } from '../../features/notifications/store/notificationsStore';

type Props = {
  isDark: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function NotificationBellButton({ isDark, onPress, style }: Props) {
  const navigation = useNavigation<any>();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    navigation.navigate('Notifications');
  }, [navigation, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.bellBtn,
        {
          backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.10)',
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <MaterialIcons name="notifications" size={22} color={isDark ? '#e5e7eb' : '#6b7280'} />
      {unreadCount > 0 ? <View style={styles.notifDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    padding: 10,
    borderRadius: 999,
    position: 'relative',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
});

