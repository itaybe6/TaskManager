import { create } from 'zustand';
import { getSupabaseConfig } from '../../../app/supabase/rest';
import { TaskCategory } from '../model/taskTypes';
import { TaskCategoriesQuery, TaskCategoriesRepository } from '../data/TaskCategoriesRepository';
import { SupabaseTaskCategoriesRepository } from '../data/SupabaseTaskCategoriesRepository';

type TaskCategoriesState = {
  repo: TaskCategoriesRepository;
  items: TaskCategory[];
  isLoading: boolean;
  error?: string;
  query: TaskCategoriesQuery;

  load: () => Promise<void>;
  setQuery: (q: Partial<TaskCategoriesQuery>) => void;
  createCategory: (input: Pick<TaskCategory, 'name' | 'slug' | 'color'>) => Promise<TaskCategory>;
};

export const useTaskCategoriesStore = create<TaskCategoriesState>((set, get) => ({
  repo: makeRepo(),
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

  createCategory: async (input) => {
    const { repo } = get();
    const created = await repo.create(input);
    await get().load();
    return created;
  },
}));

function makeRepo(): TaskCategoriesRepository {
  // currently only Supabase implementation; fallback is same for now
  return getSupabaseConfig() ? new SupabaseTaskCategoriesRepository() : new SupabaseTaskCategoriesRepository();
}

