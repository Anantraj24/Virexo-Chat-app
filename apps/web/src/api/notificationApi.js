import { apiClient } from './axiosClient.js';

const NOTIFICATION_BASE = '/api/v1/notifications';

export const getNotificationsRequest = ({ cursor, limit = 20 } = {}) => {
  const query = new URLSearchParams();
  if (limit) query.append('limit', limit);
  if (cursor) query.append('cursor', cursor);
  return apiClient.get(`${NOTIFICATION_BASE}?${query.toString()}`);
};

export const getUnreadNotificationCountRequest = () =>
  apiClient.get(`${NOTIFICATION_BASE}/unread-count`);

export const markNotificationAsReadRequest = (id) =>
  apiClient.post(`${NOTIFICATION_BASE}/${id}/read`);

export const markAllNotificationsAsReadRequest = () =>
  apiClient.post(`${NOTIFICATION_BASE}/mark-all-read`);
