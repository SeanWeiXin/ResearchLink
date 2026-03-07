import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Table, Tag, Space, Button, Popconfirm, message, Empty } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getMyUploads, deleteUpload, type Upload } from '../api/uploads';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const UploadList: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      message.error('请先登录');
      navigate('/login');
      return;
    }
    loadUploads();
  }, [page]);

  const loadUploads = async () => {
    setLoading(true);
    try {
      const response = await getMyUploads({ page, limit: 10 });
      setUploads(response.uploads);
      setTotal(response.pagination.totalUploads);
    } catch (error: any) {
      message.error('加载上传记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUpload(id);
      message.success('删除成功');
      loadUploads();
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'green';
      case 'processing': return 'blue';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploaded': return '已上传';
      case 'processing': return '处理中';
      case 'processed': return '已处理';
      case 'error': return '错误';
      default: return status;
    }
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'originalName',
      key: 'originalName',
      render: (text: string, record: Upload) => (
        <Space>
          <FileTextOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '图表',
      key: 'charts',
      render: (_: any, record: Upload) => (
        <Text type="secondary">
          {record.charts?.length || 0} 个
        </Text>
      ),
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => (
        <Text type="secondary">{dayjs(createdAt).format('YYYY-MM-DD HH:mm')}</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Upload) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/uploads/${record.id}/preview`)}
            disabled={record.status !== 'processed' && record.status !== 'uploaded'}
          >
            预览
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/uploads/create-chart?uploadId=${record.id}`)}
            disabled={record.status !== 'processed'}
          >
            创建图表
          </Button>
          <Popconfirm
            title="确定要删除吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{
        background: '#fff',
        padding: '0 50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Title level={4} style={{ margin: 0 }}>我的上传</Title>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/upload')}
            disabled={!user?.permissions?.canUploadExcel}
          >
            上传 Excel
          </Button>
          <Button onClick={() => navigate('/')}>返回主页</Button>
        </Space>
      </Header>

      <Content style={{ padding: '50px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Card>
            {uploads.length === 0 && !loading ? (
              <Empty
                description="还没有上传任何文件"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/upload')}
                  disabled={!user?.permissions?.canUploadExcel}
                >
                  上传第一个 Excel 文件
                </Button>
              </Empty>
            ) : (
              <>
                <Table
                  columns={columns}
                  dataSource={uploads}
                  loading={loading}
                  rowKey="id"
                  pagination={{
                    current: page,
                    pageSize: 10,
                    total: total,
                    onChange: (p) => setPage(p),
                    showSizeChanger: false,
                    showTotal: (total) => `共 ${total} 条记录`
                  }}
                />
              </>
            )}
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default UploadList;
