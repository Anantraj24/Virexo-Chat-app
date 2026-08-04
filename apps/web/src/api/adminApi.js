import { API_ROUTES } from '@virexo/shared';
import axiosInstance from './axiosInstance';

export const adminApi = {
  getUsers: async (params) => {
    const response = await axiosInstance.get(`${API_ROUTES.ADMIN.BASE}/users`, { params });
    return response.data;
  },
  updateUserStatus: async (id, accountStatus) => {
    const response = await axiosInstance.patch(`${API_ROUTES.ADMIN.BASE}/users/${id}/status`, { accountStatus });
    return response.data;
  },
  getReports: async (params) => {
    const response = await axiosInstance.get(`${API_ROUTES.ADMIN.BASE}/reports`, { params });
    return response.data;
  },
  updateReportStatus: async (id, status, moderatorNotes) => {
    const response = await axiosInstance.patch(`${API_ROUTES.ADMIN.BASE}/reports/${id}/status`, { status, moderatorNotes });
    return response.data;
  },
  getAuditLogs: async (params) => {
    const response = await axiosInstance.get(`${API_ROUTES.ADMIN.BASE}/audit-logs`, { params });
    return response.data;
  }
};
