import { Platform, StyleSheet } from 'react-native';

// Web-only global typography downscale.
// This runs BEFORE app UI imports (see `index.js`) so all `StyleSheet.create(...)`
// font sizes are scaled consistently across the entire app.
const WEB_FONT_MULTIPLIER = 0.84;
const WEB_LINE_HEIGHT_MULTIPLIER = 0.9;

function scale(value: number, multiplier: number) {
  return Math.max(10, Math.round(value * multiplier));
}

function patchWebStyleSheetCreate() {
  if (Platform.OS !== 'web') return;

  const g: any = globalThis as any;
  const KEY = '__TASKMANAGER_WEB_TYPOGRAPHY_PATCHED__';
  if (g[KEY]) return;
  g[KEY] = true;

  const originalCreate = StyleSheet.create.bind(StyleSheet);

  (StyleSheet as any).create = (styles: Record<string, any>) => {
    // Keep non-object styles intact, only scale plain style objects.
    const next: Record<string, any> = {};
    for (const k of Object.keys(styles)) {
      const s = styles[k];
      if (!s || typeof s !== 'object' || Array.isArray(s)) {
        next[k] = s;
        continue;
      }

      const out = { ...s };
      if (typeof out.fontSize === 'number') out.fontSize = scale(out.fontSize, WEB_FONT_MULTIPLIER);
      if (typeof out.lineHeight === 'number') out.lineHeight = scale(out.lineHeight, WEB_LINE_HEIGHT_MULTIPLIER);
      next[k] = out;
    }

    return originalCreate(next);
  };
}

patchWebStyleSheetCreate();

