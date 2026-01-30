import { create } from 'zustand';
import { getSupabaseConfig } from '../../../app/supabase/rest';
import { DocumentsRepository } from '../data/DocumentsRepository';
import { SupabaseDocumentsRepository } from '../data/SupabaseDocumentsRepository';
import { AppDocument, DocumentFilter } from '../model/documentTypes';
import { uploadFileFromUri } from '../../../app/supabase/storage';
import { useAuthStore } from '../../auth/store/authStore';

type DocumentsState = {
  repo: DocumentsRepository;
  items: AppDocument[];
  isLoading: boolean;
  error?: string;
  filter: DocumentFilter;

  load: () => Promise<void>;
  setFilter: (f: Partial<DocumentFilter>) => void;
  uploadDocument: (args: {
    uri: string;
    title: string;
    kind: AppDocument['kind'];
    clientId?: string;
    projectId?: string;
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
  }) => Promise<AppDocument>;
  deleteDocument: (id: string) => Promise<void>;
};

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  repo: new SupabaseDocumentsRepository(),
  items: [],
  isLoading: false,
  filter: {},

  load: async () => {
    set({ isLoading: true, error: undefined });
    try {
      const { repo, filter } = get();
      const items = await repo.list(filter);
      set({ items, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  setFilter: (f) => {
    set((s) => ({ filter: { ...s.filter, ...f } }));
    get().load();
  },

  uploadDocument: async (args) => {
    const { repo } = get();
    const user = useAuthStore.getState().user;
    
    // 1. Generate a SAFE storage path (ASCII only) to avoid encoding issues with Hebrew
    const bucket = 'documents';
    const timestamp = Date.now();
    const extension = args.fileName.split('.').pop() || '';
    const safeStorageName = `${timestamp}${extension ? `.${extension}` : ''}`;
    
    const objectPath = args.clientId 
      ? `clients/${args.clientId}/${safeStorageName}`
      : `general/${safeStorageName}`;

    const { publicUrl, objectPath: finalPath } = await uploadFileFromUri({
      bucket,
      objectPath,
      uri: args.uri,
      contentType: args.mimeType,
    });

    // 2. Create database record - Here we keep the original Hebrew title and filename
    const doc = await repo.create({
      title: args.title,
      kind: args.kind,
      clientId: args.clientId,
      projectId: args.projectId,
      storagePath: finalPath,
      fileName: args.fileName, // Original Hebrew name preserved here
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      uploadedBy: user?.id,
    });

    await get().load();
    return doc;
  },

  deleteDocument: async (id) => {
    const { repo } = get();
    await repo.remove(id);
    await get().load();
  },
}));
