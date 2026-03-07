import apiClient from './client';

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  role: 'user' | 'admin' | 'uploader';
  permissions: {
    canUploadExcel: boolean;
    canCreateCharts: boolean;
    canPublishCharts: boolean;
  };
  createdAt: string;
}

export const getAllUsers = async (): Promise<UserInfo[]> => {
  const response = await apiClient.get('/auth/admin/users');
  return response.data;
};

export const updateUser = async (userId: string, data: {
  role?: 'user' | 'admin' | 'uploader';
  permissions?: {
    canUploadExcel?: boolean;
    canCreateCharts?: boolean;
    canPublishCharts?: boolean;
  };
}): Promise<{ message: string; user: UserInfo }> => {
  const response = await apiClient.put(`/auth/admin/users/${userId}`, data);
  return response.data;
};
