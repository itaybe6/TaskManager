import type { Notification, NotificationsQuery } from '../model/notificationTypes';

export interface NotificationsRepository {
  list: (query?: NotificationsQuery) => Promise<Notification[]>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (viewerUserId: string) => Promise<void>;
}

