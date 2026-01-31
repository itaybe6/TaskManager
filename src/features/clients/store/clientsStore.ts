import { create } from 'zustand';
import { getSupabaseConfig } from '../../../app/supabase/rest';
import { createClientAuthUser } from '../../../app/supabase/functions';
import { supabaseRest, SupabaseRestError } from '../../../app/supabase/rest';
import { ClientsRepository, ClientsQuery } from '../data/ClientsRepository';
import { SupabaseClientsRepository } from '../data/SupabaseClientsRepository';
import { InMemoryClientsRepository } from '../data/InMemoryClientsRepository';
import { Client, ClientDocument } from '../model/clientTypes';

type CreateClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'documents'> & {
  authEmail?: string;
  authPassword?: string;
};

type ClientsState = {
  repo: ClientsRepository;
  items: Client[];
  isLoading: boolean;
  error?: string;
  query: ClientsQuery;

  load: () => Promise<void>;
  setQuery: (q: Partial<ClientsQuery>) => void;
  createClient: (input: CreateClientInput) => Promise<Client>;
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
      const msg = e instanceof SupabaseRestError
        ? `${e.message}${e.details ? `\n${e.details}` : ''}`
        : e?.message ?? 'Unknown error';
      set({ error: msg, isLoading: false });
    }
  },

  setQuery: (q) => set((s) => ({ query: { ...s.query, ...q } })),

  createClient: async (input) => {
    const { repo } = get();
    const { authEmail, authPassword, ...clientInput } = input;
    if ((authEmail && !authPassword) || (!authEmail && authPassword)) {
      throw new Error('חסר אימייל או סיסמה ללקוח');
    }
    const created = await repo.create(clientInput);

    if (authEmail && authPassword && getSupabaseConfig()) {
      let createdAuth: { user_id: string } | null = null;
      try {
        createdAuth = await createClientAuthUser({
          email: authEmail.trim(),
          password: authPassword,
          displayName: clientInput.name.trim(),
        });
      } catch (e) {
        // Best-effort rollback: remove client if auth creation failed
        try {
          await repo.remove(created.id);
        } catch {}
        throw e;
      }

      // Best-effort linking: if it fails, keep the client and the auth user (don't rollback the client).
      // This can fail if the DB schema isn't applied yet or due to RLS/schema-cache issues.
      if (createdAuth?.user_id) {
        try {
          await supabaseRest<void>({
            method: 'PATCH',
            path: '/rest/v1/clients',
            query: { id: `eq.${created.id}` },
            body: { client_user_id: createdAuth.user_id },
          });
        } catch (e: any) {
          const details = (e?.details ?? e?.message ?? '').toString();
          console.warn('[clientsStore] Created client + auth user but failed to link client_user_id (non-fatal)', {
            clientId: created.id,
            userId: createdAuth.user_id,
            status: e instanceof SupabaseRestError ? e.status : undefined,
            details,
          });
        }
      }
    }
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

