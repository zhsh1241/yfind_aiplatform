import { expect, test } from '@playwright/test';
import { openNav, seedAuthenticatedSession } from './helpers';

type EdgeServer = {
  edgeServerId: string;
  serverName: string;
  location: string;
  organizationId: string;
  ownerUserId: string;
  ownerName: string;
  hostAddress: string;
  agentVersion: string;
  hardwareSummary: Record<string, unknown>;
  resourceSummary: Record<string, unknown>;
  status: string;
  diagnostic: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  lastHeartbeatAt: string | null;
  decommissionedAt: string | null;
  permissionSummary: Record<string, boolean>;
};

type EdgeDeployment = {
  deploymentId: string;
  edgeServerId: string;
  edgeServerName: string;
  modelId: string;
  modelName: string;
  versionId: string;
  versionNo: string;
  artifactFileObjectId: string;
  artifactSha256: string;
  strategy: string;
  status: string;
  approvalStatus: string;
  requestedBy: string;
  approvedBy: string | null;
  executedBy: string | null;
  tenantId: string;
  organizationId: string;
  diagnostic: string;
  failureReason: string | null;
  retryCount: number;
  scheduledAt: string | null;
  requestedAt: string;
  approvedAt: string | null;
  executedAt: string | null;
  verifiedAt: string | null;
  deployedAt: string | null;
  rolledBackAt: string | null;
  rollbackTargetDeploymentId: string | null;
  permissionSummary: Record<string, boolean>;
};

const ok = (data: unknown) => ({ code: 0, message: 'success', traceId: 'e2e-f021', timestamp: new Date().toISOString(), data });
const permissionSummary = { canRead: true, canWrite: true, canRequestDeployment: true, canApproveDeployment: true, canExecuteDeployment: true };

function buildServer(overrides: Partial<EdgeServer> = {}): EdgeServer {
  return {
    edgeServerId: 'EDGE-E2E-001',
    serverName: '上海工厂A车间边端',
    location: '上海工厂A车间',
    organizationId: 'TENANT-CABIN',
    ownerUserId: 'USR-ADMIN',
    ownerName: '平台管理员',
    hostAddress: '10.21.0.8',
    agentVersion: '1.0.0',
    hardwareSummary: { gpu: 'NVIDIA T4 x1' },
    resourceSummary: { cpuUsage: 0.31 },
    status: 'ONLINE',
    diagnostic: 'MANUAL_AGENT_SEAM;TODO_CONFIRM_EDGE_AGENT_PROTOCOL',
    tenantId: 'TENANT-CABIN',
    createdAt: '2026-06-05T00:00:00Z',
    updatedAt: '2026-06-05T00:00:00Z',
    lastHeartbeatAt: '2026-06-05T00:01:00Z',
    decommissionedAt: null,
    permissionSummary,
    ...overrides,
  };
}

function buildDeployment(server: EdgeServer, overrides: Partial<EdgeDeployment> = {}): EdgeDeployment {
  return {
    deploymentId: 'EDGEDEP-E2E-001',
    edgeServerId: server.edgeServerId,
    edgeServerName: server.serverName,
    modelId: 'MODEL-YOLO-001',
    modelName: '焊缝缺陷检测 YOLOv8',
    versionId: 'MVER-YOLO-001-V1',
    versionNo: 'v1.0',
    artifactFileObjectId: 'FILE-MODEL-001',
    artifactSha256: 'sha256-model-001',
    strategy: 'IMMEDIATE',
    status: 'REQUESTED',
    approvalStatus: 'PENDING',
    requestedBy: 'USR-ADMIN',
    approvedBy: null,
    executedBy: null,
    tenantId: 'TENANT-CABIN',
    organizationId: 'TENANT-CABIN',
    diagnostic: 'TODO_CONFIRM_EDGE_APPROVAL_INTEGRATION',
    failureReason: null,
    retryCount: 0,
    scheduledAt: null,
    requestedAt: '2026-06-05T00:02:00Z',
    approvedAt: null,
    executedAt: null,
    verifiedAt: null,
    deployedAt: null,
    rolledBackAt: null,
    rollbackTargetDeploymentId: null,
    permissionSummary,
    ...overrides,
  };
}

