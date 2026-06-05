import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertCenterPage, DashboardPage, ReportCenterPage, SchedulerCenterPage } from './OperationsPages';
import { platformApi, type OperationAlert, type OperationsReportDetail } from '../platform/platformApi';

const metric = (key: string, name: string, value: number) => ({ key, name, value, unit: '个', trend: '较昨日稳定', status: 'OK' });
const alert: OperationAlert = {
  alertId: 'ALERT-001',
  title: '模型评估失败率过高',
  severity: 'CRITICAL',
  status: 'OPEN',
  sourceType: 'MODEL_EVALUATION',
  sourceId: 'EVAL-001',
  tenantId: 'TENANT-CABIN',
  ownerUserId: 'USR-ADMIN',
  diagnostic: 'TODO_CONFIRM_OBSERVABILITY_PROVIDER',
  createdAt: '2026-06-05T00:00:00Z',
  acknowledgedAt: null,
  resolvedAt: null,
};

vi.mock('../platform/platformApi', async () => {
  const actual = await vi.importActual<typeof import('../platform/platformApi')>('../platform/platformApi');
  return {
    ...actual,
    platformApi: {
      ...actual.platformApi,
      operationsDashboardOverview: vi.fn(),
      operationsDashboardTodos: vi.fn(),
      operationsDashboardActivities: vi.fn(),
      operationsSchedulerOverview: vi.fn(),
      operationsSchedulerTasks: vi.fn(),
      diagnoseScheduler: vi.fn(),
      operationAlerts: vi.fn(),
      operationAlertDetail: vi.fn(),
      acknowledgeOperationAlert: vi.fn(),
      resolveOperationAlert: vi.fn(),
      operationAlertRules: vi.fn(),
      operationsReportsOverview: vi.fn(),
      operationsReportDetail: vi.fn(),
      createOperationsReportExport: vi.fn(),
      operationsReportExports: vi.fn(),
    },
  };
});

function resetApiMocks() {
  vi.mocked(platformApi.operationsDashboardOverview).mockResolvedValue({
    metrics: [metric('models', '模型版本', 12), metric('datasets', '数据集', 8), metric('alerts', '开放告警', 1), metric('tasks', '运行任务', 4)],
    alertsBySeverity: { CRITICAL: 1, WARNING: 2, INFO: 3 },
    domainHealth: [{ domain: 'MODEL', status: 'WARNING', total: 12, warnings: 1, diagnostic: '评估失败率升高' }],
    diagnostic: 'TODO_CONFIRM_OBSERVABILITY_PROVIDER',
  });
  vi.mocked(platformApi.operationsDashboardTodos).mockResolvedValue({ items: [{ todoId: 'TODO-001', type: 'ALERT', title: '处理模型评估告警', priority: 'CRITICAL', status: 'OPEN', sourceType: 'ALERT', sourceId: 'ALERT-001', tenantId: 'TENANT-CABIN', createdAt: '2026-06-05T00:00:00Z', dueAt: null, actionPath: '/alert' }], total: 1, page: 1, pageSize: 8 });
  vi.mocked(platformApi.operationsDashboardActivities).mockResolvedValue({ items: [{ activityId: 'ACT-001', action: 'ALERT_CREATED', resourceType: 'Alert', resourceId: 'ALERT-001', operatorName: 'system', result: 'SUCCESS', riskLevel: 'WARNING', occurredAt: '2026-06-05T00:00:00Z', detail: '告警创建' }], total: 1, page: 1, pageSize: 8 });
  vi.mocked(platformApi.operationsSchedulerOverview).mockResolvedValue({ metrics: [metric('running', '运行中任务', 3), metric('failed', '失败任务', 1), metric('waiting', '等待任务', 5), metric('queues', '队列类型', 4)], queues: [{ taskType: 'PIPELINE', total: 5, running: 2, failed: 1, waiting: 2 }], diagnostic: 'TODO_CONFIRM_SCHEDULER_AI_ASSISTANT' });
  vi.mocked(platformApi.operationsSchedulerTasks).mockResolvedValue({ items: [{ taskId: 'TASK-001', taskType: 'PIPELINE', name: '焊缝视频抽帧预处理', status: 'FAILED', tenantId: 'TENANT-CABIN', ownerId: 'USR-ADMIN', startedAt: '2026-06-05T00:00:00Z', endedAt: null, durationMs: 1200, diagnostic: '算子超时', sourcePath: '/pipeline' }], total: 1, page: 1, pageSize: 20 });
  vi.mocked(platformApi.diagnoseScheduler).mockResolvedValue({ status: 'SEAM_READY', diagnostic: 'TODO_CONFIRM_SCHEDULER_AI_ASSISTANT', suggestions: ['检查算子配置', '重试失败节点'], generatedAt: '2026-06-05T00:00:00Z' });
  vi.mocked(platformApi.operationAlerts).mockResolvedValue({ items: [alert], total: 1, page: 1, pageSize: 20 });
  vi.mocked(platformApi.operationAlertDetail).mockResolvedValue({ alert, rule: { ruleId: 'RULE-001', name: '模型失败率规则', severity: 'CRITICAL', sourceType: 'MODEL_EVALUATION', conditionExpression: 'failed > 0', enabled: true, notificationChannel: 'TODO_CONFIRM_NOTIFICATION_CHANNEL', status: 'ACTIVE', diagnostic: '通知渠道待配置' }, timeline: [{ activityId: 'ACT-ALERT', action: 'ALERT_CREATED', resourceType: 'Alert', resourceId: alert.alertId, operatorName: 'system', result: 'SUCCESS', riskLevel: 'CRITICAL', occurredAt: '2026-06-05T00:00:00Z', detail: '创建告警' }], relatedResource: { modelId: 'MODEL-YOLO-001' } });
  vi.mocked(platformApi.acknowledgeOperationAlert).mockResolvedValue({ ...alert, status: 'ACKNOWLEDGED', acknowledgedAt: '2026-06-05T00:01:00Z' });
  vi.mocked(platformApi.resolveOperationAlert).mockResolvedValue({ ...alert, status: 'RESOLVED', resolvedAt: '2026-06-05T00:02:00Z' });
  vi.mocked(platformApi.operationAlertRules).mockResolvedValue([{ ruleId: 'RULE-001', name: '模型失败率规则', severity: 'CRITICAL', sourceType: 'MODEL_EVALUATION', conditionExpression: 'failed > 0', enabled: true, notificationChannel: 'TODO_CONFIRM_NOTIFICATION_CHANNEL', status: 'ACTIVE', diagnostic: '通知渠道待配置' }]);
  const reportDetail: OperationsReportDetail = { reportType: 'platform_overview', title: '平台总览报表', filters: { tenantId: 'TENANT-CABIN' }, metrics: [metric('datasets', '数据集', 8)], rows: [{ domain: 'MODEL', total: 12, warning: 1 }], drillDownSeam: 'TODO_CONFIRM_REPORT_DRILLDOWN' };
  vi.mocked(platformApi.operationsReportsOverview).mockResolvedValue({ metrics: [metric('reports', '报表类型', 7), metric('exports', '导出请求', 1)], reportTypes: ['platform_overview', 'model_assets'], diagnostic: 'TODO_CONFIRM_REPORT_TEMPLATE' });
  vi.mocked(platformApi.operationsReportDetail).mockResolvedValue(reportDetail);
  vi.mocked(platformApi.createOperationsReportExport).mockResolvedValue({ exportId: 'REXP-001', reportType: 'platform_overview', status: 'QUEUED', requestedBy: 'USR-ADMIN', tenantId: 'TENANT-CABIN', format: 'XLSX', filtersJson: '{}', downloadUrlMasked: null, diagnostic: 'TODO_CONFIRM_REPORT_EXPORT_STORAGE', requestedAt: '2026-06-05T00:00:00Z', completedAt: null });
  vi.mocked(platformApi.operationsReportExports).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });
}

