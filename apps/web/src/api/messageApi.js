import { apiClient } from './axiosClient.js';

const MSG_BASE = '/api/v1/messages';

export const sendMessageRequest = ({ conversationId, content, idempotencyKey, attachments = [], replyTo, forwardedFrom }) =>
  apiClient.post(MSG_BASE, { conversationId, content, idempotencyKey, attachments, replyTo, forwardedFrom });

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

export const editMessageRequest = (messageId, { content }) =>
  apiClient.put(`${MSG_BASE}/${messageId}`, { content });

export const deleteMessageForEveryoneRequest = (messageId) =>
  apiClient.delete(`${MSG_BASE}/${messageId}/everyone`);

export const pinMessageRequest = (messageId) =>
  apiClient.post(`${MSG_BASE}/${messageId}/pin`);

export const unpinMessageRequest = (messageId) =>
  apiClient.delete(`${MSG_BASE}/${messageId}/pin`);

export const addReactionRequest = (messageId, { emoji }) =>
  apiClient.post(`${MSG_BASE}/${messageId}/reactions`, { emoji });

export const removeReactionRequest = (messageId, { emoji }) =>
  apiClient.delete(`${MSG_BASE}/${messageId}/reactions`, { data: { emoji } });