import { apiClient, type ApiResponse } from '../foundation/apiClient';

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  tenantId: string;
  tenantName: string;
  buCode: string;
  status: string;
  roles: string[];
  roleNames: string[];
  permissions: string[];
  menuPermissions: string[];
  sessionVersion: number;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: CurrentUser;
};

export type UserSummary = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  tenantId: string;
  tenantName: string;
  buCode: string;
  status: string;
  authType: string;
  roles: string[];
  roleNames: string[];
  lastLoginAt: string | null;
  failedLoginCount: number;
  lockedUntil: string | null;
  sessionVersion: number;
};

export type RoleSummary = {
  code: string;
  name: string;
  description: string;
  scope: string;
  preset: boolean;
  userCount: number;
};

export type PermissionSummary = {
  code: string;
  module: string;
  resource: string;
  action: string;
  level: number;
  description: string;
};

export type PermissionModule = {
  name: string;
  permissions: PermissionSummary[];
};

export type RolePermissionRow = {
  module: string;
  permissionCode: string;
  permissionName: string;
  allowedRoles: string[];
};

export type PermissionMatrix = {
  roles: RoleSummary[];
  modules: PermissionModule[];
  rows: RolePermissionRow[];
};

export type PageResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type PermissionGrantSummary = {
  user: string;
  role: string;
  scope: string;
  expire: string;
};

export type ApprovalSummary = {
  title: string;
  time: string;
  risk: string;
};

export type AuditOverview = {
  approvals: ApprovalSummary[];
  grants: PermissionGrantSummary[];
};

export type AuditLogSummary = {
  id: string;
  eventId: string;
  tenantId: string;
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: string;
  riskLevel: string;
  beforeJson: string | null;
  afterJson: string | null;
  detailJson: string | null;
  traceId: string | null;
  signature: string;
  occurredAt: string;
};

export type AuditLogQuery = {
  actor?: string;
  action?: string;
  riskLevel?: string;
  result?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
};


export type OrganizationNode = {
  id: string;
  code: string;
  name: string;
  tenantType: 'CORP' | 'BU' | 'PROJECT' | string;
  parentId: string | null;
  path: string;
  status: string;
  timezone: string;
  defaultLocale: string;
  quotaGpu: number;
  quotaStorageTb: number;
  apiRateLimitPerDay: number;
  userCount: number;
  usedGpu: number;
  children: OrganizationNode[];
};

export type OrganizationTreeResponse = {
  nodes: OrganizationNode[];
};

export type OrganizationMember = {
  id: string;
  organizationId: string;
  organizationName: string;
  userId: string;
  username: string;
  displayName: string;
  roleCode: string;
  scopeType: string;
  scopeId: string;
  status: string;
  expiresAt: string | null;
};

export type ConfigItem = {
  key: string;
  groupName: string;
  displayName: string;
  valueType: string;
  scopeAllowed: string[];
  sensitive: boolean;
  defaultValue: string;
  scopeType: string;
  scopeId: string;
  scopeValue: string | null;
  effectiveValue: string;
  inheritedFrom: string;
  version: number;
  status: string;
};

