import { API_ROUTES } from '@virexo/shared';
import axiosInstance from './axiosInstance';

export const reportApi = {
  createReport: async (reportData) => {
    const response = await axiosInstance.post(API_ROUTES.REPORTS.BASE, reportData);
    return response.data;
  },
};
