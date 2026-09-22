import { apiClient } from './axiosClient.js';

const AUTH_BASE = '/api/v1/auth';

export const signupRequest = ({ username, email, password }) =>
  apiClient.post(`${AUTH_BASE}/signup`, { username, email, password });

export const loginRequest = ({ identifier, password, rememberMe = true }) =>
  apiClient.post(`${AUTH_BASE}/login`, { identifier, password, rememberMe });

export const refreshRequest = () =>
  apiClient.post(`${AUTH_BASE}/refresh`);

export const logoutRequest = () =>
  apiClient.post(`${AUTH_BASE}/logout`);

export const logoutAllRequest = () =>
  apiClient.post(`${AUTH_BASE}/logout-all`);

export const getMeRequest = () =>
  apiClient.get(`${AUTH_BASE}/me`);

export const verifyEmailRequest = ({ token }) =>
  apiClient.post(`${AUTH_BASE}/verify-email`, { token });

export const resendVerificationRequest = () =>
  apiClient.post(`${AUTH_BASE}/resend-verification`);

export const forgotPasswordRequest = ({ email }) =>
  apiClient.post(`${AUTH_BASE}/forgot-password`, { email });

export const resetPasswordRequest = ({ token, password }) =>
  apiClient.post(`${AUTH_BASE}/reset-password`, { token, password });
