import React, { useState } from 'react';
import { Layout, Card, Typography, Upload, Button, Space, message, Progress, Alert } from 'antd';
import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { uploadExcel } from '../api/uploads';
import { useAuthStore } from '../store/authStore';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const UploadExcel: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 检查权限
  if (!isAuthenticated) {
    message.error('请先登录');
    navigate('/login');
    return null;
  }

  if (!user?.permissions?.canUploadExcel) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        <Header style={{
          background: '#fff',
          padding: '0 50px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Title level={4}>上传 Excel</Title>
        </Header>
        <Content style={{ padding: '50px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <Alert
              type="warning"
              message="权限不足"
              description="您目前没有上传 Excel 文件的权限。请联系管理员为您授予上传权限。"
              showIcon
              style={{ marginBottom: 20 }}
            />
            <Button onClick={() => navigate('/')}>返回首页</Button>
          </div>
        </Content>
      </Layout>
    );
  }

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls,.csv',
    maxCount: 1,
    beforeUpload: (file: File) => {
      const isValidType = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/csv'
      ].includes(file.type);

      if (!isValidType) {
        message.error('只能上传 Excel 或 CSV 文件！');
        return false;
      }

      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error('文件大小不能超过 50MB！');
        return false;
      }

      return true;
    },
    customRequest: async ({ file, onSuccess, onError }: any) => {
      setUploading(true);
      setUploadProgress(0);

      try {
        // 模拟进度
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(interval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        const result = await uploadExcel(file as File);
        
        clearInterval(interval);
        setUploadProgress(100);
        
        message.success(`"${result.upload.filename}" 上传成功！`);
        
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          navigate(`/uploads/${result.upload.id}/preview`);
        }, 500);

        onSuccess?.(result);
      } catch (error: any) {
        clearInterval(interval);
        setUploading(false);
        setUploadProgress(0);
        
        const errorMsg = error.response?.data?.message || '上传失败，请重试';
        message.error(errorMsg);
        onError?.(error);
      }
    },
    onRemove: () => {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{
        background: '#fff',
        padding: '0 50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Title level={4} style={{ margin: 0 }}>上传 Excel 文件</Title>
        <Space>
          <Button onClick={() => navigate('/uploads')}>我的上传</Button>
          <Button onClick={() => navigate('/')}>返回主页</Button>
        </Space>
      </Header>

      <Content style={{ padding: '50px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Card style={{ marginBottom: 20 }}>
            <Title level={5}>支持的文件格式</Title>
            <Paragraph type="secondary">
              • Excel 2007+ (.xlsx)<br/>
              • Excel 97-2003 (.xls)<br/>
              • CSV 文件 (.csv)<br/>
              • 最大文件大小：50MB
            </Paragraph>
            
            <Alert
              type="info"
              message="数据格式提示"
              description="为了获得最佳的分析效果，请确保您的数据包含：时间列（日期）和数值列。系统会自动识别数据结构并推荐合适的图表类型。"
              showIcon
              style={{ marginTop: 16 }}
            />
          </Card>

          <Dragger {...uploadProps} disabled={uploading}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
            <p className="ant-upload-hint">
              仅支持 Excel 和 CSV 文件，且不超过 50MB
            </p>
          </Dragger>

          {uploading && (
            <Card style={{ marginTop: 20 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text>正在上传...</Text>
                  <Text>{uploadProgress}%</Text>
                </div>
                <Progress percent={uploadProgress} strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }} />
              </Space>
            </Card>
          )}

          <Card style={{ marginTop: 20 }}>
            <Title level={5}>💡 使用提示</Title>
            <Paragraph type="secondary">
              1. 上传文件后，系统将自动分析数据结构<br/>
              2. 您可以预览数据并配置处理方式<br/>
              3. 选择要可视化的数据列<br/>
              4. 创建图表并自定义样式<br/>
              5. 将图表发布到论坛帖子中
            </Paragraph>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default UploadExcel;
