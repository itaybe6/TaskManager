import type {
  ClientNote,
  ClientNoteAttachment,
  ClientNotesResolvedFilter,
  CreateClientNoteInput,
} from '../model/clientNoteTypes';
import { supabaseRest } from '../../../app/supabase/rest';
import { uploadFileFromUri } from '../../../app/supabase/storage';
import type { ClientNotesListAllQuery, ClientNotesListForClientQuery, ClientNotesRepository } from './ClientNotesRepository';

type DbClientNoteRow = {
  id: string;
  client_id: string;
  author_user_id: string;
  body: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  client_note_attachments?: DbClientNoteAttachmentRow[] | null;
  client?: { name?: string | null } | null;
  clients?: { name?: string | null } | null; // depending on embed alias
};

type DbClientNoteAttachmentRow = {
  id: string;
  note_id: string;
  storage_path: string;
  public_url: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

function mapAttachment(r: DbClientNoteAttachmentRow): ClientNoteAttachment {
  return {
    id: r.id,
    noteId: r.note_id,
    storagePath: r.storage_path,
    publicUrl: r.public_url,
    fileName: r.file_name,
    mimeType: r.mime_type ?? undefined,
    sizeBytes: r.size_bytes ?? undefined,
    createdAt: r.created_at,
  };
}

function mapRow(r: DbClientNoteRow): ClientNote {
  const embeddedClientName = (r.client?.name ?? r.clients?.name ?? undefined) ?? undefined;
  return {
    id: r.id,
    clientId: r.client_id,
    authorUserId: r.author_user_id,
    body: r.body ?? '',
    isResolved: r.is_resolved,
    resolvedAt: r.resolved_at ?? undefined,
    resolvedBy: r.resolved_by ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    attachments: (r.client_note_attachments ?? []).filter(Boolean).map(mapAttachment),
    clientName: embeddedClientName,
  };
}

function resolvedToQuery(resolved?: ClientNotesResolvedFilter) {
  if (resolved === 'resolved') return { is_resolved: 'eq.true' };
  if (resolved === 'unresolved') return { is_resolved: 'eq.false' };
  return {};
}

function extFrom(input: { mimeType?: string; fileName?: string }) {
  const fn = (input.fileName ?? '').toLowerCase();
  const fromName = fn.includes('.') ? fn.split('.').pop() : '';
  if (fromName && /^[a-z0-9]{1,6}$/.test(fromName)) return fromName;
  const mt = (input.mimeType ?? '').toLowerCase();
  if (mt.includes('png')) return 'png';
  if (mt.includes('webp')) return 'webp';
  return 'jpg';
}

function safeFileName(fileName: string, fallbackExt: string) {
  // Keep ASCII-ish to avoid path encoding issues
  const base = (fileName ?? '').trim().replace(/[^a-zA-Z0-9._-]+/g, '_');
  const clean = base.length ? base : `image.${fallbackExt}`;
  return clean.length > 120 ? clean.slice(-120) : clean;
}

export class SupabaseClientNotesRepository implements ClientNotesRepository {
  async listForClient(query: ClientNotesListForClientQuery): Promise<ClientNote[]> {
    const res = await supabaseRest<DbClientNoteRow[]>({
      method: 'GET',
      path: '/rest/v1/client_notes',
      query: {
        select:
          'id,client_id,author_user_id,body,is_resolved,resolved_at,resolved_by,created_at,updated_at,client_note_attachments(id,note_id,storage_path,public_url,file_name,mime_type,size_bytes,created_at)',
        client_id: `eq.${query.clientId}`,
        author_user_id: `eq.${query.authorUserId}`,
        order: 'created_at.desc',
        ...(query.limit ? { limit: String(query.limit) } : {}),
      },
    });
    return res.map(mapRow);
  }

  async listAll(query?: ClientNotesListAllQuery): Promise<ClientNote[]> {
    const resolved = query?.resolved ?? 'all';
    const res = await supabaseRest<DbClientNoteRow[]>({
      method: 'GET',
      path: '/rest/v1/client_notes',
      query: {
        select:
          'id,client_id,author_user_id,body,is_resolved,resolved_at,resolved_by,created_at,updated_at,client_note_attachments(id,note_id,storage_path,public_url,file_name,mime_type,size_bytes,created_at),clients:clients(name)',
        ...resolvedToQuery(resolved),
        // show unresolved first, then newest
        order: 'is_resolved.asc,created_at.desc',
        ...(query?.limit ? { limit: String(query.limit) } : {}),
      },
    });
    return res.map(mapRow);
  }

  async create(input: CreateClientNoteInput & { authorUserId: string }): Promise<ClientNote> {
    const createdNoteRes = await supabaseRest<DbClientNoteRow[]>({
      method: 'POST',
      path: '/rest/v1/client_notes',
      preferReturnRepresentation: true,
      body: {
        client_id: input.clientId,
        author_user_id: input.authorUserId,
        body: input.body,
      },
    });

    const row = createdNoteRes[0];
    if (!row?.id) throw new Error('Supabase create returned empty result');
    const noteId = row.id;

    const attachments = (input.attachments ?? []).slice(0, 3);
    if (attachments.length) {
      const inserted: Array<{
        note_id: string;
        storage_path: string;
        public_url: string;
        file_name: string;
        mime_type: string | null;
        size_bytes: number | null;
      }> = [];

      for (let i = 0; i < attachments.length; i++) {
        const a = attachments[i];
        const ext = extFrom({ mimeType: a.mimeType, fileName: a.fileName });
        const safeName = safeFileName(a.fileName, ext);
        const objectPath = `client_notes/${input.clientId}/${noteId}/${Date.now()}_${i}.${ext}`;

        const uploaded = await uploadFileFromUri({
          bucket: 'documents',
          objectPath,
          uri: a.uri,
          contentType: a.mimeType,
        });

        inserted.push({
          note_id: noteId,
          storage_path: uploaded.objectPath,
          public_url: uploaded.publicUrl,
          file_name: safeName,
          mime_type: a.mimeType ?? null,
          size_bytes: a.sizeBytes ?? null,
        });
      }

      await supabaseRest<void>({
        method: 'POST',
        path: '/rest/v1/client_note_attachments',
        body: inserted,
      });
    }

    // Fetch full (with attachments) so caller gets normalized shape
    const full = await supabaseRest<DbClientNoteRow[]>({
      method: 'GET',
      path: '/rest/v1/client_notes',
      query: {
        select:
          'id,client_id,author_user_id,body,is_resolved,resolved_at,resolved_by,created_at,updated_at,client_note_attachments(id,note_id,storage_path,public_url,file_name,mime_type,size_bytes,created_at)',
        id: `eq.${noteId}`,
        limit: '1',
      },
    });

    const fullRow = full[0];
    if (!fullRow) throw new Error('Failed to reload created note');
    return mapRow(fullRow);
  }

  async setResolved(args: { id: string; isResolved: boolean; resolvedBy?: string }): Promise<ClientNote> {
    const res = await supabaseRest<DbClientNoteRow[]>({
      method: 'PATCH',
      path: '/rest/v1/client_notes',
      preferReturnRepresentation: true,
      query: { id: `eq.${args.id}` },
      body: {
        is_resolved: args.isResolved,
        resolved_at: args.isResolved ? new Date().toISOString() : null,
        resolved_by: args.isResolved ? (args.resolvedBy ?? null) : null,
      },
    });

    const row = res[0];
    if (!row) throw new Error('Supabase update returned empty result');

    // Attachments not returned by PATCH unless selected; best-effort reload
    const full = await supabaseRest<DbClientNoteRow[]>({
      method: 'GET',
      path: '/rest/v1/client_notes',
      query: {
        select:
          'id,client_id,author_user_id,body,is_resolved,resolved_at,resolved_by,created_at,updated_at,client_note_attachments(id,note_id,storage_path,public_url,file_name,mime_type,size_bytes,created_at),clients:clients(name)',
        id: `eq.${row.id}`,
        limit: '1',
      },
    });

    const fullRow = full[0];
    return fullRow ? mapRow(fullRow) : mapRow(row);
  }
}

