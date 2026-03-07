import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout, Card, Typography, Button, Space, Spin, Alert, Tag,
  Divider, Modal, Form, Input, message, Popconfirm, Row, Col, Select
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined,
  ShareAltOutlined, EyeOutlined, LikeOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { getChart, updateChart, deleteChart, publishChartToPost, type Chart } from '../api/uploads';
import { useAuthStore } from '../store/authStore';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ChartDetail: React.FC = () => {
  const { chartId } = useParams<{ chartId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [chart, setChart] = useState<Chart | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [form] = Form.useForm();
  const chartRef = useRef<ReactECharts>(null);

  useEffect(() => {
    if (chartId) {
      loadChart(chartId);
    }
  }, [chartId]);

  const loadChart = async (id: string) => {
    setLoading(true);
    try {
      const data = await getChart(id);
      setChart(data);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载图表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (values: any) => {
    if (!chartId) return;

    try {
      const updated = await updateChart(chartId, {
        title: values.title,
        description: values.description,
      });
      setChart(updated);
      message.success('更新成功');
      setEditModalVisible(false);
    } catch (error: any) {
      message.error('更新失败');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!chartId) return;

    try {
      await deleteChart(chartId);
      message.success('删除成功');
      navigate('/uploads');
    } catch (error: any) {
      message.error('删除失败');
      console.error(error);
    }
  };

  const handlePublish = async (values: any) => {
    if (!chartId) return;

    try {
      await publishChartToPost(chartId, values.postId);
      message.success('发布成功');
      setPublishModalVisible(false);
      loadChart(chartId);
    } catch (error: any) {
      message.error(error.response?.data?.message || '发布失败');
      console.error(error);
    }
  };

  const getEChartsOption = () => {
    if (!chart?.echartsOption) return {};

    return {
      ...chart.echartsOption,
      title: {
        ...chart.echartsOption.title,
        text: chart.title
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: chart.chartType === 'pie' ? 'shadow' : 'line'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      }
    };
  };

  const getChartTypeIcon = (type: string) => {
    switch (type) {
      case 'line': return '📈';
      case 'bar': return '📊';
      case 'area': return '📉';
      case 'scatter': return '⚬';
      case 'pie': return '🥧';
      default: return '📊';
    }
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        <Content style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh'
        }}>
          <Spin size="large" tip="加载中..." />
        </Content>
      </Layout>
    );
  }

  if (!chart) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        <Content style={{ padding: '50px' }}>
          <Alert
            type="error"
            message="图表不存在"
            description="请检查图表 ID 是否正确"
          />
          <Button type="primary" onClick={() => navigate('/uploads')} style={{ marginTop: 20 }}>
            返回
          </Button>
        </Content>
      </Layout>
    );
  }

  const isOwner = isAuthenticated && user?.id === chart.user?._id;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{
        background: '#fff',
        padding: '0 50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/uploads')}>
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {getChartTypeIcon(chart.chartType)} {chart.title}
          </Title>
        </Space>
        <Space>
          <Tag color={chart.isPublic ? 'green' : 'gray'}>
            {chart.isPublic ? '公开' : '私有'}
          </Tag>
          {isOwner && (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  form.setFieldsValue({
                    title: chart.title,
                    description: chart.description,
                  });
                  setEditModalVisible(true);
                }}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定要删除吗？"
                onConfirm={handleDelete}
                okText="确定"
                cancelText="取消"
              >
                <Button danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      </Header>

      <Content style={{ padding: '50px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Row gutter={16}>
            {/* 左侧：图表展示 */}
            <Col span={18}>
              <Card style={{ marginBottom: 20 }}>
                <ReactECharts
                  ref={chartRef}
                  option={getEChartsOption()}
                  style={{ height: 500 }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={true}
                />
              </Card>

              {/* 图表信息 */}
              <Card title="图表信息">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text strong>创建者：</Text>
                    <Space>
                      <Text>{chart.user?.username}</Text>
                    </Space>
                  </div>
                  <div>
                    <Text strong>数据来源：</Text>
                    <Text>{chart.upload?.originalName}</Text>
                  </div>
                  <div>
                    <Text strong>创建时间：</Text>
                    <Text>{new Date(chart.createdAt).toLocaleString('zh-CN')}</Text>
                  </div>
                  <div>
                    <Text strong>浏览量：</Text>
                    <Text>{chart.views} 次</Text>
                  </div>
                  {chart.description && (
                    <div>
                      <Text strong>描述：</Text>
                      <Paragraph style={{ marginTop: 8 }}>{chart.description}</Paragraph>
                    </div>
                  )}
                </Space>
              </Card>
            </Col>

            {/* 右侧：操作面板 */}
            <Col span={6}>
              <Card title="操作" style={{ marginBottom: 20 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Button
                    block
                    icon={<ShareAltOutlined />}
                    onClick={() => setPublishModalVisible(true)}
                    disabled={!isOwner || chart.chartType === 'pie'}
                  >
                    发布到帖子
                  </Button>
                  <Button
                    block
                    icon={<EyeOutlined />}
                    onClick={() => {
                      // TODO: 实现全屏查看
                      message.info('全屏查看功能开发中');
                    }}
                  >
                    全屏查看
                  </Button>
                  <Button
                    block
                    icon={<LikeOutlined />}
                    onClick={() => {
                      // TODO: 实现点赞功能
                      message.info('点赞功能开发中');
                    }}
                  >
                    点赞 ({chart.views})
                  </Button>
                </Space>
              </Card>

              <Card title="已发布" size="small">
                {chart.publishedPosts && chart.publishedPosts.length > 0 ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {chart.publishedPosts.map((post: any, i: number) => (
                      <Card
                        key={i}
                        size="small"
                        hoverable
                        onClick={() => navigate(`/post/${post._id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Text ellipsis>{post.title}</Text>
                      </Card>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">还未发布到任何帖子</Text>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      </Content>

      {/* 编辑模态框 */}
      <Modal
        title="编辑图表信息"
        open={editModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="输入标题" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={4} placeholder="描述这个图表..." maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* 发布模态框 */}
      <Modal
        title="发布到帖子"
        open={publishModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setPublishModalVisible(false)}
        okText="发布"
        cancelText="取消"
      >
        <Alert
          type="info"
          message="提示"
          description="选择一个帖子发布此图表。图表将显示在帖子内容中。"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical" onFinish={handlePublish}>
          <Form.Item
            name="postId"
            label="选择帖子"
            rules={[{ required: true, message: '请选择帖子' }]}
          >
            <Select placeholder="选择要发布的帖子">
              {/* TODO: 加载用户的帖子列表 */}
              <Option value="demo">示例帖子（功能开发中）</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default ChartDetail;
