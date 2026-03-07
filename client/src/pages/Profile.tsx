import React, { useState, useEffect } from 'react';
import { Layout, Card, Tabs, Avatar, Typography, List, Button, Space, message, Form, Input, Statistic, Tag, Dropdown } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { User } from '../api/auth';
import { getUserById, getUserPosts, updateProfile, changePassword } from '../api/auth';
import { getUserFavorites } from '../api/posts';
import { useAuthStore } from '../store/authStore';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, logout } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form] = Form.useForm();

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
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
      danger: true,
    },
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      message.error('请先登录');
      navigate('/login');
      return;
    }
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const userData = await getUserById(currentUser.id);
      setUser(userData);
      form.setFieldsValue({
        bio: userData.bio,
        avatar: userData.avatar
      });

      const postsData = await getUserPosts(currentUser.id);
      setPosts(postsData);

      const favoritesData = await getUserFavorites(currentUser.id, 1, 10);
      setFavorites(favoritesData.posts);
    } catch (error: any) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (values: any) => {
    try {
      await updateProfile(values);
      message.success('更新成功');
      setEditMode(false);
      loadUserData();
    } catch (error: any) {
      message.error('更新失败');
    }
  };

  const handleChangePassword = async (values: any) => {
    try {
      await changePassword(values);
      message.success('密码修改成功');
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || '修改失败');
    }
  };

  const ROLE_LABELS: Record<string, string> = {
    user: '探索者',
    uploader: '贡献者',
    admin: '维护者'
  };

  if (!user) return null;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{
        background: '#fff',
        padding: '0 50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Space>
          <Button onClick={() => navigate('/')}>← 返回</Button>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
            <Button>
              <Space>
                <Avatar size="small" src={user.avatar || undefined}>
                  {user.username[0]}
                </Avatar>
                {user.username}
              </Space>
            </Button>
          </Dropdown>
        </Space>
      </Header>

      <Content style={{ padding: '50px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* 用户信息卡片 */}
          <Card style={{ marginBottom: 20 }}>
            <Space size="large">
              <Avatar src={user.avatar || undefined} size={100}>
                {user.username[0]}
              </Avatar>
              <div>
                <Title level={2} style={{ margin: 0 }}>{user.username}</Title>
                <Text type="secondary">{user.email}</Text>
                <div style={{ marginTop: 10 }}>
                  <Tag color="blue">{ROLE_LABELS[user.role] || user.role}</Tag>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    {user.permissions?.canUploadExcel && <Tag color="green" style={{ marginRight: 4 }}>上传</Tag>}
                    {user.permissions?.canCreateCharts && <Tag color="cyan" style={{ marginRight: 4 }}>图表</Tag>}
                    {user.permissions?.canPublishCharts && <Tag color="purple" style={{ marginRight: 4 }}>发布</Tag>}
                    {!user.permissions?.canUploadExcel && 
                     !user.permissions?.canCreateCharts && 
                     !user.permissions?.canPublishCharts && (
                      <Text type="secondary">暂无特殊权限</Text>
                    )}
                  </div>
                </div>
              </div>
            </Space>
          </Card>

          <Tabs
            items={[
              {
                key: 'posts',
                label: `我的帖子 (${posts.length})`,
                children: (
                  <List
                    loading={loading}
                    dataSource={posts}
                    renderItem={(post: any) => (
                      <List.Item>
                        <Card
                          hoverable
                          onClick={() => navigate(`/post/${post._id}`)}
                          style={{ width: '100%' }}
                        >
                          <Card.Meta
                            title={post.title}
                            description={
                              <Space>
                                <Text type="secondary">👁️ {post.views}</Text>
                                <Text type="secondary">❤️ {post.likes?.length}</Text>
                                <Text type="secondary">💬 {post.comments?.length}</Text>
                              </Space>
                            }
                          />
                        </Card>
                      </List.Item>
                    )}
                  />
                )
              },
              {
                key: 'favorites',
                label: `我的收藏 (${favorites.length})`,
                children: (
                  <List
                    loading={loading}
                    dataSource={favorites}
                    renderItem={(post: any) => (
                      <List.Item>
                        <Card
                          hoverable
                          onClick={() => navigate(`/post/${post._id}`)}
                          style={{ width: '100%' }}
                        >
                          <Card.Meta
                            title={post.title}
                            description={post.content?.substring(0, 100)}
                          />
                        </Card>
                      </List.Item>
                    )}
                  />
                )
              },
              {
                key: 'settings',
                label: '个人设置',
                children: (
                  <Card title="编辑资料">
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={handleUpdateProfile}
                      disabled={!editMode}
                    >
                      <Form.Item
                        name="avatar"
                        label="头像 URL"
                      >
                        <Input placeholder="输入头像 URL" />
                      </Form.Item>

                      <Form.Item
                        name="bio"
                        label="个人简介"
                        rules={[{ max: 500, message: '最多 500 个字符' }]}
                      >
                        <TextArea rows={4} placeholder="介绍一下自己..." />
                      </Form.Item>

                      <Form.Item>
                        <Space>
                          {editMode ? (
                            <>
                              <Button type="primary" htmlType="submit">
                                保存
                              </Button>
                              <Button onClick={() => setEditMode(false)}>
                                取消
                              </Button>
                            </>
                          ) : (
                            <Button onClick={() => setEditMode(true)}>
                              编辑
                            </Button>
                          )}
                        </Space>
                      </Form.Item>
                    </Form>
                  </Card>
                )
              },
              {
                key: 'security',
                label: '账户安全',
                children: (
                  <Card title="修改密码">
                    <Form
                      layout="vertical"
                      onFinish={handleChangePassword}
                    >
                      <Form.Item
                        name="currentPassword"
                        label="当前密码"
                        rules={[{ required: true, message: '请输入当前密码' }]}
                      >
                        <Input.Password />
                      </Form.Item>

                      <Form.Item
                        name="newPassword"
                        label="新密码"
                        rules={[
                          { required: true, message: '请输入新密码' },
                          { min: 6, message: '密码至少 6 个字符' }
                        ]}
                      >
                        <Input.Password />
                      </Form.Item>

                      <Form.Item>
                        <Button type="primary" htmlType="submit">
                          修改密码
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                )
              }
            ]}
          />
        </div>
      </Content>
    </Layout>
  );
};

export default Profile;
