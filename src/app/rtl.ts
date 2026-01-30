import { I18nManager, Platform } from 'react-native';

export const SHOULD_RTL = true;

// Configure RTL before any UI modules load.
if (Platform.OS !== 'web') {
  I18nManager.allowRTL(SHOULD_RTL);
  I18nManager.forceRTL(SHOULD_RTL);
}

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'he';
}
