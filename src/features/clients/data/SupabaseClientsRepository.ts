import { supabaseRest } from '../../../app/supabase/rest';
import { ClientsQuery, ClientsRepository } from './ClientsRepository';
import { Client } from '../model/clientTypes';

type DbClientRow = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapRowToClient(r: DbClientRow): Client {
  return {
    id: r.id,
    name: r.name,
    contactName: r.contact_name ?? undefined,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapClientToInsert(input: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    name: input.name,
    contact_name: input.contactName ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    address: input.address ?? null,
    notes: input.notes ?? null,
  };
}

function mapClientToPatch(patch: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>) {
  return {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.contactName !== undefined ? { contact_name: patch.contactName ?? null } : {}),
    ...(patch.email !== undefined ? { email: patch.email ?? null } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone ?? null } : {}),
    ...(patch.address !== undefined ? { address: patch.address ?? null } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes ?? null } : {}),
  };
}

export class SupabaseClientsRepository implements ClientsRepository {
  async list(query?: ClientsQuery): Promise<Client[]> {
    const q = (query?.searchText ?? '').trim();
    const res = await supabaseRest<DbClientRow[]>({
      method: 'GET',
      path: '/rest/v1/clients',
      query: {
        select: 'id,name,contact_name,email,phone,address,notes,created_at,updated_at',
        ...(q
          ? {
              or: `(name.ilike.*${escapeIlike(q)}*,contact_name.ilike.*${escapeIlike(q)}*,email.ilike.*${escapeIlike(q)}*)`,
            }
          : {}),
        order: 'updated_at.desc',
      },
    });
    return res.map(mapRowToClient);
  }

  async getById(id: string): Promise<Client | null> {
    const res = await supabaseRest<DbClientRow[]>({
      method: 'GET',
      path: '/rest/v1/clients',
      query: { select: 'id,name,contact_name,email,phone,address,notes,created_at,updated_at', id: `eq.${id}`, limit: '1' },
    });
    return res[0] ? mapRowToClient(res[0]) : null;
  }

  async create(input: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const res = await supabaseRest<DbClientRow[]>({
      method: 'POST',
      path: '/rest/v1/clients',
      preferReturnRepresentation: true,
      body: mapClientToInsert(input),
    });
    if (!res[0]) throw new Error('Supabase create returned empty result');
    return mapRowToClient(res[0]);
  }

  async update(
    id: string,
    patch: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Client> {
    const res = await supabaseRest<DbClientRow[]>({
      method: 'PATCH',
      path: '/rest/v1/clients',
      preferReturnRepresentation: true,
      query: { id: `eq.${id}` },
      body: mapClientToPatch(patch),
    });
    if (!res[0]) throw new Error('Supabase update returned empty result');
    return mapRowToClient(res[0]);
  }

  async remove(id: string): Promise<void> {
    await supabaseRest<void>({ method: 'DELETE', path: '/rest/v1/clients', query: { id: `eq.${id}` } });
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

