import { create } from 'zustand';
import { getSupabaseConfig } from '../../../app/supabase/rest';
import { ClientsRepository, ClientsQuery } from '../data/ClientsRepository';
import { SupabaseClientsRepository } from '../data/SupabaseClientsRepository';
import { InMemoryClientsRepository } from '../data/InMemoryClientsRepository';
import { Client, ClientDocument } from '../model/clientTypes';

type ClientsState = {
  repo: ClientsRepository;
  items: Client[];
  isLoading: boolean;
  error?: string;
  query: ClientsQuery;

  load: () => Promise<void>;
  setQuery: (q: Partial<ClientsQuery>) => void;
  createClient: (input: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'documents'>) => Promise<Client>;
  updateClient: (
    id: string,
    patch: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'documents'>>
  ) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;
  addDocument: (clientId: string, doc: Omit<ClientDocument, 'id' | 'createdAt'>) => Promise<ClientDocument>;
  removeDocument: (documentId: string) => Promise<void>;
};

export const useClientsStore = create<ClientsState>((set, get) => ({
  repo: makeClientsRepo(),
  items: [],
  isLoading: false,
  query: {},

  load: async () => {
    set({ isLoading: true, error: undefined });
    try {
      const { repo, query } = get();
      const items = await repo.list(query);
      set({ items, isLoading: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Unknown error', isLoading: false });
    }
  },

  setQuery: (q) => set((s) => ({ query: { ...s.query, ...q } })),

  createClient: async (input) => {
    const { repo } = get();
    const created = await repo.create(input);
    await get().load();
    return created;
  },

  updateClient: async (id, patch) => {
    const { repo } = get();
    const updated = await repo.update(id, patch);
    await get().load();
    return updated;
  },

  deleteClient: async (id) => {
    const { repo } = get();
    await repo.remove(id);
    await get().load();
  },

  addDocument: async (clientId, doc) => {
    const { repo } = get();
    const newDoc = await repo.addDocument(clientId, doc);
    await get().load();
    return newDoc;
  },

  removeDocument: async (documentId) => {
    const { repo } = get();
    await repo.removeDocument(documentId);
    await get().load();
  },
}));

function makeClientsRepo(): ClientsRepository {
  return getSupabaseConfig() ? new SupabaseClientsRepository() : new InMemoryClientsRepository();
}

