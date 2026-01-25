import { Task } from '../model/taskTypes';

export type TaskQuery = {
  status?: Task['status'];
  searchText?: string;
  clientId?: string;
  projectId?: string;
  categoryId?: string;
  assigneeId?: string;
  viewerUserId?: string;
};

export interface TaskRepository {
  list(query?: TaskQuery): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  create(input: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  update(
    id: string,
    patch: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Task>;
  remove(id: string): Promise<void>;
}
