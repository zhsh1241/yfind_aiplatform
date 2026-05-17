import type { Page } from '@playwright/test';

export const e2eUser = {
  id: 'USR-ADMIN',
  username: 'admin',
  displayName: '平台管理员',
  tenantId: 'TENANT-YF',
  tenantName: '延锋汽车内饰系统',
  buCode: 'YF',
  status: 'ACTIVE',
  roles: ['SUPER_ADMIN'],
  roleNames: ['超级管理员'],
  permissions: ['menu:dash', 'menu:hub', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource'],
  menuPermissions: ['dash', 'hub', 'usermgmt', 'perm', 'org', 'sys', 'resource'],
  sessionVersion: 1,
};


const organizationTree = { nodes: [{ id: 'TENANT-YF', code: 'YF', name: '花叔工业智能', tenantType: 'CORP', parentId: null, path: '/TENANT-YF', status: 'ACTIVE', timezone: 'Asia/Shanghai', defaultLocale: 'zh-CN', quotaGpu: 200, quotaStorageTb: 2000, apiRateLimitPerDay: 50000, userCount: 1, usedGpu: 2, children: [{ id: 'TENANT-CABIN', code: 'CABIN', name: '智能座舱事业部', tenantType: 'BU', parentId: 'TENANT-YF', path: '/TENANT-YF/TENANT-CABIN', status: 'ACTIVE', timezone: 'Asia/Shanghai', defaultLocale: 'zh-CN', quotaGpu: 50, quotaStorageTb: 500, apiRateLimitPerDay: 10000, userCount: 2, usedGpu: 7, children: [{ id: 'TENANT-VISION', code: 'VISION', name: '视觉质检项目', tenantType: 'PROJECT', parentId: 'TENANT-CABIN', path: '/TENANT-YF/TENANT-CABIN/TENANT-VISION', status: 'ACTIVE', timezone: 'Asia/Shanghai', defaultLocale: 'zh-CN', quotaGpu: 8, quotaStorageTb: 5, apiRateLimitPerDay: 1000, userCount: 1, usedGpu: 2, children: [] }] }] }] };
const organizationMembers = { items: [{ id: 'OM-001', organizationId: 'TENANT-CABIN', organizationName: '智能座舱事业部', userId: 'USR-001', username: 'admin', displayName: '平台管理员', roleCode: 'SUPER_ADMIN', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', status: 'ACTIVE', expiresAt: null }], total: 1, page: 1, pageSize: 1 };
const platformConfigs = [
  { key: 'platform.name', groupName: 'basic', displayName: '平台名称', valueType: 'STRING', scopeAllowed: ['GLOBAL', 'BU'], sensitive: false, defaultValue: '延锋 SMP 工业AI平台', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: '延锋 SMP 工业AI平台', effectiveValue: '延锋 SMP 工业AI平台', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'upload.maxFileSizeMb', groupName: 'storage', displayName: '最大上传文件', valueType: 'NUMBER', scopeAllowed: ['GLOBAL', 'BU', 'PROJECT'], sensitive: false, defaultValue: '200', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: '200', effectiveValue: '200', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'notification.smtpHost', groupName: 'notification', displayName: 'SMTP Host', valueType: 'STRING', scopeAllowed: ['GLOBAL', 'BU'], sensitive: true, defaultValue: 'TODO_CONFIRM_SMTP_HOST', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: 'TODO_CONFIRM_SMTP_HOST', effectiveValue: 'TODO_CONFIRM_SMTP_HOST', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'security.evalDatasetDownload', groupName: 'security', displayName: '评估集下载开关', valueType: 'BOOLEAN', scopeAllowed: ['GLOBAL', 'BU', 'PROJECT'], sensitive: false, defaultValue: 'true', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: 'true', effectiveValue: 'true', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'auth.ssoMetadataUrl', groupName: 'auth', displayName: 'IdP 元数据 URL', valueType: 'STRING', scopeAllowed: ['GLOBAL'], sensitive: true, defaultValue: 'TODO_CONFIRM_IDP_METADATA_URL', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: 'TODO_CONFIRM_IDP_METADATA_URL', effectiveValue: 'TODO_CONFIRM_IDP_METADATA_URL', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'tag.defaultScenario', groupName: 'tag', displayName: '默认业务标签', valueType: 'STRING', scopeAllowed: ['GLOBAL', 'BU'], sensitive: false, defaultValue: '质量检测', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: '质量检测', effectiveValue: '质量检测', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
];
const fileObjects = { items: [{ fileId: 'FILE-001', assetType: 'DATASET', tenantId: 'TENANT-CABIN', projectId: 'TENANT-VISION', bucket: 'TODO_CONFIRM_MINIO_BUCKET', objectKey: 'TENANT-CABIN/DATASET/FILE-001.bin', expectedSha256: 'abc', sha256: 'abc', expectedSizeBytes: 1024, sizeBytes: 1024, contentType: 'application/octet-stream', storageTier: 'STANDARD', status: 'AVAILABLE', ownerId: 'USR-001', createdAt: '2026-05-17T00:00:00Z', updatedAt: '2026-05-17T00:00:00Z' }], total: 1, page: 1, pageSize: 1 };
const notificationChannels = [{ channelId: 'NC-GLOBAL-EMAIL', channelType: 'EMAIL', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', name: '邮件通知', enabled: true, configMasked: 'host=TODO_CONFIRM_SMTP_HOST;sender=TODO_CONFIRM_SMTP_SENDER', status: 'UNCONFIGURED', diagnostic: 'TODO_CONFIRM_SMTP_HOST', lastTestAt: null }];
const apiKeys = [{ id: 'AK-001', name: 'CI/CD 集成 Key', prefix: 'smp_live_abcd', maskedKey: 'smp_live_abcd********c91e', plainTextKey: null, scopeType: 'BU', scopeId: 'TENANT-CABIN', permissions: ['INFERENCE_READ'], status: 'ACTIVE', expiresAt: '2026-08-15T00:00:00Z', revokedAt: null, createdAt: '2026-05-17T00:00:00Z', lastUsedAt: null }];

const auditLog = { id: 'AUD-001', eventId: 'EVT-E2E', tenantId: 'TENANT-YF', operatorId: 'USR-ADMIN', operatorName: '平台管理员', operatorRole: 'SUPER_ADMIN', action: 'AUDIT_EXPORT_REQUESTED', resourceType: 'AuditLog', resourceId: 'EXPORT', result: 'SUCCESS', riskLevel: 'CRITICAL', beforeJson: null, afterJson: null, detailJson: 'TODO_CONFIRM_AUDIT_COLD_STORAGE', traceId: 'e2e', signature: 'abcdef1234567890', occurredAt: '2026-05-16T08:00:00Z' };

const paiStatus = { status: 'UNCONFIGURED', configured: false, enabled: false, regionId: 'TODO_CONFIRM_PAI_REGION', endpoint: 'TODO_CONFIRM_PAI_ENDPOINT', workspaceId: 'TODO_CONFIRM_PAI_WORKSPACE_ID', quotaId: 'TODO_CONFIRM_PAI_QUOTA_ID', resourceGroupId: 'TODO_CONFIRM_PAI_RESOURCE_GROUP_ID', credentialMode: 'RAM_ROLE', credentialRefMasked: 'TODO_CONFIRM_PAI_RAM_ROLE_ARN', diagnosticCode: 'PAI_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_PAI_REGION;TODO_CONFIRM_PAI_WORKSPACE_ID;TODO_CONFIRM_PAI_QUOTA_ID', lastSyncAt: null, stale: false };
const paiOverview = { status: 'READY', scopeType: 'BU', scopeId: 'TENANT-CABIN', bindingId: 'PAI-BIND-CABIN', workspaceId: 'pai-ws-cabin-sandbox', quotaId: 'quota-cabin-sandbox', resourceGroupId: 'rg-cabin-general', lastSyncAt: '2026-05-17T00:00:00Z', stale: false, diagnosticCode: 'OK', diagnosticMessage: 'PAI resource sandbox snapshot synchronized', updatedFrom: 'PAI_SNAPSHOT', cards: [{ key: 'gpu', label: 'GPU 总量', used: 36, total: 48, unit: '卡', percent: 75, status: 'WARNING' }, { key: 'npu', label: 'NPU 算力', used: 6, total: 16, unit: '卡', percent: 38, status: 'READY' }, { key: 'cpu', label: 'CPU 核心', used: 128, total: 192, unit: '核', percent: 67, status: 'READY' }, { key: 'storage', label: 'PAI/OSS 存储', used: 145408, total: 204800, unit: 'GB', percent: 71, status: 'READY' }] };
const paiWorkspaces = { items: [{ bindingId: 'PAI-BIND-CABIN', organizationId: 'TENANT-CABIN', organizationName: '智能座舱事业部', scopeType: 'BU', workspaceId: 'pai-ws-cabin-sandbox', workspaceName: 'PAI-CABIN-SANDBOX', quotaId: 'quota-cabin-sandbox', quotaName: '训练资源配额 Sandbox', resourceGroupId: 'rg-cabin-general', status: 'ACTIVE', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX_PAI_BINDING_FOR_CONTRACT_TEST_ONLY', lastSyncAt: '2026-05-17T00:00:00Z' }], total: 1, page: 1, pageSize: 1 };
const paiNodes = { items: [{ nodeId: 'pai-node-a100-01', sourceType: 'PAI_QUOTA_NODE', hostOrZone: 'cn-shanghai-a', gpuSpec: '8×A100 80G', cpuCores: 96, memoryGb: 768, gpuTotal: 8, gpuUsed: 6, gpuUtilizationPercent: 75, status: 'READY', diagnostic: 'from PAI quota sandbox snapshot' }], total: 1, page: 1, pageSize: 1 };
const paiPools = { items: [{ poolId: 'quota-cabin-sandbox', poolName: '训练资源配额 Sandbox', sourceType: 'PAI_RESOURCE_QUOTA', bindingId: 'PAI-BIND-CABIN', quotaId: 'quota-cabin-sandbox', workspaceId: 'pai-ws-cabin-sandbox', gpuUsed: 21, gpuTotal: 24, cpuUsed: 240, cpuTotal: 384, memoryUsedGb: 1024, memoryTotalGb: 1536, userCount: 12, status: 'READY' }], total: 1, page: 1, pageSize: 1 };
const paiStorage = { items: [{ storageId: 'oss-pai-workspace-cabin', name: 'PAI Workspace OSS', sourceType: 'PAI_WORKSPACE_STORAGE', capacityGb: 204800, usedGb: 145408, percent: 71, status: 'READY', diagnostic: 'workspace storage sandbox summary' }], total: 1, page: 1, pageSize: 1 };

export async function mockPlatformApis(page: Page) {
  await page.route('**/api/v1/foundation/status', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { service: 'smp-backend', status: 'READY', domains: ['DATA', 'MODEL', 'INFERENCE', 'RESOURCE', 'PLATFORM'], enabledCapabilities: ['identity', 'permission', 'audit'] } } });
  });
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { accessToken: 'token-f006', refreshToken: 'refresh-f006', tokenType: 'Bearer', expiresInSeconds: 3600, user: e2eUser } } });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: e2eUser } });
  });
  await page.route('**/api/v1/platform/users', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { items: [{ id: 'USR-001', username: 'admin', displayName: '平台管理员', email: 'admin@yf.local', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', authType: 'LOCAL', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], lastLoginAt: null, failedLoginCount: 0, lockedUntil: null, sessionVersion: 1 }], total: 1, page: 1, pageSize: 1 } } });
  });
  await page.route('**/api/v1/platform/roles', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: [{ code: 'SUPER_ADMIN', name: '超级管理员', description: '全平台所有权限', scope: 'GLOBAL', preset: true, userCount: 1 }, { code: 'BU_ADMIN', name: 'BU子管理员', description: 'BU 范围管理', scope: 'TENANT', preset: true, userCount: 1 }] } });
  });
  await page.route('**/api/v1/platform/permissions/matrix', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { roles: [{ code: 'SUPER_ADMIN', name: '超级管理员', description: '全平台所有权限', scope: 'GLOBAL', preset: true, userCount: 1 }, { code: 'BU_ADMIN', name: 'BU子管理员', description: 'BU 范围管理', scope: 'TENANT', preset: true, userCount: 1 }], modules: [{ name: '平台管理', permissions: [] }], rows: [{ module: '平台管理', permissionCode: 'platform:user:read', permissionName: '查询用户', allowedRoles: ['SUPER_ADMIN', 'BU_ADMIN'] }] } } });
  });

  await page.route('**/api/v1/platform/organizations/tree', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: organizationTree } });
  });
  await page.route('**/api/v1/platform/organizations/members', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: organizationMembers } });
  });
  await page.route('**/api/v1/platform/configs**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: platformConfigs } });
  });
  await page.route('**/api/v1/platform/files**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: fileObjects } });
  });
  await page.route('**/api/v1/platform/notification-channels/*/test', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { channelId: 'NC-GLOBAL-EMAIL', result: 'UNCONFIGURED', diagnostic: 'TODO_CONFIRM_SMTP_HOST', testedAt: '2026-05-17T00:00:00Z' } } });
  });
  await page.route('**/api/v1/platform/notification-channels', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: notificationChannels } });
  });
  await page.route('**/api/v1/platform/api-keys/*/revoke', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...apiKeys[0], status: 'REVOKED', revokedAt: '2026-05-17T00:00:00Z' } } });
  });
  await page.route('**/api/v1/platform/api-keys', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...apiKeys[0], id: 'AK-NEW', name: 'E2E Key', plainTextKey: 'smp_live_new_plaintext_once' } } });
      return;
    }
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: apiKeys } });
  });


  await page.route('**/api/v1/platform/pai-resources/status', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: paiStatus } });
  });
  await page.route('**/api/v1/platform/pai-resources/overview**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: paiOverview } });
  });
  await page.route('**/api/v1/platform/pai-resources/workspaces', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: paiWorkspaces } });
  });
  await page.route('**/api/v1/platform/pai-resources/nodes**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: paiNodes } });
  });
  await page.route('**/api/v1/platform/pai-resources/pools**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: paiPools } });
  });
  await page.route('**/api/v1/platform/pai-resources/storage**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: paiStorage } });
  });
  await page.route('**/api/v1/platform/pai-resources/sync', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { syncId: 'PAI-SYNC-E2E', bindingId: 'PAI-BIND-CABIN', result: 'FAILED', status: 'UNCONFIGURED', diagnosticCode: 'PAI_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_PAI_REGION', lastSyncAt: '2026-05-17T00:00:00Z', stale: true, paiRequestId: 'TODO_CONFIRM_PAI_REQUEST_ID_OR_SANDBOX' } } });
  });
  await page.route('**/api/v1/platform/pai-resources/connection', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...paiStatus, status: 'READY', configured: true, enabled: true, regionId: 'cn-shanghai', diagnosticCode: 'OK', diagnosticMessage: 'ready for e2e' } } });
  });

  await page.route('**/api/v1/platform/audit-logs**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { items: [auditLog], total: 1, page: 1, pageSize: 1 } } });
  });
}

export async function seedAuthenticatedSession(page: Page) {
  await mockPlatformApis(page);
  await page.goto('/login');
  await page.getByLabel('密码').fill('Smp@123456');
  await page.getByRole('button', { name: /登\s*录/ }).click();
  await page.getByText('SMP 工业 AI 小模型平台').waitFor({ state: 'visible' });
}
