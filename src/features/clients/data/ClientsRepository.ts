import { Client, ClientDocument } from '../model/clientTypes';

export type ClientsQuery = {
  searchText?: string;
};

export interface ClientsRepository {
  list(query?: ClientsQuery): Promise<Client[]>;
  getById(id: string): Promise<Client | null>;
  create(input: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'documents'>): Promise<Client>;
  update(
    id: string,
    patch: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'documents'>>
  ): Promise<Client>;
  remove(id: string): Promise<void>;
  addDocument(clientId: string, doc: Omit<ClientDocument, 'id' | 'createdAt'>): Promise<ClientDocument>;
  removeDocument(documentId: string): Promise<void>;
}

