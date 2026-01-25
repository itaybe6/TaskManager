import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { I18nManager, Platform } from 'react-native';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { theme } from './src/shared/ui/theme';

// Enable RTL globally (Hebrew app).
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = 'rtl';
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
  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}
