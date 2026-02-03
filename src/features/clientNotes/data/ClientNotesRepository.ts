import type { ClientNote, ClientNotesResolvedFilter, CreateClientNoteInput } from '../model/clientNoteTypes';

export type ClientNotesListAllQuery = {
  resolved?: ClientNotesResolvedFilter;
  limit?: number;
};

export type ClientNotesListForClientQuery = {
  clientId: string;
  authorUserId: string;
  limit?: number;
};

export interface ClientNotesRepository {
  listForClient(query: ClientNotesListForClientQuery): Promise<ClientNote[]>;
  listAll(query?: ClientNotesListAllQuery): Promise<ClientNote[]>;
  create(input: CreateClientNoteInput & { authorUserId: string }): Promise<ClientNote>;
  setResolved(args: { id: string; isResolved: boolean; resolvedBy?: string }): Promise<ClientNote>;
}

