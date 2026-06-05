import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeManagementPage } from './EdgeManagementPage';
import { platformApi, type EdgeDeployment, type EdgeServer } from '../platform/platformApi';

const mockData = vi.hoisted(() => {
  const server: EdgeServer = {
    edgeServerId: 'EDGE-001',
    serverName: '上海工厂A车间边端',
    location: '上海工厂A车间',
    organizationId: 'TENANT-CABIN',
    ownerUserId: 'USR-BU-CABIN',
    ownerName: '座舱应用Owner',
    hostAddress: '10.21.0.8',
    agentVersion: '1.0.0',
    hardwareSummary: { gpu: 'NVIDIA T4 x1' },
    resourceSummary: { cpuUsage: 0.35 },
    status: 'ONLINE',
    diagnostic: 'MANUAL_AGENT_SEAM;TODO_CONFIRM_EDGE_AGENT_PROTOCOL',
    tenantId: 'TENANT-CABIN',
    createdAt: '2026-06-05T00:00:00Z',
    updatedAt: '2026-06-05T00:00:00Z',
    lastHeartbeatAt: '2026-06-05T00:01:00Z',
    decommissionedAt: null,
    permissionSummary: { canRead: true, canWrite: true, canRequestDeployment: true, canApproveDeployment: true, canExecuteDeployment: true },
  };
  const deployment: EdgeDeployment = {
    deploymentId: 'EDGEDEP-001',
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
    requestedBy: 'USR-BU-CABIN',
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
    permissionSummary: server.permissionSummary,
  };
  return { server, deployment };
});

vi.mock('../platform/platformApi', async () => {
  const actual = await vi.importActual<typeof import('../platform/platformApi')>('../platform/platformApi');
  return {
    ...actual,
    platformApi: {
      ...actual.platformApi,
      edgeServers: vi.fn(),
      createEdgeServer: vi.fn(),
      edgeServerDetail: vi.fn(),
      heartbeatEdgeServer: vi.fn(),
      decommissionEdgeServer: vi.fn(),
      edgeDeployments: vi.fn(),
      createEdgeDeployment: vi.fn(),
      edgeDeploymentDetail: vi.fn(),
      approveEdgeDeployment: vi.fn(),
      rejectEdgeDeployment: vi.fn(),
      executeEdgeDeployment: vi.fn(),
      verifyEdgeDeploymentIntegrity: vi.fn(),
      rollbackEdgeDeployment: vi.fn(),
    },
  };
});

let deploymentState: EdgeDeployment;

function resetApiMocks() {
  deploymentState = { ...mockData.deployment };
  vi.mocked(platformApi.edgeServers).mockResolvedValue({ items: [mockData.server], total: 1, page: 1, pageSize: 20 });
  vi.mocked(platformApi.createEdgeServer).mockResolvedValue({ ...mockData.server, edgeServerId: 'EDGE-NEW', serverName: '上海工厂新边端' });
  vi.mocked(platformApi.edgeServerDetail).mockResolvedValue(mockData.server);
  vi.mocked(platformApi.heartbeatEdgeServer).mockResolvedValue({ ...mockData.server, status: 'ONLINE' });
  vi.mocked(platformApi.decommissionEdgeServer).mockResolvedValue({ ...mockData.server, status: 'DECOMMISSIONED' });
  vi.mocked(platformApi.edgeDeployments).mockImplementation(async () => ({ items: [deploymentState], total: 1, page: 1, pageSize: 50 }));
  vi.mocked(platformApi.createEdgeDeployment).mockResolvedValue({ ...mockData.deployment, deploymentId: 'EDGEDEP-NEW' });
  vi.mocked(platformApi.edgeDeploymentDetail).mockImplementation(async () => ({ deployment: deploymentState, server: mockData.server, approvals: deploymentState.approvalStatus === 'PENDING' ? [] : [{ approvalId: 'APP-001', deploymentId: deploymentState.deploymentId, approverUserId: 'USR-BU-CABIN', decision: deploymentState.approvalStatus, comment: '页面审批通过', decidedAt: '2026-06-05T00:03:00Z' }] }));
  vi.mocked(platformApi.approveEdgeDeployment).mockImplementation(async () => { deploymentState = { ...deploymentState, status: 'APPROVED', approvalStatus: 'APPROVED' }; return deploymentState; });
  vi.mocked(platformApi.rejectEdgeDeployment).mockResolvedValue({ ...mockData.deployment, status: 'REJECTED', approvalStatus: 'REJECTED' });
  vi.mocked(platformApi.executeEdgeDeployment).mockImplementation(async () => { deploymentState = { ...deploymentState, status: 'VERIFYING', approvalStatus: 'APPROVED', diagnostic: 'MANUAL_AGENT_SEAM;TODO_CONFIRM_EDGE_AGENT_PROTOCOL' }; return deploymentState; });
  vi.mocked(platformApi.verifyEdgeDeploymentIntegrity).mockImplementation(async () => { deploymentState = { ...deploymentState, status: 'DEPLOYED', approvalStatus: 'APPROVED' }; return { deployment: deploymentState, server: mockData.server, approvals: [] }; });
  vi.mocked(platformApi.rollbackEdgeDeployment).mockResolvedValue({ ...mockData.deployment, status: 'ROLLED_BACK' });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EdgeManagementPage />
    </QueryClientProvider>,
  );
}

