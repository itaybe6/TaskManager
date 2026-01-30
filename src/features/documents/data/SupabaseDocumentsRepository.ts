import { supabaseRest } from '../../../app/supabase/rest';
import { DocumentsRepository } from './DocumentsRepository';
import { AppDocument, DocumentFilter, DocumentKind } from '../model/documentTypes';

type DbDocumentRow = {
  id: string;
  client_id: string | null;
  project_id: string | null;
  kind: string;
  title: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string } | null;
  projects?: { name: string } | null;
  users?: { display_name: string } | null;
};

function mapRowToDocument(r: DbDocumentRow): AppDocument {
  return {
    id: r.id,
    clientId: r.client_id ?? undefined,
    clientName: r.clients?.name,
    projectId: r.project_id ?? undefined,
    projectName: r.projects?.name,
    kind: r.kind as DocumentKind,
    title: r.title,
    storagePath: r.storage_path,
    fileName: r.file_name,
    mimeType: r.mime_type ?? undefined,
    sizeBytes: r.size_bytes ?? undefined,
    uploadedBy: r.uploaded_by ?? undefined,
    uploadedByName: r.users?.display_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class SupabaseDocumentsRepository implements DocumentsRepository {
  async list(filter?: DocumentFilter): Promise<AppDocument[]> {
    const query: any = {
      select: '*,clients(name),projects(name),users(display_name)',
      order: 'created_at.desc',
    };

    if (filter?.clientId) {
      query.client_id = `eq.${filter.clientId}`;
    }
    if (filter?.projectId) {
      query.project_id = `eq.${filter.projectId}`;
    }
    if (filter?.kind) {
      query.kind = `eq.${filter.kind}`;
    }
    if (filter?.searchText) {
      query.title = `ilike.*${filter.searchText}*`;
    }

    const res = await supabaseRest<DbDocumentRow[]>({
      method: 'GET',
      path: '/rest/v1/documents',
      query,
    });

    return res.map(mapRowToDocument);
  }

  async getById(id: string): Promise<AppDocument | null> {
    const res = await supabaseRest<DbDocumentRow[]>({
      method: 'GET',
      path: '/rest/v1/documents',
      query: {
        select: '*,clients(name),projects(name),users(display_name)',
        id: `eq.${id}`,
        limit: '1',
      },
    });

    return res[0] ? mapRowToDocument(res[0]) : null;
  }

  async create(input: Omit<AppDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppDocument> {
    const res = await supabaseRest<DbDocumentRow[]>({
      method: 'POST',
      path: '/rest/v1/documents',
      preferReturnRepresentation: true,
      body: {
        client_id: input.clientId ?? null,
        project_id: input.projectId ?? null,
        kind: input.kind,
        title: input.title,
        storage_path: input.storagePath,
        file_name: input.fileName,
        mime_type: input.mimeType ?? null,
        size_bytes: input.sizeBytes ?? null,
        uploaded_by: input.uploadedBy ?? null,
      },
    });

    if (!res[0]) throw new Error('Failed to create document');
    
    // Fetch full document with relations
    const full = await this.getById(res[0].id);
    if (!full) throw new Error('Failed to fetch created document');
    return full;
  }

  async remove(id: string): Promise<void> {
    await supabaseRest<void>({
      method: 'DELETE',
      path: '/rest/v1/documents',
      query: { id: `eq.${id}` },
    });
  }
}
