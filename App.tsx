import React, { useEffect, useRef } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { DevSettings, I18nManager, Platform } from 'react-native';
import { SHOULD_RTL } from './src/app/rtl';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { theme } from './src/shared/ui/theme';
import { useAuthStore } from './src/features/auth/store/authStore';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primaryNeon,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.primaryNeon,
  },
};

export default function App() {
  const didReload = useRef(false);

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

  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}
