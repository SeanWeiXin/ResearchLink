import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Button, Table, Tag, message, Modal, Form, Select, Switch, Divider, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const ROLE_LABELS: Record<string, string> = {
  user: '探索者',
  uploader: '贡献者',
  admin: '维护者'
};

interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: {
    canUploadExcel: boolean;
    canCreateCharts: boolean;
    canPublishCharts: boolean;
  };
  createdAt: string;
}

const QuickAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/auth/admin/users');
      setUsers(response.data);
    } catch (error: any) {
      console.error('加载用户失败:', error);
      if (error.response?.status === 403) {
        message.error('权限不足，需要管理员权限');
      } else {
        message.error('加载失败，请确保后端服务正在运行');
      }
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
      await apiClient.put(`/auth/admin/users/${editingUser.id}`, {
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
        <Tag color={getRoleColor(role)}>{ROLE_LABELS[role] || role}</Tag>
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
      title: '操作',
      key: 'action',
      render: (_: any, record: UserInfo) => (
        <Button type="link" onClick={() => handleEdit(record)}>
          编辑
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
        justifyContent: 'space-between'
      }}>
        <Title level={4} style={{ margin: 0 }}>🔧 快速管理 - 无需权限</Title>
        <Button onClick={() => navigate('/')}>返回主页</Button>
      </Header>

      <Content style={{ padding: '50px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Card style={{ marginBottom: 20 }}>
            <Title level={5}>💡 使用说明</Title>
            <Text type="secondary">
              这个页面允许您直接管理用户权限，无需预先设置管理员。
              选择要提升权限的用户，将其角色改为"维护者"即可。
            </Text>
          </Card>

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
        </Form>
      </Modal>
    </Layout>
  );
};

export default QuickAdmin;
