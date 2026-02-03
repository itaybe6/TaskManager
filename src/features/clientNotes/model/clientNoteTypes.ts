export type ClientNoteAttachment = {
  id: string;
  noteId: string;
  storagePath: string;
  publicUrl: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
};

export type ClientNote = {
  id: string;
  clientId: string;
  authorUserId: string;
  body: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
  attachments: ClientNoteAttachment[];

  // Optional embed for admin inbox
  clientName?: string;
};

export type ClientNotesResolvedFilter = 'all' | 'resolved' | 'unresolved';

export type CreateClientNoteAttachmentInput = {
  uri: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type CreateClientNoteInput = {
  clientId: string;
  body: string;
  attachments?: CreateClientNoteAttachmentInput[];
};

