import apiClient from './client';

export interface Upload {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  metadata?: {
    sheetNames?: string[];
    columns?: Array<{
      name: string;
      type: 'date' | 'number' | 'string' | 'boolean' | 'unknown';
      format?: string;
      sample?: any;
    }>;
    rowCount?: number;
    columnCount?: number;
    dataType?: 'time_series' | 'panel_data' | 'cross_section' | 'custom';
    confidence?: number;
    previewRows?: any[];
    warnings?: string[];
    dataBlocks?: Array<{
      blockId: string;
      blockName?: string;
      startRow: number;
      endRow: number;
      rowCount: number;
    }>;
  };
  processingConfig?: {
    sheetName?: string;
    dateColumn?: string;
    dataColumns?: string[];
  };
  charts?: any[];
  createdAt: string;
}

export interface UploadResponse {
  uploads: Upload[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUploads: number;
  };
}

// 上传 Excel 文件
export const uploadExcel = async (file: File): Promise<{ upload: Upload }> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await apiClient.post('/uploads/excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// 获取我的上传列表
export const getMyUploads = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<UploadResponse> => {
  const response = await apiClient.get('/uploads/my-uploads', { params });
  return response.data;
};

// 获取上传详情
export const getUpload = async (uploadId: string): Promise<Upload> => {
  const response = await apiClient.get(`/uploads/${uploadId}`);
  return response.data;
};

// 更新处理配置
export const updateUploadConfig = async (
  uploadId: string,
  config: {
    processingConfig?: {
      sheetName?: string;
      dateColumn?: string;
      dataColumns?: string[];
    };
  }
): Promise<{ message: string; upload: Upload }> => {
  const response = await apiClient.put(`/uploads/${uploadId}/config`, config);
  return response.data;
};

// 删除上传
export const deleteUpload = async (uploadId: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/uploads/${uploadId}`);
  return response.data;
};

// 图表相关接口
export interface Chart {
  id: string;
  title: string;
  description?: string;
  chartType: 'line' | 'bar' | 'area' | 'scatter' | 'pie';
  config: {
    xField?: string;
    yFields?: string[];
    seriesField?: string;
    color?: string[];
  };
  echartsOption?: any;
  user?: {
    username: string;
    avatar?: string;
  };
  upload?: {
    originalName: string;
  };
  isPublic: boolean;
  views: number;
  publishedPosts?: any[];
  createdAt: string;
}

export interface ChartsResponse {
  charts: Chart[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCharts: number;
  };
}

// 创建图表
export const createChart = async (data: {
  uploadId: string;
  title: string;
  description?: string;
  chartType: string;
  config: any;
  echartsOption?: any;
}): Promise<Chart> => {
  const response = await apiClient.post('/charts', data);
  return response.data;
};

// 获取图表列表
export const getCharts = async (params?: {
  userId?: string;
  isPublic?: boolean;
  page?: number;
  limit?: number;
}): Promise<ChartsResponse> => {
  const response = await apiClient.get('/charts', { params });
  return response.data;
};

// 获取图表详情
export const getChart = async (chartId: string): Promise<Chart> => {
  const response = await apiClient.get(`/charts/${chartId}`);
  return response.data;
};

// 更新图表
export const updateChart = async (
  chartId: string,
  data: {
    title?: string;
    description?: string;
    config?: any;
    echartsOption?: any;
  }
): Promise<Chart> => {
  const response = await apiClient.put(`/charts/${chartId}`, data);
  return response.data;
};

// 删除图表
export const deleteChart = async (chartId: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/charts/${chartId}`);
  return response.data;
};

// 发布图表到帖子
export const publishChartToPost = async (
  chartId: string,
  postId: string
): Promise<{ message: string; post: any }> => {
  const response = await apiClient.post(`/charts/${chartId}/publish`, { postId });
  return response.data;
};

// 设置图表可见性
export const setChartVisibility = async (
  chartId: string,
  isPublic: boolean
): Promise<{ message: string; isPublic: boolean }> => {
  const response = await apiClient.put(`/charts/${chartId}/visibility`, { isPublic });
  return response.data;
};
