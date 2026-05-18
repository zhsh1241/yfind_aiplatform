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

export type DataSourceSummary = { sourceId: string; name: string; sourceType: string; tenantId: string; projectId: string | null; endpoint: string; port: number | null; databaseName: string | null; credentialMode: string; secretRefMasked: string | null; sharedScope: string; description: string | null; status: string; lastTestAt: string | null; diagnosticCode: string | null; diagnosticMessage: string | null; latencyMs: number | null; updatedAt: string };
export type DataSourceTestResult = { sourceId: string; result: string; status: string; diagnosticCode: string; diagnosticMessage: string; latencyMs: number | null; traceId: string; testedAt: string };
export type DataSourceSyncTask = { taskId: string; sourceId: string; sourceName: string; targetDatasetId: string | null; targetDatasetName: string | null; name: string; scheduleMode: string; syncScope: string | null; status: string; lastRunAt: string | null; lastResult: string | null; diagnosticCode: string | null; diagnosticMessage: string | null };
export type DatasetSummary = { datasetId: string; name: string; datasetType: string; dataType: string; tenantId: string; projectId: string | null; currentVersionId: string | null; currentVersionName: string | null; status: string; accessLevel: string; tags: string[]; recordCount: number; sizeBytes: number; ownerId: string; ownerName: string; description: string | null; updatedAt: string };
export type DatasetStats = { total: number; raw: number; preprocessed: number; annotated: number; restricted: number; totalSizeBytes: number };
export type DatasetList = { items: DatasetSummary[]; total: number; page: number; pageSize: number; stats: DatasetStats };
export type DatasetVersion = { versionId: string; datasetId: string; versionName: string; status: string; recordCount: number; sizeBytes: number; contentSafetyStatus: string; diagnosticCode: string | null; diagnosticMessage: string | null; createdAt: string; publishedAt: string | null };
export type DatasetFile = { id: string; datasetId: string; versionId: string; fileId: string; fileRole: string; status: string; objectKey: string; contentType: string | null; sizeBytes: number | null; sha256: string | null };
export type DataLineage = { lineageId: string; sourceType: string; sourceId: string; targetType: string; targetId: string; transformType: string; createdAt: string };
export type DatasetAccessGrant = { grantId: string; datasetId: string; versionId: string | null; userId: string; userName: string; grantedBy: string; expiresAt: string; status: string };
export type DatasetDetail = { dataset: DatasetSummary; versions: DatasetVersion[]; files: DatasetFile[]; grants: DatasetAccessGrant[]; lineage: DataLineage[]; previewStatus: string; previewDiagnostic: string };
export type DatasetAccessRequest = { requestId: string; datasetId: string; requesterId: string; requesterName: string; purpose: string; status: string; createdAt: string; reviewedBy: string | null; reviewedAt: string | null };
export type DatasetReference = { datasetId: string; versionId: string; status: string; usable: boolean; diagnosticCode: string; diagnosticMessage: string };

export const dataApi = {
  async dataSources() { return unwrap<DataSourceSummary[]>(apiClient.get('/api/v1/data-sources')); },
  async createDataSource(input: Partial<DataSourceSummary> & { secretRef?: string }) { return unwrap<DataSourceSummary>(apiClient.post('/api/v1/data-sources', input)); },
  async updateDataSource(sourceId: string, input: Partial<DataSourceSummary> & { secretRef?: string }) { return unwrap<DataSourceSummary>(apiClient.put(`/api/v1/data-sources/${sourceId}`, input)); },
  async testDataSource(sourceId: string) { return unwrap<DataSourceTestResult>(apiClient.post(`/api/v1/data-sources/${sourceId}/test`)); },
  async activateDataSource(sourceId: string) { return unwrap<DataSourceSummary>(apiClient.post(`/api/v1/data-sources/${sourceId}/activate`)); },
  async disableDataSource(sourceId: string) { return unwrap<DataSourceSummary>(apiClient.post(`/api/v1/data-sources/${sourceId}/disable`)); },
  async syncTasks() { return unwrap<DataSourceSyncTask[]>(apiClient.get('/api/v1/data-source-sync-tasks')); },
  async createSyncTask(input: { sourceId: string; targetDatasetId?: string; name: string; scheduleMode: string; syncScope?: string }) { return unwrap<DataSourceSyncTask>(apiClient.post('/api/v1/data-source-sync-tasks', input)); },
  async runSyncTask(taskId: string) { return unwrap<DataSourceSyncTask>(apiClient.post(`/api/v1/data-source-sync-tasks/${taskId}/run`)); },
  async datasets(params: { keyword?: string; datasetType?: string; status?: string; accessLevel?: string } = {}) { return unwrap<DatasetList>(apiClient.get('/api/v1/datasets', { params })); },
  async createDataset(input: { name: string; datasetType: string; dataType: string; tenantId: string; accessLevel: string; tags: string[]; description?: string; recordCount?: number; sourceId?: string }) { return unwrap<DatasetDetail>(apiClient.post('/api/v1/datasets', input)); },
  async updateDataset(datasetId: string, input: { name?: string; accessLevel?: string; tags?: string[]; description?: string }) { return unwrap<DatasetDetail>(apiClient.put(`/api/v1/datasets/${datasetId}`, input)); },
  async datasetDetail(datasetId: string) { return unwrap<DatasetDetail>(apiClient.get(`/api/v1/datasets/${datasetId}`)); },
  async createVersion(datasetId: string, input: { versionName?: string; recordCount?: number }) { return unwrap<DatasetVersion>(apiClient.post(`/api/v1/datasets/${datasetId}/versions`, input)); },
  async attachFile(datasetId: string, versionId: string, input: { fileId: string; fileRole: string }) { return unwrap<DatasetFile>(apiClient.post(`/api/v1/datasets/${datasetId}/versions/${versionId}/files`, input)); },
  async publishVersion(datasetId: string, versionId: string) { return unwrap<DatasetVersion>(apiClient.post(`/api/v1/datasets/${datasetId}/versions/${versionId}/publish`)); },
  async archiveDataset(datasetId: string) { return unwrap<DatasetSummary>(apiClient.post(`/api/v1/datasets/${datasetId}/archive`)); },
  async deleteDataset(datasetId: string) { return unwrap<void>(apiClient.delete(`/api/v1/datasets/${datasetId}`)); },
  async accessRequests(datasetId: string) { return unwrap<DatasetAccessRequest[]>(apiClient.get(`/api/v1/datasets/${datasetId}/access`)); },
  async requestAccess(datasetId: string, purpose: string) { return unwrap<DatasetAccessRequest>(apiClient.post(`/api/v1/datasets/${datasetId}/access-requests`, { purpose })); },
  async approveAccess(requestId: string, input: { expiresAt?: string | null; reason?: string } = {}) { return unwrap<DatasetAccessGrant>(apiClient.put(`/api/v1/dataset-access-requests/${requestId}/approve`, input)); },
  async rejectAccess(requestId: string, input: { expiresAt?: string | null; reason?: string } = {}) { return unwrap<DatasetAccessRequest>(apiClient.put(`/api/v1/dataset-access-requests/${requestId}/reject`, input)); },
  async reference(datasetId: string, versionId?: string) { return unwrap<DatasetReference>(apiClient.get('/api/v1/dataset-references', { params: { datasetId, versionId } })); },
};
