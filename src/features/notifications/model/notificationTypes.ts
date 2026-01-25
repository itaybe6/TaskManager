export type Notification = {
  id: string;
  recipientUserId: string;
  senderUserId?: string;
  title: string;
  body?: string;
  data?: any;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationsQuery = {
  viewerUserId?: string;
  onlyUnread?: boolean;
  limit?: number;
};

