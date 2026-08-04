import { apiClient } from './axiosClient';

export const uploadMediaRequest = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/api/v1/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
  
  return response; // response interceptor already unwraps response.data
};
