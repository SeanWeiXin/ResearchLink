import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ [API] 响应成功:', response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ [API] 请求失败:', error.config?.url, error.response?.status);
    if (error.response?.status === 401) {
      // token 无效或过期，清除本地存储
      console.log('⚠️ [API] Token 失效，清除认证状态');
      localStorage.removeItem('token');
      // 注意：不要在这里直接跳转，让组件自己处理
    }
    return Promise.reject(error);
  }
);

export default apiClient;
