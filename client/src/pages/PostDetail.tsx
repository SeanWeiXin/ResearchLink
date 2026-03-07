import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Avatar, Input, Button, Space, message, Divider, Modal, Tag, Timeline } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { EyeOutlined, HeartOutlined, StarOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Post as PostType } from '../api/posts';
import { getPost, addComment, deleteComment, toggleLike, toggleFavorite, deletePost } from '../api/posts';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [post, setPost] = useState<PostType | null>(null);
  const [loading, setLoading] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) loadPost();
  }, [id]);

  const loadPost = async () => {
    setLoading(true);
    try {
      const data = await getPost(id!);
      setPost(data);
    } catch (error: any) {
      message.error('加载帖子失败');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentContent.trim()) {
      message.error('请输入评论内容');
      return;
    }

    if (!isAuthenticated) {
      message.error('请先登录');
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      await addComment(id!, { content: commentContent });
      message.success('评论成功');
      setCommentContent('');
      loadPost();
    } catch (error: any) {
      message.error('评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      message.error('请先登录');
      navigate('/login');
      return;
    }

    try {
      const response = await toggleLike(id!);
      setPost(prev => prev ? { ...prev, likes: Array(response.likes).fill(null) } : null);
      message.success(response.isLiked ? '点赞成功' : '已取消点赞');
    } catch (error: any) {
      message.error('操作失败');
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      message.error('请先登录');
      navigate('/login');
      return;
    }

    try {
      const response = await toggleFavorite(id!);
      setPost(prev => prev ? { ...prev, favorites: Array(response.favorites).fill(null) } : null);
      message.success(response.isFavorited ? '收藏成功' : '已取消收藏');
    } catch (error: any) {
      message.error('操作失败');
    }
  };

  const handleDelete = async () => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个帖子吗？',
      onOk: async () => {
        try {
          await deletePost(id!);
          message.success('删除成功');
          navigate('/');
        } catch (error: any) {
          message.error(error.response?.data?.message || '删除失败');
        }
      }
    });
  };

  if (loading || !post) {
    return (
      <Layout style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text>加载中...</Text>
      </Layout>
    );
  }

  const isLiked = post.likes?.includes(user?.id!);
  const isFavorited = post.favorites?.includes(user?.id!);
  const isAuthor = user?.id === post.author?._id;
  const isMaintainer = user?.role === 'admin';

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{
        background: '#fff',
        padding: '0 50px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Button onClick={() => navigate('/')}>← 返回</Button>
      </Header>

      <Content style={{ padding: '50px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Card>
            <div style={{ marginBottom: 20 }}>
              <Title level={2}>{post.title}</Title>
              <Space style={{ marginBottom: 20 }}>
                <Tag color="blue">{post.category}</Tag>
                {post.tags?.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
              <Space style={{ marginBottom: 20 }}>
                <Avatar src={post.author?.avatar || undefined} size={40}>
                  {post.author?.username[0]}
                </Avatar>
                <div>
                  <div><Text strong>{post.author?.username}</Text></div>
                  <div><Text type="secondary">{dayjs(post.createdAt).fromNow()}</Text></div>
                </div>
              </Space>
              <Divider />
              <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
                {post.content}
              </Paragraph>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button icon={<EyeOutlined />} onClick={handleLike} type={isLiked ? 'primary' : 'default'}>
                  {post.likes?.length || 0}
                </Button>
                <Button icon={<StarOutlined />} onClick={handleFavorite} type={isFavorited ? 'primary' : 'default'}>
                  {post.favorites?.length || 0}
                </Button>
                <Text type="secondary">👁️ {post.views}</Text>
              </Space>

              {isMaintainer && (
                <Space>
                  <Button icon={<DeleteOutlined />} danger onClick={handleDelete}>
                    删除
                  </Button>
                </Space>
              )}
            </div>
          </Card>

          {/* 评论区 */}
          <Card style={{ marginTop: 20 }} title={`评论 (${post.comments?.length || 0})`}>
            {post.comments?.length > 0 ? (
              <Timeline
                items={post.comments.map((comment) => ({
                  color: 'blue',
                  children: (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                        <Avatar src={comment.author?.avatar || undefined} size={28} style={{ marginRight: 8 }}>
                          {comment.author?.username[0]}
                        </Avatar>
                        <Text strong>{comment.author?.username}</Text>
                        <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12 }}>
                          {dayjs(comment.createdAt).fromNow()}
                        </Text>
                      </div>
                      <div style={{ marginBottom: 8 }}>{comment.content}</div>
                      {(user?.id === comment.author?._id || isMaintainer) && (
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={async () => {
                            try {
                              await deleteComment(id!, comment._id);
                              message.success('删除成功');
                              loadPost();
                            } catch (error: any) {
                              message.error(error.response?.data?.message || '删除失败');
                            }
                          }}
                        >
                          删除
                        </Button>
                      )}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Text type="secondary">暂无评论，快来抢沙发吧</Text>
            )}

            <Divider />

            <div>
              <TextArea
                rows={4}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder={isAuthenticated ? '写下你的评论...' : '请先登录后评论'}
                disabled={!isAuthenticated}
              />
              <Button
                type="primary"
                onClick={handleSubmitComment}
                loading={submitting}
                disabled={!isAuthenticated || !commentContent.trim()}
                style={{ marginTop: 10 }}
              >
                发表评论
              </Button>
            </div>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default PostDetail;
