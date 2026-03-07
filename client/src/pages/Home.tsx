import React, { useState, useEffect } from 'react';
import { Layout, List, Card, Tag, Input, Select, Button, Space, Typography, message, Avatar, Empty, Dropdown, Menu } from 'antd';
import { SearchOutlined, PlusOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Post } from '../api/posts';
import { getPosts } from '../api/posts';
import { useAuthStore } from '../store/authStore';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    loadPosts();
  }, [category, page]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await getPosts({
        category: category !== 'all' ? category : undefined,
        search: search || undefined,
        page,
        limit: 10
      });
      setPosts(response.posts);
      setTotal(response.pagination.totalPosts);
    } catch (error: any) {
      console.error('加载帖子失败:', error);
      message.error('加载帖子失败，请检查网络连接或稍后重试');
      setPosts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadPosts();
  };

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'uploads',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>,
      label: '我的上传',
      onClick: () => navigate('/uploads'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'permissions',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>,
      label: '权限管理',
      onClick: () => navigate('/quick-admin'),
    },
    {
      key: 'admin',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>,
      label: '管理后台',
      onClick: () => navigate('/admin'),
      disabled: user?.role !== 'admin',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
        padding: '0 50px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#667eea' }}>
          🚀 ResearchLink
        </div>
        <Space>
          <Input.Search
            placeholder="搜索帖子"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
          {isAuthenticated ? (
            <>
              <Button onClick={() => navigate('/new-post')} icon={<PlusOutlined />}>
                发帖
              </Button>
              <Button onClick={() => navigate('/upload')} type="primary">
                Excel 分析
              </Button>
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                <Button>
                  <Space>
                    <Avatar size="small" src={user?.avatar || undefined}>
                      {user?.username?.[0]}
                    </Avatar>
                    {user?.username}
                  </Space>
                </Button>
              </Dropdown>
            </>
          ) : (
            <Button type="primary" onClick={() => navigate('/login')}>
              登录/注册
            </Button>
          )}
        </Space>
      </Header>

      <Content style={{ padding: '50px', background: '#f0f2f5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2}>最新讨论</Title>
            <Select
              value={category}
              onChange={setCategory}
              style={{ width: 150 }}
            >
              <Option value="all">全部</Option>
              <Option value="blog">博客</Option>
              <Option value="user">分享</Option>
              <Option value="question">提问</Option>
              <Option value="share">资源</Option>
            </Select>
          </div>

          {posts.length === 0 && !loading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '100px 0',
              background: '#fff',
              borderRadius: 8
            }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>💬</div>
              <Title level={3}>暂无帖子</Title>
              <Text type="secondary">
                {isAuthenticated ? '快来发布第一个帖子吧！' : '登录后即可浏览和发布帖子'}
              </Text>
              {!isAuthenticated && (
                <div style={{ marginTop: 20 }}>
                  <Button type="primary" onClick={() => navigate('/login')}>
                    登录/注册
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <List
              loading={loading}
              itemLayout="vertical"
              dataSource={posts}
              pagination={{
                current: page,
                pageSize: 10,
                total: total,
                onChange: (p) => setPage(p)
              }}
              renderItem={(post) => (
                <List.Item>
                  <Card
                    hoverable
                    onClick={() => navigate(`/post/${post._id}`)}
                    style={{ width: '100%' }}
                  >
                    <Card.Meta
                      avatar={<Avatar src={post.author?.avatar || undefined} size={50}>{post.author?.username[0]}</Avatar>}
                      title={<Text style={{ fontSize: 18, fontWeight: 'bold' }}>{post.title}</Text>}
                      description={
                        <div>
                          <Space style={{ marginBottom: 10 }}>
                            <Tag color="blue">{post.category}</Tag>
                            {post.tags?.map(tag => (
                              <Tag key={tag}>{tag}</Tag>
                            ))}
                          </Space>
                          <div style={{ color: '#666', marginBottom: 10 }}>
                            {post.content.substring(0, 200)}...
                          </div>
                          <Space>
                            <Text type="secondary">👤 {post.author?.username}</Text>
                            <Text type="secondary">👁️ {post.views}</Text>
                            <Text type="secondary">❤️ {post.likes?.length || 0}</Text>
                            <Text type="secondary">⭐ {post.favorites?.length || 0}</Text>
                            <Text type="secondary">💬 {post.comments?.length || 0}</Text>
                          </Space>
                        </div>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default Home;
