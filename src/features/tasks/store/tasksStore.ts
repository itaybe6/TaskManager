import { create } from 'zustand';
import type { Task } from '../model/taskTypes';
import { TaskRepository, TaskQuery } from '../data/TaskRepository';
import { InMemoryTaskRepository } from '../data/InMemoryTaskRepository';
import { SupabaseTaskRepository } from '../data/SupabaseTaskRepository';
import { getSupabaseConfig } from '../../../app/supabase/rest';
import { useAuthStore } from '../../auth/store/authStore';

type TasksState = {
  repo: TaskRepository;
  items: Task[];
  selectedId?: string;
  isLoading: boolean;
  error?: string;

  query: TaskQuery;

  load: () => Promise<void>;
  setQuery: (q: Partial<TaskQuery>) => void;

  createTask: (input: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (
    id: string,
    patch: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
};

export const useTasksStore = create<TasksState>((set, get) => ({
  repo: makeTasksRepo(),
  items: [],
  isLoading: false,
  query: {},

  load: async () => {
    set({ isLoading: true, error: undefined });
    try {
      const { repo, query } = get();
      const viewerUserId = useAuthStore.getState().session?.user?.id;
      const items = await repo.list({ ...query, viewerUserId });
      set({ items, isLoading: false });
    } catch (e: any) {
      set({ error: formatError(e), isLoading: false });
    }
  },

  setQuery: (q) => {
    set((state) => ({ query: { ...state.query, ...q } }));
  },

  createTask: async (input) => {
    const { repo } = get();
    const created = await repo.create(input);
    await get().load();
    return created;
  },

  updateTask: async (id, patch) => {
    const { repo } = get();
    const updated = await repo.update(id, patch);
    await get().load();
    return updated;
  },

  deleteTask: async (id) => {
    const { repo } = get();
    await repo.remove(id);
    await get().load();
  },
}));

function makeTasksRepo(): TaskRepository {
  // If Supabase env exists -> use Supabase.
  // Otherwise fallback to in-memory so dev never breaks.
  return getSupabaseConfig() ? new SupabaseTaskRepository() : new InMemoryTaskRepository();
}

function formatError(e: any) {
  const name = (e?.name ?? '').toString();
  const msg = (e?.message ?? e?.toString?.() ?? 'Unknown error').toString();
  const status = typeof e?.status === 'number' ? e.status : undefined;
  const details = (e?.details ?? '').toString();

  // Prefer actionable details; keep it short for the UI.
  if (status !== undefined) {
    const base = `${name ? `${name} ` : ''}(${status}) ${msg}`.trim();
    return details ? `${base}\n${details}` : base;
  }
  return details ? `${msg}\n${details}` : msg;
}
