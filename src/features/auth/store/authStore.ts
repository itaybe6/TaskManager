import { create } from 'zustand';
import { signInWithPassword, signOut, type SupabaseAuthSession } from '../../../app/supabase/auth';
import { setSupabaseAccessToken } from '../../../app/supabase/session';

type AuthState = {
  session: SupabaseAuthSession | null;
  isLoading: boolean;
  error: string | null;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  signInWithEmailPassword: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const session = await signInWithPassword({ email: email.trim(), password });
      setSupabaseAccessToken(session.access_token);
      set({ session, isLoading: false, error: null });
    } catch (e: any) {
      const details = (e?.details ?? e?.message ?? 'שגיאת התחברות').toString();
      set({ session: null, isLoading: false, error: details });
    }
  },

  signOut: async () => {
    const s = get().session;
    set({ isLoading: true });
    try {
      if (s?.access_token) await signOut(s.access_token);
    } finally {
      setSupabaseAccessToken(null);
      set({ session: null, isLoading: false, error: null });
    }
  },
}));

