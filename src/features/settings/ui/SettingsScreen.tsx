import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../auth/store/authStore';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { useResponsiveLayout } from '../../../shared/ui/useResponsiveLayout';
import { supabaseRest } from '../../../app/supabase/rest';
import { uploadAvatarFromUri } from '../../../app/supabase/storage';
import { theme } from '../../../shared/ui/theme';

type UserRow = { avatar_url: string | null };

export function SettingsScreen({ navigation }: any) {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const signOut = useAuthStore((s) => s.signOut);
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const layout = useResponsiveLayout('narrow');

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const palette = useMemo(
    () => ({
      bg: isDark ? '#121212' : '#F6F7FB',
      surface: isDark ? '#1E1E1E' : '#ffffff',
      border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.10)',
      text: isDark ? '#ffffff' : '#111827',
      muted: isDark ? '#9ca3af' : '#6b7280',
    }),
    [isDark]
  );

  const fetchAvatar = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await supabaseRest<UserRow[]>({
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

  const handlePickAvatar = useCallback(async () => {
    if (!userId || isUploading) return;
    setIsUploading(true);
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('אין הרשאה', 'יש לאשר גישה לגלריה כדי לבחור תמונה.');
        return;
      }

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
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'נכשל בהעלאת התמונה');
    } finally {
      setIsUploading(false);
    }
  }, [userId, isUploading]);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, signOut]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: palette.bg }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <MaterialIcons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={palette.muted} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>הגדרות</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={[styles.body, { paddingHorizontal: layout.paddingX }]}>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarFrame}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primary }]}>
                  <MaterialIcons name="person" size={32} color="#fff" />
                </View>
              )}
              {isUploading ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>תמונת פרופיל</Text>
              <Text style={[styles.cardSubtitle, { color: palette.muted }]}>העלה תמונה שתוצג בכל האפליקציה</Text>
            </View>
          </View>

          <Pressable
            onPress={handlePickAvatar}
            disabled={isUploading}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity: isUploading ? 0.6 : pressed ? 0.92 : 1,
              },
            ]}
          >
            <MaterialIcons name="image" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>העלה תמונה</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>חשבון</Text>
          <Text style={[styles.cardSubtitle, { color: palette.muted }]}>התנתקות מהאפליקציה במכשיר זה</Text>
          <Pressable
            onPress={handleSignOut}
            disabled={isSigningOut}
            style={({ pressed }) => [
              styles.signOutBtn,
              { opacity: isSigningOut ? 0.6 : pressed ? 0.9 : 1 },
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <MaterialIcons name="logout" size={18} color="#ef4444" />
            )}
            <Text style={styles.signOutText}>התנתק</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', textAlign: 'right' },
  body: { flex: 1, paddingTop: 16, gap: 14 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  avatarRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 14 },
  avatarFrame: { width: 72, height: 72, borderRadius: 999, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '900', textAlign: 'right' },
  cardSubtitle: { fontSize: 12, fontWeight: '700', textAlign: 'right' },
  primaryBtn: {
    height: 46,
    borderRadius: 14,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  signOutBtn: {
    height: 44,
    borderRadius: 14,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  signOutText: { color: '#ef4444', fontWeight: '900', fontSize: 14 },
});

