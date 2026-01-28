import { supabaseRest } from '../../../app/supabase/rest';
import { ClientsQuery, ClientsRepository } from './ClientsRepository';
import { Client } from '../model/clientTypes';

type DbClientRow = {
  id: string;
  name: string;
  notes: string | null;
  total_price?: number | string | null;
  remaining_to_pay?: number | string | null;
  created_at: string;
  updated_at: string;
  client_contacts?: DbClientContactRow[] | null;
  documents?: DbClientDocumentRow[] | null;
};

type DbClientDocumentRow = {
  id: string;
  client_id: string;
  kind: string;
  title: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
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
    totalPrice: toNumber(r.total_price),
    remainingToPay: toNumber(r.remaining_to_pay),
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
    documents:
      (r.documents ?? [])
        ?.filter(Boolean)
        .map((d) => ({
          id: d.id,
          clientId: d.client_id,
          kind: d.kind as any,
          title: d.title,
          storagePath: d.storage_path,
          fileName: d.file_name,
          mimeType: d.mime_type ?? undefined,
          sizeBytes: d.size_bytes ?? undefined,
          createdAt: d.created_at,
        })) ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapClientToInsert(input: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    name: input.name,
    notes: input.notes ?? null,
    total_price: input.totalPrice ?? null,
    remaining_to_pay: input.remainingToPay ?? null,
  };
}

function mapClientToPatch(patch: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>) {
  return {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes ?? null } : {}),
    ...(patch.totalPrice !== undefined ? { total_price: patch.totalPrice ?? null } : {}),
    ...(patch.remainingToPay !== undefined ? { remaining_to_pay: patch.remainingToPay ?? null } : {}),
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
          'id,name,notes,total_price,remaining_to_pay,created_at,updated_at,client_contacts(id,client_id,name,email,phone,created_at,updated_at),documents(id,client_id,kind,title,storage_path,file_name,mime_type,size_bytes,created_at)',
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
          'id,name,notes,total_price,remaining_to_pay,created_at,updated_at,client_contacts(id,client_id,name,email,phone,created_at,updated_at),documents(id,client_id,kind,title,storage_path,file_name,mime_type,size_bytes,created_at)',
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

  async addDocument(clientId: string, doc: Omit<ClientDocument, 'id' | 'createdAt'>): Promise<ClientDocument> {
    const res = await supabaseRest<DbClientDocumentRow[]>({
      method: 'POST',
      path: '/rest/v1/documents',
      preferReturnRepresentation: true,
      body: {
        client_id: clientId,
        kind: doc.kind,
        title: doc.title,
        storage_path: doc.storagePath,
        file_name: doc.fileName,
        mime_type: doc.mimeType ?? null,
        size_bytes: doc.sizeBytes ?? null,
        project_id: null, // Client documents don't necessarily have a project
      },
    });

    if (!res[0]) throw new Error('Failed to create document record');
    const d = res[0];
    return {
      id: d.id,
      clientId: d.client_id,
      kind: d.kind as any,
      title: d.title,
      storagePath: d.storage_path,
      fileName: d.file_name,
      mimeType: d.mime_type ?? undefined,
      sizeBytes: d.size_bytes ?? undefined,
      createdAt: d.created_at,
    };
  }

  async removeDocument(documentId: string): Promise<void> {
    await supabaseRest<void>({
      method: 'DELETE',
      path: '/rest/v1/documents',
      query: { id: `eq.${documentId}` },
    });
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

function toNumber(v: number | string | null | undefined): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