function renderPage(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('OperationsPages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetApiMocks();
  });

  it('TASK-dashboard-alert-report AC-01 AC-02 展示工作台总览、待办与活动', async () => {
    renderPage(<DashboardPage />);
    expect(await screen.findByRole('heading', { name: '工作台' })).toBeInTheDocument();
    expect(screen.getByText('TASK-dashboard-alert-report')).toBeInTheDocument();
    expect(await screen.findByText('模型版本')).toBeInTheDocument();
    expect(screen.getByText('处理模型评估告警')).toBeInTheDocument();
    expect(screen.queryByText(/占位页|mock/i)).not.toBeInTheDocument();
  });

  it('TASK-dashboard-alert-report AC-03 AC-04 展示调度队列并调用调度助手 seam', async () => {
    const user = userEvent.setup();
    renderPage(<SchedulerCenterPage />);
    expect(await screen.findByRole('heading', { name: '调度中心' })).toBeInTheDocument();
    expect(await screen.findByText('焊缝视频抽帧预处理')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /诊断/ }).at(-1)!);
    await waitFor(() => expect(platformApi.diagnoseScheduler).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'TASK-001' })));
  });

  it('TASK-dashboard-alert-report AC-05 AC-06 AC-07 支持告警详情、确认与关闭', async () => {
    const user = userEvent.setup();
    renderPage(<AlertCenterPage />);
    expect(await screen.findByRole('heading', { name: '告警中心' })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: '模型评估失败率过高' }));
    expect(await screen.findByText('ALERT-001')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /确\s*认/ }));
    await waitFor(() => expect(platformApi.acknowledgeOperationAlert).toHaveBeenCalledWith('ALERT-001', '页面确认告警'));
    await user.click(screen.getByRole('button', { name: /关\s*闭/ }));
    await waitFor(() => expect(platformApi.resolveOperationAlert).toHaveBeenCalledWith('ALERT-001', '页面关闭告警'));
  });

  it('TASK-dashboard-alert-report AC-08 AC-09 展示报表详情并创建导出请求', async () => {
    const user = userEvent.setup();
    renderPage(<ReportCenterPage />);
    expect(await screen.findByRole('heading', { name: '报表中心' })).toBeInTheDocument();
    expect(await screen.findByText('平台总览报表')).toBeInTheDocument();
    expect(screen.getByText('TODO_CONFIRM_REPORT_DRILLDOWN')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /导出当前报表/ }));
    await waitFor(() => expect(platformApi.createOperationsReportExport).toHaveBeenCalledWith('platform_overview', expect.objectContaining({ format: 'XLSX' })));
    const dialog = screen.queryByRole('dialog');
    if (dialog) expect(within(dialog).queryByText(/占位页|mock/i)).not.toBeInTheDocument();
  });
});
