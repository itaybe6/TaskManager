export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;

  assignee?: string;
  dueAt?: string; // ISO
  tags?: string[];

  createdAt: string;
  updatedAt: string;
};
