import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore.js';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// ─── Request Interceptor ─────────────────────────────────────────────
// Attach Bearer token + request ID on every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    // Attach X-Request-ID
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      config.headers['X-Request-ID'] = crypto.randomUUID();
    }

    // Attach in-memory access token (never from localStorage)
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: 401 Refresh with Deduplication ────────────
// When a 401 is received, attempt a single refresh and retry.
// If multiple requests fail with 401 simultaneously, they all wait
// behind a single refresh call.

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  // Success: unwrap response.data (existing behavior)
  (response) => response.data,

  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 and not on refresh endpoint itself
    const is401 = error.response?.status === 401;
    const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');

    if (is401 && !isRefreshEndpoint && !originalRequest._retry) {
      if (isRefreshing) {
        // Another refresh is in flight — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt silent refresh (uses HttpOnly cookie)
        const refreshResponse = await apiClient.post('/api/v1/auth/refresh');
        const newAccessToken = refreshResponse.data.accessToken;

        // Update in-memory store
        useAuthStore.getState().setAuth(
          useAuthStore.getState().user,
          newAccessToken
        );

        // Resolve all queued requests with new token
        processQueue(null, newAccessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear auth state and reject all queued
        const wasAuthenticated = Boolean(useAuthStore.getState().user || useAuthStore.getState().accessToken);
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();

        const customError = {
          message: wasAuthenticated
            ? 'Session expired. Please log in again.'
            : 'Authentication required. Please sign in.',
          code: wasAuthenticated ? 'SESSION_EXPIRED' : 'UNAUTHORIZED',
          status: 401,
          details: null,
        };
        return Promise.reject(customError);
      } finally {
        isRefreshing = false;
      }
    }

    // Standard error formatting for non-401 or non-retryable errors
    const customError = {
      message: error.response?.data?.error?.message || error.message || 'An unexpected network error occurred',
      code: error.response?.data?.error?.code || 'NETWORK_ERROR',
      status: error.response?.status || 500,
      details: error.response?.data?.error?.details || null,
    };
    return Promise.reject(customError);
  }
);
