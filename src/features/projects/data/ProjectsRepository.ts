import { Project, ProjectStatus } from '../model/projectTypes';

export type ProjectsQuery = {
  searchText?: string;
  status?: ProjectStatus;
  clientId?: string;
};

export interface ProjectsRepository {
  list(query?: ProjectsQuery): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  create(input: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'clientName'>): Promise<Project>;
  update(
    id: string,
    patch: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'clientName'>>
  ): Promise<Project>;
  remove(id: string): Promise<void>;
}

