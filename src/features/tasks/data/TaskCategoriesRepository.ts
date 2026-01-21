import { TaskCategory } from '../model/taskTypes';

export type TaskCategoriesQuery = {
  searchText?: string;
};

export interface TaskCategoriesRepository {
  list(query?: TaskCategoriesQuery): Promise<TaskCategory[]>;
  create(input: Pick<TaskCategory, 'name' | 'slug' | 'color'>): Promise<TaskCategory>;
}

