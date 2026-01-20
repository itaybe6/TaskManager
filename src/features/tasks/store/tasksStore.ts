import { create } from 'zustand';
import { Task } from '../model/taskTypes';
import { TaskRepository, TaskQuery } from '../data/TaskRepository';
import { InMemoryTaskRepository } from '../data/InMemoryTaskRepository';
import { SupabaseTaskRepository } from '../data/SupabaseTaskRepository';
import { getSupabaseConfig } from '../../../app/supabase/rest';

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
      const items = await repo.list(query);
      set({ items, isLoading: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Unknown error', isLoading: false });
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
