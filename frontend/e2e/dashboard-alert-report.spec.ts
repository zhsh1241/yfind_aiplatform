import { expect, test } from '@playwright/test';
import { openNav, seedAuthenticatedSession } from './helpers';

const now = '2026-06-05T00:00:00Z';
const ok = (data: unknown) => ({ code: 0, message: 'success', traceId: 'e2e-f022', timestamp: new Date().toISOString(), data });
const metric = (key: string, name: string, value: number, unit = '个') => ({ key, name, value, unit, trend: '较昨日稳定', status: 'OK' });

const dashboardOverview = {
  metrics: [metric('datasets', '数据集', 18), metric('models', '模型版本', 12), metric('edge', '在线边端', 3), metric('alerts', '开放告警', 1)],
  alertsBySeverity: { CRITICAL: 1, WARNING: 2, INFO: 3 },
  domainHealth: [{ domain: 'MODEL', status: 'WARNING', total: 12, warnings: 1, diagnostic: '评估失败率升高' }, { domain: 'DATA', status: 'HEALTHY', total: 18, warnings: 0, diagnostic: '数据资产稳定' }],
  diagnostic: 'TODO_CONFIRM_OBSERVABILITY_PROVIDER',
};
const todos = { items: [{ todoId: 'TODO-E2E-001', type: 'ALERT', title: '处理模型评估告警', priority: 'CRITICAL', status: 'OPEN', sourceType: 'ALERT', sourceId: 'ALERT-E2E-001', tenantId: 'TENANT-CABIN', createdAt: now, dueAt: null, actionPath: '/alert' }], total: 1, page: 1, pageSize: 8 };
const activities = { items: [{ activityId: 'ACT-E2E-001', action: 'ALERT_CREATED', resourceType: 'Alert', resourceId: 'ALERT-E2E-001', operatorName: 'system', result: 'SUCCESS', riskLevel: 'CRITICAL', occurredAt: now, detail: '创建告警' }], total: 1, page: 1, pageSize: 8 };
const schedulerOverview = { metrics: [metric('running', '运行中任务', 3), metric('failed', '失败任务', 1), metric('waiting', '等待任务', 5), metric('queues', '队列类型', 4)], queues: [{ taskType: 'PIPELINE', total: 5, running: 2, failed: 1, waiting: 2 }], diagnostic: 'TODO_CONFIRM_SCHEDULER_AI_ASSISTANT' };
const schedulerTasks = { items: [{ taskId: 'STASK-E2E-001', taskType: 'PIPELINE', name: '焊缝视频抽帧预处理', status: 'FAILED', tenantId: 'TENANT-CABIN', ownerId: 'USR-ADMIN', startedAt: now, endedAt: null, durationMs: 1200, diagnostic: '算子超时', sourcePath: '/pipeline' }], total: 1, page: 1, pageSize: 20 };
const alertRule = { ruleId: 'RULE-E2E-001', name: '模型失败率规则', severity: 'CRITICAL', sourceType: 'MODEL_EVALUATION', conditionExpression: 'failed > 0', enabled: true, notificationChannel: 'TODO_CONFIRM_NOTIFICATION_CHANNEL', status: 'ACTIVE', diagnostic: '通知渠道待配置' };
const reportDetail = { reportType: 'platform_overview', title: '平台总览报表', filters: { tenantId: 'TENANT-CABIN', range: 'LAST_7_DAYS' }, metrics: [metric('datasets', '数据集', 18), metric('models', '模型版本', 12)], rows: [{ domain: 'MODEL', total: 12, warning: 1 }, { domain: 'DATA', total: 18, warning: 0 }], drillDownSeam: 'TODO_CONFIRM_REPORT_DRILLDOWN' };

function buildAlert(status = 'OPEN') {
  return { alertId: 'ALERT-E2E-001', title: '模型评估失败率过高', severity: 'CRITICAL', status, sourceType: 'MODEL_EVALUATION', sourceId: 'EVAL-E2E-001', tenantId: 'TENANT-CABIN', ownerUserId: 'USR-ADMIN', diagnostic: 'TODO_CONFIRM_OBSERVABILITY_PROVIDER', createdAt: now, acknowledgedAt: status === 'ACKNOWLEDGED' ? now : null, resolvedAt: status === 'RESOLVED' ? now : null };
}

