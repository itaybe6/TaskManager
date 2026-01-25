import { supabaseRest } from '../../../app/supabase/rest';
import type { DbNotification } from '../../../shared/types/database';
import type { Notification, NotificationsQuery } from '../model/notificationTypes';
import type { NotificationsRepository } from './NotificationsRepository';

function mapRowToNotification(r: DbNotification): Notification {
  return {
    id: r.id,
    recipientUserId: r.recipient_user_id,
    senderUserId: r.sender_user_id ?? undefined,
    title: r.title,
    body: r.body ?? undefined,
    data: r.data ?? undefined,
    isRead: r.is_read,
    readAt: r.read_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class SupabaseNotificationsRepository implements NotificationsRepository {
  async list(query?: NotificationsQuery): Promise<Notification[]> {
    const viewerUserId = query?.viewerUserId;
    if (!viewerUserId) return [];

    const res = await supabaseRest<DbNotification[]>({
      method: 'GET',
      path: '/rest/v1/notifications',
      query: {
        select:
          'id,recipient_user_id,sender_user_id,title,body,data,is_read,read_at,created_at,updated_at',
        recipient_user_id: `eq.${viewerUserId}`,
        ...(query?.onlyUnread ? { is_read: 'eq.false' } : {}),
        order: 'created_at.desc',
        ...(query?.limit ? { limit: String(query.limit) } : {}),
      },
    });

    return res.map(mapRowToNotification);
  }

  async markRead(id: string): Promise<void> {
    await supabaseRest<void>({
      method: 'PATCH',
      path: '/rest/v1/notifications',
      query: { id: `eq.${id}` },
      body: { is_read: true, read_at: new Date().toISOString() },
    });
  }

  async markAllRead(viewerUserId: string): Promise<void> {
    await supabaseRest<void>({
      method: 'PATCH',
      path: '/rest/v1/notifications',
      query: { recipient_user_id: `eq.${viewerUserId}`, is_read: 'eq.false' },
      body: { is_read: true, read_at: new Date().toISOString() },
    });
  }
}

