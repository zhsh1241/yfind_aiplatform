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
  parentRoleCode?: string | null;
  userCount: number;
};

const roleDisplayFallbacks: Record<string, { name: string; description: string }> = {
  CABIN_ROLE_41194: { name: '座舱数据管理员', description: '智能座舱 BU 数据管理权限角色' },
  CABIN_ROLE_5522: { name: '座舱标注协调员', description: '智能座舱 BU 标注任务协调与数据查看角色' },
};

const mojibakePattern = /[�ÃÂ]|(?:[åæçèéä][\u0080-\u00ff]?)/;

export function normalizeRoleSummary(role: RoleSummary): RoleSummary {
  const fallback = roleDisplayFallbacks[role.code];
  if (!fallback) return role;
  return {
    ...role,
    name: isUnreadableText(role.name) || role.name === role.code ? fallback.name : role.name,
    description: isUnreadableText(role.description) || !role.description ? fallback.description : role.description,
  };
}

export function displayRoleName(roleOrCode: RoleSummary | string, roles: RoleSummary[] = []) {
  const code = typeof roleOrCode === 'string' ? roleOrCode : roleOrCode.code;
  const matchedRole = typeof roleOrCode === 'string' ? roles.find((role) => role.code === code) : roleOrCode;
  if (matchedRole) return normalizeRoleSummary(matchedRole).name;
  return roleDisplayFallbacks[code]?.name ?? code;
}

function isUnreadableText(value?: string | null) {
  return !value || mojibakePattern.test(value);
}

export type UserUpdateInput = {
  displayName: string;
  email: string;
  status: string;
};

