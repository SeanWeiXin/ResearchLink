import React, { useState, useEffect } from 'react';
import { Layout, Card, Tag, Input, Select, Button, Space, Typography, message, Avatar, Empty, Dropdown, Menu, Row, Col, Popconfirm, Divider } from 'antd';
import { SearchOutlined, PlusOutlined, UserOutlined, LogoutOutlined, LikeOutlined, StarOutlined, MessageOutlined, PushpinOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Post } from '../api/posts';
import { getPosts, togglePin } from '../api/posts';
import { useAuthStore } from '../store/authStore';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('isPinned');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    loadPosts();
  }, [category, sortBy, page]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await getPosts({
        category: category !== 'all' ? category : undefined,
        search: search || undefined,
        page,
        limit: 20,
        sortBy,
        order: 'desc'
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

  const handlePin = async (e: React.MouseEvent, postId: string, currentPinned: boolean) => {
    e.stopPropagation();
    try {
      await togglePin(postId, !currentPinned);
      message.success(currentPinned ? '已取消置顶' : '已置顶');
      loadPosts();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
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
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
      danger: true,
    },
  ];

  const isMaintainer = user?.role === 'admin';

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
              <Button onClick={() => navigate('/data')} icon={<DatabaseOutlined />}>
                数据管理
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
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* 标题和筛选栏 */}
          <div style={{ 
            marginBottom: 20, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <Title level={2} style={{ margin: 0 }}>最新讨论</Title>
            <Space wrap>
              <Select
                value={category}
                onChange={setCategory}
                style={{ width: 120 }}
                placeholder="分类"
              >
                <Option value="all">全部</Option>
                <Option value="blog">博客</Option>
                <Option value="user">分享</Option>
                <Option value="question">提问</Option>
                <Option value="share">资源</Option>
              </Select>
              <Select
                value={sortBy}
                onChange={setSortBy}
                style={{ width: 120 }}
                placeholder="排序"
              >
                <Option value="isPinned">默认</Option>
                <Option value="likes">点赞最多</Option>
                <Option value="favorites">收藏最多</Option>
                <Option value="createdAt">最新发布</Option>
                <Option value="views">浏览最多</Option>
              </Select>
            </Space>
          </div>

          {/* 帖子列表 - 响应式多列布局 */}
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
            <Row gutter={[16, 16]}>
              {posts.map((post) => (
                <Col xs={24} sm={12} md={12} lg={8} xl={6} key={post._id}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/post/${post._id}`)}
                    style={{ 
                      height: '100%',
                      position: 'relative',
                      borderTop: post.isPinned ? '3px solid #ff4d4f' : 'none'
                    }}
                    cover={
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: '16px' }}
                      >
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Space>
                            <Avatar src={post.author?.avatar || undefined} size={40}>
                              {post.author?.username[0]}
                            </Avatar>
                            <Text strong style={{ fontSize: 14 }}>{post.author?.username}</Text>
                          </Space>
                          {isMaintainer && (
                            <Popconfirm
                              title={post.isPinned ? "确定取消置顶吗？" : "确定置顶吗？"}
                              onConfirm={(e: any) => handlePin(e, post._id, post.isPinned)}
                              okText="确定"
                              cancelText="取消"
                            >
                              <Button
                                type="text"
                                icon={<PushpinOutlined style={{ 
                                  color: post.isPinned ? '#ff4d4f' : '#999',
                                  transform: post.isPinned ? 'rotate(0deg)' : 'rotate(45deg)'
                                }} />}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </Popconfirm>
                          )}
                        </Space>
                      </div>
                    }
                  >
                    <Card.Meta
                      title={
                        <Space wrap style={{ width: '100%' }}>
                          {post.isPinned && <Tag color="red">置顶</Tag>}
                          <Tag color="blue">{post.category}</Tag>
                          <Text ellipsis style={{ maxWidth: 200, fontSize: 15, fontWeight: 'bold' }}>
                            {post.title}
                          </Text>
                        </Space>
                      }
                      description={
                        <div>
                          {post.tags?.slice(0, 3).map(tag => (
                            <Tag key={tag} style={{ marginBottom: 4 }}>{tag}</Tag>
                          ))}
                          <Paragraph
                            ellipsis={{ rows: 2 }}
                            style={{ 
                              color: '#666', 
                              fontSize: 13,
                              margin: '8px 0',
                              height: 44
                            }}
                          >
                            {post.content}
                          </Paragraph>
                          <Divider style={{ margin: '8px 0' }} />
                          <Space wrap size="small">
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <LikeOutlined /> {post.likes?.length || 0}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <StarOutlined /> {post.favorites?.length || 0}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <MessageOutlined /> {post.comments?.length || 0}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              👁️ {post.views}
                            </Text>
                          </Space>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          {/* 分页 */}
          {posts.length > 0 && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: 30,
              padding: '20px 0'
            }}>
              <Button 
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                style={{ marginRight: 10 }}
              >
                上一页
              </Button>
              <Text>第 {page} 页 / 共 {Math.ceil(total / 20)} 页</Text>
              <Button 
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage(page + 1)}
                style={{ marginLeft: 10 }}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default Home;
