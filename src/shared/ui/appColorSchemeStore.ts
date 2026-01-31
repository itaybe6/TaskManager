import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export type AppColorScheme = 'light' | 'dark';

type AppColorSchemeState = {
  scheme: AppColorScheme;
  isHydrated: boolean;
  setScheme: (scheme: AppColorScheme) => void;
  toggleScheme: () => void;
  hydrate: () => Promise<void>;
};

const STORAGE_KEY = 'taskmanager.ui.color_scheme.v1';

async function persistScheme(scheme: AppColorScheme) {
  if (Platform.OS === 'web') {
    try {
      window?.localStorage?.setItem(STORAGE_KEY, scheme);
    } catch {}
    return;
  }

  try {
    await SecureStore.setItemAsync(STORAGE_KEY, scheme);
  } catch {
    // ignore persistence failures
  }
}

async function loadPersistedScheme(): Promise<AppColorScheme | null> {
  let raw: string | null = null;
  if (Platform.OS === 'web') {
    try {
      raw = window?.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {}
  } else {
    try {
      raw = (await SecureStore.getItemAsync(STORAGE_KEY)) ?? null;
    } catch {}
  }

  if (raw === 'light' || raw === 'dark') return raw;
  return null;
}

export const useAppColorSchemeStore = create<AppColorSchemeState>((set, get) => ({
  scheme: 'light',
  isHydrated: false,
  setScheme: (scheme) => {
    set({ scheme });
    void persistScheme(scheme);
  },
  toggleScheme: () => {
    const next = get().scheme === 'dark' ? 'light' : 'dark';
    set({ scheme: next });
    void persistScheme(next);
  },
  hydrate: async () => {
    const stored = await loadPersistedScheme();
    if (stored) set({ scheme: stored, isHydrated: true });
    else set({ isHydrated: true });
  },
}));