export type RoleCreateInput = {
  code: string;
  name: string;
  description?: string;
  scope: string;
  parentRoleCode?: string;
  permissionCodes: string[];
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

export type FileObjectInitInput = {
  assetType: string;
  tenantId: string;
  projectId?: string | null;
  filename: string;
  expectedSha256: string;
  expectedSizeBytes: number;
  contentType: string;
  storageTier: string;
};

export type FileObjectCompleteInput = {
  sha256: string;
  sizeBytes: number;
};

export type FileDownloadResponse = {
  fileId: string;
  status: string;
  downloadUrl: string | null;
  diagnostic: string;
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
  async refresh() {
    return unwrap<LoginResponse>(apiClient.post('/api/v1/auth/refresh'));
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
  async updateUser(userId: string, input: UserUpdateInput) {
    return unwrap<UserSummary>(apiClient.put(`/api/v1/platform/users/${userId}`, input));
  },
  async updateUserRoles(userId: string, roleCodes: string[], expiresAt?: string | null) {
    return unwrap<void>(apiClient.put(`/api/v1/platform/users/${userId}/roles`, { roleCodes, expiresAt }));
  },
  async unlockUser(userId: string) {
    return unwrap<void>(apiClient.post(`/api/v1/platform/users/${userId}/unlock`));
  },
  async roles() {
    return (await unwrap<RoleSummary[]>(apiClient.get('/api/v1/platform/roles'))).map(normalizeRoleSummary);
  },
  async createRole(input: RoleCreateInput) {
    return normalizeRoleSummary(await unwrap<RoleSummary>(apiClient.post('/api/v1/platform/roles', input)));
  },
  async updateRolePermissions(roleCode: string, permissionCodes: string[]) {
    return normalizeRoleSummary(await unwrap<RoleSummary>(apiClient.put(`/api/v1/platform/roles/${roleCode}/permissions`, { permissionCodes })));
  },
  async permissionMatrix() {
    const matrix = await unwrap<PermissionMatrix>(apiClient.get('/api/v1/platform/permissions/matrix'));
    return { ...matrix, roles: matrix.roles.map(normalizeRoleSummary) };
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
  async initFile(input: FileObjectInitInput) {
    return unwrap<FileObjectSummary>(apiClient.post('/api/v1/platform/files/init', input));
  },
  async uploadFile(fileId: string, file: File, onProgress?: (percent: number) => void) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return unwrap<FileObjectSummary>(apiClient.post(`/api/v1/platform/files/${fileId}/content`, formData, {
      onUploadProgress: (event) => {
        if (!event.total || !onProgress) return;
        onProgress(Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100))));
      },
    }));
  },
  async completeFile(fileId: string, input: FileObjectCompleteInput) {
    return unwrap<FileObjectSummary>(apiClient.post(`/api/v1/platform/files/${fileId}/complete`, input));
  },
  async fileDownloadUrl(fileId: string) {
    return unwrap<FileDownloadResponse>(apiClient.get(`/api/v1/platform/files/${fileId}/download-url`));
  },
  fileContentUrl(fileId: string) {
    const base = apiClient.defaults.baseURL ?? '';
    return `${base}/api/v1/platform/files/${fileId}/content`;
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


export type PipelineNode = { nodeId: string; operatorId: string; operatorName?: string; label: string; positionX: number; positionY: number; configJson: string; status?: string };
export type PipelineEdge = { edgeId: string; sourceNodeId: string; targetNodeId: string; edgeType: string };
export type PipelineVariable = { name: string; valueType: string; valueKind: string; valueJson?: string; valueMasked?: string; required: boolean };
export type PipelineSummary = { pipelineId: string; name: string; tenantId: string; projectId: string | null; status: string; currentVersionId: string | null; ownerId: string; ownerName: string; nodeCount: number; runCount: number; description: string | null; updatedAt: string };
export type PipelineVersion = { versionId: string; pipelineId: string; versionName: string; note: string | null; dagJson: string; createdBy: string; createdAt: string };
export type PipelineValidationIssue = { code: string; message: string; nodeId: string | null; edgeId: string | null };
export type PipelineValidation = { valid: boolean; diagnosticCode: string; diagnosticMessage: string; errors: PipelineValidationIssue[]; warnings: string[] };
export type PipelineRunSummary = { runId: string; pipelineId: string; versionId: string | null; status: string; triggerMode: string; diagnosticCode: string | null; diagnosticMessage: string | null; outputDatasetId: string | null; durationMs: number | null; startedAt: string; endedAt: string | null };
export type PipelineRunNode = { nodeRunId: string; runId: string; nodeId: string; operatorName: string; status: string; durationMs: number | null; logSummary: string | null; errorCode: string | null };
export type PipelineRunDetail = { run: PipelineRunSummary; nodeRuns: PipelineRunNode[] };
export type PipelineDetail = { pipeline: PipelineSummary; nodes: PipelineNode[]; edges: PipelineEdge[]; variables: PipelineVariable[]; versions: PipelineVersion[]; runs: PipelineRunSummary[]; validation: PipelineValidation };
export type PipelineList = { items: PipelineSummary[]; total: number; page: number; pageSize: number };
export type PipelineSaveInput = { name: string; tenantId?: string; projectId?: string | null; description?: string | null; nodes: PipelineNode[]; edges: PipelineEdge[]; variables: PipelineVariable[] };

export type OperatorSummary = { operatorId: string; name: string; category: string; stage: string; kind: string; status: string; description: string | null; beforeExample: string | null; afterExample: string | null; usageCount: number; pipelineCount: number; errorRate: number };
export type OperatorCategory = { category: string; count: number };
export type OperatorStats = { total: number; builtin: number; custom: number; published: number; submitted: number };
export type OperatorList = { items: OperatorSummary[]; total: number; categories: OperatorCategory[]; stats: OperatorStats };
export type OperatorReview = { reviewId: string; operatorId: string; submitterId: string; reviewerId: string | null; status: string; reason: string | null; submittedAt: string; reviewedAt: string | null };
export type OperatorDetail = { operator: OperatorSummary; parameterSchemaJson: string; inputSchemaJson: string; outputSchemaJson: string; endpointMasked: string | null; credentialRefMasked: string | null; timeoutSeconds: number | null; concurrencyLimit: number | null; reviews: OperatorReview[] };
export type OperatorCustomInput = { name: string; category: string; stage: string; description?: string; parameterSchemaJson: string; inputSchemaJson?: string; outputSchemaJson?: string; endpoint?: string; credentialRef?: string; timeoutSeconds?: number; concurrencyLimit?: number };

export type DataStandardField = { sourceField: string; standardField: string; displayName: string; dataType: string; unit: string | null; required: boolean; mappingStatus: string; rule: string };
export type DataStandardProfile = { datasetId: string; datasetName: string; datasetType: string; dataType: string; sourceType: string; profileStatus: string; qualityScore: number; fieldCount: number; matchedFieldCount: number; issueCount: number; fields: DataStandardField[] };
export type DataStandardTask = { taskId: string; sourceDatasetId: string; sourceDatasetName: string; sourceVersionId: string | null; outputDatasetId: string | null; outputDatasetName: string | null; name: string; standardProfile: string; status: string; qualityScoreBefore: number | null; qualityScoreAfter: number | null; diagnosticCode: string | null; diagnosticMessage: string | null; lastRunAt: string | null; updatedAt: string };
export type DataStandardOverview = { stats: { datasetCount: number; profiledCount: number; compliantCount: number; issueCount: number; taskCount: number }; profiles: DataStandardProfile[]; tasks: DataStandardTask[] };

export type DataSourceSummary = { sourceId: string; name: string; sourceType: string; tenantId: string; projectId: string | null; endpoint: string; port: number | null; databaseName: string | null; credentialMode: string; secretRefMasked: string | null; sharedScope: string; description: string | null; status: string; lastTestAt: string | null; diagnosticCode: string | null; diagnosticMessage: string | null; latencyMs: number | null; updatedAt: string };
export type DataSourceTestResult = { sourceId: string; result: string; status: string; diagnosticCode: string; diagnosticMessage: string; latencyMs: number | null; traceId: string; testedAt: string };
export type DataSourceSyncTask = { taskId: string; sourceId: string; sourceName: string; targetDatasetId: string | null; targetDatasetName: string | null; name: string; scheduleMode: string; syncScope: string | null; status: string; lastRunAt: string | null; lastResult: string | null; diagnosticCode: string | null; diagnosticMessage: string | null };
export type DatasetUploadProgress = { phase: string; percent: number };
export type DatasetUploadSummary = { totalFiles: number; acceptedFiles: number; rejectedFiles: number };
export type DatasetUploadFile = { fileName: string; fileId: string | null; status: string; sizeBytes: number | null; contentType: string | null; diagnosticCode: string; diagnosticMessage: string };
export type DatasetUploadSession = { sessionId: string; datasetId: string | null; versionId: string | null; status: string; creationMode: string; targetAction: string; targetDatasetId: string | null; targetVersionId: string | null; progress: DatasetUploadProgress; summary: DatasetUploadSummary; datasetStatus: string | null; versionStatus: string | null; diagnosticCode: string; diagnosticMessage: string; files: DatasetUploadFile[] };
export type DatasetSummary = { datasetId: string; name: string; datasetType: string; dataType: string; tenantId: string; projectId: string | null; currentVersionId: string | null; currentVersionName: string | null; status: string; accessLevel: string; tags: string[]; versionCount: number; recordCount: number; sizeBytes: number; ownerId: string; ownerName: string; description: string | null; archivedAt: string | null; updatedAt: string; mutable: boolean; hardDeletable: boolean };
export type DatasetStats = { total: number; raw: number; preprocessed: number; annotated: number; restricted: number; totalSizeBytes: number };
export type DatasetList = { items: DatasetSummary[]; total: number; page: number; pageSize: number; stats: DatasetStats };
export type DatasetVersion = { versionId: string; datasetId: string; versionName: string; status: string; isCurrent: boolean; sourceVersionId: string | null; recordCount: number; fileCount: number; sizeBytes: number; contentSafetyStatus: string; diagnosticCode: string | null; diagnosticMessage: string | null; createdAt: string; publishedAt: string | null; mutable: boolean; deletable: boolean; deleteBlockedReason: string | null };
export type DatasetFile = { bindingId: string; datasetId: string; versionId: string; fileId: string; fileRole: string; status: string; objectKey: string; contentType: string | null; sizeBytes: number | null; sha256: string | null };
export type DataLineage = { lineageId: string; sourceType: string; sourceId: string; targetType: string; targetId: string; transformType: string; createdAt: string };
export type DatasetAccessGrant = { grantId: string; datasetId: string; versionId: string | null; userId: string; userName: string; grantedBy: string; expiresAt: string; status: string };
export type DatasetDetail = { dataset: DatasetSummary; selectedVersionId: string; selectedVersion: DatasetVersion; versions: DatasetVersion[]; files: DatasetFile[]; grants: DatasetAccessGrant[]; lineage: DataLineage[]; previewStatus: string; previewDiagnostic: string };
export type DatasetAccessRequest = { requestId: string; datasetId: string; datasetName?: string; tenantId?: string; requesterId: string; requesterName: string; purpose: string; status: string; createdAt: string; reviewedBy: string | null; reviewerName?: string | null; reviewedAt: string | null };
export type DatasetReference = { datasetId: string; versionId: string; status: string; usable: boolean; diagnosticCode: string; diagnosticMessage: string };

export type AnnotationUser = { userId: string; displayName: string; role: string };
export type AnnotationStats = { total: number; inProgress: number; pendingReview: number; completed: number; templates: number };
export type AnnotationTaskSummary = { taskId: string; name: string; scene: string; sceneLabel: string; sourceDatasetId: string; sourceDatasetName: string; templateId: string; templateName: string; tenantId: string; status: string; reviewEnabled: boolean; prelabelEnabled: boolean; labelStudioEnabled: boolean; totalCount: number; annotatedCount: number; reviewedCount: number; qualityScore: number | null; assignees: AnnotationUser[]; deadline: string | null; updatedAt: string };
export type AnnotationAssignment = { assignmentId: string; taskId: string; assigneeId: string; assigneeName: string; role: string; status: string; assignedBy: string; assignedAt: string };
export type AnnotationLabelTemplate = { templateId: string; name: string; scene: string; labelType: string; labelSchemaJson: string; labelStudioConfigXml: string; status: string; tenantId: string; createdBy: string; updatedAt: string };
export type AnnotationWorkItem = { workItemId: string; taskId: string; sampleKey: string; sampleFileId: string | null; sampleImageUrl?: string | null; annotatorId: string | null; annotatorName: string | null; status: string; predictionJson: string | null; annotationJson: string | null; submittedAt: string | null; updatedAt: string };
export type AnnotationReviewItem = { reviewItemId: string; workItemId: string; taskId: string; taskName: string; annotatorId: string; annotatorName: string; reviewerId: string | null; reviewerName: string | null; status: string; reviewComment: string | null; reviewedAt: string | null };
export type AnnotationPublication = { publicationId: string; taskId: string; qualityStatus: string; coverageRate: number; formatStatus: string; diagnosticCode: string; diagnosticMessage: string; annotationArtifactFileId?: string | null; outputDatasetId: string | null; outputVersionId: string | null; publishedAt: string | null };
export type AnnotationExternalBinding = { bindingId: string; taskId: string; provider: string; externalProjectId: string | null; externalUrl: string | null; externalTaskId?: string | null; externalTaskUrl?: string | null; configStatus: string; lastSyncStatus: string; diagnosticCode: string; diagnosticMessage: string; launchUrl: string | null; retryable?: boolean | null; lastSyncAt: string | null };
export type AnnotationOverview = { stats: AnnotationStats; tasks: AnnotationTaskSummary[]; templates: AnnotationLabelTemplate[] };
export type AnnotationTaskList = { items: AnnotationTaskSummary[]; total: number; page: number; pageSize: number };
export type AnnotationTaskDetail = { task: AnnotationTaskSummary; assignments: AnnotationAssignment[]; workItems: AnnotationWorkItem[]; reviewItems: AnnotationReviewItem[]; publications: AnnotationPublication[]; externalBinding: AnnotationExternalBinding };
export type AnnotationTrainingExport = { exportId: string; taskId: string; format: string; formatVersion: string; status: string; diagnosticCode: string; diagnosticMessage: string; fileId: string | null; downloadUrl: string | null; sizeBytes: number | null; asyncRequired: boolean; packageIncludesImages: boolean; requestedAt: string; generatedAt: string | null; expiresAt: string | null };
export type DatasetAnnotationCandidate = { datasetId: string; datasetName: string; currentVersionId: string | null; dataType: string; status: string; eligible: boolean; diagnosticCode: string; diagnosticMessage: string; templates: AnnotationLabelTemplate[]; supportedFormats: string[] };
export type DatasetAnnotationTask = { task: AnnotationTaskSummary; exports: AnnotationTrainingExport[] };
export type AnnotationTaskCreateInput = { name: string; sourceDatasetId: string; sourceVersionId?: string | null; templateId: string; scene: string; reviewEnabled?: boolean; prelabelEnabled?: boolean; labelStudioEnabled?: boolean; prelabelModelSource?: string; prelabelConfidence?: number; assigneeIds?: string[]; reviewerIds?: string[]; deadline?: string | null; note?: string };
export type AnnotationLabelTemplateInput = { name: string; tenantId?: string; scene: string; labelType: string; labelSchemaJson: string; labelStudioConfigXml?: string };

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
  async createDatasetUploadSession(input: { name: string; tenantId?: string; datasetType: string; dataType: string; accessLevel: string; tags: string[]; description?: string; creationMode: 'LOCAL_UPLOAD'; targetAction?: 'CREATE_DATASET' | 'APPEND_VERSION'; targetDatasetId?: string; targetVersionId?: string }) {
    return unwrap<DatasetUploadSession>(apiClient.post('/api/v1/dataset-upload-sessions', input));
  },
  async uploadDatasetSessionFiles(sessionId: string, files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return unwrap<DatasetUploadSession>(apiClient.post(`/api/v1/dataset-upload-sessions/${sessionId}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
  async datasetUploadSession(sessionId: string) {
    return unwrap<DatasetUploadSession>(apiClient.get(`/api/v1/dataset-upload-sessions/${sessionId}`));
  },
  async commitDatasetUploadSession(sessionId: string, input: { publishRequested?: boolean } = {}) {
    return unwrap<DatasetUploadSession>(apiClient.post(`/api/v1/dataset-upload-sessions/${sessionId}/commit`, input));
  },
  async datasets(params: { keyword?: string; datasetType?: string; status?: string; accessLevel?: string; page?: number; pageSize?: number } = {}) { return unwrap<DatasetList>(apiClient.get('/api/v1/datasets', { params })); },
  async createDataset(input: { name: string; datasetType: string; dataType: string; tenantId: string; accessLevel: string; tags: string[]; description?: string; recordCount?: number; sourceId?: string }) { return unwrap<DatasetDetail>(apiClient.post('/api/v1/datasets', input)); },
  async updateDataset(datasetId: string, input: { name?: string; accessLevel?: string; tags?: string[]; description?: string }) { return unwrap<DatasetDetail>(apiClient.put(`/api/v1/datasets/${datasetId}`, input)); },
  async datasetDetail(datasetId: string, versionId?: string) { return unwrap<DatasetDetail>(apiClient.get(`/api/v1/datasets/${datasetId}`, { params: versionId ? { versionId } : undefined })); },
  async createVersion(datasetId: string, input: { versionName?: string; sourceVersionId?: string | null; inheritPreviousFiles?: boolean; description?: string; recordCount?: number }) { return unwrap<DatasetVersion>(apiClient.post(`/api/v1/datasets/${datasetId}/versions`, input)); },
  async deleteVersion(datasetId: string, versionId: string) { return unwrap<{ datasetId: string; deletedVersionId: string; currentVersionId: string; currentVersionName: string; versionCount: number }>(apiClient.delete(`/api/v1/datasets/${datasetId}/versions/${versionId}`)); },
  async attachFile(datasetId: string, versionId: string, input: { fileId: string; fileRole: string }) { return unwrap<DatasetFile>(apiClient.post(`/api/v1/datasets/${datasetId}/versions/${versionId}/files`, input)); },
  async unbindFile(datasetId: string, versionId: string, bindingId: string) { return unwrap<{ datasetId: string; versionId: string; bindingId: string; fileId: string; remainingFileCount: number }>(apiClient.delete(`/api/v1/datasets/${datasetId}/versions/${versionId}/files/${bindingId}`)); },
  async publishVersion(datasetId: string, versionId: string) { return unwrap<DatasetVersion>(apiClient.post(`/api/v1/datasets/${datasetId}/versions/${versionId}/publish`)); },
  async archiveDataset(datasetId: string) { return unwrap<DatasetSummary>(apiClient.post(`/api/v1/datasets/${datasetId}/archive`)); },
  async deleteDataset(datasetId: string) { return unwrap<void>(apiClient.delete(`/api/v1/datasets/${datasetId}`)); },
  async accessRequests(datasetId: string) { return unwrap<DatasetAccessRequest[]>(apiClient.get(`/api/v1/datasets/${datasetId}/access`)); },
  async accessRequestInbox(params: { status?: string; datasetId?: string } = {}) { return unwrap<DatasetAccessRequest[]>(apiClient.get('/api/v1/dataset-access-requests', { params })); },
  async requestAccess(datasetId: string, purpose: string) { return unwrap<DatasetAccessRequest>(apiClient.post(`/api/v1/datasets/${datasetId}/access-requests`, { purpose })); },
  async approveAccess(requestId: string, input: { expiresAt?: string | null; reason?: string } = {}) { return unwrap<DatasetAccessGrant>(apiClient.put(`/api/v1/dataset-access-requests/${requestId}/approve`, input)); },
  async rejectAccess(requestId: string, input: { expiresAt?: string | null; reason?: string } = {}) { return unwrap<DatasetAccessRequest>(apiClient.put(`/api/v1/dataset-access-requests/${requestId}/reject`, input)); },
  async reference(datasetId: string, versionId?: string) { return unwrap<DatasetReference>(apiClient.get('/api/v1/dataset-references', { params: { datasetId, versionId } })); },
  async datasetAnnotationCandidate(datasetId: string) { return unwrap<DatasetAnnotationCandidate>(apiClient.get(`/api/v1/datasets/${datasetId}/annotation-candidates`)); },
  async datasetAnnotationTasks(datasetId: string) { return unwrap<DatasetAnnotationTask[]>(apiClient.get(`/api/v1/datasets/${datasetId}/annotation-tasks`)); },
  async createDatasetAnnotationTask(datasetId: string, input: AnnotationTaskCreateInput) { return unwrap<AnnotationTaskDetail>(apiClient.post(`/api/v1/datasets/${datasetId}/annotation-tasks`, input)); },

  async pipelines(params: { keyword?: string; status?: string; page?: number; pageSize?: number } = {}) { return unwrap<PipelineList>(apiClient.get('/api/v1/pipelines', { params })); },
  async pipelineDetail(pipelineId: string) { return unwrap<PipelineDetail>(apiClient.get(`/api/v1/pipelines/${pipelineId}`)); },
  async createPipeline(input: PipelineSaveInput) { return unwrap<PipelineDetail>(apiClient.post('/api/v1/pipelines', input)); },
  async updatePipeline(pipelineId: string, input: PipelineSaveInput) { return unwrap<PipelineDetail>(apiClient.put(`/api/v1/pipelines/${pipelineId}`, input)); },
  async validatePipeline(pipelineId: string) { return unwrap<PipelineValidation>(apiClient.post(`/api/v1/pipelines/${pipelineId}/validate`)); },
  async savePipelineVersion(pipelineId: string, input: { versionName?: string; note?: string }) { return unwrap<PipelineVersion>(apiClient.post(`/api/v1/pipelines/${pipelineId}/versions`, input)); },
  async restorePipelineVersion(pipelineId: string, versionId: string) { return unwrap<PipelineDetail>(apiClient.post(`/api/v1/pipelines/${pipelineId}/versions/${versionId}/restore`)); },
  async runPipeline(pipelineId: string, input: { triggerMode?: string; sampleDatasetId?: string } = {}) { return unwrap<PipelineRunDetail>(apiClient.post(`/api/v1/pipelines/${pipelineId}/runs`, input)); },
  async pipelineRuns(pipelineId: string) { return unwrap<PipelineRunSummary[]>(apiClient.get(`/api/v1/pipelines/${pipelineId}/runs`)); },
  async pipelineRunDetail(runId: string) { return unwrap<PipelineRunDetail>(apiClient.get(`/api/v1/pipeline-runs/${runId}`)); },
  async operators(params: { keyword?: string; category?: string; stage?: string; status?: string } = {}) { return unwrap<OperatorList>(apiClient.get('/api/v1/operators', { params })); },
  async operatorDetail(operatorId: string) { return unwrap<OperatorDetail>(apiClient.get(`/api/v1/operators/${operatorId}`)); },
  async createCustomOperator(input: OperatorCustomInput) { return unwrap<OperatorDetail>(apiClient.post('/api/v1/operators/custom', input)); },
  async submitOperator(operatorId: string) { return unwrap<OperatorDetail>(apiClient.post(`/api/v1/operators/${operatorId}/submit-review`)); },
  async approveOperator(operatorId: string, reason?: string) { return unwrap<OperatorDetail>(apiClient.post(`/api/v1/operators/${operatorId}/approve`, { reason })); },
  async rejectOperator(operatorId: string, reason: string) { return unwrap<OperatorDetail>(apiClient.post(`/api/v1/operators/${operatorId}/reject`, { reason })); },
  async dataStandardOverview() { return unwrap<DataStandardOverview>(apiClient.get('/api/v1/data-standards/overview')); },
  async dataStandardProfile(datasetId: string) { return unwrap<DataStandardProfile>(apiClient.get(`/api/v1/datasets/${datasetId}/standard-profile`)); },
  async dataStandardTasks() { return unwrap<DataStandardTask[]>(apiClient.get('/api/v1/data-standard-tasks')); },
  async createDataStandardTask(input: { datasetId: string; name: string; standardProfile?: string; ruleJson?: string }) { return unwrap<DataStandardTask>(apiClient.post('/api/v1/data-standard-tasks', input)); },
  async runDataStandardTask(taskId: string) { return unwrap<DataStandardTask>(apiClient.post(`/api/v1/data-standard-tasks/${taskId}/run`)); },
  async annotationOverview() { return unwrap<AnnotationOverview>(apiClient.get('/api/v1/annotation/overview')); },
  async annotationTasks(params: { status?: string; keyword?: string; page?: number; pageSize?: number } = {}) { return unwrap<AnnotationTaskList>(apiClient.get('/api/v1/annotation/tasks', { params })); },
  async annotationTaskDetail(taskId: string) { return unwrap<AnnotationTaskDetail>(apiClient.get(`/api/v1/annotation/tasks/${taskId}`)); },
  async createAnnotationTask(input: AnnotationTaskCreateInput) { return unwrap<AnnotationTaskDetail>(apiClient.post('/api/v1/annotation/tasks', input)); },
  async assignAnnotationTask(taskId: string, input: { assigneeIds: string[]; reviewerIds: string[] }) { return unwrap<AnnotationTaskDetail>(apiClient.post(`/api/v1/annotation/tasks/${taskId}/assign`, input)); },
  async startAnnotationTask(taskId: string) { return unwrap<AnnotationTaskDetail>(apiClient.post(`/api/v1/annotation/tasks/${taskId}/start`)); },
  async labelTemplates(params: { status?: string; scene?: string } = {}) { return unwrap<AnnotationLabelTemplate[]>(apiClient.get('/api/v1/annotation/label-templates', { params })); },
  async createLabelTemplate(input: AnnotationLabelTemplateInput) { return unwrap<AnnotationLabelTemplate>(apiClient.post('/api/v1/annotation/label-templates', input)); },
  async updateLabelTemplate(templateId: string, input: AnnotationLabelTemplateInput) { return unwrap<AnnotationLabelTemplate>(apiClient.put(`/api/v1/annotation/label-templates/${templateId}`, input)); },
  async publishLabelTemplate(templateId: string) { return unwrap<AnnotationLabelTemplate>(apiClient.post(`/api/v1/annotation/label-templates/${templateId}/publish`)); },
  async archiveLabelTemplate(templateId: string) { return unwrap<AnnotationLabelTemplate>(apiClient.post(`/api/v1/annotation/label-templates/${templateId}/archive`)); },
  async labelStudioConfig(templateId: string) { return unwrap<{ templateId: string; configXml: string; diagnosticCode: string; diagnosticMessage: string }>(apiClient.get(`/api/v1/annotation/label-templates/${templateId}/label-studio-config`)); },
  async annotationWorkItems(taskId: string) { return unwrap<AnnotationWorkItem[]>(apiClient.get(`/api/v1/annotation/tasks/${taskId}/work-items`)); },
  async saveAnnotationDraft(workItemId: string, annotationJson: string) { return unwrap<AnnotationWorkItem>(apiClient.post(`/api/v1/annotation/work-items/${workItemId}/draft`, { annotationJson })); },
  async submitAnnotationWorkItem(workItemId: string, annotationJson: string) { return unwrap<AnnotationWorkItem>(apiClient.post(`/api/v1/annotation/work-items/${workItemId}/submit`, { annotationJson })); },
  async annotationReviewItems(params: { status?: string; taskId?: string } = {}) { return unwrap<AnnotationReviewItem[]>(apiClient.get('/api/v1/annotation/review-items', { params })); },
  async approveAnnotationReviewItem(reviewItemId: string) { return unwrap<AnnotationReviewItem>(apiClient.post(`/api/v1/annotation/review-items/${reviewItemId}/approve`)); },
  async rejectAnnotationReviewItem(reviewItemId: string, reason: string) { return unwrap<AnnotationReviewItem>(apiClient.post(`/api/v1/annotation/review-items/${reviewItemId}/reject`, { reason })); },
  async qualityCheckAnnotationTask(taskId: string) { return unwrap<AnnotationPublication>(apiClient.post(`/api/v1/annotation/tasks/${taskId}/quality-check`)); },
  async publishAnnotationDataset(taskId: string) { return unwrap<AnnotationPublication>(apiClient.post(`/api/v1/annotation/tasks/${taskId}/publish-dataset`)); },
  async labelStudioStatus(taskId: string) { return unwrap<AnnotationExternalBinding>(apiClient.get(`/api/v1/annotation/tasks/${taskId}/label-studio/status`)); },
  async syncLabelStudioProject(taskId: string) { return unwrap<AnnotationExternalBinding>(apiClient.post(`/api/v1/annotation/tasks/${taskId}/label-studio/sync-project`)); },
  async syncLabelStudioTask(workItemId: string) { return unwrap<AnnotationExternalBinding>(apiClient.post(`/api/v1/annotation/work-items/${workItemId}/label-studio/sync-task`)); },
  async importLabelStudioResults(taskId: string) { return unwrap<AnnotationExternalBinding>(apiClient.post(`/api/v1/annotation/tasks/${taskId}/label-studio/import-results`)); },
  async annotationExports(taskId: string) { return unwrap<AnnotationTrainingExport[]>(apiClient.get(`/api/v1/annotation/tasks/${taskId}/exports`)); },
  async createAnnotationExport(taskId: string, input: { format: string; optionsJson?: string }) { return unwrap<AnnotationTrainingExport>(apiClient.post(`/api/v1/annotation/tasks/${taskId}/exports`, input)); },
  async annotationExportDownloadUrl(exportId: string) { return unwrap<AnnotationTrainingExport>(apiClient.get(`/api/v1/annotation/exports/${exportId}/download-url`)); },
};
