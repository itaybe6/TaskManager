import { TaskRepository, TaskQuery } from './TaskRepository';
import type { Task, TaskStatus } from '../model/taskTypes';
import { supabaseRest } from '../../../app/supabase/rest';

type FetchMode = 'full' | 'noCategory' | 'noEmbeds';

type DbTaskRow = {
  id: string;
  description: string | null;
  status: TaskStatus;
  assignee_id: string | null;
  due_at: string | null;
  client_id: string | null;
  project_id: string | null;
  category_id: string | null;
  // Added later in schema.tasks.personal.sql. These may be missing in some environments.
  is_personal?: boolean | null;
  owner_user_id?: string | null;
  created_at: string;
  updated_at: string;
  // Embedded relation (if selected)
  assignee?: { display_name?: string | null } | null;
  category?: { name?: string | null; color?: string | null } | null;
};

function mapRowToTask(r: DbTaskRow): Task {
  return {
    id: r.id,
    description: r.description ?? '',
    status: r.status,
    assigneeId: r.assignee_id ?? undefined,
    assignee: r.assignee?.display_name ?? undefined,
    clientId: r.client_id ?? undefined,
    projectId: r.project_id ?? undefined,
    categoryId: r.category_id ?? undefined,
    categoryName: r.category?.name ?? undefined,
    dueAt: r.due_at ?? undefined,
    isPersonal: r.is_personal ?? undefined,
    ownerUserId: r.owner_user_id ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapTaskToInsert(input: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    description: input.description,
    status: input.status,
    assignee_id: input.assigneeId ?? null,
    due_at: input.dueAt ?? null,
    client_id: input.clientId ?? null,
    project_id: input.projectId ?? null,
    category_id: input.categoryId ?? null,
    is_personal: input.isPersonal ?? false,
    owner_user_id: input.ownerUserId ?? null,
  };
}

function mapTaskToPatch(patch: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) {
  return {
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    // Use `"assigneeId" in patch` so callers can explicitly clear with `assigneeId: undefined`
    ...('assigneeId' in patch ? { assignee_id: patch.assigneeId ?? null } : {}),
    ...(patch.dueAt !== undefined ? { due_at: patch.dueAt ?? null } : {}),
    // Use `"clientId" in patch` so callers can explicitly clear with `clientId: undefined`
    ...('clientId' in patch ? { client_id: patch.clientId ?? null } : {}),
    ...(patch.projectId !== undefined ? { project_id: patch.projectId ?? null } : {}),
    ...(patch.categoryId !== undefined ? { category_id: patch.categoryId ?? null } : {}),
    ...(patch.isPersonal !== undefined ? { is_personal: patch.isPersonal } : {}),
    ...('ownerUserId' in patch ? { owner_user_id: patch.ownerUserId ?? null } : {}),
  };
}

function selectForMode(mode: FetchMode) {
  const base =
    'id,description,status,assignee_id,due_at,client_id,project_id,category_id,is_personal,owner_user_id,created_at,updated_at';
  if (mode === 'full') return `${base},assignee:users(display_name),category:task_categories(name,color)`;
  if (mode === 'noCategory') return `${base},assignee:users(display_name)`;
  return base;
}

function looksLikeMissingRelation(details?: string) {
  const d = (details ?? '').toLowerCase();
  return d.includes('could not find') || d.includes('does not exist') || d.includes('relationship') || d.includes('relation');
}

function looksLikeMissingColumn(details?: string) {
  const d = (details ?? '').toLowerCase();
  // Examples:
  // - column public.tasks.owner_user_id does not exist
  // - column "is_personal" of relation "tasks" does not exist
  return d.includes('column') && d.includes('does not exist');
}

function selectLegacy() {
  // Schema before task categories / personal tasks.
  // Keep minimal fields that have existed from the beginning.
  return 'id,description,status,assignee_id,due_at,client_id,project_id,category_id,created_at,updated_at';
}

async function fetchTasks(
  args: {
    mode: FetchMode;
    query?: TaskQuery;
  }
): Promise<DbTaskRow[]> {
  const q = (args.query?.searchText ?? '').trim();
  return await supabaseRest<DbTaskRow[]>({
    method: 'GET',
    path: '/rest/v1/tasks',
    query: {
      select: selectForMode(args.mode),
      ...(args.query?.status ? { status: `eq.${args.query.status}` } : {}),
      ...(args.query?.assigneeId ? { assignee_id: `eq.${args.query.assigneeId}` } : {}),
      ...(args.query?.clientId ? { client_id: `eq.${args.query.clientId}` } : {}),
      ...(args.query?.projectId ? { project_id: `eq.${args.query.projectId}` } : {}),
      ...(args.query?.categoryId ? { category_id: `eq.${args.query.categoryId}` } : {}),
      ...(q ? { description: `ilike.*${escapeIlike(q)}*` } : {}),
      order: 'updated_at.desc',
    },
  });
}

async function fetchTasksLegacy(query?: TaskQuery): Promise<DbTaskRow[]> {
  const q = (query?.searchText ?? '').trim();
  return await supabaseRest<DbTaskRow[]>({
    method: 'GET',
    path: '/rest/v1/tasks',
    query: {
      select: selectLegacy(),
      ...(query?.status ? { status: `eq.${query.status}` } : {}),
      ...(query?.assigneeId ? { assignee_id: `eq.${query.assigneeId}` } : {}),
      ...(query?.clientId ? { client_id: `eq.${query.clientId}` } : {}),
      ...(query?.projectId ? { project_id: `eq.${query.projectId}` } : {}),
      ...(query?.categoryId ? { category_id: `eq.${query.categoryId}` } : {}),
      ...(q ? { description: `ilike.*${escapeIlike(q)}*` } : {}),
      order: 'updated_at.desc',
    },
  });
}

async function fetchTaskById(args: { id: string; mode: FetchMode }): Promise<DbTaskRow[]> {
  return await supabaseRest<DbTaskRow[]>({
    method: 'GET',
    path: '/rest/v1/tasks',
    query: {
      select: selectForMode(args.mode),
      id: `eq.${args.id}`,
      limit: '1',
    },
  });
}

async function fetchTaskByIdLegacy(id: string): Promise<DbTaskRow[]> {
  return await supabaseRest<DbTaskRow[]>({
    method: 'GET',
    path: '/rest/v1/tasks',
    query: {
      select: selectLegacy(),
      id: `eq.${id}`,
      limit: '1',
    },
  });
}

export class SupabaseTaskRepository implements TaskRepository {
  async list(query?: TaskQuery): Promise<Task[]> {
    try {
      const res = await fetchTasks({ mode: 'full', query });
      const items = res.map(mapRowToTask);
      return filterForViewer(items, query?.viewerUserId);
    } catch (e: any) {
      const details = e?.details ?? e?.message;
      // Common when schema.tasks.categories.sql wasn't applied yet (task_categories relation missing).
      if (looksLikeMissingRelation(details)) {
        try {
          const res = await fetchTasks({ mode: 'noCategory', query });
          const items = res.map(mapRowToTask);
          return filterForViewer(items, query?.viewerUserId);
        } catch (e2: any) {
          try {
            const res = await fetchTasks({ mode: 'noEmbeds', query });
            const items = res.map(mapRowToTask);
            return filterForViewer(items, query?.viewerUserId);
          } catch (e3: any) {
            const d3 = e3?.details ?? e3?.message;
            if (looksLikeMissingColumn(d3)) {
              const res = await fetchTasksLegacy(query);
              const items = res.map(mapRowToTask);
              return filterForViewer(items, query?.viewerUserId);
            }
            throw e2;
          }
        }
      }
      // Common when schema.tasks.personal.sql wasn't applied yet (is_personal / owner_user_id columns missing).
      if (looksLikeMissingColumn(details)) {
        const res = await fetchTasksLegacy(query);
        const items = res.map(mapRowToTask);
        return filterForViewer(items, query?.viewerUserId);
      }
      throw e;
    }
  }

  async getById(id: string): Promise<Task | null> {
    try {
      const res = await fetchTaskById({ id, mode: 'full' });
      const row = res[0];
      return row ? mapRowToTask(row) : null;
    } catch (e: any) {
      const details = e?.details ?? e?.message;
      if (looksLikeMissingRelation(details)) {
        try {
          const res = await fetchTaskById({ id, mode: 'noCategory' });
          const row = res[0];
          return row ? mapRowToTask(row) : null;
        } catch (e2: any) {
          try {
            const res = await fetchTaskById({ id, mode: 'noEmbeds' });
            const row = res[0];
            return row ? mapRowToTask(row) : null;
          } catch (e3: any) {
            const d3 = e3?.details ?? e3?.message;
            if (looksLikeMissingColumn(d3)) {
              const res = await fetchTaskByIdLegacy(id);
              const row = res[0];
              return row ? mapRowToTask(row) : null;
            }
            throw e2;
          }
        }
      }
      if (looksLikeMissingColumn(details)) {
        const res = await fetchTaskByIdLegacy(id);
        const row = res[0];
        return row ? mapRowToTask(row) : null;
      }
      throw e;
    }
  }

  async create(input: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const res = await supabaseRest<DbTaskRow[]>({
      method: 'POST',
      path: '/rest/v1/tasks',
      preferReturnRepresentation: true,
      body: mapTaskToInsert(input),
    });

    const row = res[0];
    if (!row) throw new Error('Supabase create returned empty result');
    return mapRowToTask(row);
  }

  async update(
    id: string,
    patch: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Task> {
    const res = await supabaseRest<DbTaskRow[]>({
      method: 'PATCH',
      path: '/rest/v1/tasks',
      preferReturnRepresentation: true,
      query: { id: `eq.${id}` },
      body: mapTaskToPatch(patch),
    });

    const row = res[0];
    if (!row) throw new Error('Supabase update returned empty result');
    return mapRowToTask(row);
  }

  async remove(id: string): Promise<void> {
    await supabaseRest<void>({
      method: 'DELETE',
      path: '/rest/v1/tasks',
      query: { id: `eq.${id}` },
    });
  }
}

function escapeIlike(s: string) {
  // PostgREST ilike patterns: we only need to escape commas and parentheses used by `or=(...)`
  // and percent/underscore which are wildcards.
  return s
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
    .replaceAll(',', '\\,')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function filterForViewer(items: Task[], viewerUserId?: string) {
  if (!viewerUserId) return items;
  return items.filter((t) => !t.isPersonal || t.ownerUserId === viewerUserId);
}
