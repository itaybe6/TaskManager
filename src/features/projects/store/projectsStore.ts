import { create } from 'zustand';
import { getSupabaseConfig } from '../../../app/supabase/rest';
import { Project } from '../model/projectTypes';
import { ProjectsQuery, ProjectsRepository } from '../data/ProjectsRepository';
import { SupabaseProjectsRepository } from '../data/SupabaseProjectsRepository';

type ProjectsState = {
  repo: ProjectsRepository;
  items: Project[];
  isLoading: boolean;
  error?: string;
  query: ProjectsQuery;

  load: () => Promise<void>;
  setQuery: (q: Partial<ProjectsQuery>) => void;
  createProject: (input: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'clientName'>) => Promise<Project>;
  updateProject: (
    id: string,
    patch: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'clientName'>>
  ) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
};

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  repo: makeProjectsRepo(),
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

  createProject: async (input) => {
    const { repo } = get();
    const created = await repo.create(input);
    await get().load();
    return created;
  },

  updateProject: async (id, patch) => {
    const { repo } = get();
    const updated = await repo.update(id, patch);
    await get().load();
    return updated;
  },

  deleteProject: async (id) => {
    const { repo } = get();
    await repo.remove(id);
    await get().load();
  },
}));

function makeProjectsRepo(): ProjectsRepository {
  return getSupabaseConfig() ? new SupabaseProjectsRepository() : new SupabaseProjectsRepository();
}

