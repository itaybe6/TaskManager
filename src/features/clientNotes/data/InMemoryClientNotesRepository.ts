import type {
  ClientNote,
  ClientNoteAttachment,
  ClientNotesResolvedFilter,
  CreateClientNoteInput,
} from '../model/clientNoteTypes';
import type { ClientNotesListAllQuery, ClientNotesListForClientQuery, ClientNotesRepository } from './ClientNotesRepository';

function uuidLike() {
  // Good enough for local fallback
  return `local_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function nowIso() {
  return new Date().toISOString();
}

export class InMemoryClientNotesRepository implements ClientNotesRepository {
  private notes: ClientNote[] = [];

  async listForClient(query: ClientNotesListForClientQuery): Promise<ClientNote[]> {
    const items = this.notes
      .filter((n) => n.clientId === query.clientId && n.authorUserId === query.authorUserId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return query.limit ? items.slice(0, query.limit) : items;
  }

  async listAll(query?: ClientNotesListAllQuery): Promise<ClientNote[]> {
    const resolved: ClientNotesResolvedFilter = query?.resolved ?? 'all';
    let items = [...this.notes].sort((a, b) => {
      if (a.isResolved !== b.isResolved) return a.isResolved ? 1 : -1; // unresolved first
      return a.createdAt < b.createdAt ? 1 : -1;
    });
    if (resolved === 'resolved') items = items.filter((n) => n.isResolved);
    if (resolved === 'unresolved') items = items.filter((n) => !n.isResolved);
    return query?.limit ? items.slice(0, query.limit) : items;
  }

  async create(input: CreateClientNoteInput & { authorUserId: string }): Promise<ClientNote> {
    const id = uuidLike();
    const createdAt = nowIso();
    const base: ClientNote = {
      id,
      clientId: input.clientId,
      authorUserId: input.authorUserId,
      body: input.body,
      isResolved: false,
      createdAt,
      updatedAt: createdAt,
      attachments: [],
    };

    const attachments: ClientNoteAttachment[] = (input.attachments ?? []).map((a) => ({
      id: uuidLike(),
      noteId: id,
      storagePath: `local/${id}/${a.fileName}`,
      publicUrl: a.uri,
      fileName: a.fileName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      createdAt,
    }));

    const note: ClientNote = { ...base, attachments };
    this.notes = [note, ...this.notes];
    return note;
  }

  async setResolved(args: { id: string; isResolved: boolean; resolvedBy?: string }): Promise<ClientNote> {
    const idx = this.notes.findIndex((n) => n.id === args.id);
    if (idx < 0) throw new Error('Note not found');
    const prev = this.notes[idx];
    const next: ClientNote = {
      ...prev,
      isResolved: args.isResolved,
      resolvedAt: args.isResolved ? nowIso() : undefined,
      resolvedBy: args.isResolved ? (args.resolvedBy ?? prev.resolvedBy) : undefined,
      updatedAt: nowIso(),
    };
    this.notes[idx] = next;
    return next;
  }
}