export type FileObjectSummary = {
  fileId: string;
  assetType: string;
  tenantId: string;
  projectId: string | null;
  bucket: string;
  objectKey: string;
  expectedSha256: string | null;
  sha256: string | null;
  expectedSizeBytes: number | null;
  sizeBytes: number | null;
  contentType: string | null;
  storageTier: string;
  status: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationChannel = {
  channelId: string;
  channelType: string;
  scopeType: string;
  scopeId: string;
  name: string;
  enabled: boolean;
  configMasked: string | null;
  status: string;
  diagnostic: string | null;
  lastTestAt: string | null;
};

export type NotificationTestResult = {
  channelId: string;
  result: string;
  diagnostic: string;
  testedAt: string;
};

export type ApiKeySummary = {
  id: string;
  name: string;
  prefix: string;
  maskedKey: string;
  plainTextKey: string | null;
  scopeType: string;
  scopeId: string;
  permissions: string[];
  status: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

export type OrganizationCreateInput = {
  name: string;
  code: string;
  tenantType: string;
  parentId: string;
  timezone?: string;
  defaultLocale?: string;
  quotaGpu?: number;
  quotaStorageTb?: number;
  apiRateLimitPerDay?: number;
};


export type PaiResourceStatus = {
  status: string;
  configured: boolean;
  enabled: boolean;
  regionId: string;
  endpoint: string;
  workspaceId: string;
  quotaId: string;
  resourceGroupId: string;
  credentialMode: string;
  credentialRefMasked: string;
  diagnosticCode: string;
  diagnosticMessage: string;
  lastSyncAt: string | null;
  stale: boolean;
};

export type PaiResourceUsageCard = {
  key: string;
  label: string;
  used: number;
  total: number;
  unit: string;
  percent: number;
  status: string;
};

export type PaiResourceOverview = {
  status: string;
  scopeType: string;
  scopeId: string;
  bindingId: string;
  workspaceId: string;
  quotaId: string;
  resourceGroupId: string;
  lastSyncAt: string | null;
  stale: boolean;
  diagnosticCode: string;
  diagnosticMessage: string;
  cards: PaiResourceUsageCard[];
  updatedFrom: string;
};

export type PaiResourceBinding = {
  bindingId: string;
  organizationId: string;
  organizationName: string;
  scopeType: string;
  workspaceId: string;
  workspaceName: string;
  quotaId: string;
  quotaName: string;
  resourceGroupId: string;
  status: string;
  diagnosticCode: string;
  diagnosticMessage: string;
  lastSyncAt: string | null;
};

export type PaiResourceNode = {
  nodeId: string;
  sourceType: string;
  hostOrZone: string;
  gpuSpec: string;
  cpuCores: number;
  memoryGb: number;
  gpuTotal: number;
  gpuUsed: number;
  gpuUtilizationPercent: number;
  status: string;
  diagnostic: string;
};

export type PaiResourcePool = {
  poolId: string;
  poolName: string;
  sourceType: string;
  bindingId: string;
  quotaId: string;
  workspaceId: string;
  gpuUsed: number;
  gpuTotal: number;
  cpuUsed: number;
  cpuTotal: number;
  memoryUsedGb: number;
  memoryTotalGb: number;
  userCount: number;
  status: string;
};

export type PaiResourceStorage = {
  storageId: string;
  name: string;
  sourceType: string;
  capacityGb: number;
  usedGb: number;
  percent: number;
  status: string;
  diagnostic: string;
};

export type PaiSyncResult = {
  syncId: string;
  bindingId: string;
  result: string;
  status: string;
  diagnosticCode: string;
  diagnosticMessage: string;
  lastSyncAt: string | null;
  stale: boolean;
  paiRequestId: string;
};

export type PaiResourceReference = {
  resourceBindingId: string;
  organizationId: string;
  paiWorkspaceId: string;
  paiQuotaId: string;
  paiResourceGroupId: string;
  status: string;
  usable: boolean;
  diagnosticCode: string;
  diagnosticMessage: string;
};

export type PaiResourceBindingUpdateInput = {
  organizationId: string;
  workspaceId: string;
  workspaceName: string;
  quotaId: string;
  quotaName: string;
  resourceGroupId: string;
  status: string;
  diagnosticMessage?: string;
};

export type PaiConnectionUpdateInput = {
  regionId: string;
  endpoint: string;
  workspaceId: string;
  quotaId: string;
  resourceGroupId: string;
  credentialMode: string;
  credentialRefMasked: string;
  enabled: boolean;
  status: string;
  diagnosticMessage?: string;
};

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const response = await promise;
  if (response.data.code !== 0) {
    throw new Error(response.data.message);
  }
  return response.data.data;
}

export const platformApi = {
  async login(input: { username: string; password: string; tenantCode: string }) {
    return unwrap<LoginResponse>(apiClient.post('/api/v1/auth/login', input));
  },
  async me() {
    return unwrap<CurrentUser>(apiClient.get('/api/v1/auth/me'));
  },
  async users() {
    return unwrap<PageResponse<UserSummary>>(apiClient.get('/api/v1/platform/users'));
  },
  async createUser(input: { username: string; displayName: string; email: string; tenantId: string; buCode: string; password: string }) {
    return unwrap<UserSummary>(apiClient.post('/api/v1/platform/users', input));
  },
  async roles() {
    return unwrap<RoleSummary[]>(apiClient.get('/api/v1/platform/roles'));
  },
  async permissionMatrix() {
    return unwrap<PermissionMatrix>(apiClient.get('/api/v1/platform/permissions/matrix'));
  },
  async auditLogs(query: AuditLogQuery = {}) {
    return unwrap<PageResponse<AuditLogSummary>>(apiClient.get('/api/v1/platform/audit-logs', { params: query }));
  },
  async auditOverview(): Promise<AuditOverview> {
    const logs = await platformApi.auditLogs();
    const approvals = logs.items.slice(0, 3).map((item) => ({
      title: `${item.action} · ${item.operatorName}`,
      time: item.occurredAt ? new Date(item.occurredAt).toLocaleString('zh-CN') : '待确认时间',
      risk: item.riskLevel === 'CRITICAL' ? '高' : item.riskLevel === 'WARNING' ? '中' : '低',
    }));
    return {
      approvals: approvals.length > 0 ? approvals : [{ title: '暂无待审批事项', time: '实时', risk: '低' }],
      grants: logs.items.length === 0 ? [{ user: '暂无授权记录', role: '审计主体', scope: 'AuditLog', expire: 'TODO_CONFIRM_PERMISSION_GRANT_EXPIRE' }] : logs.items.slice(0, 3).map((item) => ({
        user: item.operatorName,
        role: item.operatorRole || '审计主体',
        scope: item.resourceType,
        expire: 'TODO_CONFIRM_PERMISSION_GRANT_EXPIRE',
      })),
    };
  },
  async organizationTree() {
    return unwrap<OrganizationTreeResponse>(apiClient.get('/api/v1/platform/organizations/tree'));
  },
  async createOrganization(input: OrganizationCreateInput) {
    return unwrap<OrganizationNode>(apiClient.post('/api/v1/platform/organizations', input));
  },
  async updateOrganization(organizationId: string, input: Partial<OrganizationCreateInput>) {
    return unwrap<OrganizationNode>(apiClient.patch(`/api/v1/platform/organizations/${organizationId}`, input));
  },
  async organizationMembers() {
    return unwrap<PageResponse<OrganizationMember>>(apiClient.get('/api/v1/platform/organizations/members'));
  },
  async assignOrganizationMember(organizationId: string, input: { userId: string; roleCode: string; scopeType: string; scopeId: string; expiresAt?: string | null }) {
    return unwrap<OrganizationMember>(apiClient.post(`/api/v1/platform/organizations/${organizationId}/members`, input));
  },
  async configs(scopeType = 'GLOBAL', scopeId = 'TENANT-YF') {
    return unwrap<ConfigItem[]>(apiClient.get('/api/v1/platform/configs', { params: { scopeType, scopeId } }));
  },
  async updateConfig(key: string, input: { scopeType: string; scopeId: string; value: string; reason?: string }) {
    return unwrap<ConfigItem>(apiClient.put(`/api/v1/platform/configs/${encodeURIComponent(key)}`, input));
  },
  async files() {
    return unwrap<PageResponse<FileObjectSummary>>(apiClient.get('/api/v1/platform/files'));
  },
  async notificationChannels() {
    return unwrap<NotificationChannel[]>(apiClient.get('/api/v1/platform/notification-channels'));
  },
  async updateNotificationChannel(channelId: string, input: { enabled?: boolean; configMasked?: string; diagnostic?: string }) {
    return unwrap<NotificationChannel>(apiClient.put(`/api/v1/platform/notification-channels/${channelId}`, input));
  },
  async testNotificationChannel(channelId: string) {
    return unwrap<NotificationTestResult>(apiClient.post(`/api/v1/platform/notification-channels/${channelId}/test`));
  },
  async apiKeys() {
    return unwrap<ApiKeySummary[]>(apiClient.get('/api/v1/platform/api-keys'));
  },
  async createApiKey(input: { name: string; scopeType: string; scopeId: string; expiresInDays?: number; permissions?: string[] }) {
    return unwrap<ApiKeySummary>(apiClient.post('/api/v1/platform/api-keys', input));
  },
  async revokeApiKey(keyId: string) {
    return unwrap<ApiKeySummary>(apiClient.post(`/api/v1/platform/api-keys/${keyId}/revoke`));
  },
  async paiResourceStatus() {
    return unwrap<PaiResourceStatus>(apiClient.get('/api/v1/platform/pai-resources/status'));
  },
  async paiResourceOverview(organizationId = 'TENANT-CABIN') {
    return unwrap<PaiResourceOverview>(apiClient.get('/api/v1/platform/pai-resources/overview', { params: { organizationId } }));
  },
  async paiResourceWorkspaces() {
    return unwrap<PageResponse<PaiResourceBinding>>(apiClient.get('/api/v1/platform/pai-resources/workspaces'));
  },
  async paiResourceNodes(bindingId?: string) {
    return unwrap<PageResponse<PaiResourceNode>>(apiClient.get('/api/v1/platform/pai-resources/nodes', { params: bindingId ? { bindingId } : {} }));
  },
  async paiResourcePools(bindingId?: string) {
    return unwrap<PageResponse<PaiResourcePool>>(apiClient.get('/api/v1/platform/pai-resources/pools', { params: bindingId ? { bindingId } : {} }));
  },
  async paiResourceStorage(bindingId?: string) {
    return unwrap<PageResponse<PaiResourceStorage>>(apiClient.get('/api/v1/platform/pai-resources/storage', { params: bindingId ? { bindingId } : {} }));
  },
  async syncPaiResources(input: { bindingId?: string; force?: boolean }) {
    return unwrap<PaiSyncResult>(apiClient.post('/api/v1/platform/pai-resources/sync', input));
  },
  async updatePaiConnection(input: PaiConnectionUpdateInput) {
    return unwrap<PaiResourceStatus>(apiClient.put('/api/v1/platform/pai-resources/connection', input));
  },
  async updatePaiResourceBinding(bindingId: string, input: PaiResourceBindingUpdateInput) {
    return unwrap<PaiResourceBinding>(apiClient.put(`/api/v1/platform/pai-resources/bindings/${bindingId}`, input));
  },
  async paiResourceReference(organizationId = 'TENANT-CABIN') {
    return unwrap<PaiResourceReference>(apiClient.get('/api/v1/platform/pai-resources/references', { params: { organizationId } }));
  },

};
