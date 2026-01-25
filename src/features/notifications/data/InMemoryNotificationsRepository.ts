import type { NotificationsRepository } from './NotificationsRepository';
import type { Notification, NotificationsQuery } from '../model/notificationTypes';

const nowIso = () => new Date().toISOString();

let seed: Notification[] = [
  {
    id: 'n_demo_1',
    recipientUserId: 'demo',
    title: 'ברוך הבא',
    body: 'כאן יופיעו ההתראות שלך.',
    isRead: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

export class InMemoryNotificationsRepository implements NotificationsRepository {
  async list(query?: NotificationsQuery): Promise<Notification[]> {
    const viewerUserId = query?.viewerUserId;
    if (!viewerUserId) return [];

    let items = seed.filter((n) => n.recipientUserId === viewerUserId);
    if (query?.onlyUnread) items = items.filter((n) => !n.isRead);
    items = items.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    if (query?.limit) items = items.slice(0, query.limit);
    return items;
  }

  async markRead(id: string): Promise<void> {
    seed = seed.map((n) =>
      n.id === id
        ? { ...n, isRead: true, readAt: n.readAt ?? nowIso(), updatedAt: nowIso() }
        : n
    );
  }

  async markAllRead(viewerUserId: string): Promise<void> {
    seed = seed.map((n) =>
      n.recipientUserId === viewerUserId && !n.isRead
        ? { ...n, isRead: true, readAt: n.readAt ?? nowIso(), updatedAt: nowIso() }
        : n
    );
  }
}

