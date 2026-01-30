import { create } from 'zustand';
import { refreshSession, signInWithPassword, signOut, type SupabaseAuthSession } from '../../../app/supabase/auth';
import {
  loadPersistedSupabaseSession,
  persistSupabaseSession,
  setSupabaseAccessToken,
  type PersistedSupabaseSession,
} from '../../../app/supabase/session';
import { supabaseRest } from '../../../app/supabase/rest';

export type AppUserRole = 'admin' | 'client';

export type AppUserProfile = {
  id: string;
  displayName: string;
  role: AppUserRole;
};

type AuthState = {
  session: SupabaseAuthSession | null;
  profile: AppUserProfile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isBootstrapping: boolean;
  error: string | null;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  loadProfile: () => Promise<void>;
  bootstrapAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: false,
  isProfileLoading: false,
  isBootstrapping: true,
  error: null,

  clearError: () => set({ error: null }),

  loadProfile: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;
    set({ isProfileLoading: true });
    try {
      const res = await supabaseRest<Array<{ id: string; display_name: string; role: AppUserRole }>>({
        method: 'GET',
        path: '/rest/v1/users',
        query: { select: 'id,display_name,role', id: `eq.${userId}`, limit: '1' },
      });
      const row = res?.[0];
      if (row?.id) {
        set({
          profile: { id: row.id, displayName: row.display_name ?? '', role: row.role ?? 'admin' },
          isProfileLoading: false,
        });
      } else {
        set({ profile: null, isProfileLoading: false });
      }
    } catch {
      // fallback: if profile can't be fetched, treat as admin UX (but keep profile null)
      set({ profile: null, isProfileLoading: false });
    }
  },

  bootstrapAuth: async () => {
    set({ isBootstrapping: true });
    try {
      const stored = await loadPersistedSupabaseSession();
      if (!stored?.refresh_token) {
        setSupabaseAccessToken(null);
        set({ session: null, profile: null, isBootstrapping: false });
        return;
      }

      try {
        const session = await refreshSession(stored.refresh_token);
        setSupabaseAccessToken(session.access_token);
        const persisted: PersistedSupabaseSession = { ...session, obtained_at: Date.now() };
        await persistSupabaseSession(persisted);
        set({ session });
        await get().loadProfile();
      } catch {
        // refresh failed -> clear persisted session
        await persistSupabaseSession(null);
        setSupabaseAccessToken(null);
        set({ session: null, profile: null });
      }
    } finally {
      set({ isBootstrapping: false });
    }
  },

  signInWithEmailPassword: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const session = await signInWithPassword({ email: email.trim(), password });
      setSupabaseAccessToken(session.access_token);
      await persistSupabaseSession({ ...session, obtained_at: Date.now() });
      set({ session, isLoading: false, error: null });
      await get().loadProfile();
    } catch (e: any) {
      const details = (e?.details ?? e?.message ?? 'שגיאת התחברות').toString();
      set({ session: null, profile: null, isLoading: false, error: details, isProfileLoading: false });
    }
  },

  signOut: async () => {
    const s = get().session;
    set({ isLoading: true });
    try {
      if (s?.access_token) await signOut(s.access_token);
    } finally {
      await persistSupabaseSession(null);
      setSupabaseAccessToken(null);
      set({ session: null, profile: null, isLoading: false, error: null, isProfileLoading: false });
    }
  },
}));

