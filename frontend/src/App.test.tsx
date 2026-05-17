import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import type { CurrentUser } from './features/platform/platformApi';
import { useSessionStore } from './features/platform/sessionStore';

const mockState = {
  token: null as string | null,
  user: null as CurrentUser | null,
};

const mockUsers = [
  { id: 'USR-001', username: 'admin', displayName: '平台管理员', email: 'admin@yf.local', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', authType: 'LOCAL', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], lastLoginAt: '2026-05-16T09:00:00+08:00', failedLoginCount: 0, lockedUntil: null, sessionVersion: 1 },
];

const mockRoles = [
  { code: 'SUPER_ADMIN', name: '超级管理员', description: '全平台所有权限', scope: 'GLOBAL', preset: true, userCount: 1 },
  { code: 'BU_ADMIN', name: 'BU子管理员', description: 'BU 范围管理', scope: 'TENANT', preset: true, userCount: 1 },
  { code: 'DATA_ANNOTATOR', name: '数据标注工程师', description: '标注任务执行', scope: 'TENANT', preset: true, userCount: 1 },
  { code: 'DATA_REVIEWER', name: '审核工程师', description: '标注审核', scope: 'TENANT', preset: true, userCount: 1 },
  { code: 'MODEL_TRAINER', name: '模型训练工程师', description: '模型训练', scope: 'TENANT', preset: true, userCount: 1 },
  { code: 'MODEL_OPS', name: '模型应用工程师', description: '推理运维', scope: 'TENANT', preset: true, userCount: 1 },
];

const mockMatrix = {
  roles: mockRoles,
  modules: [{ name: '平台管理', permissions: [] }],
  rows: [{ module: '平台管理', permissionCode: 'platform:user:read', permissionName: '查询用户', allowedRoles: ['SUPER_ADMIN', 'BU_ADMIN'] }],
};

const mockAuditLog = { id: 'AUD-001', eventId: 'EVT-UNIT', tenantId: 'TENANT-YF', operatorId: 'USR-001', operatorName: '平台管理员', operatorRole: 'SUPER_ADMIN', action: 'AUDIT_EXPORT_REQUESTED', resourceType: 'AuditLog', resourceId: 'EXPORT', result: 'SUCCESS', riskLevel: 'CRITICAL', beforeJson: null, afterJson: null, detailJson: 'TODO_CONFIRM_AUDIT_COLD_STORAGE', traceId: 't', signature: 'abcdef1234567890', occurredAt: '2026-05-16T08:00:00Z' };

const mockOrganizations = { nodes: [{ id: 'TENANT-YF', code: 'YF', name: '花叔工业智能', tenantType: 'CORP', parentId: null, path: '/TENANT-YF', status: 'ACTIVE', timezone: 'Asia/Shanghai', defaultLocale: 'zh-CN', quotaGpu: 200, quotaStorageTb: 2000, apiRateLimitPerDay: 50000, userCount: 1, usedGpu: 2, children: [{ id: 'TENANT-CABIN', code: 'CABIN', name: '智能座舱事业部', tenantType: 'BU', parentId: 'TENANT-YF', path: '/TENANT-YF/TENANT-CABIN', status: 'ACTIVE', timezone: 'Asia/Shanghai', defaultLocale: 'zh-CN', quotaGpu: 50, quotaStorageTb: 500, apiRateLimitPerDay: 10000, userCount: 2, usedGpu: 7, children: [{ id: 'TENANT-VISION', code: 'VISION', name: '视觉质检项目', tenantType: 'PROJECT', parentId: 'TENANT-CABIN', path: '/TENANT-YF/TENANT-CABIN/TENANT-VISION', status: 'ACTIVE', timezone: 'Asia/Shanghai', defaultLocale: 'zh-CN', quotaGpu: 8, quotaStorageTb: 5, apiRateLimitPerDay: 1000, userCount: 1, usedGpu: 2, children: [] }] }] }] };
const mockMembers = { items: [{ id: 'OM-001', organizationId: 'TENANT-CABIN', organizationName: '智能座舱事业部', userId: 'USR-001', username: 'admin', displayName: '平台管理员', roleCode: 'SUPER_ADMIN', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', status: 'ACTIVE', expiresAt: null }], total: 1, page: 1, pageSize: 1 };
const mockConfigs = [
  { key: 'platform.name', groupName: 'basic', displayName: '平台名称', valueType: 'STRING', scopeAllowed: ['GLOBAL', 'BU'], sensitive: false, defaultValue: '延锋 SMP 工业AI平台', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: '延锋 SMP 工业AI平台', effectiveValue: '延锋 SMP 工业AI平台', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'upload.maxFileSizeMb', groupName: 'storage', displayName: '最大上传文件', valueType: 'NUMBER', scopeAllowed: ['GLOBAL', 'BU', 'PROJECT'], sensitive: false, defaultValue: '200', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: '200', effectiveValue: '200', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'notification.smtpHost', groupName: 'notification', displayName: 'SMTP Host', valueType: 'STRING', scopeAllowed: ['GLOBAL', 'BU'], sensitive: true, defaultValue: 'TODO_CONFIRM_SMTP_HOST', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: 'TODO_CONFIRM_SMTP_HOST', effectiveValue: 'TODO_CONFIRM_SMTP_HOST', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'security.evalDatasetDownload', groupName: 'security', displayName: '评估集下载开关', valueType: 'BOOLEAN', scopeAllowed: ['GLOBAL', 'BU', 'PROJECT'], sensitive: false, defaultValue: 'true', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: 'true', effectiveValue: 'true', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'auth.ssoMetadataUrl', groupName: 'auth', displayName: 'IdP 元数据 URL', valueType: 'STRING', scopeAllowed: ['GLOBAL'], sensitive: true, defaultValue: 'TODO_CONFIRM_IDP_METADATA_URL', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: 'TODO_CONFIRM_IDP_METADATA_URL', effectiveValue: 'TODO_CONFIRM_IDP_METADATA_URL', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'tag.defaultScenario', groupName: 'tag', displayName: '默认业务标签', valueType: 'STRING', scopeAllowed: ['GLOBAL', 'BU'], sensitive: false, defaultValue: '质量检测', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: '质量检测', effectiveValue: '质量检测', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
];
const mockFiles = { items: [{ fileId: 'FILE-001', assetType: 'DATASET', tenantId: 'TENANT-CABIN', projectId: 'TENANT-VISION', bucket: 'TODO_CONFIRM_MINIO_BUCKET', objectKey: 'TENANT-CABIN/DATASET/FILE-001.bin', expectedSha256: 'abc', sha256: 'abc', expectedSizeBytes: 1024, sizeBytes: 1024, contentType: 'application/octet-stream', storageTier: 'STANDARD', status: 'AVAILABLE', ownerId: 'USR-001', createdAt: '2026-05-17T00:00:00Z', updatedAt: '2026-05-17T00:00:00Z' }], total: 1, page: 1, pageSize: 1 };
const mockChannels = [{ channelId: 'NC-GLOBAL-EMAIL', channelType: 'EMAIL', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', name: '邮件通知', enabled: true, configMasked: 'host=TODO_CONFIRM_SMTP_HOST;sender=TODO_CONFIRM_SMTP_SENDER', status: 'UNCONFIGURED', diagnostic: 'TODO_CONFIRM_SMTP_HOST', lastTestAt: null }];

const mockPaiStatus = { status: 'UNCONFIGURED', configured: false, enabled: false, regionId: 'TODO_CONFIRM_PAI_REGION', endpoint: 'TODO_CONFIRM_PAI_ENDPOINT', workspaceId: 'TODO_CONFIRM_PAI_WORKSPACE_ID', quotaId: 'TODO_CONFIRM_PAI_QUOTA_ID', resourceGroupId: 'TODO_CONFIRM_PAI_RESOURCE_GROUP_ID', credentialMode: 'RAM_ROLE', credentialRefMasked: 'TODO_CONFIRM_PAI_RAM_ROLE_ARN', diagnosticCode: 'PAI_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_PAI_REGION;TODO_CONFIRM_PAI_WORKSPACE_ID;TODO_CONFIRM_PAI_QUOTA_ID', lastSyncAt: null, stale: false };
const mockPaiOverview = { status: 'READY', scopeType: 'BU', scopeId: 'TENANT-CABIN', bindingId: 'PAI-BIND-CABIN', workspaceId: 'pai-ws-cabin-sandbox', quotaId: 'quota-cabin-sandbox', resourceGroupId: 'rg-cabin-general', lastSyncAt: '2026-05-17T00:00:00Z', stale: false, diagnosticCode: 'OK', diagnosticMessage: 'PAI resource sandbox snapshot synchronized', updatedFrom: 'PAI_SNAPSHOT', cards: [{ key: 'gpu', label: 'GPU 总量', used: 36, total: 48, unit: '卡', percent: 75, status: 'WARNING' }, { key: 'npu', label: 'NPU 算力', used: 6, total: 16, unit: '卡', percent: 38, status: 'READY' }, { key: 'cpu', label: 'CPU 核心', used: 128, total: 192, unit: '核', percent: 67, status: 'READY' }, { key: 'storage', label: 'PAI/OSS 存储', used: 145408, total: 204800, unit: 'GB', percent: 71, status: 'READY' }] };
const mockPaiWorkspaces = { items: [{ bindingId: 'PAI-BIND-CABIN', organizationId: 'TENANT-CABIN', organizationName: '智能座舱事业部', scopeType: 'BU', workspaceId: 'pai-ws-cabin-sandbox', workspaceName: 'PAI-CABIN-SANDBOX', quotaId: 'quota-cabin-sandbox', quotaName: '训练资源配额 Sandbox', resourceGroupId: 'rg-cabin-general', status: 'ACTIVE', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX_PAI_BINDING_FOR_CONTRACT_TEST_ONLY', lastSyncAt: '2026-05-17T00:00:00Z' }], total: 1, page: 1, pageSize: 1 };
const mockPaiNodes = { items: [{ nodeId: 'pai-node-a100-01', sourceType: 'PAI_QUOTA_NODE', hostOrZone: 'cn-shanghai-a', gpuSpec: '8×A100 80G', cpuCores: 96, memoryGb: 768, gpuTotal: 8, gpuUsed: 6, gpuUtilizationPercent: 75, status: 'READY', diagnostic: 'from PAI quota sandbox snapshot' }], total: 1, page: 1, pageSize: 1 };
const mockPaiPools = { items: [{ poolId: 'quota-cabin-sandbox', poolName: '训练资源配额 Sandbox', sourceType: 'PAI_RESOURCE_QUOTA', bindingId: 'PAI-BIND-CABIN', quotaId: 'quota-cabin-sandbox', workspaceId: 'pai-ws-cabin-sandbox', gpuUsed: 21, gpuTotal: 24, cpuUsed: 240, cpuTotal: 384, memoryUsedGb: 1024, memoryTotalGb: 1536, userCount: 12, status: 'READY' }], total: 1, page: 1, pageSize: 1 };
const mockPaiStorage = { items: [{ storageId: 'oss-pai-workspace-cabin', name: 'PAI Workspace OSS', sourceType: 'PAI_WORKSPACE_STORAGE', capacityGb: 204800, usedGb: 145408, percent: 71, status: 'READY', diagnostic: 'workspace storage sandbox summary' }], total: 1, page: 1, pageSize: 1 };
const mockApiKeys = [{ id: 'AK-001', name: 'CI/CD 集成 Key', prefix: 'smp_live_abcd', maskedKey: 'smp_live_abcd********c91e', plainTextKey: null, scopeType: 'BU', scopeId: 'TENANT-CABIN', permissions: ['INFERENCE_READ'], status: 'ACTIVE', expiresAt: '2026-08-15T00:00:00Z', revokedAt: null, createdAt: '2026-05-17T00:00:00Z', lastUsedAt: null }];

vi.mock('./features/foundation/apiClient', () => ({
  apiClient: {
    get: vi.fn((url: string) => {
      if (url.includes('/auth/me')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockState.user } });
      if (url.includes('/platform/users')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { items: mockUsers, total: 1, page: 1, pageSize: 1 } } });
      if (url.includes('/platform/roles')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockRoles } });
      if (url.includes('/platform/permissions/matrix')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockMatrix } });
      if (url.includes('/platform/organizations/tree')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockOrganizations } });
      if (url.includes('/platform/organizations/members')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockMembers } });
      if (url.includes('/platform/configs')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockConfigs } });
      if (url.includes('/platform/files')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockFiles } });
      if (url.includes('/platform/notification-channels')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockChannels } });
      if (url.includes('/platform/pai-resources/sync')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { syncId: 'PAI-SYNC-UNIT', bindingId: 'PAI-BIND-CABIN', result: 'FAILED', status: 'UNCONFIGURED', diagnosticCode: 'PAI_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_PAI_REGION', lastSyncAt: '2026-05-17T00:00:00Z', stale: true, paiRequestId: 'TODO_CONFIRM_PAI_REQUEST_ID_OR_SANDBOX' } } });
      if (url.includes('/platform/api-keys')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockApiKeys } });
      if (url.includes('/platform/pai-resources/status')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiStatus } });
      if (url.includes('/platform/pai-resources/overview')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiOverview } });
      if (url.includes('/platform/pai-resources/workspaces')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiWorkspaces } });
      if (url.includes('/platform/pai-resources/nodes')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiNodes } });
      if (url.includes('/platform/pai-resources/pools')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiPools } });
      if (url.includes('/platform/pai-resources/storage')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiStorage } });
      if (url.includes('/platform/audit-logs')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { items: [mockAuditLog], total: 1, page: 1, pageSize: 1 } } });
      return Promise.reject(new Error('backend not running in frontend unit test'));
    }),
    put: vi.fn((url: string) => {
      if (url.includes('/platform/pai-resources/bindings')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiWorkspaces.items[0] } });
      if (url.includes('/platform/pai-resources/connection')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { ...mockPaiStatus, status: 'READY', configured: true, enabled: true, regionId: 'cn-shanghai', diagnosticCode: 'OK', diagnosticMessage: 'ready for test' } } });
      return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockConfigs[0] } });
    }),
    patch: vi.fn(() => Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockOrganizations.nodes[0] } })),
    post: vi.fn((url: string) => {
      if (url.includes('/auth/login')) {
        mockState.token = 'token-f006';
        mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource'], menuPermissions: ['dash', 'usermgmt', 'perm', 'org', 'sys', 'resource'], sessionVersion: 1 };
        return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { accessToken: 'token-f006', refreshToken: 'refresh', tokenType: 'Bearer', expiresInSeconds: 3600, user: mockState.user } } });
      }
      if (url.includes('/platform/pai-resources/sync')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { syncId: 'PAI-SYNC-UNIT', bindingId: 'PAI-BIND-CABIN', result: 'FAILED', status: 'UNCONFIGURED', diagnosticCode: 'PAI_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_PAI_REGION', lastSyncAt: '2026-05-17T00:00:00Z', stale: true, paiRequestId: 'TODO_CONFIRM_PAI_REQUEST_ID_OR_SANDBOX' } } });
      if (url.includes('/platform/api-keys')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { ...mockApiKeys[0], id: 'AK-NEW', plainTextKey: 'smp_live_new_plaintext_once' } } });
      if (url.includes('/platform/notification-channels')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { channelId: 'NC-GLOBAL-EMAIL', result: 'UNCONFIGURED', diagnostic: 'TODO_CONFIRM_SMTP_HOST', testedAt: '2026-05-17T00:00:00Z' } } });
      return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: {} } });
    }),
    interceptors: { request: { use: vi.fn() } },
  },
}));

