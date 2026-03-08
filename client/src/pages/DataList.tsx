import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout, Card, Typography, List, Button, Space, Tag, Input, message,
  Pagination, Popconfirm, Empty, Spin, Row, Col, Statistic, Divider
} from 'antd';
import {
  SearchOutlined, EyeOutlined, DeleteOutlined,
  DatabaseOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { getMyData, deleteData } from '../api/uploads';
import type { DataItem } from '../api/uploads';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

const DataList: React.FC = () => {
  const navigate = useNavigate();
  const [dataList, setDataList] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 12,
    total: 0
  });

  useEffect(() => {
    loadData();
  }, [pagination.current, pagination.pageSize, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await getMyData({
        page: pagination.current,
        limit: pagination.pageSize,
        search: search || undefined
      });
      
      setDataList(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.totalItems
      }));
    } catch (error: any) {
      message.error('加载数据列表失败：' + (error.message || '未知错误'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleDelete = async (dataId: string) => {
    try {
      await deleteData(dataId);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error('删除失败：' + error.message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
            返回主页
          </Button>
          <Title level={4} style={{ margin: 0 }}>数据管理</Title>
        </Space>
        <Space>
          <DatabaseOutlined style={{ fontSize: 20 }} />
          <Text>共 {pagination.total} 个数据集</Text>
        </Space>
      </Header>

      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* 搜索栏 */}
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col span={8}>
                <Search
                  placeholder="搜索数据名称"
                  allowClear
                  enterButton
                  size="large"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onSearch={handleSearch}
                />
              </Col>
              <Col>
                <Button onClick={() => navigate('/upload')} type="primary" size="large">
                  上传新数据
                </Button>
              </Col>
            </Row>
          </Card>

          {/* 数据列表 */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <Spin size="large" tip="加载中..." />
            </div>
          ) : dataList.length === 0 ? (
            <Card>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={search ? '未找到匹配的数据' : '暂无数据，请上传 Excel 文件'}
              >
                {!search && (
                  <Button type="primary" onClick={() => navigate('/upload')}>
                    上传数据
                  </Button>
                )}
              </Empty>
            </Card>
          ) : (
            <>
              <List
                grid={{ gutter: 16, column: 3 }}
                dataSource={dataList}
                loading={loading}
                renderItem={(item) => (
                  <List.Item>
                    <Card
                      hoverable
                      actions={[
                        <Button
                          key="view"
                          type="link"
                          icon={<EyeOutlined />}
                          onClick={() => navigate(`/uploads/${item.id}/preview`)}
                        >
                          预览
                        </Button>,
                        <Popconfirm
                          key="delete"
                          title="确定要删除吗？"
                          description="删除后无法恢复"
                          onConfirm={() => handleDelete(item.id)}
                          okText="删除"
                          cancelText="取消"
                        >
                          <Button danger type="link" icon={<DeleteOutlined />}>
                            删除
                          </Button>
                        </Popconfirm>
                      ]}
                    >
                      <Card.Meta
                        title={
                          <Space wrap>
                            <Text ellipsis style={{ maxWidth: 300 }}>{item.excelName}</Text>
                            {item.isVerified && (
                              <Tag color="green">已验证</Tag>
                            )}
                          </Space>
                        }
                        description={
                          <div>
                            <Row gutter={8} style={{ marginBottom: 8 }}>
                              <Col span={12}>
                                <Statistic
                                  title="数据列"
                                  value={item.totalColumns}
                                  valueStyle={{ fontSize: 18 }}
                                  suffix="列"
                                />
                              </Col>
                              <Col span={12}>
                                <Statistic
                                  title="数据行"
                                  value={item.totalRows}
                                  valueStyle={{ fontSize: 18 }}
                                  suffix="行"
                                />
                              </Col>
                            </Row>
                            
                            <Divider style={{ margin: '12px 0' }} />
                            
                            <div style={{ marginBottom: 8 }}>
                              <Text type="secondary">工作表:</Text>
                              <div style={{ marginTop: 4 }}>
                                {item.sheetNames.slice(0, 3).map((name, i) => (
                                  <Tag key={i} style={{ marginBottom: 4 }}>{name}</Tag>
                                ))}
                                {item.sheetNames.length > 3 && (
                                  <Tag>+{item.sheetNames.length - 3}</Tag>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <Text type="secondary">上传时间:</Text>
                              <div style={{ marginTop: 4 }}>
                                <Text>{formatDate(item.createdAt)}</Text>
                              </div>
                            </div>
                          </div>
                        }
                      />
                    </Card>
                  </List.Item>
                )}
              />

              {/* 分页 */}
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  onChange={(page, pageSize) => {
                    setPagination(prev => ({
                      ...prev,
                      current: page,
                      pageSize: pageSize || prev.pageSize
                    }));
                  }}
                  showSizeChanger
                  showTotal={(total) => `共 ${total} 个数据集`}
                />
              </div>
            </>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default DataList;
