import { API_ROUTES } from '@virexo/shared';
import { apiClient } from './axiosClient';

export const reportApi = {
  createReport: async (data) => {
    const response = await apiClient.post(`${API_ROUTES.REPORTS}`, data);
    return response.data;
  },
};
