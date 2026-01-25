import { TaskRepository, TaskQuery } from './TaskRepository';
import { Task, TaskStatus, TaskPriority } from '../model/taskTypes';
import { supabaseRest } from '../../../app/supabase/rest';

type DbTaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_at: string | null;
  tags: string[] | null;
  client_id: string | null;
  project_id: string | null;
  category_id: string | null;
  is_personal: boolean | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Embedded relation (if selected)
  assignee?: { display_name?: string | null } | null;
  category?: { name?: string | null; color?: string | null } | null;
};

function mapRowToTask(r: DbTaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    status: r.status,
    priority: r.priority,
    assigneeId: r.assignee_id ?? undefined,
    assignee: r.assignee?.display_name ?? undefined,
    clientId: r.client_id ?? undefined,
    projectId: r.project_id ?? undefined,
    categoryId: r.category_id ?? undefined,
    categoryName: r.category?.name ?? undefined,
    dueAt: r.due_at ?? undefined,
    tags: r.tags ?? undefined,
    isPersonal: r.is_personal ?? undefined,
    ownerUserId: r.owner_user_id ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapTaskToInsert(input: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    title: input.title,
    description: input.description ?? null,
    status: input.status,
    priority: input.priority,
    assignee_id: input.assigneeId ?? null,
    due_at: input.dueAt ?? null,
    tags: input.tags ?? null,
    client_id: input.clientId ?? null,
    project_id: input.projectId ?? null,
    category_id: input.categoryId ?? null,
    is_personal: input.isPersonal ?? false,
    owner_user_id: input.ownerUserId ?? null,
  };
}

function mapTaskToPatch(patch: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) {
  return {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    // Use `"assigneeId" in patch` so callers can explicitly clear with `assigneeId: undefined`
    ...('assigneeId' in patch ? { assignee_id: patch.assigneeId ?? null } : {}),
    ...(patch.dueAt !== undefined ? { due_at: patch.dueAt ?? null } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags ?? null } : {}),
    // Use `"clientId" in patch` so callers can explicitly clear with `clientId: undefined`
    ...('clientId' in patch ? { client_id: patch.clientId ?? null } : {}),
    ...(patch.projectId !== undefined ? { project_id: patch.projectId ?? null } : {}),
    ...(patch.categoryId !== undefined ? { category_id: patch.categoryId ?? null } : {}),
    ...(patch.isPersonal !== undefined ? { is_personal: patch.isPersonal } : {}),
    ...('ownerUserId' in patch ? { owner_user_id: patch.ownerUserId ?? null } : {}),
  };
}

export class SupabaseTaskRepository implements TaskRepository {
  async list(query?: TaskQuery): Promise<Task[]> {
    const q = (query?.searchText ?? '').trim();

    const res = await supabaseRest<DbTaskRow[]>({
      method: 'GET',
      path: '/rest/v1/tasks',
      query: {
        select:
          'id,title,description,status,priority,assignee_id,due_at,tags,client_id,project_id,category_id,is_personal,owner_user_id,created_at,updated_at,assignee:users(display_name),category:task_categories(name,color)',
        ...(query?.status ? { status: `eq.${query.status}` } : {}),
        ...(query?.assigneeId ? { assignee_id: `eq.${query.assigneeId}` } : {}),
        ...(query?.clientId ? { client_id: `eq.${query.clientId}` } : {}),
        ...(query?.projectId ? { project_id: `eq.${query.projectId}` } : {}),
        ...(query?.categoryId ? { category_id: `eq.${query.categoryId}` } : {}),
        ...(q
          ? {
              or: `(title.ilike.*${escapeIlike(q)}*,description.ilike.*${escapeIlike(q)}*)`,
            }
          : {}),
        order: 'updated_at.desc',
      },
    });

    return res.map(mapRowToTask);
  }

  async getById(id: string): Promise<Task | null> {
    const res = await supabaseRest<DbTaskRow[]>({
      method: 'GET',
      path: '/rest/v1/tasks',
      query: {
        select:
          'id,title,description,status,priority,assignee_id,due_at,tags,client_id,project_id,category_id,is_personal,owner_user_id,created_at,updated_at,assignee:users(display_name),category:task_categories(name,color)',
        id: `eq.${id}`,
        limit: '1',
      },
    });

    const row = res[0];
    return row ? mapRowToTask(row) : null;
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

