import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../features/auth/store/authStore';
import { supabaseRest } from '../../app/supabase/rest';
import { uploadAvatarFromUri } from '../../app/supabase/storage';
import { theme } from './theme';

type Props = {
  size?: number;
  backgroundColor?: string;
  style?: ViewStyle;
};

export function UserAvatarButton({ size = 40, backgroundColor = theme.colors.primary, style }: Props) {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
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
    })();
  }, [userId]);

  const onPress = useCallback(async () => {
    if (!userId || isUploading) return;
    setIsUploading(true);
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const uploaded = await uploadAvatarFromUri({
        userId,
        uri: asset.uri,
        contentType: asset.mimeType ?? 'image/jpeg',
      });

      await supabaseRest({
        method: 'PATCH',
        path: '/rest/v1/users',
        query: { id: `eq.${userId}` },
        body: { avatar_url: uploaded.publicUrl },
        preferReturnRepresentation: false,
      });

      setAvatarUrl(uploaded.publicUrl);
    } finally {
      setIsUploading(false);
    }
  }, [userId, isUploading]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
      <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor }, style]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.img} resizeMode="cover" />
        ) : (
          <MaterialIcons name="person" size={Math.round(size * 0.55)} color="#fff" />
        )}
        {isUploading ? (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

