export type DocumentKind =
  | 'general'
  | 'receipt'
  | 'invoice'
  | 'quote'
  | 'contract'
  | 'tax_invoice'
  | 'other';

export type AppDocument = {
  id: string;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  kind: DocumentKind;
  title: string;
  storagePath: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedBy?: string;
  uploadedByName?: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentFilter = {
  kind?: DocumentKind;
  clientId?: string;
  projectId?: string;
  searchText?: string;
};
