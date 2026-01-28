export type ClientContact = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientContactInput = {
  name: string;
  email?: string;
  phone?: string;
};

export type ClientDocument = {
  id: string;
  clientId: string;
  kind: 'general' | 'receipt' | 'invoice' | 'quote' | 'contract' | 'tax_invoice' | 'other';
  title: string;
  storagePath: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
};

export type Client = {
  id: string;
  name: string;
  notes?: string;
  totalPrice?: number;
  remainingToPay?: number;
  contacts: ClientContact[];
  documents?: ClientDocument[];
  createdAt: string;
  updatedAt: string;
};

