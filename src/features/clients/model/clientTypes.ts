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

export type Client = {
  id: string;
  name: string;
  notes?: string;
  contacts: ClientContact[];
  createdAt: string;
  updatedAt: string;
};

