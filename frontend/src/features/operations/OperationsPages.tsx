import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AlertOutlined,
  DashboardOutlined,
  DownloadOutlined,
  RobotOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import {
  platformApi,
  type DomainHealth,
  type OperationAlert,
  type OperationsActivity,
  type OperationsMetric,
  type OperationsTodo,
  type ReportExportRecord,
  type SchedulerTask,
} from '../platform/platformApi';

const TASK_MARK = 'TASK-dashboard-alert-report';
const cardColors = ['blue', 'green', 'purple', 'gold'] as const;

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN');
}

function statusColor(status?: string | null) {
  switch (status) {
    case 'OK':
    case 'HEALTHY':
    case 'SUCCESS':
    case 'SUCCEEDED':
    case 'ACTIVE':
    case 'RESOLVED':
    case 'CLOSED':
      return 'green';
    case 'RUNNING':
    case 'OPEN':
    case 'ACKNOWLEDGED':
    case 'PENDING':
    case 'WARNING':
      return 'gold';
    case 'CRITICAL':
    case 'FAILED':
    case 'ERROR':
      return 'red';
    case 'INFO':
      return 'blue';
    default:
      return 'default';
  }
}

function severityColor(severity?: string | null) {
  switch (severity) {
    case 'CRITICAL':
      return 'red';
    case 'WARNING':
      return 'gold';
    case 'INFO':
      return 'blue';
    default:
      return 'default';
  }
}

function renderSummaryCards(metrics: OperationsMetric[], fallback: OperationsMetric[] = []) {
  const items = metrics.length > 0 ? metrics : fallback;
  return (
    <div className="console-summary-grid">
      {items.slice(0, 4).map((metric, index) => (
        <Card key={metric.key} className={`console-summary-card console-summary-card-${cardColors[index % cardColors.length]}`}>
          <div className="console-summary-card-header">
            <span className="console-summary-icon"><DashboardOutlined /></span>
            <Typography.Text type="secondary">{metric.name}</Typography.Text>
          </div>
          <Statistic value={metric.value} suffix={metric.unit} />
          <Typography.Text type="secondary" className="console-summary-hint">
            {metric.trend || metric.status || '实时聚合'}
          </Typography.Text>
        </Card>
      ))}
    </div>
  );
}

function PageHero({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="page-hero console-hero">
      <div className="console-hero-copy">
        <div className="console-hero-kickers">
          <Tag color="blue">{TASK_MARK}</Tag>
          <Tag color="purple">统一 console-* 风格</Tag>
        </div>
        <Typography.Title level={3}>{title}</Typography.Title>
        <Typography.Paragraph type="secondary">{subtitle}</Typography.Paragraph>
      </div>
      <div className="console-hero-actions"><Space wrap>{children}</Space></div>
    </div>
  );
}

function DiagnosticAlert({ message: diagnostic }: { message?: string | null }) {
  if (!diagnostic) return null;
  return <Alert showIcon type="info" title={diagnostic} style={{ marginBottom: 16 }} />;
}

function sourcePath(path?: string | null) {
  return path || '-';
}

