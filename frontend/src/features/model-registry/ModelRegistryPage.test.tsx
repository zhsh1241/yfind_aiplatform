import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ModelRegistryPage } from './ModelRegistryPage';
import { platformApi } from '../platform/platformApi';
import { useSessionStore } from '../platform/sessionStore';

vi.mock('../platform/platformApi', async () => {
  const actual = await vi.importActual<typeof import('../platform/platformApi')>('../platform/platformApi');

  const models = {
    items: [
      {
        modelId: 'MODEL-YOLO-001',
        name: '焊缝缺陷检测 YOLOv8',
        description: '用于焊缝表面缺陷检测',
        framework: 'PYTORCH',
        taskType: 'OBJECT_DETECTION',
        inputFormat: 'image:640x640 RGB',
        outputFormat: 'bbox[class,score,x1,y1,x2,y2]',
        tags: ['焊缝', '缺陷检测'],
        scope: 'PLATFORM',
        source: 'PLATFORM_BUILT_IN',
        ownerUserId: 'USER-SYSTEM',
        ownerOrgId: 'TENANT-YF',
        tenantId: 'TENANT-YF',
        currentVersionId: 'MVER-YOLO-001-V1',
        currentVersionNo: 'v1.0',
        currentVersionStatus: 'PRODUCTION',
        evaluationStatus: 'IMPORTED_PROOF',
        permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: true, canEditModel: true, canCreateVersion: true, canDeleteVersion: true, canApproveAccess: true },
        createdAt: '2026-06-03T00:00:00Z',
        updatedAt: '2026-06-03T00:00:00Z',
      },
      {
        modelId: 'MODEL-SEG-002',
        name: '缺陷分割实验模型',
        description: '测试版本只限 BU',
        framework: 'ONNX',
        taskType: 'SEMANTIC_SEGMENTATION',
        inputFormat: 'image:1024x1024 RGB',
        outputFormat: 'mask[class]',
        tags: ['分割'],
        scope: 'BU',
        source: 'LOCAL_UPLOAD',
        ownerUserId: 'USER-TRAINER',
        ownerOrgId: 'TENANT-CABIN',
        tenantId: 'TENANT-CABIN',
        currentVersionId: 'MVER-SEG-002-V1',
        currentVersionNo: 'v1.2',
        currentVersionStatus: 'DEPRECATED',
        evaluationStatus: 'NONE',
        permissionSummary: { canView: true, canDownload: false, canUseForTraining: false, canDeploy: false, canManage: false, canEditModel: false, canCreateVersion: false, canDeleteVersion: false, canApproveAccess: false },
        createdAt: '2026-06-03T00:00:00Z',
        updatedAt: '2026-06-03T00:00:00Z',
      },
      {
        modelId: 'MODEL-NO-CURRENT-003',
        name: '未设置当前版本模型',
        description: '有训练权限但尚未设置当前版本',
        framework: 'PYTORCH',
        taskType: 'SEMANTIC_SEGMENTATION',
        inputFormat: 'image:1024x1024 RGB',
        outputFormat: 'mask[class]',
        tags: ['分割'],
        scope: 'BU',
        source: 'LOCAL_UPLOAD',
        ownerUserId: 'USER-TRAINER',
        ownerOrgId: 'TENANT-CABIN',
        tenantId: 'TENANT-CABIN',
        currentVersionId: null,
        currentVersionNo: null,
        currentVersionStatus: null,
        evaluationStatus: 'NONE',
        permissionSummary: { canView: true, canDownload: false, canUseForTraining: true, canDeploy: false, canManage: false, canEditModel: false, canCreateVersion: false, canDeleteVersion: false, canApproveAccess: false },
        createdAt: '2026-06-03T00:00:00Z',
        updatedAt: '2026-06-03T00:00:00Z',
      },
    ],
    total: 3,
    page: 1,
    pageSize: 20,
  };

  const detail = {
    modelId: 'MODEL-YOLO-001',
    name: '焊缝缺陷检测 YOLOv8',
    description: '用于焊缝表面缺陷检测',
    framework: 'PYTORCH',
    taskType: 'OBJECT_DETECTION',
    inputFormat: 'image:640x640 RGB',
    outputFormat: 'bbox[class,score,x1,y1,x2,y2]',
    runtimeRequirements: '{"python":"3.10"}',
    tags: ['焊缝', '缺陷检测'],
    scope: 'PLATFORM',
    source: 'PLATFORM_BUILT_IN',
    ownerUserId: 'USER-SYSTEM',
    ownerOrgId: 'TENANT-YF',
    tenantId: 'TENANT-YF',
    currentVersionId: 'MVER-YOLO-001-V1',
    permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: true, canEditModel: true, canCreateVersion: true, canDeleteVersion: true, canApproveAccess: true },
    versions: [
      {
        versionId: 'MVER-YOLO-001-V1',
        modelId: 'MODEL-YOLO-001',
        versionNo: 'v1.0',
        fileObjectId: 'FILE-MODEL-001',
        fileName: 'weld-yolo-v1.onnx',
        fileExtension: '.onnx',
        fileSizeBytes: 104857600,
        checksum: 'sha256...',
        storageBucket: 'smp-models',
        storageKey: 'TENANT-CABIN/models/MODEL-YOLO-001/v1.0/weld-yolo-v1.onnx',
        runtimeRequirements: '{"python":"3.10"}',
        metricsSummary: { mAP50: 0.91, latencyMs: 18 },
        securityScanStatus: 'PENDING',
        evaluationStatus: 'IMPORTED_PROOF',
        evaluationRecordId: 'EXT-EVAL-001',
        evaluationProof: '外部评估报告 EXT-EVAL-001，管理员导入',
        status: 'PRODUCTION',
        activeDeploymentCount: 0,
        activeReferences: [],
        permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: true, canEditModel: true, canCreateVersion: true, canDeleteVersion: true, canApproveAccess: true },
        downloadAvailable: true,
        transitionActions: ['DEPRECATED'],
        createdBy: 'USER-TRAINER',
        createdAt: '2026-06-03T00:00:00Z',
      },
      {
        versionId: 'MVER-YOLO-001-V2',
        modelId: 'MODEL-YOLO-001',
        versionNo: 'v2.0',
        fileObjectId: 'FILE-MODEL-002',
        fileName: 'weld-yolo-v2.onnx',
        fileExtension: '.onnx',
        fileSizeBytes: 114857600,
        checksum: 'sha256-v2',
        storageBucket: 'smp-models',
        storageKey: 'TENANT-CABIN/models/MODEL-YOLO-001/v2.0/weld-yolo-v2.onnx',
        runtimeRequirements: '{"python":"3.10"}',
        metricsSummary: { mAP50: 0.94, latencyMs: 16 },
        securityScanStatus: 'PENDING',
        evaluationStatus: 'NONE',
        evaluationRecordId: null,
        evaluationProof: null,
        status: 'TESTING',
        activeDeploymentCount: 1,
        activeReferences: [{ serviceId: 'INF-SVC-001', serviceName: '焊缝在线检测', status: 'RUNNING' }],
        permissionSummary: { canView: true, canDownload: false, canUseForTraining: false, canDeploy: false, canManage: false, canEditModel: false, canCreateVersion: false, canDeleteVersion: false, canApproveAccess: false },
        downloadAvailable: false,
        transitionActions: [],
        createdBy: 'USER-TRAINER',
        createdAt: '2026-06-04T00:00:00Z',
      },
    ],
    auditEvents: [
      { eventId: 'AUD-1', action: 'MODEL_CREATED', operatorName: '模型训练工程师', occurredAt: '2026-06-03T00:00:00Z', result: 'SUCCESS' },
      { eventId: 'AUD-2', action: 'MODEL_VERSION_PUBLISH_BLOCKED', operatorName: '模型训练工程师', occurredAt: '2026-06-04T00:00:00Z', result: 'BLOCKED' },
    ],
    createdAt: '2026-06-03T00:00:00Z',
    updatedAt: '2026-06-04T00:00:00Z',
  };

  return {
    ...actual,
    platformApi: {
      ...actual.platformApi,
      models: vi.fn().mockResolvedValue(models),
      createModel: vi.fn().mockImplementation(async (input: { name: string }) => ({ ...models.items[0], modelId: 'MODEL-NEW-001', name: input.name })),
      modelDetail: vi.fn().mockResolvedValue(detail),
      modelVersions: vi.fn().mockImplementation(async (modelId: string) => {
        if (modelId === 'MODEL-YOLO-001') return detail.versions;
        if (modelId === 'MODEL-SEG-002') {
          return [
            {
              ...detail.versions[0],
              versionId: 'MVER-SEG-002-V0',
              modelId: 'MODEL-SEG-002',
              versionNo: 'v1.1',
              fileObjectId: 'FILE-MODEL-SEG-001',
              fileName: 'defect-seg-v1.onnx',
              status: 'TESTING',
              permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: false, canEditModel: false, canCreateVersion: false, canDeleteVersion: false, canApproveAccess: false },
            },
            {
              ...detail.versions[0],
              versionId: 'MVER-SEG-002-V1',
              modelId: 'MODEL-SEG-002',
              versionNo: 'v1.2',
              fileObjectId: 'FILE-MODEL-SEG-002',
              fileName: 'defect-seg-v2.onnx',
              status: 'DEPRECATED',
              permissionSummary: { canView: true, canDownload: false, canUseForTraining: false, canDeploy: false, canManage: false, canEditModel: false, canCreateVersion: false, canDeleteVersion: false, canApproveAccess: false },
            },
          ];
        }
        if (modelId === 'MODEL-NO-CURRENT-003') return [];
        return [];
      }),
      updateModel: vi.fn().mockImplementation(async (_modelId: string, input: { name?: string }) => ({ ...models.items[0], name: input.name ?? models.items[0].name })),
      files: vi.fn().mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      }),
      filesByQuery: vi.fn().mockResolvedValue({
        items: [
          {
            fileId: 'FILE-MODEL-001',
            assetType: 'MODEL',
            tenantId: 'TENANT-CABIN',
            projectId: null,
            bucket: 'smp-models',
            objectKey: 'TENANT-CABIN/models/weld-yolo-v1.onnx',
            expectedSha256: null,
            sha256: 'sha256...',
            expectedSizeBytes: 104857600,
            sizeBytes: 104857600,
            contentType: 'application/octet-stream',
            storageTier: 'STANDARD',
            status: 'AVAILABLE',
            ownerId: 'USER-TRAINER',
            createdAt: '2026-06-03T00:00:00Z',
            updatedAt: '2026-06-03T00:00:00Z',
          },
          {
            fileId: 'FILE-DATASET-001',
            assetType: 'DATASET',
            tenantId: 'TENANT-CABIN',
            projectId: null,
            bucket: 'smp-datasets',
            objectKey: 'TENANT-CABIN/datasets/weld-images.zip',
            expectedSha256: null,
            sha256: 'sha256-dataset',
            expectedSizeBytes: 4096,
            sizeBytes: 4096,
            contentType: 'application/zip',
            storageTier: 'STANDARD',
            status: 'AVAILABLE',
            ownerId: 'USER-TRAINER',
            createdAt: '2026-06-03T00:00:00Z',
            updatedAt: '2026-06-03T00:00:00Z',
          },
          {
            fileId: 'FILE-MODEL-TXT-001',
            assetType: 'MODEL',
            tenantId: 'TENANT-CABIN',
            projectId: null,
            bucket: 'smp-models',
            objectKey: 'TENANT-CABIN/models/readme.txt',
            expectedSha256: null,
            sha256: 'sha256-txt',
            expectedSizeBytes: 512,
            sizeBytes: 512,
            contentType: 'text/plain',
            storageTier: 'STANDARD',
            status: 'AVAILABLE',
            ownerId: 'USER-TRAINER',
            createdAt: '2026-06-03T00:00:00Z',
            updatedAt: '2026-06-03T00:00:00Z',
          },
          {
            fileId: 'FILE-MODEL-DELETED-001',
            assetType: 'MODEL',
            tenantId: 'TENANT-CABIN',
            projectId: null,
            bucket: 'smp-models',
            objectKey: 'TENANT-CABIN/models/deleted.onnx',
            expectedSha256: null,
            sha256: 'sha256-deleted',
            expectedSizeBytes: 1024,
            sizeBytes: 1024,
            contentType: 'application/octet-stream',
            storageTier: 'STANDARD',
            status: 'DELETED',
            ownerId: 'USER-TRAINER',
            createdAt: '2026-06-03T00:00:00Z',
            updatedAt: '2026-06-03T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
      createModelVersion: vi.fn().mockResolvedValue(detail.versions[0]),
      transitionModelVersion: vi.fn().mockImplementation(async (_modelId: string, versionId: string, input: { targetStatus: string }) => ({
        ...detail.versions.find((item) => item.versionId === versionId)!,
        status: input.targetStatus,
      })),
      deleteModelVersion: vi.fn().mockImplementation(async (_modelId: string, versionId: string) => ({
        versionId,
        deleted: false,
        blocked: true,
        activeReferences: [{ serviceId: 'INF-SVC-001', serviceName: '焊缝在线检测', status: 'RUNNING' }],
      })),
      modelAccessRequests: vi.fn().mockResolvedValue([
        {
          requestId: 'MACC-EXISTING',
          modelId: 'MODEL-YOLO-001',
          versionId: 'MVER-YOLO-001-V1',
          requesterUserId: 'USER-QE',
          requesterOrgId: 'TENANT-QE',
          ownerOrgId: 'TENANT-CABIN',
          permission: 'USE_FOR_TRAINING',
          reason: '跨会话待审批申请',
          status: 'PENDING',
          reviewComment: null,
          reviewedBy: null,
          reviewedAt: null,
          expiresAt: '2026-12-31T23:59:59Z',
        },
      ]),
      requestModelAccess: vi.fn().mockResolvedValue({
        requestId: 'MACC-001',
        modelId: 'MODEL-YOLO-001',
        versionId: 'MVER-YOLO-001-V1',
        requesterUserId: 'USER-QE',
        requesterOrgId: 'TENANT-QE',
        ownerOrgId: 'TENANT-CABIN',
        permission: 'USE_FOR_TRAINING',
        reason: '用于座舱缺陷检测训练对比',
        status: 'PENDING',
        reviewComment: null,
        reviewedBy: null,
        reviewedAt: null,
        expiresAt: '2026-12-31T23:59:59Z',
      }),
      approveModelAccessRequest: vi.fn().mockResolvedValue({
        requestId: 'MACC-001',
        modelId: 'MODEL-YOLO-001',
        versionId: 'MVER-YOLO-001-V1',
        requesterUserId: 'USER-QE',
        requesterOrgId: 'TENANT-QE',
        ownerOrgId: 'TENANT-CABIN',
        permission: 'USE_FOR_TRAINING',
        reason: '用于座舱缺陷检测训练对比',
        status: 'APPROVED',
        reviewComment: '页面审批通过',
        reviewedBy: 'USR-001',
        reviewedAt: '2026-06-03T01:00:00Z',
        expiresAt: '2026-12-31T23:59:59Z',
      }),
      rejectModelAccessRequest: vi.fn().mockResolvedValue({
        requestId: 'MACC-EXISTING',
        modelId: 'MODEL-YOLO-001',
        versionId: 'MVER-YOLO-001-V1',
        requesterUserId: 'USER-QE',
        requesterOrgId: 'TENANT-QE',
        ownerOrgId: 'TENANT-CABIN',
        permission: 'USE_FOR_TRAINING',
        reason: '跨会话待审批申请',
        status: 'REJECTED',
        reviewComment: '页面审批拒绝',
        reviewedBy: 'USR-001',
        reviewedAt: '2026-06-03T01:00:00Z',
        expiresAt: '2026-12-31T23:59:59Z',
      }),
      modelDownloadUrl: vi.fn().mockResolvedValue({
        modelId: 'MODEL-YOLO-001',
        versionId: 'MVER-YOLO-001-V1',
        fileObjectId: 'FILE-MODEL-001',
        downloadUrl: 'http://127.0.0.1:9000/smp-models/model.onnx?X-Amz-Expires=600',
        expiresInSeconds: 600,
        diagnostic: 'PRESIGNED_URL_READY',
      }),
    },
  };
});

