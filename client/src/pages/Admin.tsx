import React, { useState, useEffect } from 'react';
import { Layout, Table, Card, Avatar, Typography, Tag, Space, Button, Modal, Form, Switch, Select, message, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getAllUsers, updateUser, type UserInfo } from '../api/admin';
import { useAuthStore } from '../store/authStore';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const ROLE_LABELS: Record<string, string> = {
  user: '探索者',
  uploader: '贡献者',
  admin: '维护者'
};

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== 'admin') {
      message.error('需要管理员权限');
      navigate('/');
      return;
    }
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error: any) {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: UserInfo) => {
    setEditingUser(user);
    form.setFieldsValue({
      role: user.role,
      canUploadExcel: user.permissions.canUploadExcel,
      canCreateCharts: user.permissions.canCreateCharts,
      canPublishCharts: user.permissions.canPublishCharts,
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    if (!editingUser) return;

    try {
      await updateUser(editingUser.id, {
        role: values.role,
        permissions: {
          canUploadExcel: values.canUploadExcel,
          canCreateCharts: values.canCreateCharts,
          canPublishCharts: values.canPublishCharts,
        },
      });
      message.success('更新成功');
      setModalVisible(false);
      loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || '更新失败');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'red';
      case 'uploader': return 'blue';
      default: return 'gray';
    }
  };

  const columns = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: UserInfo) => (
        <Space>
          <Avatar src={record.avatar || undefined}>{username[0]}</Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>{username}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>{ROLE_LABELS[role]}</Tag>
      ),
    },
    {
      title: '权限',
      key: 'permissions',
      render: (_: any, record: UserInfo) => (
        <Space size="small" wrap>
          {record.permissions.canUploadExcel && <Tag color="green">上传</Tag>}
          {record.permissions.canCreateCharts && <Tag color="cyan">图表</Tag>}
          {record.permissions.canPublishCharts && <Tag color="purple">发布</Tag>}
          {!record.permissions.canUploadExcel && 
           !record.permissions.canCreateCharts && 
           !record.permissions.canPublishCharts && (
            <Text type="secondary" style={{ fontSize: 12 }}>无特殊权限</Text>
          )}
        </Space>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => (
        <Text type="secondary">{new Date(createdAt).toLocaleDateString('zh-CN')}</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: UserInfo) => (
        <Button 
          type="link" 
          onClick={() => handleEdit(record)}
          disabled={record.role === 'admin' && currentUser?.id !== record.id}
        >
          {record.role === 'admin' && currentUser?.id === record.id ? '查看' : '编辑'}
        </Button>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{
        background: '#fff',
        padding: '0 50px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Title level={4} style={{ margin: 0, marginRight: 20 }}>用户管理</Title>
        <Button onClick={() => navigate('/')}>返回主页</Button>
      </Header>

      <Content style={{ padding: '50px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Card>
            <Table
              columns={columns}
              dataSource={users}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </div>
      </Content>

      <Modal
        title={`编辑用户：${editingUser?.username}`}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Divider orientation="left">角色设置</Divider>
          <Form.Item
            name="role"
            label="用户角色"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="user">探索者</Option>
              <Option value="uploader">贡献者</Option>
              <Option value="admin">维护者</Option>
            </Select>
          </Form.Item>

          <Divider orientation="left">权限设置</Divider>
          <Form.Item
            name="canUploadExcel"
            label="上传 Excel"
            valuePropName="checked"
          >
            <Switch checkedChildren="允许" unCheckedChildren="禁止" />
          </Form.Item>

          <Form.Item
            name="canCreateCharts"
            label="创建图表"
            valuePropName="checked"
          >
            <Switch checkedChildren="允许" unCheckedChildren="禁止" />
          </Form.Item>

          <Form.Item
            name="canPublishCharts"
            label="发布图表"
            valuePropName="checked"
          >
            <Switch checkedChildren="允许" unCheckedChildren="禁止" />
          </Form.Item>

          <Text type="secondary" style={{ fontSize: 12 }}>
            提示：上传 Excel 权限允许用户上传和解析 Excel 文件；创建图表权限允许用户生成可视化图表；发布图表权限允许用户将图表发布到论坛。
          </Text>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Admin;
