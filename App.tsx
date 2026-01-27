import React, { useEffect, useRef } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { DevSettings, I18nManager, Platform, Text, TextInput } from 'react-native';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { theme } from './src/shared/ui/theme';

const SHOULD_RTL = true;

// Enable RTL globally (Hebrew app). Note: native reload required for this to take effect.
I18nManager.allowRTL(SHOULD_RTL);
I18nManager.forceRTL(SHOULD_RTL);
// Keep explicit "left/right" styles as-is so our RTL textAlign stays on the right.
I18nManager.swapLeftAndRightInRTL(false);

const rtlTextStyle = { textAlign: 'right' as const, writingDirection: 'rtl' as const };
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [Text.defaultProps.style, rtlTextStyle];
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [TextInput.defaultProps.style, rtlTextStyle];

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
    // In Expo Go / dev, this triggers a full JS reload which is enough for RTL to take effect.
    // In production builds you may need a full app restart for RTL changes.
    if (typeof DevSettings?.reload === 'function') DevSettings.reload();
  }, []);

  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}
