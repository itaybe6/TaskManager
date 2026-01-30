import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../features/auth/store/authStore';
import { supabaseRest } from '../../app/supabase/rest';
import { theme } from './theme';

type Props = {
  size?: number;
  backgroundColor?: string;
  style?: ViewStyle;
  onPress?: () => void;
};

export function UserAvatarButton({ size = 40, backgroundColor, style, onPress }: Props) {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const navigation = useNavigation<any>();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const finalBg = backgroundColor ?? theme.colors.primary;

  const fetchAvatar = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await supabaseRest<Array<{ avatar_url: string | null }>>({
        method: 'GET',
        path: '/rest/v1/users',
        query: { select: 'avatar_url', id: `eq.${userId}`, limit: '1' },
      });
      setAvatarUrl(res?.[0]?.avatar_url ?? null);
    } catch {
      // ignore
    }
  }, [userId]);

  useEffect(() => {
    fetchAvatar();
  }, [fetchAvatar]);

  useFocusEffect(
    useCallback(() => {
      fetchAvatar();
    }, [fetchAvatar])
  );

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    navigation.navigate('Settings');
  }, [navigation, onPress]);

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
      <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: finalBg }, style]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.img} resizeMode="cover" />
        ) : (
          <MaterialIcons name="person" size={Math.round(size * 0.55)} color="#fff" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  img: { width: '100%', height: '100%' },
});

