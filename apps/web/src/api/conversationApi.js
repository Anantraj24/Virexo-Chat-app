import { apiClient } from './axiosClient.js';

const CONV_BASE = '/api/v1/conversations';

export const createDirectRequest = ({ recipientId }) =>
  apiClient.post(`${CONV_BASE}/direct`, { recipientId });

export const createGroupRequest = ({ name, description, memberIds }) =>
  apiClient.post(`${CONV_BASE}/group`, { name, description, memberIds });

export const listConversationsRequest = ({ cursor, limit = 20 } = {}) => {
  const query = new URLSearchParams();
  if (limit) query.append('limit', limit);
  if (cursor) query.append('cursor', cursor);
  return apiClient.get(`${CONV_BASE}?${query.toString()}`);
};

export const getConversationRequest = (id) =>
  apiClient.get(`${CONV_BASE}/${id}`);

export const updateGroupRequest = (id, data) =>
  apiClient.patch(`${CONV_BASE}/${id}`, data);

export const addMembersRequest = (id, { memberIds }) =>
  apiClient.post(`${CONV_BASE}/${id}/members`, { memberIds });

export const removeMemberRequest = (id, userId) =>
  apiClient.delete(`${CONV_BASE}/${id}/members/${userId}`);

export const updateMemberRoleRequest = (id, userId, { role }) =>
  apiClient.patch(`${CONV_BASE}/${id}/members/${userId}/role`, { role });

export const leaveGroupRequest = (id) =>
  apiClient.post(`${CONV_BASE}/${id}/leave`);

export const transferOwnershipRequest = (id, { newOwnerId }) =>
  apiClient.post(`${CONV_BASE}/${id}/transfer-ownership`, { newOwnerId });
