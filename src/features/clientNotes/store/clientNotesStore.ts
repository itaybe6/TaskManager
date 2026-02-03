import { create } from 'zustand';
import { getSupabaseConfig } from '../../../app/supabase/rest';
import { useAuthStore } from '../../auth/store/authStore';
import type { ClientNote, ClientNotesResolvedFilter, CreateClientNoteInput } from '../model/clientNoteTypes';
import type { ClientNotesRepository } from '../data/ClientNotesRepository';
import { SupabaseClientNotesRepository } from '../data/SupabaseClientNotesRepository';
import { InMemoryClientNotesRepository } from '../data/InMemoryClientNotesRepository';

type ClientNotesState = {
  repo: ClientNotesRepository;
  items: ClientNote[];
  isLoading: boolean;
  error?: string;

  // for admin inbox view
  resolvedFilter: ClientNotesResolvedFilter;

  loadForClient: (clientId: string) => Promise<void>;
  loadAll: (resolved?: ClientNotesResolvedFilter) => Promise<void>;
  setResolvedFilter: (f: ClientNotesResolvedFilter) => void;
  createNoteForViewer: (input: CreateClientNoteInput) => Promise<ClientNote>;
  setResolved: (id: string, isResolved: boolean) => Promise<ClientNote>;
};

export const useClientNotesStore = create<ClientNotesState>((set, get) => ({
  repo: makeRepo(),
  items: [],
  isLoading: false,
  resolvedFilter: 'all',

  setResolvedFilter: (f) => set({ resolvedFilter: f }),

  loadForClient: async (clientId) => {
    set({ isLoading: true, error: undefined });
    try {
      const viewerUserId = useAuthStore.getState().session?.user?.id;
      if (!viewerUserId) {
        set({ items: [], isLoading: false });
        return;
      }
      const { repo } = get();
      const items = await repo.listForClient({ clientId, authorUserId: viewerUserId });
      set({ items, isLoading: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Unknown error', isLoading: false });
    }
  },

  loadAll: async (resolved) => {
    set({ isLoading: true, error: undefined });
    try {
      const { repo } = get();
      const filter = resolved ?? get().resolvedFilter;
      const items = await repo.listAll({ resolved: filter });
      set({ items, isLoading: false, resolvedFilter: filter });
    } catch (e: any) {
      set({ error: e?.message ?? 'Unknown error', isLoading: false });
    }
  },

  createNoteForViewer: async (input) => {
    const viewerUserId = useAuthStore.getState().session?.user?.id;
    if (!viewerUserId) throw new Error('Not signed in');
    const { repo } = get();
    const created = await repo.create({ ...input, authorUserId: viewerUserId });
    // best-effort refresh: if we're currently showing this client's notes, reload
    await get().loadForClient(input.clientId);
    return created;
  },

  setResolved: async (id, isResolved) => {
    const viewerUserId = useAuthStore.getState().session?.user?.id;
    const { repo } = get();
    const updated = await repo.setResolved({ id, isResolved, resolvedBy: viewerUserId });
    // optimistic-ish update
    set((state) => ({ items: state.items.map((n) => (n.id === id ? { ...n, ...updated } : n)) }));
    return updated;
  },
}));

function makeRepo(): ClientNotesRepository {
  return getSupabaseConfig() ? new SupabaseClientNotesRepository() : new InMemoryClientNotesRepository();
}

