import { api } from '@/api/client';
import type { Notification } from '@/types/api';

export const notificationsApi = {
  list: () =>
    api.get<{ data: Notification[]; unread: number }>('/notifications/').then((r) => r.data),

  markRead: (id: number) =>
    api.post<{ success: boolean }>(`/notifications/${id}/mark_read/`).then((r) => r.data),

  markAllRead: () =>
    api.post<{ success: boolean }>('/notifications/mark_all_read/').then((r) => r.data),
};
