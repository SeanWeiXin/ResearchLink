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
    dataColumns?: Array<{
      columnIndex: number;
      displayName: string;
      originalName: string;
      unit?: string;
      source?: string;
      frequency?: string;
      previewRows?: Array<{ date: string; value: number }>;
      totalRows?: number;
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
    isVerified?: boolean;
    metadata?: any;
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
  chartType: string;
  config: any;
  thumbnail?: string;
  upload: string;
  createdBy: string;
  isPublic: boolean;
  createdAt: string;
}

// 数据管理 API
export interface DataItem {
  id: string;
  excelName: string;
  sheetNames: string[];
  columns: Array<{
    displayName: string;
    unit?: string;
    source?: string;
    frequency?: string;
    totalRows?: number;
  }>;
  totalColumns: number;
  totalRows: number;
  storagePath?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface DataListResponse {
  data: DataItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
}

// 获取用户的数据列表
export const getMyData = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<DataListResponse> => {
  const response = await apiClient.get('/data/my-data', { params });
  return response.data;
};

// 获取数据详情
export const getData = async (dataId: string): Promise<any> => {
  const response = await apiClient.get(`/data/${dataId}`);
  return response.data;
};

// 获取数据预览
export const getDataPreview = async (
  dataId: string,
  params?: { sheetName?: string; limit?: number }
): Promise<any> => {
  const response = await apiClient.get(`/data/${dataId}/preview`, { params });
  return response.data;
};

// 更新元数据
export const updateMetadata = async (
  dataId: string,
  metadata: {
    columns?: Array<{
      columnIndex: number;
      displayName?: string;
      unit?: string;
      source?: string;
      frequency?: string;
    }>;
  }
): Promise<any> => {
  const response = await apiClient.put(`/data/${dataId}/metadata`, metadata);
  return response.data;
};

// 删除数据
export const deleteData = async (dataId: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/data/${dataId}`);
  return response.data;
};

// 创建图表
export const createChart = async (
  uploadId: string,
  chartData: {
    title: string;
    description?: string;
    chartType: string;
    config: any;
    isPublic?: boolean;
  }
): Promise<any> => {
  const response = await apiClient.post('/charts', {
    upload: uploadId,
    ...chartData
  });
  return response.data;
};

// 获取图表列表
export const getCharts = async (params?: {
  page?: number;
  limit?: number;
  uploadId?: string;
}): Promise<{ charts: Chart[]; pagination: any }> => {
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
  updates: {
    title?: string;
    description?: string;
    config?: any;
    isPublic?: boolean;
  }
): Promise<any> => {
  const response = await apiClient.put(`/charts/${chartId}`, updates);
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
  postData?: {
    title?: string;
    content?: string;
  }
): Promise<any> => {
  const response = await apiClient.post(`/charts/${chartId}/publish`, postData);
  return response.data;
};