export function DashboardPage() {
  const overviewQuery = useQuery({ queryKey: ['operations-dashboard-overview'], queryFn: () => platformApi.operationsDashboardOverview() });
  const todosQuery = useQuery({ queryKey: ['operations-dashboard-todos'], queryFn: () => platformApi.operationsDashboardTodos({ page: 1, pageSize: 8 }) });
  const activitiesQuery = useQuery({ queryKey: ['operations-dashboard-activities'], queryFn: () => platformApi.operationsDashboardActivities({ page: 1, pageSize: 8 }) });

  const domainColumns: ColumnsType<DomainHealth> = [
    { title: '领域', dataIndex: 'domain' },
    { title: '状态', dataIndex: 'status', render: (value) => <Tag color={statusColor(value)}>{value}</Tag> },
    { title: '总量', dataIndex: 'total' },
    { title: '风险', dataIndex: 'warnings', render: (value) => <Tag color={value > 0 ? 'gold' : 'green'}>{value}</Tag> },
    { title: '诊断', dataIndex: 'diagnostic' },
  ];
  const todoColumns: ColumnsType<OperationsTodo> = [
    { title: '待办', dataIndex: 'title' },
    { title: '类型', dataIndex: 'type', render: (value) => <Tag>{value}</Tag> },
    { title: '优先级', dataIndex: 'priority', render: (value) => <Tag color={severityColor(value)}>{value}</Tag> },
    { title: '状态', dataIndex: 'status', render: (value) => <Tag color={statusColor(value)}>{value}</Tag> },
    { title: '入口', dataIndex: 'actionPath', render: sourcePath },
  ];
  const overview = overviewQuery.data;
  const activities = activitiesQuery.data?.items ?? [];

  return (
    <div className="content-page">
      <PageHero title="工作台" subtitle="跨域运营状态、待办、近期活动与风险统一入口。">
        <Button icon={<SyncOutlined />} onClick={() => void overviewQuery.refetch()}>刷新运营总览</Button>
      </PageHero>
      <DiagnosticAlert message={overview?.diagnostic} />
      {renderSummaryCards(overview?.metrics ?? [], [{ key: 'loading', name: '运营指标', value: 0, unit: '', trend: '等待数据', status: 'PENDING' }])}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="领域健康" className="page-card console-catalog-card" loading={overviewQuery.isLoading}>
            <Table rowKey="domain" size="small" columns={domainColumns} dataSource={overview?.domainHealth ?? []} pagination={false} locale={{ emptyText: <Empty description="暂无领域健康数据" /> }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="告警分布" className="page-card console-panel-card" loading={overviewQuery.isLoading}>
            <Space orientation="vertical" className="full-width">
              {Object.entries(overview?.alertsBySeverity ?? {}).map(([severity, count]) => (
                <Alert key={severity} type={severity === 'CRITICAL' ? 'error' : severity === 'WARNING' ? 'warning' : 'info'} title={`${severity}：${count}`} showIcon />
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="待办队列" className="page-card console-catalog-card" loading={todosQuery.isLoading}>
            <Table rowKey="todoId" size="small" columns={todoColumns} dataSource={todosQuery.data?.items ?? []} pagination={false} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="近期活动" className="page-card console-panel-card" loading={activitiesQuery.isLoading}>
            <Timeline items={activities.map((item: OperationsActivity) => ({ color: statusColor(item.result), content: <span>{item.action} · {item.operatorName} · {formatDateTime(item.occurredAt)}</span> }))} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export function SchedulerCenterPage() {
  const [filters, setFilters] = useState({ taskType: undefined as string | undefined, status: undefined as string | undefined });
  const [messageApi, contextHolder] = message.useMessage();
  const overviewQuery = useQuery({ queryKey: ['operations-scheduler-overview'], queryFn: () => platformApi.operationsSchedulerOverview() });
  const tasksQuery = useQuery({ queryKey: ['operations-scheduler-tasks', filters], queryFn: () => platformApi.operationsSchedulerTasks({ ...filters, page: 1, pageSize: 20 }) });
  const assistantMutation = useMutation({
    mutationFn: (taskId?: string) => platformApi.diagnoseScheduler({ taskId, question: '请给出失败任务诊断建议' }),
    onSuccess: (result) => messageApi.info(`${result.status}：${result.suggestions.join('；') || result.diagnostic}`),
    onError: (error: Error) => messageApi.error(error.message),
  });
  const taskColumns: ColumnsType<SchedulerTask> = [
    { title: '任务', dataIndex: 'name', render: (value, record) => <Space orientation="vertical" size={0}><Typography.Text strong>{value}</Typography.Text><Typography.Text type="secondary">{record.taskId}</Typography.Text></Space> },
    { title: '类型', dataIndex: 'taskType', render: (value) => <Tag>{value}</Tag> },
    { title: '状态', dataIndex: 'status', render: (value) => <Tag color={statusColor(value)}>{value}</Tag> },
    { title: '耗时', dataIndex: 'durationMs', render: (value) => value ? `${value} ms` : '-' },
    { title: '诊断', dataIndex: 'diagnostic' },
    { title: '来源', dataIndex: 'sourcePath', render: sourcePath },
    { title: '操作', key: 'actions', render: (_, record) => <Button size="small" icon={<RobotOutlined />} onClick={() => assistantMutation.mutate(record.taskId)}>诊断</Button> },
  ];

  return (
    <div className="content-page">
      {contextHolder}
      <PageHero title="调度中心" subtitle="统一任务队列、运行状态、失败诊断与调度助手 seam。"><Button icon={<RobotOutlined />} loading={assistantMutation.isPending} onClick={() => assistantMutation.mutate(undefined)}>调度助手诊断</Button></PageHero>
      <DiagnosticAlert message={overviewQuery.data?.diagnostic} />
      {renderSummaryCards(overviewQuery.data?.metrics ?? [])}
      <Card className="page-card console-panel-card" title="队列概览">
        <Row gutter={[16, 16]}>{(overviewQuery.data?.queues ?? []).map((queue) => <Col xs={24} md={12} lg={6} key={queue.taskType}><Card size="small"><Statistic title={queue.taskType} value={queue.total} /><Space wrap><Tag color="blue">运行 {queue.running}</Tag><Tag color="red">失败 {queue.failed}</Tag><Tag>等待 {queue.waiting}</Tag></Space></Card></Col>)}</Row>
      </Card>
      <Card className="page-card console-catalog-card" title="任务列表">
        <div className="console-filter-toolbar">
          <Select allowClear placeholder="任务类型" style={{ width: 180 }} value={filters.taskType} onChange={(taskType) => setFilters((current) => ({ ...current, taskType }))} options={['PIPELINE', 'ANNOTATION', 'EVALUATION', 'EDGE'].map((value) => ({ value, label: value }))} />
          <Select allowClear placeholder="状态" style={{ width: 160 }} value={filters.status} onChange={(status) => setFilters((current) => ({ ...current, status }))} options={['RUNNING', 'SUCCEEDED', 'FAILED', 'PENDING'].map((value) => ({ value, label: value }))} />
        </div>
        <Table rowKey="taskId" loading={tasksQuery.isLoading} columns={taskColumns} dataSource={tasksQuery.data?.items ?? []} pagination={false} />
      </Card>
    </div>
  );
}

export function AlertCenterPage() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [filters, setFilters] = useState({ severity: undefined as string | undefined, status: undefined as string | undefined });
  const [selectedAlertId, setSelectedAlertId] = useState<string>();
  const alertsQuery = useQuery({ queryKey: ['operation-alerts', filters], queryFn: () => platformApi.operationAlerts({ ...filters, page: 1, pageSize: 20 }) });
  const rulesQuery = useQuery({ queryKey: ['operation-alert-rules'], queryFn: () => platformApi.operationAlertRules() });
  const detailQuery = useQuery({ queryKey: ['operation-alert-detail', selectedAlertId], queryFn: () => platformApi.operationAlertDetail(selectedAlertId!), enabled: Boolean(selectedAlertId) });
  const overviewMetrics = useMemo(() => {
    const alerts = alertsQuery.data?.items ?? [];
    return [
      { key: 'open', name: '未处理告警', value: alerts.filter((item) => item.status === 'OPEN').length, unit: '条', trend: '当前筛选', status: 'OPEN' },
      { key: 'critical', name: '高危告警', value: alerts.filter((item) => item.severity === 'CRITICAL').length, unit: '条', trend: '需优先处理', status: 'CRITICAL' },
      { key: 'rules', name: '启用规则', value: (Array.isArray(rulesQuery.data) ? rulesQuery.data : []).filter((item) => item.enabled).length, unit: '条', trend: '规则 seam', status: 'ACTIVE' },
      { key: 'ack', name: '已确认', value: alerts.filter((item) => item.status === 'ACKNOWLEDGED').length, unit: '条', trend: '处理中', status: 'ACKNOWLEDGED' },
    ];
  }, [alertsQuery.data?.items, rulesQuery.data]);
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['operation-alerts'] });
    await queryClient.invalidateQueries({ queryKey: ['operation-alert-detail'] });
  };
  const acknowledgeMutation = useMutation({ mutationFn: (alertId: string) => platformApi.acknowledgeOperationAlert(alertId, '页面确认告警'), onSuccess: async () => { messageApi.success('告警已确认'); await refresh(); }, onError: (error: Error) => messageApi.error(error.message) });
  const resolveMutation = useMutation({ mutationFn: (alertId: string) => platformApi.resolveOperationAlert(alertId, '页面关闭告警'), onSuccess: async () => { messageApi.success('告警已关闭'); await refresh(); }, onError: (error: Error) => messageApi.error(error.message) });
  const alertColumns: ColumnsType<OperationAlert> = [
    { title: '告警', dataIndex: 'title', render: (value, record) => <Button type="link" onClick={() => setSelectedAlertId(record.alertId)}>{value}</Button> },
    { title: '级别', dataIndex: 'severity', render: (value) => <Tag color={severityColor(value)}>{value}</Tag> },
    { title: '状态', dataIndex: 'status', render: (value) => <Tag color={statusColor(value)}>{value}</Tag> },
    { title: '来源', dataIndex: 'sourceType', render: (value, record) => `${value} · ${record.sourceId}` },
    { title: '诊断', dataIndex: 'diagnostic' },
    { title: '创建时间', dataIndex: 'createdAt', render: formatDateTime },
    { title: '操作', key: 'actions', render: (_, record) => <Space><Button size="small" disabled={record.status !== 'OPEN'} onClick={() => acknowledgeMutation.mutate(record.alertId)}>确认</Button><Button size="small" danger disabled={record.status === 'RESOLVED'} onClick={() => resolveMutation.mutate(record.alertId)}>关闭</Button></Space> },
  ];

  return (
    <div className="content-page">
      {contextHolder}
      <PageHero title="告警中心" subtitle="告警统计、筛选、详情、确认/关闭与规则通知 seam。"><Button icon={<AlertOutlined />} onClick={() => void alertsQuery.refetch()}>刷新告警</Button></PageHero>
      {renderSummaryCards(overviewMetrics)}
      <Card className="page-card console-catalog-card" title="告警列表">
        <div className="console-filter-toolbar"><Select allowClear placeholder="级别" style={{ width: 160 }} value={filters.severity} onChange={(severity) => setFilters((current) => ({ ...current, severity }))} options={['CRITICAL', 'WARNING', 'INFO'].map((value) => ({ value, label: value }))} /><Select allowClear placeholder="状态" style={{ width: 160 }} value={filters.status} onChange={(status) => setFilters((current) => ({ ...current, status }))} options={['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].map((value) => ({ value, label: value }))} /></div>
        <Table rowKey="alertId" loading={alertsQuery.isLoading} columns={alertColumns} dataSource={alertsQuery.data?.items ?? []} pagination={false} />
      </Card>
      <Card className="page-card console-panel-card" title="规则与通知 seam">
        <Table rowKey="ruleId" size="small" dataSource={Array.isArray(rulesQuery.data) ? rulesQuery.data : []} pagination={false} columns={[{ title: '规则', dataIndex: 'name' }, { title: '级别', dataIndex: 'severity', render: (value) => <Tag color={severityColor(value)}>{value}</Tag> }, { title: '来源', dataIndex: 'sourceType' }, { title: '通知渠道', dataIndex: 'notificationChannel' }, { title: '诊断', dataIndex: 'diagnostic' }]} />
      </Card>
      <Drawer title="告警详情" open={Boolean(selectedAlertId)} onClose={() => setSelectedAlertId(undefined)} size="large">
        {detailQuery.data ? <Space orientation="vertical" className="full-width" size={16}><Descriptions bordered column={1} size="small"><Descriptions.Item label="告警 ID">{detailQuery.data.alert.alertId}</Descriptions.Item><Descriptions.Item label="标题">{detailQuery.data.alert.title}</Descriptions.Item><Descriptions.Item label="诊断">{detailQuery.data.alert.diagnostic}</Descriptions.Item><Descriptions.Item label="相关资源">{Object.entries(detailQuery.data.relatedResource ?? {}).map(([key, value]) => `${key}=${value}`).join('；') || '-'}</Descriptions.Item></Descriptions><Timeline items={detailQuery.data.timeline.map((item) => ({ content: `${item.action} · ${item.operatorName} · ${formatDateTime(item.occurredAt)}` }))} /></Space> : <Empty description="请选择告警" />}
      </Drawer>
    </div>
  );
}

const reportTypeLabel: Record<string, string> = { platform_overview: '平台总览', data_assets: '数据资产', model_assets: '模型资产', resource_usage: '资源使用', task_execution: '任务执行', edge_runtime: '边端运行', security_audit: '安全合规' };
function rowValue(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (value === null || value === undefined) return '-';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function ReportCenterPage() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const overviewQuery = useQuery({ queryKey: ['operations-reports-overview'], queryFn: () => platformApi.operationsReportsOverview() });
  const [reportType, setReportType] = useState('platform_overview');
  const detailQuery = useQuery({ queryKey: ['operations-report-detail', reportType], queryFn: () => platformApi.operationsReportDetail(reportType) });
  const exportsQuery = useQuery({ queryKey: ['operations-report-exports'], queryFn: () => platformApi.operationsReportExports({ page: 1, pageSize: 10 }) });
  const exportMutation = useMutation({ mutationFn: () => platformApi.createOperationsReportExport(reportType, { format: 'XLSX', filters: detailQuery.data?.filters ?? {} }), onSuccess: async (record) => { messageApi.success(`导出请求 ${record.exportId} 已创建`); await queryClient.invalidateQueries({ queryKey: ['operations-report-exports'] }); }, onError: (error: Error) => messageApi.error(error.message) });
  const detail = detailQuery.data;
  const rowKeys = Object.keys(detail?.rows?.[0] ?? {});
  const rowColumns: ColumnsType<Record<string, unknown>> = rowKeys.map((key) => ({ title: key, dataIndex: key, render: (_, row) => rowValue(row, key) }));
  const exportColumns: ColumnsType<ReportExportRecord> = [
    { title: '导出 ID', dataIndex: 'exportId' },
    { title: '报表', dataIndex: 'reportType', render: (value) => reportTypeLabel[value] ?? value },
    { title: '格式', dataIndex: 'format' },
    { title: '状态', dataIndex: 'status', render: (value) => <Tag color={statusColor(value)}>{value}</Tag> },
    { title: '诊断', dataIndex: 'diagnostic' },
    { title: '请求时间', dataIndex: 'requestedAt', render: formatDateTime },
  ];

  return (
    <div className="content-page">
      {contextHolder}
      <PageHero title="报表中心" subtitle="运营看板、专项报表、过滤下钻 seam 与导出请求闭环。"><Button type="primary" icon={<DownloadOutlined />} loading={exportMutation.isPending} onClick={() => exportMutation.mutate()}>导出当前报表</Button></PageHero>
      <DiagnosticAlert message={overviewQuery.data?.diagnostic} />
      {renderSummaryCards(overviewQuery.data?.metrics ?? [])}
      <Card className="page-card console-panel-card" title="报表类型"><Select value={reportType} onChange={setReportType} style={{ minWidth: 260 }} options={(overviewQuery.data?.reportTypes ?? Object.keys(reportTypeLabel)).map((value) => ({ value, label: reportTypeLabel[value] ?? value }))} /></Card>
      <Card className="page-card console-catalog-card" title={detail?.title ?? '报表详情'} loading={detailQuery.isLoading}>
        <Space orientation="vertical" className="full-width" size={16}><Space wrap>{Object.entries(detail?.filters ?? {}).map(([key, value]) => <Tag key={key}>{key}: {value}</Tag>)}</Space><Alert type="info" showIcon title={detail?.drillDownSeam ?? 'TODO_CONFIRM_REPORT_DRILLDOWN'} />{renderSummaryCards(detail?.metrics ?? [])}<Table rowKey={(row) => String(row.id ?? row.domain ?? row.reportType ?? JSON.stringify(row))} size="small" columns={rowColumns} dataSource={detail?.rows ?? []} pagination={false} /></Space>
      </Card>
      <Card className="page-card console-catalog-card" title="导出记录"><Table rowKey="exportId" size="small" loading={exportsQuery.isLoading} columns={exportColumns} dataSource={exportsQuery.data?.items ?? []} pagination={false} /></Card>
    </div>
  );
}
