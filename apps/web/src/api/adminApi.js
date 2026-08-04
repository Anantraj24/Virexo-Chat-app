import { API_ROUTES } from '@virexo/shared';
import { apiClient } from './axiosClient';

export const adminApi = {
  getUsers: async (params) => {
    const response = await apiClient.get(`${API_ROUTES.ADMIN}/users`, { params });
    return response.data;
  },
  updateUserStatus: async (id, accountStatus) => {
    const response = await apiClient.patch(`${API_ROUTES.ADMIN}/users/${id}/status`, { accountStatus });
    return response.data;
  },
  getReports: async (params) => {
    const response = await apiClient.get(`${API_ROUTES.ADMIN}/reports`, { params });
    return response.data;
  },
  updateReportStatus: async (id, status, moderatorNotes) => {
    const response = await apiClient.patch(`${API_ROUTES.ADMIN}/reports/${id}/status`, { status, moderatorNotes });
    return response.data;
  },
  getAuditLogs: async (params) => {
    const response = await apiClient.get(`${API_ROUTES.ADMIN}/audit-logs`, { params });
    return response.data;
  },
};
