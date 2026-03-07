import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Card, Typography, Form, Input, Select, Button, Space,
  Row, Col, Divider, message, Steps, ColorPicker
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, LineChartOutlined,
  BarChartOutlined, AreaChartOutlined, PieChartOutlined } from '@ant-design/icons';
import { createChart, getUpload, type Upload } from '../api/uploads';
import type { Color } from 'antd/es/color-picker';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface ChartConfig {
  xField?: string;
  yFields?: string[];
  seriesField?: string;
  color?: string[];
}

const CreateChart: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<string>('line');

  // 从 URL 获取 uploadId
  const params = new URLSearchParams(location.search);
  const uploadId = params.get('uploadId');

  useEffect(() => {
    if (!uploadId) {
      message.error('请指定上传文件');
      navigate('/uploads');
      return;
    }
    loadUploadData(uploadId);
  }, [uploadId]);

  const loadUploadData = async (id: string) => {
    try {
      const data = await getUpload(id);
      setUpload(data);
      
      // 自动填充配置
      if (data.processingConfig) {
        form.setFieldsValue({
          title: `${data.originalName} - ${data.processingConfig.dateColumn || '数据分析'}`,
          xField: data.processingConfig.dateColumn,
          yFields: data.processingConfig.dataColumns,
        });
      }
    } catch (error: any) {
      message.error('加载数据失败');
      console.error(error);
    }
  };

  const handleCreateChart = async (values: any) => {
    if (!uploadId) return;

    setLoading(true);
    try {
      // 构建 ECharts 配置
      const echartsOption = buildEChartsOption(values);

      const chartData = await createChart({
        uploadId,
        title: values.title,
        description: values.description,
        chartType: values.chartType,
        config: {
          xField: values.xField,
          yFields: values.yFields,
          color: values.color?.map((c: Color) => c.toHexString()),
        },
        echartsOption,
      });

      message.success('图表创建成功！');
      navigate(`/charts/${chartData.id}`);
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建图表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const buildEChartsOption = (values: any) => {
    const { chartType, xField, yFields, color } = values;
    
    const colorArray = color?.map((c: Color) => c.toHexString()) || 
      ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'];

    // 基础配置
    const option: any = {
      title: {
        text: values.title,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: chartType === 'pie' ? 'shadow' : 'line'
        }
      },
      legend: {
        data: yFields || [],
        top: '10%'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: chartType !== 'pie' ? {
        type: 'category',
        boundaryGap: chartType === 'bar',
        name: xField,
        data: [] // 实际数据将从后端获取
      } : undefined,
      yAxis: chartType !== 'pie' ? {
        type: 'value',
        name: '数值'
      } : undefined,
      series: yFields?.map((field: string, index: number) => ({
        name: field,
        type: chartType === 'area' ? 'line' : chartType,
        areaStyle: chartType === 'area' ? {} : undefined,
        data: [], // 实际数据将从后端获取
        itemStyle: {
          color: colorArray[index % colorArray.length]
        }
      })) || []
    };

    if (chartType === 'pie') {
      option.series = [{
        name: values.title,
        type: 'pie',
        radius: '50%',
        data: [],
        itemStyle: {
          color: (params: any) => colorArray[params.dataIndex % colorArray.length]
        }
      }];
      option.legend = {
        orient: 'vertical',
        left: 'left',
        data: []
      };
    }

    return option;
  };

  const chartTypeOptions = [
    { type: 'line', name: '折线图', icon: <LineChartOutlined />, desc: '适合展示时间序列数据' },
    { type: 'bar', name: '柱状图', icon: <BarChartOutlined />, desc: '适合比较不同类别的数据' },
    { type: 'area', name: '面积图', icon: <AreaChartOutlined />, desc: '强调数量随时间的变化' },
    { type: 'scatter', name: '散点图', icon: <LineChartOutlined />, desc: '展示数据点的分布' },
    { type: 'pie', name: '饼图', icon: <PieChartOutlined />, desc: '显示各部分占比' },
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
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/uploads/${uploadId}/preview`)}>
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>创建图表</Title>
        </Space>
      </Header>

      <Content style={{ padding: '50px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Steps
            current={2}
            items={[
              { title: '上传文件', status: 'finish' },
              { title: '配置数据', status: 'finish' },
              { title: '创建图表', status: 'process' }
            ]}
            style={{ marginBottom: 20 }}
          />

          <Row gutter={16}>
            {/* 左侧：配置表单 */}
            <Col span={12}>
              <Card 
                title="图表配置"
                style={{ marginBottom: 20 }}
              >
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleCreateChart}
                  initialValues={{
                    chartType: 'line',
                    color: ['#5470c6', '#91cc75', '#fac858', '#ee6666'],
                  }}
                >
                  {/* 图表类型选择 */}
                  <Form.Item
                    name="chartType"
                    label="图表类型"
                    rules={[{ required: true, message: '请选择图表类型' }]}
                  >
                    <Select
                      onChange={setSelectedChartType}
                      placeholder="选择图表类型"
                    >
                      {chartTypeOptions.map(opt => (
                        <Option key={opt.type} value={opt.type}>
                          <Space>
                            {opt.icon}
                            <div>
                              <div>{opt.name}</div>
                              <div style={{ fontSize: 12, color: '#999' }}>{opt.desc}</div>
                            </div>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Divider />

                  {/* 基本信息 */}
                  <Form.Item
                    name="title"
                    label="图表标题"
                    rules={[{ required: true, message: '请输入标题' }]}
                  >
                    <Input placeholder="输入图表标题" />
                  </Form.Item>

                  <Form.Item
                    name="description"
                    label="描述"
                  >
                    <TextArea
                      rows={2}
                      placeholder="描述这个图表..."
                      maxLength={500}
                      showCount
                    />
                  </Form.Item>

                  <Divider />

                  {/* 数据映射 */}
                  <Form.Item
                    name="xField"
                    label="X 轴数据列"
                    rules={[{ required: selectedChartType !== 'pie', message: '请选择 X 轴' }]}
                    tooltip="通常选择日期或分类列"
                  >
                    <Select placeholder="选择 X 轴数据列" allowClear>
                      {upload?.metadata?.columns?.map((col, i) => (
                        <Option key={i} value={col.name}>
                          {col.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="yFields"
                    label="Y 轴数据列"
                    rules={[{ required: selectedChartType !== 'pie', message: '请选择 Y 轴' }]}
                    tooltip="选择要展示的数值列"
                  >
                    <Select
                      mode="multiple"
                      placeholder="选择 Y 轴数据列"
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

                  <Divider />

                  {/* 颜色选择 */}
                  <Form.Item
                    name="color"
                    label="颜色方案"
                    tooltip="为图表选择颜色"
                  >
                    <Space wrap>
                      <Form.Item noStyle shouldUpdate>
                        {() => {
                          const colors = form.getFieldValue('color') || [];
                          return (
                            <>
                              {colors.map((c: Color, i: number) => (
                                <Form.Item key={i} name={['color', i]}>
                                  <ColorPicker showText format="hex" />
                                </Form.Item>
                              ))}
                            </>
                          );
                        }}
                      </Form.Item>
                    </Space>
                  </Form.Item>

                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SaveOutlined />}
                        loading={loading}
                        size="large"
                      >
                        创建图表
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            {/* 右侧：预览区域 */}
            <Col span={12}>
              <Card title="图表预览">
                <div style={{
                  height: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fafafa',
                  borderRadius: 8
                }}>
                  <Space direction="vertical" align="center">
                    {React.createElement(
                      selectedChartType === 'line' ? LineChartOutlined :
                      selectedChartType === 'bar' ? BarChartOutlined :
                      selectedChartType === 'area' ? AreaChartOutlined :
                      selectedChartType === 'scatter' ? LineChartOutlined :
                      PieChartOutlined,
                      { style: { fontSize: 80, color: '#1890ff' } }
                    )}
                    <Text type="secondary">
                      配置完成后将显示图表预览
                    </Text>
                  </Space>
                </div>

                <Divider />

                <Card size="small" title="💡 配置提示">
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      • 折线图：适合展示数据随时间的变化趋势
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      • 柱状图：适合比较不同类别的数据大小
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      • 面积图：强调数量随时间变化的程度
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      • 散点图：展示数据点的分布和相关性
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      • 饼图：显示各部分占整体的比例
                    </Text>
                  </Space>
                </Card>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
};

export default CreateChart;
