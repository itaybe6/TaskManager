import { supabaseRest } from '../../../app/supabase/rest';
import { Project, ProjectStatus } from '../model/projectTypes';
import { ProjectsQuery, ProjectsRepository } from './ProjectsRepository';

type DbProjectRow = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
  client?: { name?: string | null } | null;
};

function mapRowToProject(r: DbProjectRow): Project {
  return {
    id: r.id,
    clientId: r.client_id,
    clientName: r.client?.name ?? undefined,
    name: r.name,
    description: r.description ?? undefined,
    status: r.status,
    startDate: r.start_date ?? undefined,
    endDate: r.end_date ?? undefined,
    budget: r.budget ?? undefined,
    currency: r.currency,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapProjectToInsert(input: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'clientName'>) {
  return {
    client_id: input.clientId,
    name: input.name,
    description: input.description ?? null,
    status: input.status,
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    budget: input.budget ?? null,
    currency: input.currency,
  };
}

function mapProjectToPatch(patch: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'clientName'>>) {
  return {
    ...(patch.clientId !== undefined ? { client_id: patch.clientId } : {}),
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.startDate !== undefined ? { start_date: patch.startDate ?? null } : {}),
    ...(patch.endDate !== undefined ? { end_date: patch.endDate ?? null } : {}),
    ...(patch.budget !== undefined ? { budget: patch.budget ?? null } : {}),
    ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
  };
}

export class SupabaseProjectsRepository implements ProjectsRepository {
  async list(query?: ProjectsQuery): Promise<Project[]> {
    const q = (query?.searchText ?? '').trim();

    const res = await supabaseRest<DbProjectRow[]>({
      method: 'GET',
      path: '/rest/v1/projects',
      query: {
        select:
          'id,client_id,name,description,status,start_date,end_date,budget,currency,created_at,updated_at,client:clients(name)',
        ...(query?.status ? { status: `eq.${query.status}` } : {}),
        ...(query?.clientId ? { client_id: `eq.${query.clientId}` } : {}),
        ...(q ? { name: `ilike.*${escapeIlike(q)}*` } : {}),
        order: 'updated_at.desc',
      },
    });
    return res.map(mapRowToProject);
  }

  async getById(id: string): Promise<Project | null> {
    const res = await supabaseRest<DbProjectRow[]>({
      method: 'GET',
      path: '/rest/v1/projects',
      query: {
        select:
          'id,client_id,name,description,status,start_date,end_date,budget,currency,created_at,updated_at,client:clients(name)',
        id: `eq.${id}`,
        limit: '1',
      },
    });
    return res[0] ? mapRowToProject(res[0]) : null;
  }

  async create(input: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'clientName'>): Promise<Project> {
    const res = await supabaseRest<DbProjectRow[]>({
      method: 'POST',
      path: '/rest/v1/projects',
      preferReturnRepresentation: true,
      body: mapProjectToInsert(input),
    });
    if (!res[0]) throw new Error('Supabase create returned empty result');
    return mapRowToProject(res[0]);
  }

  async update(
    id: string,
    patch: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'clientName'>>
  ): Promise<Project> {
    const res = await supabaseRest<DbProjectRow[]>({
      method: 'PATCH',
      path: '/rest/v1/projects',
      preferReturnRepresentation: true,
      query: { id: `eq.${id}` },
      body: mapProjectToPatch(patch),
    });
    if (!res[0]) throw new Error('Supabase update returned empty result');
    return mapRowToProject(res[0]);
  }

  async remove(id: string): Promise<void> {
    await supabaseRest<void>({ method: 'DELETE', path: '/rest/v1/projects', query: { id: `eq.${id}` } });
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

