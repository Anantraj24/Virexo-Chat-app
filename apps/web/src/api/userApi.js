import { apiClient } from './axiosClient.js';

const USERS_BASE = '/api/v1/users';

export const getProfileRequest = () =>
  apiClient.get(`${USERS_BASE}/profile`);

export const updateProfileRequest = (profileData) =>
  apiClient.patch(`${USERS_BASE}/profile`, profileData);

export const updatePrivacyRequest = (privacySettings) =>
  apiClient.patch(`${USERS_BASE}/privacy`, privacySettings);

export const updateNotificationsRequest = (notificationSettings) =>
  apiClient.patch(`${USERS_BASE}/notifications`, notificationSettings);

export const checkUsernameRequest = (username) =>
  apiClient.get(`${USERS_BASE}/check-username?username=${encodeURIComponent(username)}`);

export const searchUsersRequest = (query) =>
  apiClient.get(`${USERS_BASE}/search?q=${encodeURIComponent(query)}`);

export const getUserProfileRequest = (userIdOrUsername) =>
  apiClient.get(`${USERS_BASE}/${encodeURIComponent(userIdOrUsername)}`);
