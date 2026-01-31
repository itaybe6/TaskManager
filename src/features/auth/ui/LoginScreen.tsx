import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  I18nManager,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BrandLogo } from '../../../shared/ui/BrandLogo';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { useAuthStore } from '../store/authStore';
import { useResponsiveLayout } from '../../../shared/ui/useResponsiveLayout';

export function LoginScreen() {
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const auth = useAuthStore();
  const layout = useResponsiveLayout('narrow');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 6, [email, password]);

  const palette = useMemo(() => {
    // design-inspired colors (keep brand primary from theme)
    return {
      bg1: isDark ? theme.colors.primaryDarkest : theme.colors.primarySoft2,
      bg2: isDark ? theme.colors.primaryDeep : theme.colors.primarySoft,
      bg3: isDark ? theme.colors.primaryDarkest : theme.colors.surface,
      text: isDark ? '#ffffff' : '#0f172a',
      sub: isDark ? '#94a3b8' : '#64748b',
      glass: isDark ? 'rgba(17, 24, 39, 0.70)' : 'rgba(255, 255, 255, 0.72)',
      glassBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)',
      fieldBg: isDark ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255,255,255,0.55)',
      fieldBorder: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.28)',
      divider: isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.28)',
    } as const;
  }, [isDark]);

  if (layout.isDesktop) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: isDark ? '#0b0b0b' : theme.colors.background }]}>
        <View style={styles.desktopRoot}>
          <View style={[styles.desktopRight, { backgroundColor: '#ffffff' }]}>
            <View style={styles.desktopLangToggle}>
              <Text style={[styles.desktopLangText, { color: theme.colors.primary }]}>עברית</Text>
              <Text style={styles.desktopLangDivider}>|</Text>
              <Pressable onPress={() => {}} hitSlop={6} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={[styles.desktopLangText, { color: isDark ? '#9ca3af' : '#9ca3af' }]}>אנגלית</Text>
              </Pressable>
            </View>

            <View style={styles.desktopFormWrap}>
              <View style={styles.desktopFormHeader}>
                <Text style={[styles.desktopFormTitle, { color: isDark ? '#ffffff' : '#141118' }]}>כניסה למערכת</Text>
                <Text style={[styles.desktopFormSubtitle, { color: isDark ? '#9ca3af' : '#756189' }]}>
                  הזן את פרטיך כדי להתחבר
                </Text>
              </View>

              <View style={styles.desktopFields}>
                <View style={styles.desktopField}>
                  <Text style={[styles.desktopLabel, { color: isDark ? '#ffffff' : '#141118' }]}>אימייל</Text>
                  <TextInput
                    value={email}
                    onChangeText={(v) => {
                      auth.clearError();
                      setEmail(v);
                    }}
                    placeholder="name@example.com"
                    placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.desktopInput,
                      { color: isDark ? '#ffffff' : '#141118', borderBottomColor: isDark ? '#334155' : '#e2e8f0' },
                    ]}
                    textAlign="right"
                    writingDirection="ltr"
                  />
                </View>

                <View style={styles.desktopField}>
                  <View style={styles.desktopPasswordRow}>
                    <Pressable onPress={() => {}} hitSlop={6} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                      <Text style={[styles.desktopForgot, { color: theme.colors.primary }]}>שכחת סיסמה?</Text>
                    </Pressable>
                    <Text style={[styles.desktopLabel, { color: isDark ? '#ffffff' : '#141118' }]}>סיסמה</Text>
                  </View>
                  <View style={styles.desktopPasswordWrap}>
                    <Pressable
                      onPress={() => {}}
                      hitSlop={6}
                      style={({ pressed }) => [styles.desktopEye, pressed && { opacity: 0.7 }]}
                    >
                      <MaterialIcons name="visibility-off" size={18} color={isDark ? '#9ca3af' : '#94a3b8'} />
                    </Pressable>
                    <TextInput
                      value={password}
                      onChangeText={(v) => {
                        auth.clearError();
                        setPassword(v);
                      }}
                      placeholder="******"
                      placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[
                        styles.desktopInput,
                        styles.desktopPasswordInput,
                        { color: isDark ? '#ffffff' : '#141118', borderBottomColor: isDark ? '#334155' : '#e2e8f0' },
                      ]}
                      textAlign="right"
                      writingDirection="rtl"
                    />
                  </View>
                </View>
              </View>

              {auth.error ? (
                <Text style={[styles.error, { color: theme.colors.danger }]} numberOfLines={4}>
                  {auth.error}
                </Text>
              ) : null}

              <View style={styles.desktopActions}>
                <Pressable
                  onPress={() => auth.signInWithEmailPassword(email, password)}
                  disabled={!canSubmit || auth.isLoading}
                  style={({ pressed }) => [
                    styles.desktopPrimaryBtn,
                    {
                      backgroundColor: theme.colors.primary,
                      opacity: !canSubmit || auth.isLoading ? 0.6 : pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text style={styles.desktopPrimaryBtnText}>{auth.isLoading ? 'מתחבר...' : 'התחבר'}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={[styles.desktopLeft, { backgroundColor: theme.colors.primary }]}>
            <ImageBackground
              source={{
                uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop',
              }}
              style={styles.desktopLeftImage}
              imageStyle={styles.desktopLeftImageInner}
              resizeMode="cover"
            />
            <View style={styles.desktopLeftGlowA} />
            <View style={styles.desktopLeftGlowB} />
            <View style={styles.desktopLeftHeader}>
              <View style={styles.desktopLeftLogo}>
                <BrandLogo width={120} height={40} />
                <Text style={styles.desktopLeftBrand}>אסטרו</Text>
              </View>
            </View>
            <View style={styles.desktopLeftBody}>
              <Text style={styles.desktopLeftTitle}>ברוכים הבאים</Text>
              <Text style={styles.desktopLeftSubtitle}>
                כנס ללוח הבקרה כדי לנהל את החשבון הפרימיום שלך. הצטרף לקהילת חדשנים ויוצרים.
              </Text>
            </View>
            <Text style={styles.desktopLeftFooter}>© 2023 לומינה בעמ. כל הזכויות שמורות.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: isDark ? '#0b0b0b' : theme.colors.background }]}>
      <View
        pointerEvents="none"
        style={[
          styles.bg,
          {
            backgroundColor: palette.bg1,
          },
        ]}
      >
        <View style={[styles.blob, styles.blobA, { backgroundColor: theme.colors.primaryNeon, opacity: isDark ? 0.16 : 0.18 }]} />
        <View style={[styles.blob, styles.blobB, { backgroundColor: theme.colors.primaryClassic, opacity: isDark ? 0.16 : 0.18 }]} />
        <View style={[styles.blob, styles.blobC, { backgroundColor: theme.colors.primaryDeep, opacity: isDark ? 0.14 : 0.16 }]} />
        <View style={[styles.bgFade, { backgroundColor: palette.bg2, opacity: isDark ? 0.18 : 0.30 }]} />
        <View style={[styles.bgFade2, { backgroundColor: palette.bg3, opacity: isDark ? 0.18 : 0.26 }]} />
      </View>

      <KeyboardAvoidingView
        style={[styles.kav, { paddingHorizontal: layout.paddingX }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.wrap}>
          <View style={styles.hero}>
            <View style={styles.heroText}>
              <BrandLogo width={120} height={40} />
              <Text style={[styles.heroSub, { color: palette.sub }]}>פרויקט</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: palette.glass, borderColor: palette.glassBorder }]}>
            <View style={styles.cardTopRow}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>התחברות</Text>
              <Text style={[styles.welcome, { color: palette.sub }]}>ברוכים הבאים</Text>
            </View>

            <Text style={[styles.subtitle, { color: palette.sub }]}>
              כדי להיכנס למערכת, הזן מייל וסיסמה
            </Text>

            <View style={styles.form}>
              <Field
                label="מייל"
                icon="mail-outline"
                isDark={isDark}
                palette={palette}
              >
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    auth.clearError();
                    setEmail(v);
                  }}
                  placeholder="name@example.com"
                  placeholderTextColor={isDark ? '#6b7280' : '#94a3b8'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.fieldInput, { color: palette.text }]}
                  textAlign="right"
                  // Email is typically LTR even in RTL UI
                  writingDirection="ltr"
                />
              </Field>

              <Field
                label="סיסמה"
                icon="lock-outline"
                isDark={isDark}
                palette={palette}
              >
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    auth.clearError();
                    setPassword(v);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={isDark ? '#6b7280' : '#94a3b8'}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.fieldInput, styles.rtlInput, { color: palette.text }]}
                  textAlign="right"
                  writingDirection="rtl"
                />
              </Field>

              <View style={styles.forgotRow}>
                <Pressable onPress={() => {}} hitSlop={8} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                  <Text style={[styles.forgot, { color: theme.colors.primaryNeon }]}>שכחת סיסמה?</Text>
                </Pressable>
              </View>

              {auth.error ? (
                <Text style={[styles.error, { color: theme.colors.danger }]} numberOfLines={4}>
                  {auth.error}
                </Text>
              ) : null}

              <Pressable
                onPress={() => auth.signInWithEmailPassword(email, password)}
                disabled={!canSubmit || auth.isLoading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: !canSubmit || auth.isLoading ? 0.55 : pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  },
                ]}
              >
                <View style={styles.primaryBtnInner}>
                  <Text style={styles.primaryBtnText}>{auth.isLoading ? 'מתחבר...' : 'התחבר'}</Text>
                  <MaterialIcons name="arrow-back" size={18} color="#fff" />
                </View>
              </Pressable>

              <Text style={[styles.hint, { color: isDark ? '#9ca3af' : '#94a3b8' }]}>
                אם יצרת משתמשים דרך סופאבייס, אפשר להתחבר איתם כאן.
              </Text>
            </View>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  isDark: boolean;
  palette: {
    text: string;
    sub: string;
    fieldBg: string;
    fieldBorder: string;
  };
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: props.palette.sub }]}>{props.label}</Text>
      <View style={[styles.fieldBox, { backgroundColor: props.palette.fieldBg, borderColor: props.palette.fieldBorder }]}>
        <View pointerEvents="none" style={styles.fieldIcon}>
          <MaterialIcons name={props.icon} size={20} color={props.isDark ? '#94a3b8' : '#64748b'} />
        </View>
        <View style={styles.fieldInputWrap}>{props.children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  blob: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 999,
  },
  blobA: { top: -90, left: -120 },
  blobB: { top: -110, right: -140 },
  blobC: { bottom: -160, left: 40 },
  bgFade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bgFade2: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  kav: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  wrap: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  hero: { alignItems: 'flex-end', marginBottom: 18 },
  heroText: { alignItems: 'flex-end' },
  heroSub: {
    marginTop: -6,
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  card: {
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  cardTopRow: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: -0.3,
    alignSelf: 'stretch',
  },
  welcome: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    alignSelf: 'stretch',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
    alignSelf: 'stretch',
  },
  form: { marginTop: 16, gap: 14 },

  fieldWrap: { gap: 8 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    alignSelf: 'stretch',
  },
  fieldBox: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 52,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    paddingRight: 12,
    paddingLeft: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  fieldIcon: { width: 30, alignItems: 'center', justifyContent: 'center' },
  fieldInputWrap: { flex: 1, paddingRight: 6 },
  fieldInput: {
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  rtlInput: {
    writingDirection: 'rtl',
  },

  forgotRow: { alignItems: 'flex-end', marginTop: -6 },
  forgot: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    alignSelf: 'stretch',
  },

  primaryBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primaryDeep,
    shadowOpacity: 0.30,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  primaryBtnInner: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 10 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  error: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 18,
    alignSelf: 'stretch',
  },
  hint: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    alignSelf: 'stretch',
  },

  desktopRoot: { flex: 1, flexDirection: 'row', minHeight: '100%' },
  desktopLeft: {
    flex: 1,
    paddingHorizontal: 64,
    paddingVertical: 64,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  desktopLeftImage: { ...StyleSheet.absoluteFillObject, opacity: 0.22 },
  desktopLeftImageInner: { opacity: 0.5 },
  desktopLeftGlowA: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: '#fff',
    opacity: 0.08,
    top: -80,
    left: -80,
  },
  desktopLeftGlowB: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: '#fff',
    opacity: 0.12,
    bottom: -80,
    right: -80,
  },
  desktopLeftHeader: { zIndex: 2, alignItems: 'flex-end' },
  desktopLeftLogo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, alignSelf: 'flex-end' },
  desktopLeftBrand: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  desktopLeftBody: { zIndex: 2, gap: 16, maxWidth: 440, alignItems: 'flex-end' },
  desktopLeftTitle: { color: '#fff', fontSize: 46, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  desktopLeftSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  desktopLeftFooter: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'right', alignSelf: 'flex-end' },

  desktopRight: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  desktopLangToggle: {
    position: 'absolute',
    top: 24,
    right: 32,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  desktopLangText: { fontSize: 11, fontWeight: '800', writingDirection: 'rtl', textAlign: 'right' },
  desktopLangDivider: { color: '#cbd5f5', fontSize: 12 },
  desktopFormWrap: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 28, alignItems: 'flex-end' },
  desktopFormHeader: { alignItems: 'flex-end', gap: 6, alignSelf: 'stretch' },
  desktopFormTitle: { fontSize: 28, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  desktopFormSubtitle: { fontSize: 13, fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },
  desktopFields: { gap: 22, alignSelf: 'stretch' },
  desktopField: { gap: 12 },
  desktopLabel: { fontSize: 12, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  desktopInput: {
    borderBottomWidth: 2,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  desktopPasswordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  desktopForgot: { fontSize: 11, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  desktopPasswordWrap: { position: 'relative' },
  desktopEye: { position: 'absolute', left: 0, top: 6, padding: 8, zIndex: 2 },
  desktopPasswordInput: { paddingLeft: 32 },
  desktopActions: { gap: 18, alignSelf: 'stretch' },
  desktopPrimaryBtn: {
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  desktopPrimaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});

