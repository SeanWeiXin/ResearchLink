import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { login, register } from '../api/auth';
import { useAuthStore } from '../store/authStore';

const { Title } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();
  const loginStore = useAuthStore();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (isRegister) {
        // 注册
        const response = await register({
          username: values.username,
          email: values.email,
          password: values.password
        });
        message.success('注册成功！');
        loginStore.login(response.user, response.token);
        navigate('/');
      } else {
        // 登录
        const response = await login({
          username: values.username,
          password: values.password
        });
        message.success('登录成功！');
        loginStore.login(response.user, response.token);
        navigate('/');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <Title level={2}>🚀 ResearchLink</Title>
          <Title level={5} type="secondary">
            {isRegister ? '创建新账户' : '欢迎回来'}
          </Title>
        </div>

        <Form
          name={isRegister ? "register" : "login"}
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少 3 个字符' }
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          {isRegister && (
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="邮箱" />
            </Form.Item>
          )}

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少 6 个字符' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {isRegister ? '注册' : '登录'}
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Button type="link" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? '已有账户？去登录' : '没有账户？去注册'}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