describe('EdgeManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetApiMocks();
  });

  it('TASK-edge-management-delivery AC-01 AC-02 AC-07 AC-10 展示列表、详情并注册边端', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('heading', { name: '边端管理' })).toBeInTheDocument();
    expect(screen.getByText('TASK-edge-management-delivery')).toBeInTheDocument();
    expect(await screen.findByText('上海工厂A车间边端')).toBeInTheDocument();
    expect(screen.getByText('MANUAL_AGENT_SEAM 与 TODO_CONFIRM_EDGE_AGENT_PROTOCOL', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(/原型|mock/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '上海工厂A车间边端' }));
    expect(await screen.findByText('EDGE-001')).toBeInTheDocument();
    expect(screen.getByText('NVIDIA T4 x1', { exact: false })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /注册边端服务器/ }));
    await user.clear(screen.getByLabelText('服务器名称'));
    await user.type(screen.getByLabelText('服务器名称'), '上海工厂新边端');
    await user.type(screen.getByLabelText('位置'), '上海工厂B车间');
    await user.type(screen.getByLabelText('主机地址'), '10.21.0.9');
    await user.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(platformApi.createEdgeServer).toHaveBeenCalledWith(expect.objectContaining({
      serverName: '上海工厂新边端',
      location: '上海工厂B车间',
      hostAddress: '10.21.0.9',
      hardwareSummary: { gpu: 'NVIDIA T4 x1' },
    })));
  });

  it('TASK-edge-management-delivery AC-03 AC-04 AC-05 AC-06 AC-10 创建下发并执行审批与完整性校验', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('上海工厂A车间边端');
    await user.click(screen.getAllByRole('button', { name: '申请下发' })[0]);
    await screen.findByText('创建模型下发申请');
    const dialog = screen.getAllByRole('dialog').find((item) => within(item).queryByText('创建模型下发申请'))!;
    await user.type(within(dialog).getByLabelText('模型 ID'), 'MODEL-YOLO-001');
    await user.type(within(dialog).getByLabelText('Production 版本 ID'), 'MVER-YOLO-001-V1');
    await user.type(within(dialog).getByLabelText('申请说明'), 'F021 下发申请');
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(platformApi.createEdgeDeployment).toHaveBeenCalledWith(expect.objectContaining({
      edgeServerId: 'EDGE-001',
      modelId: 'MODEL-YOLO-001',
      versionId: 'MVER-YOLO-001-V1',
      strategy: 'IMMEDIATE',
      notes: 'F021 下发申请',
    })));

    await user.click(await screen.findByRole('button', { name: 'EDGEDEP-001' }));
    await screen.findByText(/FILE-MODEL-001/);
    const detailDrawer = screen.getAllByRole('dialog').find((item) => within(item).queryByText('下发详情'))!;
    await user.click(within(detailDrawer).getByRole('button', { name: '审批通过' }));
    await waitFor(() => expect(platformApi.approveEdgeDeployment).toHaveBeenCalledWith('EDGEDEP-001', '页面审批通过'));

    await waitFor(() => expect(within(detailDrawer).getByRole('button', { name: /执行/ })).not.toBeDisabled());
    await user.click(within(detailDrawer).getByRole('button', { name: /执行/ }));
    await waitFor(() => expect(platformApi.executeEdgeDeployment).toHaveBeenCalledWith('EDGEDEP-001'));

    await user.click(within(detailDrawer).getByRole('button', { name: '提交校验' }));
    await waitFor(() => expect(platformApi.verifyEdgeDeploymentIntegrity).toHaveBeenCalledWith('EDGEDEP-001', expect.objectContaining({
      receivedSha256: 'sha256-model-001',
      diagnostic: 'edge side checksum',
    })));
  });
});
