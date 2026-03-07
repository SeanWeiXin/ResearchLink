import apiClient from './client';

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  role: string;
  permissions?: {
    canUploadExcel?: boolean;
    canCreateCharts?: boolean;
    canPublishCharts?: boolean;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}

// 登录
export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await apiClient.post('/auth/login', data);
  return response.data;
};

// 注册
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
};

// 获取当前用户
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

// 更新用户资料
export const updateProfile = async (data: { avatar?: string; bio?: string }): Promise<{ user: User }> => {
  const response = await apiClient.put('/auth/profile', data);
  return response.data;
};

// 修改密码
export const changePassword = async (data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> => {
  const response = await apiClient.put('/auth/change-password', data);
  return response.data;
};

// 获取用户公开信息
export const getUserById = async (userId: string): Promise<User> => {
  const response = await apiClient.get(`/auth/${userId}`);
  return response.data;
};

// 获取用户的帖子
export const getUserPosts = async (userId: string): Promise<any[]> => {
  const response = await apiClient.get(`/auth/${userId}/posts`);
  return response.data;
};
