export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskCategory = {
  id: string;
  name: string;
  slug: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;

  assigneeId?: string;
  assignee?: string;
  clientId?: string;
  projectId?: string;
  categoryId?: string;
  categoryName?: string;
  dueAt?: string; // ISO
  tags?: string[];
  isPersonal?: boolean;
  ownerUserId?: string;

  createdAt: string;
  updatedAt: string;
};
