import { supabaseRest } from '../../../app/supabase/rest';
import { TaskCategory } from '../model/taskTypes';
import { TaskCategoriesQuery, TaskCategoriesRepository } from './TaskCategoriesRepository';

type DbCategoryRow = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  created_at: string;
  updated_at: string;
};

function mapRowToCategory(r: DbCategoryRow): TaskCategory {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    color: r.color ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class SupabaseTaskCategoriesRepository implements TaskCategoriesRepository {
  async list(query?: TaskCategoriesQuery): Promise<TaskCategory[]> {
    const q = (query?.searchText ?? '').trim();
    const res = await supabaseRest<DbCategoryRow[]>({
      method: 'GET',
      path: '/rest/v1/task_categories',
      query: {
        select: 'id,name,slug,color,created_at,updated_at',
        ...(q ? { name: `ilike.*${escapeIlike(q)}*` } : {}),
        order: 'name.asc',
      },
    });
    return res.map(mapRowToCategory);
  }

  async create(input: Pick<TaskCategory, 'name' | 'slug' | 'color'>): Promise<TaskCategory> {
    const res = await supabaseRest<DbCategoryRow[]>({
      method: 'POST',
      path: '/rest/v1/task_categories',
      preferReturnRepresentation: true,
      body: {
        name: input.name,
        slug: input.slug,
        color: input.color ?? null,
      },
    });
    if (!res[0]) throw new Error('Supabase create returned empty result');
    return mapRowToCategory(res[0]);
  }
}

function escapeIlike(s: string) {
  return s
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
    .replaceAll(',', '\\,')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

