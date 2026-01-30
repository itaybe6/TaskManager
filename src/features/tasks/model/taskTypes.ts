export type TaskStatus = 'todo' | 'done';

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
  description: string;
  status: TaskStatus;

  assigneeId?: string;
  assignee?: string;
  clientId?: string;
  projectId?: string;
  categoryId?: string;
  categoryName?: string;
  dueAt?: string; // ISO
  isPersonal?: boolean;
  ownerUserId?: string;

  createdAt: string;
  updatedAt: string;
};