test('TASK-edge-management-delivery AC-01 AC-03 AC-04 AC-05 AC-06 AC-07 AC-10 边端管理主链路', async ({ page }) => {
  test.setTimeout(90000);
  let server = buildServer();
  let deployment = buildDeployment(server);

  await page.route('**/api/v1/edge-servers**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === '/api/v1/edge-servers' && method === 'POST') {
      const body = route.request().postDataJSON() as Partial<EdgeServer>;
      server = buildServer({ edgeServerId: 'EDGE-E2E-NEW', serverName: body.serverName ?? '上海工厂B车间边端', location: body.location ?? '上海工厂B车间', hostAddress: body.hostAddress ?? '10.21.0.9', status: 'REGISTERED' });
      await route.fulfill({ json: ok(server) });
      return;
    }
    if (url.pathname === '/api/v1/edge-servers') {
      await route.fulfill({ json: ok({ items: [server], total: 1, page: 1, pageSize: 20 }) });
      return;
    }
    if (url.pathname.endsWith('/heartbeat')) {
      server = { ...server, status: 'ONLINE', resourceSummary: { cpuUsage: 0.35 }, lastHeartbeatAt: '2026-06-05T00:05:00Z' };
      await route.fulfill({ json: ok(server) });
      return;
    }
    if (url.pathname.endsWith('/actions:decommission')) {
      server = { ...server, status: 'DECOMMISSIONED', decommissionedAt: '2026-06-05T00:10:00Z' };
      await route.fulfill({ json: ok(server) });
      return;
    }
    await route.fulfill({ json: ok(server) });
  });

  await page.route('**/api/v1/edge-deployments**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === '/api/v1/edge-deployments' && method === 'POST') {
      const body = route.request().postDataJSON() as Partial<EdgeDeployment>;
      deployment = buildDeployment(server, { deploymentId: 'EDGEDEP-E2E-NEW', modelId: body.modelId ?? 'MODEL-YOLO-001', versionId: body.versionId ?? 'MVER-YOLO-001-V1' });
      await route.fulfill({ json: ok(deployment) });
      return;
    }
    if (url.pathname === '/api/v1/edge-deployments') {
      await route.fulfill({ json: ok({ items: [deployment], total: 1, page: 1, pageSize: 50 }) });
      return;
    }
    if (url.pathname.endsWith('/approvals:approve')) {
      deployment = { ...deployment, status: 'APPROVED', approvalStatus: 'APPROVED', approvedBy: 'USR-ADMIN', approvedAt: '2026-06-05T00:03:00Z' };
      await route.fulfill({ json: ok(deployment) });
      return;
    }
    if (url.pathname.endsWith('/actions:execute')) {
      deployment = { ...deployment, status: 'VERIFYING', approvalStatus: 'APPROVED', executedBy: 'USR-ADMIN', executedAt: '2026-06-05T00:04:00Z', diagnostic: 'MANUAL_AGENT_SEAM;TODO_CONFIRM_EDGE_AGENT_PROTOCOL' };
      await route.fulfill({ json: ok(deployment) });
      return;
    }
    if (url.pathname.endsWith('/actions:verify-integrity')) {
      const body = route.request().postDataJSON() as { receivedSha256?: string };
      if (body.receivedSha256 !== deployment.artifactSha256) {
        deployment = { ...deployment, status: 'FAILED', failureReason: '完整性校验失败', retryCount: deployment.retryCount + 1 };
        await route.fulfill({ status: 422, json: { code: 42263, message: '完整性校验失败', traceId: 'e2e-f021', timestamp: new Date().toISOString(), data: null } });
        return;
      }
      deployment = { ...deployment, status: 'DEPLOYED', verifiedAt: '2026-06-05T00:05:00Z', deployedAt: '2026-06-05T00:05:00Z' };
      await route.fulfill({ json: ok({ deployment, server, approvals: [{ approvalId: 'APP-E2E', deploymentId: deployment.deploymentId, approverUserId: 'USR-ADMIN', decision: 'APPROVED', comment: '页面审批通过', decidedAt: '2026-06-05T00:03:00Z' }] }) });
      return;
    }
    if (url.pathname.endsWith('/actions:rollback')) {
      deployment = { ...deployment, status: 'ROLLED_BACK', rolledBackAt: '2026-06-05T00:06:00Z' };
      await route.fulfill({ json: ok(deployment) });
      return;
    }
    await route.fulfill({ json: ok({ deployment, server, approvals: [] }) });
  });

  await seedAuthenticatedSession(page);
  await openNav(page, '边端管理');

  await expect(page.getByRole('heading', { name: '边端管理' })).toBeVisible();
  await expect(page.getByText('TASK-edge-management-delivery')).toBeVisible();
  await expect(page.getByText('上海工厂A车间边端')).toBeVisible();
  await expect(page.getByText('MANUAL_AGENT_SEAM 与 TODO_CONFIRM_EDGE_AGENT_PROTOCOL')).toBeVisible();

  await page.getByRole('button', { name: /注册边端服务器/ }).click();
  const registerDialog = page.getByRole('dialog').filter({ hasText: '注册边端服务器' });
  await registerDialog.getByLabel('服务器名称').fill('上海工厂B车间边端');
  await registerDialog.getByLabel('位置').fill('上海工厂B车间');
  await registerDialog.getByLabel('主机地址').fill('10.21.0.9');
  await registerDialog.getByRole('button', { name: /OK|确/ }).click();
  await expect(page.getByText('边端服务器 上海工厂B车间边端 已注册')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog').filter({ hasText: '注册边端服务器' })).toHaveCount(0);

  await page.getByRole('button', { name: '申请下发' }).click();
  const deploymentDialog = page.getByRole('dialog').filter({ hasText: '创建模型下发申请' });
  await deploymentDialog.getByLabel('模型 ID').fill('MODEL-YOLO-001');
  await deploymentDialog.getByLabel('Production 版本 ID').fill('MVER-YOLO-001-V1');
  await deploymentDialog.getByLabel('申请说明').fill('F021 E2E 下发申请');
  await deploymentDialog.getByRole('button', { name: /OK|确/ }).click();
  await expect(page.getByText(/下发申请 EDGEDEP-E2E-NEW 已创建/)).toBeVisible();

  await page.getByRole('button', { name: 'EDGEDEP-E2E-NEW' }).click();
  const detailDrawer = page.getByRole('dialog').filter({ hasText: '下发详情' });
  await expect(detailDrawer.getByText('sha256-model-001')).toBeVisible();
  await detailDrawer.getByRole('button', { name: '审批通过' }).click();
  await expect(page.getByText('下发申请已授权')).toBeVisible();
  await expect(detailDrawer.getByRole('button', { name: /执行/ })).toBeEnabled();
  await detailDrawer.getByRole('button', { name: /执行/ }).click();
  await expect(page.getByText('已进入边端执行与完整性验证 seam')).toBeVisible();
  await detailDrawer.getByRole('button', { name: '提交校验' }).click();
  await expect(page.getByText('完整性校验通过，部署已完成')).toBeVisible();
  await expect(page.getByText('DEPLOYED')).toBeVisible();

  await page.getByRole('button', { name: '记录回滚' }).click();
  await expect(page.getByText('回滚记录已写入')).toBeVisible();
});