async function routeOperations(page: import('@playwright/test').Page) {
  let alert = buildAlert();
  let exportRecord = { exportId: 'REXP-E2E-001', reportType: 'platform_overview', status: 'QUEUED', requestedBy: 'USR-ADMIN', tenantId: 'TENANT-CABIN', format: 'XLSX', filtersJson: '{}', downloadUrlMasked: null, diagnostic: 'TODO_CONFIRM_REPORT_EXPORT_STORAGE', requestedAt: now, completedAt: null };

  await page.route('**/api/v1/operations/dashboard/overview**', async (route) => route.fulfill({ json: ok(dashboardOverview) }));
  await page.route('**/api/v1/operations/dashboard/todos**', async (route) => route.fulfill({ json: ok(todos) }));
  await page.route('**/api/v1/operations/dashboard/activities**', async (route) => route.fulfill({ json: ok(activities) }));
  await page.route('**/api/v1/operations/scheduler/overview**', async (route) => route.fulfill({ json: ok(schedulerOverview) }));
  await page.route('**/api/v1/operations/scheduler/tasks**', async (route) => route.fulfill({ json: ok(schedulerTasks) }));
  await page.route('**/api/v1/operations/scheduler/assistant:diagnose', async (route) => route.fulfill({ json: ok({ status: 'SEAM_READY', diagnostic: 'TODO_CONFIRM_SCHEDULER_AI_ASSISTANT', suggestions: ['检查算子配置', '重试失败节点'], generatedAt: now }) }));
  await page.route('**/api/v1/operations/alerts/rules', async (route) => route.fulfill({ json: ok([alertRule]) }));
  await page.route(/\/api\/v1\/operations\/alerts\/[^/]+\/acknowledge$/, async (route) => { alert = buildAlert('ACKNOWLEDGED'); await route.fulfill({ json: ok(alert) }); });
  await page.route(/\/api\/v1\/operations\/alerts\/[^/]+\/resolve$/, async (route) => { alert = buildAlert('RESOLVED'); await route.fulfill({ json: ok(alert) }); });
  await page.route(/\/api\/v1\/operations\/alerts\/(?!rules$)[^/?]+(?:\?.*)?$/, async (route) => route.fulfill({ json: ok({ alert, rule: alertRule, timeline: activities.items, relatedResource: { modelId: 'MODEL-YOLO-001' } }) }));
  await page.route(/\/api\/v1\/operations\/alerts(?:\?.*)?$/, async (route) => route.fulfill({ json: ok({ items: [alert], total: 1, page: 1, pageSize: 20 }) }));
  await page.route('**/api/v1/operations/reports/overview**', async (route) => route.fulfill({ json: ok({ metrics: [metric('reports', '报表类型', 7), metric('exports', '导出请求', 1)], reportTypes: ['platform_overview', 'model_assets'], diagnostic: 'TODO_CONFIRM_REPORT_TEMPLATE' }) }));
  await page.route(/\/api\/v1\/operations\/reports\/exports(?:\?.*)?$/, async (route) => route.fulfill({ json: ok({ items: [exportRecord], total: 1, page: 1, pageSize: 10 }) }));
  await page.route(/\/api\/v1\/operations\/reports\/[^/]+\/exports$/, async (route) => { exportRecord = { ...exportRecord, exportId: 'REXP-E2E-NEW' }; await route.fulfill({ json: ok(exportRecord) }); });
  await page.route(/\/api\/v1\/operations\/reports\/[^/?]+(?:\?.*)?$/, async (route) => route.fulfill({ json: ok(reportDetail) }));
}

test('TASK-dashboard-alert-report AC-01~AC-11 运营闭环主链路', async ({ page }) => {
  test.setTimeout(90000);
  await routeOperations(page);
  await seedAuthenticatedSession(page);

  await openNav(page, '工作台');
  await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
  await expect(page.getByText('TASK-dashboard-alert-report')).toBeVisible();
  await expect(page.getByText('处理模型评估告警')).toBeVisible();
  await expect(page.getByText('TODO_CONFIRM_OBSERVABILITY_PROVIDER')).toBeVisible();

  await openNav(page, '调度中心');
  await expect(page.getByRole('heading', { name: '调度中心' })).toBeVisible();
  await expect(page.getByText('焊缝视频抽帧预处理')).toBeVisible();
  await page.getByRole('button', { name: /诊断/ }).last().click();
  await expect(page.getByText(/SEAM_READY|检查算子配置/)).toBeVisible();

  await openNav(page, '告警中心');
  await expect(page.getByRole('heading', { name: '告警中心' })).toBeVisible();
  await page.getByRole('button', { name: '模型评估失败率过高' }).click();
  await expect(page.getByText('ALERT-E2E-001')).toBeVisible();
  await page.getByRole('dialog').filter({ hasText: '告警详情' }).getByLabel('Close').click();
  await expect(page.getByRole('dialog').filter({ hasText: '告警详情' })).toHaveCount(0);
  await page.getByRole('button', { name: /确\s*认/ }).click();
  await expect(page.getByText('告警已确认')).toBeVisible();
  await page.getByRole('button', { name: /关\s*闭/ }).click();
  await expect(page.getByText('告警已关闭')).toBeVisible();
  await expect(page.getByText('模型失败率规则')).toBeVisible();

  await openNav(page, '报表中心');
  await expect(page.getByRole('heading', { name: '报表中心' })).toBeVisible();
  await expect(page.getByText('平台总览报表')).toBeVisible();
  await expect(page.getByText('TODO_CONFIRM_REPORT_DRILLDOWN')).toBeVisible();
  await page.getByRole('button', { name: /导出当前报表/ }).click();
  await expect(page.getByText(/导出请求 REXP-E2E-NEW 已创建/)).toBeVisible();
});
