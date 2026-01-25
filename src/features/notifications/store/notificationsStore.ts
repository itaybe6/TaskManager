import { create } from 'zustand';
import { getSupabaseConfig } from '../../../app/supabase/rest';
import { useAuthStore } from '../../auth/store/authStore';
import type { Notification, NotificationsQuery } from '../model/notificationTypes';
import type { NotificationsRepository } from '../data/NotificationsRepository';
import { SupabaseNotificationsRepository } from '../data/SupabaseNotificationsRepository';
import { InMemoryNotificationsRepository } from '../data/InMemoryNotificationsRepository';

type NotificationsState = {
  repo: NotificationsRepository;
  items: Notification[];
  isLoading: boolean;
  error?: string;
  query: Omit<NotificationsQuery, 'viewerUserId'>;

  unreadCount: number;

  load: () => Promise<void>;
  setQuery: (q: Partial<Omit<NotificationsQuery, 'viewerUserId'>>) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  repo: makeNotificationsRepo(),
  items: [],
  isLoading: false,
  query: {},
  unreadCount: 0,

  load: async () => {
    set({ isLoading: true, error: undefined });
    try {
      const viewerUserId = useAuthStore.getState().session?.user?.id;
      const { repo, query } = get();
      const items = await repo.list({ ...query, viewerUserId });
      const unreadCount = items.reduce((acc, n) => acc + (n.isRead ? 0 : 1), 0);
      set({ items, unreadCount, isLoading: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Unknown error', isLoading: false });
    }
  },

  setQuery: (q) => {
    set((state) => ({ query: { ...state.query, ...q } }));
  },

  markRead: async (id) => {
    const viewerUserId = useAuthStore.getState().session?.user?.id;
    const { repo } = get();
    await repo.markRead(id);
    // optimistic-ish update (no full reload needed)
    set((state) => {
      const items = state.items.map((n) =>
        n.id === id && !n.isRead ? { ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() } : n
      );
      const unreadCount = items.reduce((acc, n) => acc + (n.isRead ? 0 : 1), 0);
      return { items, unreadCount };
    });
    // If user changed (rare), ensure consistency
    if (!viewerUserId) await get().load();
  },

  markAllRead: async () => {
    const viewerUserId = useAuthStore.getState().session?.user?.id;
    if (!viewerUserId) return;
    const { repo } = get();
    await repo.markAllRead(viewerUserId);
    set((state) => {
      const now = new Date().toISOString();
      const items = state.items.map((n) => (n.isRead ? n : { ...n, isRead: true, readAt: n.readAt ?? now }));
      return { items, unreadCount: 0 };
    });
  },
}));

function makeNotificationsRepo(): NotificationsRepository {
  return getSupabaseConfig() ? new SupabaseNotificationsRepository() : new InMemoryNotificationsRepository();
}

