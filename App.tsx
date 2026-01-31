import React, { useEffect, useMemo, useRef } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { DevSettings, I18nManager, Platform, StyleSheet, Text, TextInput } from 'react-native';
import { SHOULD_RTL } from './src/app/rtl';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { setThemeScheme, theme } from './src/shared/ui/theme';
import { useAuthStore } from './src/features/auth/store/authStore';
import { bootstrapAppColorScheme, useAppColorScheme } from './src/shared/ui/useAppColorScheme';

// Global typography scaling (native only).
// Web scaling is applied earlier in `src/app/typographyScale.ts` (before UI imports).
const FONT_MULTIPLIER = 1;
const LINE_HEIGHT_MULTIPLIER = 1;
let didSetupTypography = false;
function setupTypographyScale() {
  if (didSetupTypography) return;

  const setPreprocessor = (StyleSheet as any)?.setStyleAttributePreprocessor as
    | undefined
    | ((property: string, process: (nextValue: unknown) => unknown) => void);

  // react-native-web doesn't implement this API (it exists on native RN).
  if (typeof setPreprocessor !== 'function') {
    didSetupTypography = true;
    return;
  }

  didSetupTypography = true;

  setPreprocessor('fontSize', (value) => {
    if (typeof value !== 'number') return value;
    return Math.max(10, Math.round(value * FONT_MULTIPLIER));
  });

  setPreprocessor('lineHeight', (value) => {
    if (typeof value !== 'number') return value;
    return Math.max(10, Math.round(value * LINE_HEIGHT_MULTIPLIER));
  });
}

export default function App() {
  setupTypographyScale();

  const didReload = useRef(false);
  const scheme = useAppColorScheme();

  // Apply scheme synchronously so the UI updates immediately (especially on web).
  setThemeScheme(scheme);
  const colors = scheme === 'dark' ? theme.dark : theme.light;

  const navTheme = useMemo(() => {
    return {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.primaryNeon,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.primaryNeon,
      },
    };
  }, [scheme]);

  useEffect(() => {
    // If native layout direction didn't flip yet, reload once so RTL takes effect.
    if (didReload.current) return;
    if (Platform.OS === 'web') return;
    if (I18nManager.isRTL === SHOULD_RTL) return;

    didReload.current = true;
    if (typeof DevSettings?.reload === 'function') {
      DevSettings.reload();
    }
  }, []);

  useEffect(() => {
    // Restore persisted auth session on app start.
    useAuthStore.getState().bootstrapAuth();
  }, []);

  useEffect(() => {
    void bootstrapAppColorScheme();
  }, []);

  useEffect(() => {
    // Load a crisp Hebrew-friendly font on web and apply globally.
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;

    const id = 'taskmanager-font-heebo';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;900&display=swap';
      document.head.appendChild(link);
    }

    // Apply as the default font family for Text/TextInput on web.
    const fontFamily = 'Heebo';
    const t: any = Text;
    const ti: any = TextInput;
    t.defaultProps = t.defaultProps ?? {};
    ti.defaultProps = ti.defaultProps ?? {};
    t.defaultProps.style = [{ fontFamily }, t.defaultProps.style].filter(Boolean);
    ti.defaultProps.style = [{ fontFamily }, ti.defaultProps.style].filter(Boolean);
  }, []);

  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}
