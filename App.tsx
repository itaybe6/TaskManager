import React, { useEffect, useRef } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { DevSettings, I18nManager, Platform } from 'react-native';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { theme } from './src/shared/ui/theme';

const SHOULD_RTL = true;

// Enable RTL globally (Hebrew app).
I18nManager.allowRTL(SHOULD_RTL);
I18nManager.forceRTL(SHOULD_RTL);
// Allow the system to swap left/right automatically if it's in RTL mode.
I18nManager.swapLeftAndRightInRTL(true);

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'he';
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.primary,
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

  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}
