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

vi.mock('./features/foundation/apiClient', () => ({
  apiClient: {
    get: vi.fn((url: string) => {
      if (url.includes('/auth/me')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockState.user } });
      if (url.includes('/platform/users')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { items: mockUsers, total: 1, page: 1, pageSize: 1 } } });
      if (url.includes('/platform/roles')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockRoles } });
      if (url.includes('/platform/permissions/matrix')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockMatrix } });
      if (url.includes('/platform/audit-logs')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { items: [mockAuditLog], total: 1, page: 1, pageSize: 1 } } });
      return Promise.reject(new Error('backend not running in frontend unit test'));
    }),
    post: vi.fn((url: string) => {
      if (url.includes('/auth/login')) {
        mockState.token = 'token-f006';
        mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm'], menuPermissions: ['dash', 'usermgmt', 'perm'], sessionVersion: 1 };
        return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { accessToken: 'token-f006', refreshToken: 'refresh', tokenType: 'Bearer', expiresInSeconds: 3600, user: mockState.user } } });
      }
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
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm'], menuPermissions: ['dash', 'usermgmt', 'perm'], sessionVersion: 1 };
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
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm'], menuPermissions: ['dash', 'usermgmt', 'perm'], sessionVersion: 1 };
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
});
