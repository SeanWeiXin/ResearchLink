import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout, Card, Typography, Table, Select, Button, Space, message,
  Alert, Divider, Tag, Steps, Form
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getUpload, updateUploadConfig, type Upload } from '../api/uploads';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const UploadPreview: React.FC = () => {
  const { uploadId } = useParams<{ uploadId: string }>();
  const navigate = useNavigate();
  const [upload, setUpload] = useState<Upload | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (uploadId) {
      loadUpload(uploadId);
    }
  }, [uploadId]);

  const loadUpload = async (id: string) => {
    setLoading(true);
    try {
      const data = await getUpload(id);
      setUpload(data);
      
      // 如果有现有配置，填充表单
      if (data.processingConfig) {
        form.setFieldsValue(data.processingConfig);
      }
    } catch (error: any) {
      message.error('加载数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    if (!uploadId) return;
    
    setSaving(true);
    try {
      // 自动设置 X 轴和 Y 轴
      const processingConfig = {
        sheetName: values.sheetName,
        dateColumn: values.dateColumn,
        dataColumns: values.dataColumns,
        // 自动设置 X 轴和 Y 轴（用于图表）
        xAxis: values.dateColumn || values.dataColumns?.[0],
        yAxis: values.dataColumns
      };
      
      await updateUploadConfig(uploadId, {
        processingConfig
      });
      
      message.success('配置保存成功！系统已自动设置 X 轴和 Y 轴。');
      setUpload(prev => prev ? {
        ...prev,
        processingConfig,
        status: 'processed'
      } : null);
    } catch (error: any) {
      message.error('保存配置失败');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (!upload && !loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        <Content style={{ padding: '50px', textAlign: 'center' }}>
          <Alert
            type="error"
            message="未找到上传记录"
            description="请检查上传 ID 是否正确"
          />
          <Button type="primary" onClick={() => navigate('/uploads')} style={{ marginTop: 20 }}>
            返回上传列表
          </Button>
        </Content>
      </Layout>
    );
  }

  const columns = upload?.metadata?.columns?.map((col, index) => ({
    title: (
      <div>
        <Text strong>{col.name}</Text>
        <br />
        <Tag color={col.type === 'date' ? 'blue' : col.type === 'number' ? 'green' : col.type === 'string' ? 'orange' : 'default'} style={{ marginTop: 4 }}>
          {col.type === 'date' ? '日期' : col.type === 'number' ? '数值' : col.type === 'string' ? '文本' : '其他'}
        </Tag>
        {col.format && (
          <Tag color="purple" style={{ marginTop: 4, fontSize: 10 }}>
            {col.format}
          </Tag>
        )}
      </div>
    ),
    dataIndex: col.name,
    key: col.name,
    width: 150,
    render: (value: any) => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    },
  })) || [];

  // 使用实际的预览数据
  const previewData = upload?.metadata?.previewRows || [];

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
          <Title level={4} style={{ margin: 0 }}>数据预览与配置</Title>
        </Space>
        <Space>
          <Tag color={upload?.status === 'processed' ? 'green' : 'blue'}>
            {upload?.status === 'processed' ? '已处理' : '未配置'}
          </Tag>
        </Space>
      </Header>

      <Content style={{ padding: '50px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* 步骤条 */}
          <Card style={{ marginBottom: 20 }}>
            <Steps
              current={upload?.processingConfig ? 2 : 1}
              items={[
                {
                  title: '上传文件',
                  description: '已完成',
                  status: 'finish'
                },
                {
                  title: '配置数据',
                  description: upload?.processingConfig ? '已完成' : '进行中',
                  status: upload?.processingConfig ? 'finish' : 'process'
                },
                {
                  title: '创建图表',
                  description: '下一步',
                  status: 'wait'
                }
              ]}
            />
          </Card>

          {/* 文件信息 */}
          <Card style={{ marginBottom: 20 }}>
            <Title level={5}>文件信息</Title>
            <Space direction="vertical">
              <div>
                <Text strong>文件名：</Text>
                <Text>{upload?.originalName}</Text>
              </div>
              <div>
                <Text strong>文件大小：</Text>
                <Text>{((upload?.size || 0) / 1024 / 1024).toFixed(2)} MB</Text>
              </div>
              <div>
                <Text strong>数据行数：</Text>
                <Text>{upload?.metadata?.rowCount || '未知'}</Text>
              </div>
              {upload?.metadata?.sheetNames && (
                <div>
                  <Text strong>工作表：</Text>
                  <Space wrap>
                    {upload.metadata.sheetNames.map((name, i) => (
                      <Tag key={i}>{name}</Tag>
                    ))}
                  </Space>
                </div>
              )}
            </Space>
          </Card>

          {/* 数据配置 */}
          <Card 
            title="数据配置"
            extra={
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => form.submit()}
                loading={saving}
              >
                保存配置
              </Button>
            }
            style={{ marginBottom: 20 }}
          >
            {/* 显示数据结构类型 */}
            {upload?.metadata?.dataType && (
              <Alert
                type="success"
                message={`数据结构类型：${
                  upload.metadata.dataType === 'time_series' ? '时间序列数据' :
                  upload.metadata.dataType === 'panel_data' ? '面板数据（多维度）' :
                  upload.metadata.dataType === 'cross_section' ? '截面数据' : '自定义结构'
                }`}
                description={
                  upload.metadata.dataType === 'time_series' ? '单一维度随时间变化的数据，适合直接生成时间序列图表' :
                  upload.metadata.dataType === 'panel_data' ? '包含多个维度和时间维度，建议进行数据转换（unpivot）' :
                  upload.metadata.dataType === 'cross_section' ? '单一时间点的多维度数据对比' : '需要根据具体数据结构进行配置'
                }
                showIcon
                style={{ marginBottom: 20 }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              initialValues={{
                sheetName: upload?.metadata?.sheetNames?.[0],
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* 工作表选择 */}
                {upload?.metadata?.sheetNames && upload.metadata.sheetNames.length > 1 && (
                  <Form.Item
                    name="sheetName"
                    label="选择工作表"
                    rules={[{ required: true, message: '请选择工作表' }]}
                  >
                    <Select placeholder="选择要处理的工作表">
                      {upload.metadata.sheetNames.map((name, i) => (
                        <Option key={i} value={name}>{name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}

                {/* 日期列选择 - 智能推荐 */}
                <Form.Item
                  name="dateColumn"
                  label="日期/时间列"
                  rules={[{ required: false, message: '请选择日期列（可选）' }]}
                  tooltip="用于 X 轴的时间或日期数据。系统已自动识别日期类型的列"
                  extra={
                    <Space style={{ fontSize: 12, color: '#666' }}>
                      <span>💡 智能推荐：</span>
                      {upload?.metadata?.columns?.filter(col => col.type === 'date' || col.format === 'M 月').map(col => (
                        <Tag key={col.name} color="blue">{col.name}</Tag>
                      ))}
                      {(!upload?.metadata?.columns || upload.metadata.columns.filter(col => col.type === 'date' || col.format === 'M 月').length === 0) && (
                        <span>未检测到日期列</span>
                      )}
                    </Space>
                  }
                >
                  <Select placeholder="选择作为时间轴的列（可选）" allowClear>
                    {upload?.metadata?.columns
                      ?.filter(col => col.type === 'date' || col.type === 'string' || col.format === 'M 月')
                      .map((col, i) => (
                        <Option key={i} value={col.name}>
                          {col.name} ({col.type === 'date' || col.format === 'M 月' ? '日期' : '文本'})
                        </Option>
                      ))}
                  </Select>
                </Form.Item>

                {/* 数值列选择 - 智能推荐 */}
                <Form.Item
                  name="dataColumns"
                  label="数值列"
                  rules={[{ required: true, message: '请至少选择一个数值列' }]}
                  tooltip="要分析和可视化的数据列"
                  extra={
                    <Space style={{ fontSize: 12, color: '#666' }}>
                      <span>💡 智能推荐：</span>
                      {upload?.metadata?.columns?.filter(col => col.type === 'number').map(col => (
                        <Tag key={col.name} color="green">{col.name}</Tag>
                      ))}
                    </Space>
                  }
                >
                  <Select
                    mode="multiple"
                    placeholder="选择要分析的数值列（可多选）"
                    style={{ width: '100%' }}
                  >
                    {upload?.metadata?.columns
                      ?.filter(col => col.type === 'number')
                      .map((col, i) => (
                        <Option key={i} value={col.name}>
                          {col.name}
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
              </Space>
            </Form>
          </Card>

          {/* 数据预览 */}
          <Card title="数据预览（前 20 行）">
            {upload?.metadata?.columns && upload.metadata.columns.length > 0 ? (
              previewData.length > 0 ? (
                <Table
                  columns={columns}
                  dataSource={previewData}
                  scroll={{ x: true }}
                  pagination={false}
                  size="small"
                  locale={{ emptyText: '暂无数据' }}
                />
              ) : (
                <Alert
                  type="warning"
                  message="暂无预览数据"
                  description="数据可能正在处理中，或文件格式较为复杂，请稍后刷新页面"
                  showIcon
                />
              )
            ) : (
              <Alert
                type="warning"
                message="暂无数据预览"
                description="数据正在处理中，请稍后刷新页面"
                showIcon
              />
            )}
            
            {/* 显示警告信息 */}
            {upload?.metadata?.warnings && upload.metadata.warnings.length > 0 && (
              <Alert
                type="warning"
                message="数据警告"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {upload.metadata.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                }
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
            
            {/* 显示置信度 */}
            {upload?.metadata?.confidence && (
              <Card 
                size="small" 
                title="📊 分析置信度" 
                style={{ marginTop: 16 }}
                bordered={false}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 'bold', color: upload.metadata.confidence >= 80 ? '#52c41a' : upload.metadata.confidence >= 50 ? '#faad14' : '#ff4d4f' }}>
                    {upload.metadata.confidence.toFixed(1)}%
                  </div>
                  <div style={{ color: '#666', marginTop: 8 }}>
                    {upload.metadata.confidence >= 80 ? '高置信度 - 数据质量良好' : 
                     upload.metadata.confidence >= 50 ? '中等置信度 - 建议检查数据' : 
                     '低置信度 - 需要人工校正'}
                  </div>
                </div>
              </Card>
            )}
          </Card>

          {/* 下一步操作 */}
          {upload?.processingConfig && (
            <Card style={{ marginTop: 20, background: '#f6ffed', borderColor: '#b7eb8f' }}>
              <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                <Title level={5}>配置完成！</Title>
                <Paragraph>
                  现在您可以使用这些配置创建图表了
                </Paragraph>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate(`/uploads/create-chart?uploadId=${uploadId}`)}
                >
                  创建图表 →
                </Button>
              </Space>
            </Card>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default UploadPreview;
