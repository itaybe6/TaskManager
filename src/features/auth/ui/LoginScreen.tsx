import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable, TextInput } from 'react-native';
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
      bg1: isDark ? '#0f172a' : '#eef2ff',
      bg2: isDark ? '#2e1065' : '#f3e8ff',
      bg3: isDark ? '#0b1220' : '#dbeafe',
      text: isDark ? '#ffffff' : '#0f172a',
      sub: isDark ? '#94a3b8' : '#64748b',
      glass: isDark ? 'rgba(17, 24, 39, 0.70)' : 'rgba(255, 255, 255, 0.72)',
      glassBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)',
      fieldBg: isDark ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255,255,255,0.55)',
      fieldBorder: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.28)',
      divider: isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.28)',
    } as const;
  }, [isDark]);

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
        <View style={[styles.blob, styles.blobA, { backgroundColor: '#a78bfa', opacity: isDark ? 0.16 : 0.26 }]} />
        <View style={[styles.blob, styles.blobB, { backgroundColor: '#60a5fa', opacity: isDark ? 0.16 : 0.24 }]} />
        <View style={[styles.blob, styles.blobC, { backgroundColor: '#818cf8', opacity: isDark ? 0.14 : 0.22 }]} />
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
              <Text style={[styles.heroSub, { color: palette.sub }]}>Project</Text>
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
                  <Text style={[styles.forgot, { color: theme.colors.primary }]}>שכחת סיסמה?</Text>
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
                אם יצרת משתמשים דרך Supabase Auth, אפשר להתחבר איתם כאן.
              </Text>
            </View>
          </View>

          <View style={styles.bottomCta}>
            <Text style={[styles.bottomText, { color: palette.sub }]}>
              אין לך עדיין חשבון?{' '}
            </Text>
            <Pressable onPress={() => {}} hitSlop={8} style={({ pressed }) => [pressed && { opacity: 0.75 }]}>
              <Text style={[styles.bottomLink, { color: theme.colors.primary }]}>הרשם עכשיו</Text>
            </Pressable>
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
  hero: { alignItems: 'center', marginBottom: 18 },
  heroText: { alignItems: 'center' },
  heroSub: {
    marginTop: -6,
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    fontWeight: '600',
    textAlign: 'center',
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
    flexDirection: 'row-reverse',
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
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.30,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  primaryBtnInner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
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

  bottomCta: {
    marginTop: 14,
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  bottomText: { fontSize: 13, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  bottomLink: { fontSize: 13, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
});

