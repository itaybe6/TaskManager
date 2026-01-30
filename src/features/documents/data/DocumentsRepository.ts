import { AppDocument, DocumentFilter, DocumentKind } from '../model/documentTypes';

export interface DocumentsRepository {
  list(filter?: DocumentFilter): Promise<AppDocument[]>;
  getById(id: string): Promise<AppDocument | null>;
  create(input: Omit<AppDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppDocument>;
  remove(id: string): Promise<void>;
}
