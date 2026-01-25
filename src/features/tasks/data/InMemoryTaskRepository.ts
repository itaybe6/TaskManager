import { TaskRepository, TaskQuery } from './TaskRepository';
import type { Task } from '../model/taskTypes';
import { makeId } from '../../../shared/utils/id';

const nowIso = () => new Date().toISOString();

export class InMemoryTaskRepository implements TaskRepository {
  private tasks: Task[] = [
    {
      id: 't1',
      title: "להרים פיצ'ר בסיסי",
      description: 'רשימה + יצירה + פרטים',
      status: 'in_progress',
      priority: 'high',
      assigneeId: 'u_iti',
      assignee: 'איתי',
      projectId: 'p1111111-1111-1111-1111-111111111111',
      categoryId: 'cat_projects',
      categoryName: 'פרויקטים',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      tags: ['mvp'],
    },
    {
      id: 't2',
      title: 'לשוחח עם לקוח',
      status: 'todo',
      priority: 'medium',
      assigneeId: 'u_adir',
      assignee: 'אדיר',
      clientId: 'c1111111-1111-1111-1111-111111111111',
      projectId: 'p2222222-2222-2222-2222-222222222222',
      categoryId: 'cat_marketing',
      categoryName: 'פרסום',
      isPersonal: true,
      ownerUserId: 'u_adir',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];

  async list(query?: TaskQuery): Promise<Task[]> {
    let out = [...this.tasks];

    if (query?.viewerUserId) {
      out = out.filter((t) => !t.isPersonal || t.ownerUserId === query.viewerUserId);
    }
    if (query?.assigneeId) out = out.filter(t => t.assigneeId === query.assigneeId);
    if (query?.clientId) out = out.filter(t => t.clientId === query.clientId);
    if (query?.projectId) out = out.filter(t => t.projectId === query.projectId);
    if (query?.categoryId) out = out.filter(t => t.categoryId === query.categoryId);
    if (query?.status) out = out.filter(t => t.status === query.status);
    if (query?.searchText?.trim()) {
      const s = query.searchText.trim().toLowerCase();
      out = out.filter(
        t =>
          t.title.toLowerCase().includes(s) ||
          (t.description ?? '').toLowerCase().includes(s)
      );
    }

    const priorityRank: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 };
    out.sort((a, b) => {
      const pr = priorityRank[a.priority] - priorityRank[b.priority];
      if (pr !== 0) return pr;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return out;
  }

  async getById(id: string): Promise<Task | null> {
    return this.tasks.find(t => t.id === id) ?? null;
  }

  async create(input: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const task: Task = {
      ...input,
      id: makeId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.tasks = [task, ...this.tasks];
    return task;
  }

  async update(
    id: string,
    patch: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Task> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Task not found');

    const updated: Task = {
      ...existing,
      ...patch,
      updatedAt: nowIso(),
    };

    this.tasks = this.tasks.map(t => (t.id === id ? updated : t));
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.tasks = this.tasks.filter(t => t.id !== id);
  }
}
