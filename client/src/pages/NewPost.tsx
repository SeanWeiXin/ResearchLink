import React, { useState } from 'react';
import { Layout, Card, Form, Input, Select, Button, message, Typography, Space, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../api/posts';
import { useAuthStore } from '../store/authStore';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const NewPost: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  if (!isAuthenticated) {
    message.error('请先登录');
    navigate('/login');
    return null;
  }

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await createPost({
        title: values.title,
        content: values.content,
        category: values.category,
        tags: values.tags
      });
      message.success('发帖成功');
      navigate('/');
    } catch (error: any) {
      message.error(error.response?.data?.message || '发帖失败');
    } finally {
      setLoading(false);
    }
  };

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
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Card>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 30 }}>
              发布新帖子
            </Title>

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              size="large"
            >
              <Form.Item
                name="title"
                label="标题"
                rules={[
                  { required: true, message: '请输入标题' },
                  { max: 100, message: '标题最多 100 个字符' }
                ]}
              >
                <Input placeholder="请输入帖子标题" />
              </Form.Item>

              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
                initialValue="user"
              >
                <Select placeholder="请选择分类">
                  <Option value="blog">博客</Option>
                  <Option value="user">分享</Option>
                  <Option value="question">提问</Option>
                  <Option value="share">资源</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="tags"
                label="标签"
                tooltip="按回车键添加标签，最多 5 个"
              >
                <Select
                  mode="tags"
                  placeholder="添加标签"
                  maxCount={5}
                />
              </Form.Item>

              <Form.Item
                name="content"
                label="内容"
                rules={[
                  { required: true, message: '请输入内容' },
                  { min: 10, message: '内容至少 10 个字符' }
                ]}
              >
                <TextArea
                  rows={10}
                  placeholder="请输入帖子内容..."
                  showCount
                  maxLength={10000}
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={loading} size="large">
                    发布
                  </Button>
                  <Button onClick={() => navigate('/')} size="large">
                    取消
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default NewPost;
