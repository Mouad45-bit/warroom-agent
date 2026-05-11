import { api } from './client'

export async function getDashboardStats() {
    const response = await api.get('/api/dashboard/stats')
    return response.data
}

export async function getManagerDashboardStats() {
    const response = await api.get('/api/dashboard/stats/manager')
    return response.data
}

export async function getDashboardNotifications() {
    const response = await api.get('/api/dashboard/notifications')
    return response.data
}

export async function markDashboardNotificationRead(notificationId) {
    const response = await api.put(`/api/dashboard/notifications/${notificationId}/read`)
    return response.data
}
