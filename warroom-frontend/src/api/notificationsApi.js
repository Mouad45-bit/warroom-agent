import { api } from './client';

export async function getNotifications({ unreadOnly = true } = {}) {
    const response = await api.get('/api/dashboard/notifications', {
        params: { unreadOnly },
    });
    return response.data;
}

export async function markNotificationRead(notificationId) {
    const response = await api.put(`/api/dashboard/notifications/${notificationId}/read`);
    return response.data;
}