function renderApp(initialEntries = ['/login']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('F006 platform identity frontend', () => {
  // TASK-platform-organization-config AC-08
  beforeEach(() => {
    // TASK-platform-identity-audit AC-01 AC-08 AC-09
    mockState.token = null;
    mockState.user = null;
    useSessionStore.setState({ token: null, user: null, initialized: false });
  });

  it('renders prototype-consistent login and navigates after API login', async () => {
    renderApp(['/login']);

    expect(screen.getByText('⚙ SMP')).toBeInTheDocument();
    expect(screen.getByText('工业 AI 平台')).toBeInTheDocument();
    expect(screen.getByText('账号登录')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('密码'), 'Smp@123456');
    await userEvent.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => expect(screen.getByText('SMP 工业 AI 小模型平台')).toBeInTheDocument());
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('权限管理')).toBeInTheDocument();
  });

  it('keeps usermgmt tabs, table, role cards and permission matrix API-driven', async () => {
    mockState.token = 'token-f006';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource'], menuPermissions: ['dash', 'usermgmt', 'perm', 'org', 'sys', 'resource'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f006', user: mockState.user, initialized: true });
    renderApp(['/usermgmt']);

    expect(await screen.findByText('账号管理 · 角色分配 · GPU 用量统计')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '用户列表' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '角色管理' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '权限矩阵' })).toBeInTheDocument();
    expect(await screen.findByText('平台管理员')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: '角色管理' }));
    expect((await screen.findAllByText('SUPER_ADMIN')).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('tab', { name: '权限矩阵' }));
    expect(await screen.findByText('查询用户')).toBeInTheDocument();
  });

  it('keeps perm page title, tabs, approval cards, grant list and dialogs', async () => {
    mockState.token = 'token-f006';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource'], menuPermissions: ['dash', 'usermgmt', 'perm', 'org', 'sys', 'resource'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f006', user: mockState.user, initialized: true });
    renderApp(['/perm']);

    expect(await screen.findByText('RBAC 角色权限矩阵 · 6 个预设角色')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '当前权限概览' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '申请历史' })).toBeInTheDocument();
    expect(await screen.findByText('待审批')).toBeInTheDocument();
    expect(screen.getByText('数据集访问授权')).toBeInTheDocument();
    expect(await screen.findByText('AUDIT_EXPORT_REQUESTED · 平台管理员')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '添加授权' }));
    expect((await screen.findAllByText('授权对象')).length).toBeGreaterThan(1);
    await userEvent.keyboard('{Escape}');
  });

  it('renders org page with prototype tabs and real organization APIs', async () => {
    mockState.token = 'token-f007';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource'], menuPermissions: ['dash', 'usermgmt', 'perm', 'org', 'sys', 'resource'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f007', user: mockState.user, initialized: true });
    renderApp(['/org']);

    expect(await screen.findByText('花叔工业智能 · 组织架构管理')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '组织架构' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '部门管理' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '成员管理' })).toBeInTheDocument();
    expect((await screen.findAllByText('智能座舱事业部')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '＋ 新建租户' })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: '编辑配额' })[0]);
    expect((await screen.findAllByText(/编辑配额/)).length).toBeGreaterThan(0);
    await userEvent.keyboard('{Escape}');
  });

  it('renders sys page with config, notification and one-time API key paths', async () => {
    mockState.token = 'token-f007';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource'], menuPermissions: ['dash', 'usermgmt', 'perm', 'org', 'sys', 'resource'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f007', user: mockState.user, initialized: true });
    renderApp(['/sys']);

    expect(await screen.findByText('基础设置 · 存储配置 · 通知设置 · API 密钥 · 数据安全 · 认证集成 · 标签管理')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '基础设置' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '通知设置' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'API 密钥' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: '通知设置' }));
    expect(await screen.findByText('TODO_CONFIRM_SMTP_HOST')).toBeInTheDocument();
    expect(screen.getByText('UNCONFIGURED')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'API 密钥' }));
    expect(await screen.findByText('CI/CD 集成 Key')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '＋ 新建 API Key' }));
    expect(await screen.findByText('新建 API Key')).toBeInTheDocument();
  });

  it('renders resource page with PAI unconfigured guidance and prototype tabs', async () => {
    // TASK-pai-resource-integration AC-01 AC-02 AC-05 AC-06
    mockState.token = 'token-f008';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource'], menuPermissions: ['dash', 'usermgmt', 'perm', 'org', 'sys', 'resource'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f008', user: mockState.user, initialized: true });
    renderApp(['/resource']);

    expect(await screen.findByRole('heading', { name: '资源管理' })).toBeInTheDocument();
    expect(screen.getByText(/阿里云 PAI Workspace/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '集群总览' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'GPU 节点' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '资源池' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '存储' })).toBeInTheDocument();
    expect(await screen.findByText('PAI 连接尚未配置')).toBeInTheDocument();
    expect(screen.getAllByText(/TODO_CONFIRM_PAI_REGION/).length).toBeGreaterThan(0);
    expect(screen.getByText('GPU 总量')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '手动同步 PAI' }));
    expect(await screen.findByText(/PAI 同步返回 UNCONFIGURED/)).toBeInTheDocument();
  });

});