function renderPage(options: { permissions?: string[] } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const permissions = options.permissions ?? ['model:model:read', 'model:model:write', 'model:version:write', 'model:model:download'];
  useSessionStore.setState({
    token: 'token-model',
    initialized: true,
    user: {
      id: 'USR-001',
      username: 'admin',
      displayName: '平台管理员',
      tenantId: 'TENANT-YF',
      tenantName: '延锋汽车内饰系统',
      buCode: 'YF',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      roleNames: ['超级管理员'],
      permissions,
      menuPermissions: ['hub'],
      sessionVersion: 1,
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ModelRegistryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'open').mockImplementation(() => null);
});

describe('TASK-model-registry-foundation ModelRegistryPage', () => {
  // TASK-model-registry-foundation AC-04 AC-13: 详情页展示版本/审计，页面不得出现原型说明性质元素。
  it('renders model list, opens detail, and keeps business empty-state text out', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: '模型中心' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '焊缝缺陷检测 YOLOv8' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '缺陷分割实验模型' })).toBeInTheDocument();
    expect(screen.queryByText(/原型说明|示意页面/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '焊缝缺陷检测 YOLOv8' }));

    expect(await screen.findByText(/MODEL_CREATED/)).toBeInTheDocument();
    expect(screen.getAllByText('weld-yolo-v1.onnx').length).toBeGreaterThan(0);
    expect(screen.getByText(/· \.onnx · 100\.0 MB/)).toBeInTheDocument();
    expect(screen.getByText('可生成 10 分钟下载链接')).toBeInTheDocument();
    expect(screen.getAllByText('DEPRECATED').length).toBeGreaterThan(0);
  });

  it('validates create model form before submitting API', async () => {
    renderPage();
    await userEvent.click((await screen.findByText('新建模型')).closest('button')!);
    await userEvent.click(document.querySelector('.ant-modal .ant-btn-primary') as HTMLButtonElement);

    expect(await screen.findByText('请输入模型名称')).toBeInTheDocument();
    expect(platformApi.createModel).not.toHaveBeenCalled();
  });


  it('hides create model action when session lacks model write permission', async () => {
    renderPage({ permissions: ['model:model:read', 'model:model:download'] });

    expect(await screen.findByRole('heading', { name: '模型中心' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '新建模型' })).not.toBeInTheDocument();
  });

  it('hides write actions when backend capabilities are read-only', async () => {
    const writableDetail = await platformApi.modelDetail('MODEL-YOLO-001');
    const readOnlyDetail = {
      ...writableDetail,
      permissionSummary: {
        canView: true,
        canDownload: false,
        canUseForTraining: true,
        canDeploy: false,
        canManage: false,
        canEditModel: false,
        canCreateVersion: false,
        canDeleteVersion: false,
        canApproveAccess: false,
      },
      versions: writableDetail.versions.map((version) => ({
        ...version,
        permissionSummary: {
          ...version.permissionSummary,
          canManage: false,
          canEditModel: false,
          canCreateVersion: false,
          canDeleteVersion: false,
          canApproveAccess: false,
        },
        transitionActions: [],
      })),
    };
    vi.mocked(platformApi.modelDetail).mockResolvedValueOnce(readOnlyDetail);

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: '焊缝缺陷检测 YOLOv8' }));
    expect(await screen.findByText(/MODEL_CREATED/)).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: '编辑元数据' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '创建版本' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '审批通过' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '拒绝' })).not.toBeInTheDocument();
  });

  it('shows delete blocking references returned by the backend conflict response', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: '焊缝缺陷检测 YOLOv8' }));
    expect(await screen.findByText(/MODEL_CREATED/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(platformApi.deleteModelVersion).toHaveBeenCalledWith('MODEL-YOLO-001', 'MVER-YOLO-001-V1');
    });
    expect((await screen.findAllByText('该模型版本当前被推理服务引用，请先下线相关服务')).length).toBeGreaterThan(0);
    expect(await screen.findByText('焊缝在线检测 · RUNNING')).toBeInTheDocument();
  });


  it('passes tag and owner BU filters to model list query', async () => {
    renderPage();
    await screen.findByRole('heading', { name: '模型中心' });

    await userEvent.type(screen.getByPlaceholderText('按标签筛选'), '预训练{enter}');
    await userEvent.type(screen.getByPlaceholderText('Owner BU / 组织 ID'), 'TENANT-YF{enter}');

    await waitFor(() => {
      expect(platformApi.models).toHaveBeenCalledWith(expect.objectContaining({ tag: '预训练', ownerOrgId: 'TENANT-YF' }));
    });
  });

  it('limits create-version file selector to available model artifacts only', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: '焊缝缺陷检测 YOLOv8' }));
    expect(await screen.findByText(/MODEL_CREATED/)).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: /创建版本/ })[0]);
    await waitFor(() => {
      expect(platformApi.filesByQuery).toHaveBeenCalledWith({ assetType: 'MODEL', status: 'AVAILABLE' });
    });

    await userEvent.click(screen.getByLabelText('平台文件对象'));
    expect(await screen.findByText(/FILE-MODEL-001 · TENANT-CABIN\/models\/weld-yolo-v1\.onnx/)).toBeInTheDocument();
    expect(screen.queryByText(/FILE-DATASET-001/)).not.toBeInTheDocument();
    expect(screen.queryByText(/FILE-MODEL-TXT-001/)).not.toBeInTheDocument();
    expect(screen.queryByText(/FILE-MODEL-DELETED-001/)).not.toBeInTheDocument();
  });


  it('loads pending access requests from backend so approvers can review cross-session requests', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: '焊缝缺陷检测 YOLOv8' }));

    expect(await screen.findByText('MACC-EXISTING')).toBeInTheDocument();
    expect(await screen.findByText('跨会话待审批申请')).toBeInTheDocument();
    await waitFor(() => {
      expect(platformApi.modelAccessRequests).toHaveBeenCalledWith('MODEL-YOLO-001', { status: 'PENDING' });
    });

    await userEvent.click(screen.getByRole('button', { name: '审批通过' }));
    await waitFor(() => {
      expect(platformApi.approveModelAccessRequest).toHaveBeenCalledWith('MACC-EXISTING', expect.objectContaining({ reviewComment: '页面审批通过' }));
    });
  });


  it('refreshes pending access requests after rejecting a cross-session request', async () => {
    vi.mocked(platformApi.modelAccessRequests)
      .mockResolvedValueOnce([
        {
          requestId: 'MACC-EXISTING',
          modelId: 'MODEL-YOLO-001',
          versionId: 'MVER-YOLO-001-V1',
          requesterUserId: 'USER-QE',
          requesterOrgId: 'TENANT-QE',
          ownerOrgId: 'TENANT-CABIN',
          permission: 'USE_FOR_TRAINING',
          reason: '跨会话待审批申请',
          status: 'PENDING',
          reviewComment: null,
          reviewedBy: null,
          reviewedAt: null,
          expiresAt: '2026-12-31T23:59:59Z',
        },
      ])
      .mockResolvedValueOnce([]);

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: '焊缝缺陷检测 YOLOv8' }));
    expect(await screen.findByText('MACC-EXISTING')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /拒\s*绝/ }));

    await waitFor(() => {
      expect(platformApi.rejectModelAccessRequest).toHaveBeenCalledWith('MACC-EXISTING', expect.objectContaining({ reviewComment: '页面审批拒绝' }));
    });
    await waitFor(() => {
      expect(platformApi.modelAccessRequests).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('暂无待处理访问申请')).toBeInTheDocument();
  });

  it('submits cross-BU access request and keeps selector filtered to training-usable non-deprecated model versions', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: '焊缝缺陷检测 YOLOv8' }));

    await userEvent.click(screen.getByRole('combobox', { name: 'model-selector' }));
    expect(await screen.findByText('焊缝缺陷检测 YOLOv8 · v1.0 · PYTORCH')).toBeInTheDocument();
    expect(await screen.findByText('缺陷分割实验模型 · v1.1 · ONNX')).toBeInTheDocument();
    expect(screen.queryByText('缺陷分割实验模型 · v1.2 · ONNX')).not.toBeInTheDocument();
    expect(screen.queryByText(/未设置当前版本模型 ·/)).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: /跨 BU 访问申请/ })[0]);
    await userEvent.type(screen.getByLabelText('申请原因'), '用于座舱缺陷检测训练对比');
    await userEvent.click(document.querySelector('.ant-modal .ant-btn-primary') as HTMLButtonElement);

    await waitFor(() => {
      expect(platformApi.requestModelAccess).toHaveBeenCalledWith(
        'MODEL-YOLO-001',
        expect.objectContaining({ permission: 'USE_FOR_TRAINING', reason: '用于座舱缺陷检测训练对比' }),
      );
    });

    await waitFor(() => {
      expect(platformApi.modelAccessRequests).toHaveBeenCalledWith('MODEL-YOLO-001', { status: 'PENDING' });
    });
  });
});


