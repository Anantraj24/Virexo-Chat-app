import { apiClient } from './axiosClient.js';

const MSG_BASE = '/api/v1/messages';

export const sendMessageRequest = ({ conversationId, content, idempotencyKey, attachments = [] }) =>
  apiClient.post(MSG_BASE, { conversationId, content, idempotencyKey, attachments });

export const getMessageHistoryRequest = (conversationId, { cursor, limit = 50 } = {}) => {
  const query = new URLSearchParams();
  if (limit) query.append('limit', limit);
  if (cursor) query.append('cursor', cursor);
  return apiClient.get(`${MSG_BASE}/conversation/${conversationId}?${query.toString()}`);
};

export const markReadRequest = (conversationId) =>
  apiClient.post(`${MSG_BASE}/conversation/${conversationId}/read`);

export const deleteMessageRequest = (messageId) =>
  apiClient.delete(`${MSG_BASE}/${messageId}`);
