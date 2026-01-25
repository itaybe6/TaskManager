import { supabaseRest } from '../../../app/supabase/rest';
import { ClientsQuery, ClientsRepository } from './ClientsRepository';
import { Client } from '../model/clientTypes';

type DbClientRow = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client_contacts?: DbClientContactRow[] | null;
};

type DbClientContactRow = {
  id: string;
  client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

function mapRowToClient(r: DbClientRow): Client {
  return {
    id: r.id,
    name: r.name,
    notes: r.notes ?? undefined,
    contacts:
      (r.client_contacts ?? [])
        ?.filter(Boolean)
        .map((cc) => ({
          id: cc.id,
          name: cc.name,
          email: cc.email ?? undefined,
          phone: cc.phone ?? undefined,
          createdAt: cc.created_at,
          updatedAt: cc.updated_at,
        })) ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapClientToInsert(input: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    name: input.name,
    notes: input.notes ?? null,
  };
}

function mapClientToPatch(patch: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>) {
  return {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
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
        select:
          'id,name,notes,created_at,updated_at,client_contacts(id,client_id,name,email,phone,created_at,updated_at)',
        ...(q
          ? {
              or: `(name.ilike.*${escapeIlike(q)}*)`,
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
      query: {
        select:
          'id,name,notes,created_at,updated_at,client_contacts(id,client_id,name,email,phone,created_at,updated_at)',
        id: `eq.${id}`,
        limit: '1',
      },
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

    const createdClientId = res[0].id;
    await this.replaceContacts(createdClientId, input.contacts ?? []);
    const full = await this.getById(createdClientId);
    if (!full) throw new Error('Failed to refetch created client');
    return full;
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

    if (patch.contacts !== undefined) {
      await this.replaceContacts(id, patch.contacts);
    }

    const full = await this.getById(id);
    if (!full) throw new Error('Failed to refetch updated client');
    return full;
  }

  async remove(id: string): Promise<void> {
    await supabaseRest<void>({ method: 'DELETE', path: '/rest/v1/clients', query: { id: `eq.${id}` } });
  }

  private async replaceContacts(
    clientId: string,
    contacts: { name: string; email?: string; phone?: string }[]
  ): Promise<void> {
    // Remove existing
    await supabaseRest<void>({
      method: 'DELETE',
      path: '/rest/v1/client_contacts',
      query: { client_id: `eq.${clientId}` },
    });

    const normalized = contacts
      .map((c) => ({
        client_id: clientId,
        name: c.name.trim(),
        email: c.email?.trim() ? c.email.trim() : null,
        phone: c.phone?.trim() ? c.phone.trim() : null,
      }))
      .filter((c) => c.name.length > 0);

    if (normalized.length === 0) return;

    await supabaseRest<void>({
      method: 'POST',
      path: '/rest/v1/client_contacts',
      body: normalized,
    });
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

