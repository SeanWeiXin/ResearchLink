import apiClient from './client';

export interface Post {
  _id: string;
  title: string;
  content: string;
  author: {
    _id: string;
    username: string;
    avatar?: string;
  };
  category: 'blog' | 'user' | 'question' | 'share';
  tags: string[];
  views: number;
  likes: string[];
  favorites: string[];
  comments: Comment[];
  charts?: any[];
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  author: {
    _id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  parentComment?: string;
  likes: number;
  createdAt: string;
}

export interface PostsResponse {
  posts: Post[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalPosts: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 获取帖子列表
export const getPosts = async (params?: {
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}): Promise<PostsResponse> => {
  const response = await apiClient.get('/posts', { params });
  return response.data;
};

// 置顶/取消置顶帖子
export const togglePin = async (postId: string, isPinned?: boolean): Promise<{ message: string; isPinned: boolean }> => {
  const response = await apiClient.put(`/posts/${postId}/pin`, { isPinned });
  return response.data;
};

// 获取单个帖子
export const getPost = async (postId: string): Promise<Post> => {
  const response = await apiClient.get(`/posts/${postId}`);
  return response.data;
};

// 创建帖子
export const createPost = async (data: {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}): Promise<Post> => {
  const response = await apiClient.post('/posts', data);
  return response.data;
};

// 更新帖子
export const updatePost = async (postId: string, data: {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
}): Promise<Post> => {
  const response = await apiClient.put(`/posts/${postId}`, data);
  return response.data;
};

// 删除帖子
export const deletePost = async (postId: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/posts/${postId}`);
  return response.data;
};

// 添加评论
export const addComment = async (postId: string, data: {
  content: string;
  parentCommentId?: string;
}): Promise<Comment> => {
  const response = await apiClient.post(`/posts/${postId}/comments`, data);
  return response.data;
};

// 删除评论
export const deleteComment = async (postId: string, commentId: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/posts/${postId}/comments/${commentId}`);
  return response.data;
};

// 点赞/取消点赞
export const toggleLike = async (postId: string): Promise<{ likes: number; isLiked: boolean }> => {
  const response = await apiClient.post(`/posts/${postId}/like`);
  return response.data;
};

// 收藏/取消收藏
export const toggleFavorite = async (postId: string): Promise<{ favorites: number; isFavorited: boolean }> => {
  const response = await apiClient.post(`/posts/${postId}/favorite`);
  return response.data;
};

// 获取用户的收藏
export const getUserFavorites = async (userId: string, page?: number, limit?: number): Promise<PostsResponse> => {
  const response = await apiClient.get(`/posts/user/${userId}/favorites`, { params: { page, limit } });
  return response.data;
};
