/**
 * Database types for Supabase tables.
 * Matches the SQL in `supabase/schema.sql`.
 *
 * Notes:
 * - Timestamps are ISO strings (Supabase returns them as string in JS).
 * - Nullable columns are modeled as `T | null` (and optional for convenience).
 */

export type TaskStatus = 'todo' | 'done';
export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type DocKind = 'general' | 'receipt' | 'invoice' | 'quote' | 'contract' | 'other';
export type TransactionType = 'income' | 'expense';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';

export interface DbTaskCategory {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUser {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
  id: string;
  description: string;
  status: TaskStatus;
  assignee_id?: string | null;
  due_at?: string | null;
  tags?: string[] | null;
  client_id?: string | null;
  project_id?: string | null;
  category_id?: string | null;
  is_personal?: boolean;
  owner_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbClient {
  id: string;
  name: string;
  notes?: string | null;
  total_price?: number | null;
  remaining_to_pay?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbClientContact {
  id: string;
  client_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProject {
  id: string;
  client_id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  start_date?: string | null; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  budget?: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface DbDocument {
  id: string;
  project_id: string;
  kind: DocKind;
  title: string;
  storage_path: string;
  file_name: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbInvoice {
  id: string;
  project_id: string;
  invoice_no: string;
  status: InvoiceStatus;
  issued_at?: string | null; // YYYY-MM-DD
  due_at?: string | null; // YYYY-MM-DD
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbInvoiceItem {
  id: string;
  invoice_id: string;
  title: string;
  qty: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

export interface DbTransaction {
  id: string;
  project_id: string;
  type: TransactionType;
  category?: string | null;
  description?: string | null;
  amount: number;
  currency: string;
  occurred_at: string;
  receipt_document_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPriceListItem {
  id: string;
  title: string;
  unit?: string | null;
  unit_price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbUserPushToken {
  id: string;
  user_id: string;
  expo_push_token: string;
  device_platform?: string | null;
  device_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbNotification {
  id: string;
  recipient_user_id: string;
  sender_user_id?: string | null;
  title: string;
  body?: string | null;
  data?: any | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Insert / Update helper types (client-side)
export type DbUserInsert = {
  display_name: string;
  avatar_url?: string | null;
};

export type DbUserUpdate = Partial<DbUserInsert>;

export type DbTaskInsert = {
  description: string;
  status?: TaskStatus; // default: 'todo'
  assignee_id?: string | null;
  due_at?: string | null;
  tags?: string[] | null;
  client_id?: string | null;
  project_id?: string | null;
  category_id?: string | null;
  is_personal?: boolean;
  owner_user_id?: string | null;
};

export type DbTaskUpdate = Partial<DbTaskInsert>;

export type DbTaskCategoryInsert = {
  name: string;
  slug: string;
  color?: string | null;
};
export type DbTaskCategoryUpdate = Partial<DbTaskCategoryInsert>;

export type DbClientInsert = {
  name: string;
  notes?: string | null;
  total_price?: number | null;
  remaining_to_pay?: number | null;
};
export type DbClientUpdate = Partial<DbClientInsert>;

export type DbClientContactInsert = {
  client_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};
export type DbClientContactUpdate = Partial<DbClientContactInsert>;

export type DbProjectInsert = {
  client_id: string;
  name: string;
  description?: string | null;
  status?: ProjectStatus; // default: 'active'
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  currency?: string; // default: 'ILS'
};
export type DbProjectUpdate = Partial<DbProjectInsert>;

export type DbDocumentInsert = {
  project_id: string;
  kind?: DocKind; // default: 'general'
  title: string;
  storage_path: string;
  file_name: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  uploaded_by?: string | null;
};
export type DbDocumentUpdate = Partial<DbDocumentInsert>;

export type DbInvoiceInsert = {
  project_id: string;
  invoice_no: string;
  status?: InvoiceStatus; // default: 'draft'
  issued_at?: string | null;
  due_at?: string | null;
  currency?: string; // default: 'ILS'
  subtotal?: number; // default 0
  tax?: number; // default 0
  total?: number; // default 0
  notes?: string | null;
};
export type DbInvoiceUpdate = Partial<DbInvoiceInsert>;

export type DbInvoiceItemInsert = {
  invoice_id: string;
  title: string;
  qty?: number; // default 1
  unit_price?: number; // default 0
  line_total?: number; // default 0
};
export type DbInvoiceItemUpdate = Partial<DbInvoiceItemInsert>;

export type DbTransactionInsert = {
  project_id: string;
  type: TransactionType;
  category?: string | null;
  description?: string | null;
  amount: number;
  currency?: string; // default 'ILS'
  occurred_at?: string; // default now()
  receipt_document_id?: string | null;
};
export type DbTransactionUpdate = Partial<DbTransactionInsert>;

export type DbPriceListItemInsert = {
  title: string;
  unit?: string | null;
  unit_price: number;
  currency?: string; // default 'ILS'
  is_active?: boolean; // default true
};
export type DbPriceListItemUpdate = Partial<DbPriceListItemInsert>;

export type DbUserPushTokenInsert = {
  user_id: string;
  expo_push_token: string;
  device_platform?: string | null;
  device_name?: string | null;
};
export type DbUserPushTokenUpdate = Partial<DbUserPushTokenInsert>;

export type DbNotificationInsert = {
  recipient_user_id: string;
  sender_user_id?: string | null;
  title: string;
  body?: string | null;
  data?: any | null;
  is_read?: boolean; // default false
  read_at?: string | null;
};
export type DbNotificationUpdate = Partial<DbNotificationInsert>;

/**
 * Supabase-style `Database` type (useful for typed client).
 * Example:
 *   const supabase = createClient<Database>(url, key)
 */
export type Database = {
  public: {
    Tables: {
      users: {
        Row: DbUser;
        Insert: DbUserInsert;
        Update: DbUserUpdate;
      };
      task_categories: {
        Row: DbTaskCategory;
        Insert: DbTaskCategoryInsert;
        Update: DbTaskCategoryUpdate;
      };
      tasks: {
        Row: DbTask;
        Insert: DbTaskInsert;
        Update: DbTaskUpdate;
      };
      clients: {
        Row: DbClient;
        Insert: DbClientInsert;
        Update: DbClientUpdate;
      };
      client_contacts: {
        Row: DbClientContact;
        Insert: DbClientContactInsert;
        Update: DbClientContactUpdate;
      };
      projects: {
        Row: DbProject;
        Insert: DbProjectInsert;
        Update: DbProjectUpdate;
      };
      documents: {
        Row: DbDocument;
        Insert: DbDocumentInsert;
        Update: DbDocumentUpdate;
      };
      invoices: {
        Row: DbInvoice;
        Insert: DbInvoiceInsert;
        Update: DbInvoiceUpdate;
      };
      invoice_items: {
        Row: DbInvoiceItem;
        Insert: DbInvoiceItemInsert;
        Update: DbInvoiceItemUpdate;
      };
      transactions: {
        Row: DbTransaction;
        Insert: DbTransactionInsert;
        Update: DbTransactionUpdate;
      };
      price_list_items: {
        Row: DbPriceListItem;
        Insert: DbPriceListItemInsert;
        Update: DbPriceListItemUpdate;
      };
      user_push_tokens: {
        Row: DbUserPushToken;
        Insert: DbUserPushTokenInsert;
        Update: DbUserPushTokenUpdate;
      };
      notifications: {
        Row: DbNotification;
        Insert: DbNotificationInsert;
        Update: DbNotificationUpdate;
      };
    };
  };
};

