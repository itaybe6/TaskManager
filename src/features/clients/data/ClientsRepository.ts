import { Client } from '../model/clientTypes';

export type ClientsQuery = {
  searchText?: string;
};

export interface ClientsRepository {
  list(query?: ClientsQuery): Promise<Client[]>;
  getById(id: string): Promise<Client | null>;
  create(input: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client>;
  update(
    id: string,
    patch: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Client>;
  remove(id: string): Promise<void>;
}

