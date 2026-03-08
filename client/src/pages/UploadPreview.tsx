import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout, Card, Typography, Table, Select, Button, Space, message,
  Alert, Divider, Tag, Tabs, Form, Input, Row, Col, Statistic, Modal
} from 'antd';
import {
  ArrowLeftOutlined, SaveOutlined, CheckCircleOutlined,
  EditOutlined, DeleteOutlined, ReloadOutlined
} from '@ant-design/icons';
import { getUpload, updateUploadConfig, deleteUpload } from '../api/uploads';
import type { Upload } from '../api/uploads';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const UploadPreview: React.FC = () => {
  const { uploadId } = useParams<{ uploadId: string }>();
  const navigate = useNavigate();
  const [upload, setUpload] = useState<Upload | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editField, setEditField] = useState<string>('');
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
      
      // 默认选择第一个工作表
      if (data.metadata?.sheetNames && data.metadata.sheetNames.length > 0) {
        setSelectedSheet(data.metadata.sheetNames[0]);
      }
      
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
      await updateUploadConfig(uploadId, {
        processingConfig: values,
        isVerified: true
      });
      
      message.success('配置保存成功！数据已确认无误。');
      setUpload(prev => prev ? {
        ...prev,
        processingConfig: values,
        isVerified: true,
        status: 'processed'
      } : null);
    } catch (error: any) {
      message.error('保存配置失败');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleMetadataUpdate = async (columnIndex: number, sheetName: string, updatedData: any) => {
    if (!upload || !upload.metadata?.dataColumns) return;
    
    console.log('📝 更新元数据:', {
      columnIndex,
      sheetName,
      updatedData,
      totalColumns: upload.metadata.dataColumns.length
    });
    
    setSaving(true);
    try {
      const updatedColumns = upload.metadata.dataColumns.map(col => {
        const colSheetName = col.sheetName || col.sheet_name;
        const colIndex = col.columnIndex ?? col.column_index;
        // 同时匹配 sheetName 和 columnIndex
        if (colSheetName === sheetName && colIndex === columnIndex) {
          console.log('✅ 匹配到列，准备更新:', {
            colSheetName,
            colIndex,
            oldData: col,
            newData: updatedData
          });
          return { ...col, ...updatedData };
        }
        return col;
      });
      
      console.log('📦 更新后的列总数:', updatedColumns.length);
      
      await updateUploadConfig(uploadId, {
        metadata: {
          ...upload.metadata,
          dataColumns: updatedColumns
        }
      });
      
      message.success('元数据更新成功！');
      setUpload(prev => prev ? {
        ...prev,
        metadata: {
          ...prev.metadata,
          dataColumns: updatedColumns
        }
      } : null);
      setEditingKey(null);
      setEditValue('');
      setEditField('');
    } catch (error: any) {
      message.error('更新失败');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // 开始编辑
  const handleEditClick = (record: any, field: string, currentValue: string) => {
    const sheetName = record.sheetName || record.sheet_name;
    const colIndex = record.columnIndex ?? record.column_index ?? 0;
    
    console.log('👆 点击编辑:', {
      record,
      sheetName,
      colIndex,
      field,
      currentValue
    });
    
    const key = `${sheetName || 'unknown'}-${colIndex}-${field}`;
    setEditingKey(key);
    setEditValue(currentValue || '');
    setEditField(field);
  };

  // 保存编辑
  const handleSaveEdit = async (columnIndex: number, sheetName: string) => {
    if (!editingKey || !editField) return;
    
    console.log('💾 准备保存编辑:', {
      columnIndex,
      sheetName,
      field: editField,
      value: editValue,
      editingKey
    });
    
    await handleMetadataUpdate(columnIndex, sheetName, { [editField]: editValue });
    
    // 保存成功后清除编辑状态
    setEditingKey(null);
    setEditValue('');
    setEditField('');
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
    setEditField('');
  };

  // 获取当前工作表的数据列
  const getCurrentSheetColumns = useMemo(() => {
    if (!upload?.metadata?.dataColumns) return [];
    
    // 如果只有一个工作表或没有 sheetNames，返回所有列
    if (!upload.metadata.sheetNames || upload.metadata.sheetNames.length <= 1) {
      return upload.metadata.dataColumns;
    }
    
    // 多个工作表时，根据 sheet_name 或 sheetName 过滤（兼容两种格式）
    const filtered = upload.metadata.dataColumns.filter(col => {
      const colSheetName = col.sheetName || col.sheet_name;
      return colSheetName === selectedSheet;
    });
    
    // 如果过滤后为空，返回所有列作为后备
    if (filtered.length === 0) {
      return upload.metadata.dataColumns;
    }
    
    return filtered;
  }, [upload?.metadata?.dataColumns, upload?.metadata?.sheetNames, selectedSheet]);

  // 获取当前工作表的预览数据
  const getPreviewData = useMemo(() => {
    if (getCurrentSheetColumns.length === 0) return [];
    
    // 从第一列的 previewRows 获取数据
    const firstColumn = getCurrentSheetColumns[0];
    return firstColumn.previewRows || [];
  }, [getCurrentSheetColumns]);

  // 构建表格列
  const tableColumns = useMemo(() => [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 150,
      fixed: 'left'
    },
    ...getCurrentSheetColumns.map(col => ({
      title: (
        <div>
          <Text strong>{col.displayName || col.originalName}</Text>
          {col.unit && <br />}
          {col.unit && <Tag color="blue" style={{ fontSize: 10, marginTop: 4 }}>{col.unit}</Tag>}
          {col.source && <br />}
          {col.source && <Tag color="green" style={{ fontSize: 10, marginTop: 4 }}>{col.source}</Tag>}
        </div>
      ),
      dataIndex: col.displayName || col.originalName,
      key: col.columnIndex.toString(),
      width: 150,
      render: (value: any, record: any) => {
        // 从当前工作表的列中查找
        const columnData = getCurrentSheetColumns.find(c => 
          (c.displayName || c.originalName) === (col.displayName || col.originalName)
        );
        if (!columnData) return '-';
        
        // 在 previewRows 中查找
        const previewRow = columnData.previewRows?.find((r: any) => r.date === record.date);
        return previewRow ? previewRow.value : '-';
      }
    }))
  ], [getCurrentSheetColumns]);

  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个上传文件及其所有数据吗？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteUpload(uploadId!);
          message.success('删除成功');
          navigate('/uploads');
        } catch (error: any) {
          message.error('删除失败：' + error.message);
        }
      }
    });
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
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/uploads')}>
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>数据预览与配置</Title>
        </Space>
        <Space>
          <Tag color={upload?.isVerified ? 'green' : upload?.status === 'processed' ? 'blue' : 'orange'}>
            {upload?.isVerified ? '已确认' : upload?.status === 'processed' ? '已处理' : '待确认'}
          </Tag>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            删除
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* 文件信息卡片 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic title="文件名" value={upload?.originalName} valueStyle={{ fontSize: 14 }} />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic 
                  title="文件大小" 
                  value={((upload?.size || 0) / 1024 / 1024).toFixed(2)} 
                  suffix="MB"
                  valueStyle={{ fontSize: 14 }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic 
                  title="数据列数" 
                  value={upload?.metadata?.columnCount || 0}
                  valueStyle={{ fontSize: 14 }}
                />
              </Card>
            </Col>
            <Col span={5}>
              <Card>
                <Statistic 
                  title="置信度" 
                  value={upload?.metadata?.confidence || 0}
                  suffix="%"
                  valueStyle={{ 
                    fontSize: 14,
                    color: (upload?.metadata?.confidence || 0) >= 80 ? '#52c41a' : '#faad14'
                  }}
                />
              </Card>
            </Col>
            <Col span={5}>
              <Card>
                <Statistic 
                  title="存储路径" 
                  value={upload?.dataStoragePath ? '已存储' : '未存储'}
                  valueStyle={{ 
                    fontSize: 14,
                    color: upload?.dataStoragePath ? '#52c41a' : '#999'
                  }}
                />
              </Card>
            </Col>
          </Row>

          {/* 工作表选择和数据预览 */}
          <Card title="数据预览" style={{ marginBottom: 16 }}>
            {upload?.metadata?.sheetNames && upload.metadata.sheetNames.length > 1 ? (
              <Tabs
                activeKey={selectedSheet}
                onChange={setSelectedSheet}
                type="card"
              >
                {upload.metadata.sheetNames.map((name, i) => (
                  <TabPane tab={name} key={name}>
                    <Table
                      columns={tableColumns}
                      dataSource={getPreviewData}
                      scroll={{ x: true }}
                      pagination={{ pageSize: 20 }}
                      size="small"
                      loading={loading}
                    />
                  </TabPane>
                ))}
              </Tabs>
            ) : (
              <Table
                columns={tableColumns}
                dataSource={getPreviewData}
                scroll={{ x: true }}
                pagination={{ pageSize: 20 }}
                size="small"
                loading={loading}
              />
            )}
          </Card>

          {/* 元数据编辑 */}
          <Card 
            title="数据列元数据（可编辑）"
            extra={
              <Text type="secondary">点击列名可编辑名称、单位、来源等信息</Text>
            }
            style={{ marginBottom: 16 }}
          >
            <Table
              columns={[
                {
                  title: '列索引',
                  dataIndex: 'columnIndex',
                  key: 'columnIndex',
                  width: 80
                },
                {
                  title: '数据名称',
                  dataIndex: 'displayName',
                  key: 'displayName',
                  width: 300,
                  render: (text, record) => {
                    const key = `${record.sheetName || record.sheet_name || 'unknown'}-${record.columnIndex ?? record.column_index ?? 0}-displayName`;
                    if (editingKey === key) {
                      return (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onPressEnter={() => handleSaveEdit(record.columnIndex ?? record.column_index ?? 0, record.sheetName || record.sheet_name)}
                          autoFocus
                        />
                      );
                    }
                    return (
                      <Text
                        onClick={() => handleEditClick(record, 'displayName', text || record.originalName)}
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {text || record.originalName} <EditOutlined />
                      </Text>
                    );
                  }
                },
                {
                  title: '原始名称',
                  dataIndex: 'originalName',
                  key: 'originalName',
                  width: 200
                },
                {
                  title: '单位',
                  dataIndex: 'unit',
                  key: 'unit',
                  width: 100,
                  render: (text, record) => {
                    const key = `${record.sheetName || record.sheet_name || 'unknown'}-${record.columnIndex ?? record.column_index ?? 0}-unit`;
                    if (editingKey === key) {
                      return (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onPressEnter={() => handleSaveEdit(record.columnIndex ?? record.column_index ?? 0, record.sheetName || record.sheet_name)}
                          autoFocus
                        />
                      );
                    }
                    return (
                      <Text
                        onClick={() => handleEditClick(record, 'unit', text || '')}
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {text || '-'} <EditOutlined />
                      </Text>
                    );
                  }
                },
                {
                  title: '来源',
                  dataIndex: 'source',
                  key: 'source',
                  width: 150,
                  render: (text, record) => {
                    const key = `${record.sheetName || record.sheet_name || 'unknown'}-${record.columnIndex ?? record.column_index ?? 0}-source`;
                    if (editingKey === key) {
                      return (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onPressEnter={() => handleSaveEdit(record.columnIndex ?? record.column_index ?? 0, record.sheetName || record.sheet_name)}
                          autoFocus
                        />
                      );
                    }
                    return (
                      <Text
                        onClick={() => handleEditClick(record, 'source', text || '')}
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {text || '-'} <EditOutlined />
                      </Text>
                    );
                  }
                },
                {
                  title: '频率',
                  dataIndex: 'frequency',
                  key: 'frequency',
                  width: 100,
                  render: (text) => {
                    const freqMap: any = {
                      monthly: '月度',
                      quarterly: '季度',
                      yearly: '年度'
                    };
                    return freqMap[text] || text || '-';
                  }
                },
                {
                  title: '总行数',
                  dataIndex: 'totalRows',
                  key: 'totalRows',
                  width: 100
                }
              ]}
              dataSource={getCurrentSheetColumns}
              rowKey={(record, index) => {
                // 使用复合 key 确保唯一性：sheetName + columnIndex + index
                const sheetName = record.sheetName || record.sheet_name || 'unknown';
                const colIndex = record.columnIndex ?? record.column_index ?? index;
                return `${sheetName}-${colIndex}-${index}`;
              }}
              size="small"
              pagination={false}
            />
          </Card>

          {/* 配置确认 */}
          <Card>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
            >
              <Alert
                message="确认数据无误后，请点击'确认无误'按钮"
                description="确认后数据将被存储到服务器，并可用于创建图表"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              <Space>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => form.submit()}
                  loading={saving}
                  size="large"
                >
                  确认无误，存储数据
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => navigate('/uploads')}
                  size="large"
                >
                  重新上传
                </Button>
              </Space>
            </Form>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default UploadPreview;
