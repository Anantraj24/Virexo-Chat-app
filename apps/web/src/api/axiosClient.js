import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach X-Request-ID
apiClient.interceptors.request.use(
  (config) => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      config.headers['X-Request-ID'] = crypto.randomUUID();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Extract error details cleanly
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const customError = {
      message: error.response?.data?.error?.message || error.message || 'An unexpected network error occurred',
      code: error.response?.data?.error?.code || 'NETWORK_ERROR',
      status: error.response?.status || 500,
      details: error.response?.data?.error?.details || null,
    };
    return Promise.reject(customError);
  }
);
