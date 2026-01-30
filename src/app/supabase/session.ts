import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type PersistedSupabaseSession = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: { id: string; email?: string };
  obtained_at: number; // epoch ms
};

const STORAGE_KEY = 'taskmanager.supabase.session.v1';

let accessToken: string | null = null;

export function setSupabaseAccessToken(token: string | null) {
  accessToken = token;
}

export function getSupabaseAccessToken() {
  return accessToken;
}

export async function persistSupabaseSession(session: PersistedSupabaseSession | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (!session) window?.localStorage?.removeItem(STORAGE_KEY);
      else window?.localStorage?.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {}
    return;
  }

  try {
    if (!session) {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore persistence failures
  }
}

export async function loadPersistedSupabaseSession(): Promise<PersistedSupabaseSession | null> {
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

  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedSupabaseSession;
    if (!parsed?.access_token || !parsed?.refresh_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

