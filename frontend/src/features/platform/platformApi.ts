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
};
