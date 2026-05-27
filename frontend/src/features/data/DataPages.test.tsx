import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { dataApi } from '../platform/platformApi';
import { DataPipelineStandardPage, TagManagementPage } from './DataPages';
import { useSessionStore } from '../platform/sessionStore';

vi.mock('../platform/platformApi', async () => {
  const actual = await vi.importActual<typeof import('../platform/platformApi')>('../platform/platformApi');
  const mockRunResult = {
    run: { outputDatasetId: 'DATASET-OUT', diagnosticMessage: 'VISUAL_PREPROCESS_RUN_SUCCEEDED' },
    preview: {
      datasetId: 'DATASET-OUT',
      runId: 'RUN-001',
      pipelineId: 'PIPE-VIDEO-PREP',
      sourceDatasetId: 'DATASET-WELD-VIDEO-001',
      sourceVersionId: 'DVER-WELD-VIDEO-001',
      status: 'PENDING_CONFIRMATION',
      datasetDataType: 'IMAGE',
      previewWatermarkApplied: true,
      artifactWatermarkApplied: false,
      artifactWatermarkBlocksAnnotation: false,
      enhancementMode: null,
      frameExtractionMode: 'FIXED_INTERVAL',
      totalCount: 12,
      successCount: 10,
      skippedCount: 1,
      failedCount: 1,
      samplePairs: [
        { label: '抽帧样本', beforeExample: 'frame-001-before.jpg', afterExample: 'frame-001-after.jpg' },
        { label: '增强样本', beforeExample: 'frame-002-before.jpg', afterExample: 'frame-002-after.jpg' },
      ],
      warnings: ['预览水印已应用'],
      failedReasons: ['少量帧解码失败'],
      skippedReasons: ['已过滤重复帧'],
      processParamsJson: JSON.stringify({ mode: 'FIXED_INTERVAL', intervalSeconds: 2, outputImageFormat: 'JPG' }),
      operatorChainJson: JSON.stringify(['OP-READ-DATASET', 'OP-VIDEO-FRAME-EXTRACT', 'OP-IMG-WATERMARK']),
    },
    activation: {
      datasetId: 'DATASET-OUT',
      status: 'PENDING_CONFIRMATION',
      confirmed: false,
      annotationEligible: false,
      blockReason: '尚未人工确认',
      targetVersionId: 'DVER-OUT-001',
      confirmedAt: null,
      activatedAt: null,
    },
  };

  const operatorItems = [
    { operatorId: 'OP-READ-DATASET', name: '读取数据集', categoryGroup: 'COMMON', category: 'DATA_INPUT', subCategory: 'SOURCE', dataType: 'ANY', stage: 'PREPROCESS', kind: 'BUILTIN', status: 'PUBLISHED', supportsPreview: true, enhancementMode: null, defaultOutputDatasetDataType: 'ANY', annotationRiskLevel: 'LOW', description: '读取本次加工任务选择的数据集版本', beforeExample: 'before', afterExample: 'after', usageCount: 1, pipelineCount: 1, errorRate: 0.01 },
    { operatorId: 'OP-IMG-WATERMARK', name: '图片加水印', categoryGroup: 'VISUAL_PREPROCESS', category: 'IMAGE_PROCESSING', subCategory: 'WATERMARK', dataType: 'IMAGE', stage: 'PREPROCESS', kind: 'BUILTIN', status: 'PUBLISHED', supportsPreview: true, enhancementMode: null, defaultOutputDatasetDataType: 'IMAGE', annotationRiskLevel: 'MEDIUM', description: '添加预览水印或产物水印', beforeExample: 'before', afterExample: 'after', usageCount: 1, pipelineCount: 1, errorRate: 0.01 },
    { operatorId: 'OP-IMG-ENHANCE', name: '图片质量提高', categoryGroup: 'VISUAL_PREPROCESS', category: 'IMAGE_PROCESSING', subCategory: 'QUALITY_ENHANCEMENT', dataType: 'IMAGE', stage: 'PREPROCESS', kind: 'BUILTIN', status: 'PUBLISHED', supportsPreview: true, enhancementMode: 'TRADITIONAL_ONLY', defaultOutputDatasetDataType: 'IMAGE', annotationRiskLevel: 'LOW', description: '传统增强', beforeExample: 'before', afterExample: 'after', usageCount: 1, pipelineCount: 1, errorRate: 0.01 },
    { operatorId: 'OP-VIDEO-FRAME-EXTRACT', name: '固定间隔抽帧', categoryGroup: 'VISUAL_PREPROCESS', category: 'VIDEO_PROCESSING', subCategory: 'FRAME_EXTRACTION', dataType: 'AUDIO_VIDEO', stage: 'PREPROCESS', kind: 'BUILTIN', status: 'PUBLISHED', supportsPreview: true, enhancementMode: null, defaultOutputDatasetDataType: 'IMAGE', annotationRiskLevel: 'LOW', description: '固定间隔抽帧', beforeExample: 'before', afterExample: 'after', usageCount: 1, pipelineCount: 1, errorRate: 0.01 },
  ];

  const pipelineDetail = {
    pipeline: {
      pipelineId: 'PIPE-VIDEO-PREP',
      name: '焊缝视频抽帧预处理',
      tenantId: 'TENANT-CABIN',
      projectId: null,
      status: 'ACTIVE',
      currentVersionId: 'PV-1',
      ownerId: 'USR-001',
      ownerName: '平台管理员',
      nodeCount: 3,
      runCount: 1,
      description: 'test',
      templateCode: 'VIDEO_FRAME_TO_IMAGE_PREPROCESS',
      sourceDatasetId: 'DATASET-WELD-VIDEO-001',
      sourceVersionId: 'DVER-WELD-VIDEO-001',
      sourceDatasetDataType: 'AUDIO_VIDEO',
      updatedAt: '2026-05-26T00:00:00Z',
    },
    nodes: [
      { nodeId: 'read-video', operatorId: 'OP-READ-DATASET', operatorName: '读取数据集', label: '读取数据集', positionX: 100, positionY: 100, configJson: JSON.stringify({ datasetId: 'DATASET-WELD-VIDEO-001', versionId: 'DVER-WELD-VIDEO-001' }), status: 'READY' },
      { nodeId: 'extract', operatorId: 'OP-VIDEO-FRAME-EXTRACT', operatorName: '固定间隔抽帧', label: '固定间隔抽帧', positionX: 300, positionY: 100, configJson: JSON.stringify({ mode: 'FIXED_INTERVAL', intervalSeconds: 2, outputImageFormat: 'JPG' }), status: 'READY' },
      { nodeId: 'watermark', operatorId: 'OP-IMG-WATERMARK', operatorName: '图片加水印', label: '图片加水印', positionX: 500, positionY: 100, configJson: JSON.stringify({ previewWatermarkEnabled: true, artifactWatermarkEnabled: false, watermarkText: '', position: 'BOTTOM_RIGHT', opacity: 0.4 }), status: 'READY' },
      { nodeId: 'enhance', operatorId: 'OP-IMG-ENHANCE', operatorName: '图片质量提高', label: '图片质量提高', positionX: 700, positionY: 100, configJson: JSON.stringify({ enhancementMode: 'TRADITIONAL_ONLY', sharpen: true, denoise: true, brightnessContrastOptimize: true }), status: 'READY' },
    ],
    edges: [
      { edgeId: 'edge-0', sourceNodeId: 'read-video', targetNodeId: 'extract', edgeType: 'DATA' },
      { edgeId: 'edge-1', sourceNodeId: 'extract', targetNodeId: 'watermark', edgeType: 'DATA' },
      { edgeId: 'edge-2', sourceNodeId: 'watermark', targetNodeId: 'enhance', edgeType: 'DATA' },
    ],
    variables: [],
    versions: [],
    runs: [
      {
        runId: 'RUN-HISTORY-001',
        pipelineId: 'PIPE-VIDEO-PREP',
        versionId: 'PV-1',
        status: 'SUCCEEDED',
        triggerMode: 'MANUAL',
        diagnosticCode: 'OK',
        diagnosticMessage: 'VISUAL_PREPROCESS_RUN_SUCCEEDED',
        outputDatasetId: 'DATASET-OUT',
        resultDatasetStatus: 'PENDING_CONFIRMATION',
        durationMs: 3200,
        totalCount: 12,
        successCount: 10,
        skippedCount: 1,
        failedCount: 1,
        startedAt: '2026-05-26T10:00:00Z',
        endedAt: '2026-05-26T10:00:03Z',
      },
    ],
    validation: { valid: true, diagnosticCode: 'OK', diagnosticMessage: 'ok', errors: [], warnings: [] },
  };

  return {
    ...actual,
    getAccessToken: () => 'token-test',
    dataApi: {
      pipelines: vi.fn().mockResolvedValue({ items: [{ pipelineId: 'PIPE-VIDEO-PREP', name: '焊缝视频抽帧预处理' }], total: 1, page: 1, pageSize: 20 }),
      pipelineDetail: vi.fn().mockResolvedValue(pipelineDetail),
      datasets: vi.fn().mockResolvedValue({
        items: [
          {
            datasetId: 'DATASET-WELD-VIDEO-001',
            name: '焊缝视频巡检数据集',
            datasetType: 'RAW',
            dataType: 'AUDIO_VIDEO',
            tenantId: 'TENANT-CABIN',
            projectId: null,
            currentVersionId: 'DVER-WELD-VIDEO-001',
            currentVersionName: 'v1',
            status: 'ACTIVE',
            accessLevel: 'TEAM',
            tags: ['焊缝', '视频'],
            versionCount: 1,
            recordCount: 1,
            sizeBytes: 1024,
            ownerId: 'USR-001',
            ownerName: '平台管理员',
            description: null,
            archivedAt: null,
            updatedAt: '2026-05-26T00:00:00Z',
            mutable: true,
            hardDeletable: false,
          },
          {
            datasetId: 'DATASET-NEW-VIDEO-002',
            name: '新一批车间视频数据集',
            datasetType: 'RAW',
            dataType: 'AUDIO_VIDEO',
            tenantId: 'TENANT-CABIN',
            projectId: null,
            currentVersionId: 'DVER-NEW-VIDEO-002',
            currentVersionName: 'v1',
            status: 'ACTIVE',
            accessLevel: 'TEAM',
            tags: [],
            versionCount: 1,
            recordCount: 1,
            sizeBytes: 2048,
            ownerId: 'USR-001',
            ownerName: '平台管理员',
            description: null,
            archivedAt: null,
            updatedAt: '2026-05-26T00:00:00Z',
            mutable: true,
            hardDeletable: false,
          },
          {
            datasetId: 'DATASET-PREP-OUT-001',
            name: '预处理导出图片数据集',
            datasetType: 'PREPROCESSED',
            dataType: 'IMAGE',
            tenantId: 'TENANT-CABIN',
            projectId: null,
            currentVersionId: 'DVER-PREP-OUT-001',
            currentVersionName: '抽帧结果v1',
            status: 'PENDING_CONFIRMATION',
            accessLevel: 'TEAM',
            tags: ['焊缝', '预处理导出'],
            versionCount: 1,
            recordCount: 12,
            sizeBytes: 4096,
            ownerId: 'USR-001',
            ownerName: '平台管理员',
            description: 'Pipeline 预处理导出',
            archivedAt: null,
            updatedAt: '2026-05-26T00:00:00Z',
            mutable: true,
            hardDeletable: false,
          },
        ],
        total: 3,
        page: 1,
        pageSize: 100,
        stats: { total: 3, raw: 2, preprocessed: 1, annotated: 0, restricted: 0, totalSizeBytes: 7168 },
      }),
      operators: vi.fn().mockImplementation((params?: { categoryGroup?: string }) => {
        const items = params?.categoryGroup ? operatorItems.filter((item) => item.categoryGroup === params.categoryGroup) : operatorItems;
        return Promise.resolve({ items, total: items.length, categories: [], stats: { total: items.length, builtin: items.length, custom: 0, published: items.length, submitted: 0 } });
      }),
      datasetDetail: vi.fn().mockImplementation((datasetId: string) => {
        const dataset = [
          { datasetId: 'DATASET-WELD-VIDEO-001', name: '焊缝视频巡检数据集', datasetType: 'RAW', dataType: 'AUDIO_VIDEO', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-WELD-VIDEO-001', currentVersionName: 'v1', status: 'ACTIVE', accessLevel: 'TEAM', tags: [], versionCount: 1, recordCount: 1, sizeBytes: 1024, ownerId: 'USR-001', ownerName: '平台管理员', description: null, archivedAt: null, updatedAt: '2026-05-26T00:00:00Z', mutable: true, hardDeletable: false },
          { datasetId: 'DATASET-PREP-OUT-001', name: '预处理导出图片数据集', datasetType: 'PREPROCESSED', dataType: 'IMAGE', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-PREP-OUT-001', currentVersionName: '抽帧结果v1', status: 'PENDING_CONFIRMATION', accessLevel: 'TEAM', tags: [], versionCount: 1, recordCount: 12, sizeBytes: 4096, ownerId: 'USR-001', ownerName: '平台管理员', description: 'Pipeline 预处理导出', archivedAt: null, updatedAt: '2026-05-26T00:00:00Z', mutable: true, hardDeletable: false },
        ].find((item) => item.datasetId === datasetId) ?? { datasetId, name: datasetId, datasetType: 'RAW', dataType: 'IMAGE', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-FALLBACK', currentVersionName: 'v1', status: 'ACTIVE', accessLevel: 'TEAM', tags: [], versionCount: 1, recordCount: 1, sizeBytes: 1, ownerId: 'USR-001', ownerName: '平台管理员', description: null, archivedAt: null, updatedAt: '2026-05-26T00:00:00Z', mutable: true, hardDeletable: false };
        const versionId = dataset.currentVersionId ?? 'DVER-FALLBACK';
        const selectedVersion = { versionId, datasetId: dataset.datasetId, versionName: dataset.currentVersionName ?? 'v1', status: dataset.datasetType === 'PREPROCESSED' ? 'READY' : 'PUBLISHED', isCurrent: true, sourceVersionId: null, recordCount: dataset.recordCount, fileCount: 1, sizeBytes: dataset.sizeBytes, contentSafetyStatus: 'PASSED', diagnosticCode: 'OK', diagnosticMessage: null, createdAt: '2026-05-26T00:00:00Z', publishedAt: '2026-05-26T00:00:00Z', mutable: true, deletable: false, deleteBlockedReason: null };
        return Promise.resolve({ dataset, selectedVersionId: versionId, selectedVersion, versions: [selectedVersion], files: [], grants: [], lineage: [], previewStatus: 'READY', previewDiagnostic: 'OK' });
      }),
      pipelineProcessingTasks: vi.fn().mockResolvedValue({
        items: [
          {
            taskId: 'RUN-HISTORY-001',
            pipelineId: 'PIPE-VIDEO-PREP',
            pipelineName: '焊缝视频抽帧预处理',
            sourceDatasetId: 'DATASET-WELD-VIDEO-001',
            sourceDatasetName: '焊缝视频巡检数据集',
            sourceVersionId: 'DVER-WELD-VIDEO-001',
            outputDatasetId: 'DATASET-OUT',
            status: 'SUCCEEDED',
            resultDatasetStatus: 'PENDING_CONFIRMATION',
            diagnosticCode: 'OK',
            diagnosticMessage: 'VISUAL_PREPROCESS_RUN_SUCCEEDED',
            durationMs: 3200,
            totalCount: 12,
            successCount: 10,
            skippedCount: 1,
            failedCount: 1,
            createdAt: '2026-05-26T10:00:00Z',
            endedAt: '2026-05-26T10:00:03Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 100,
      }),
      createPipelineProcessingTask: vi.fn().mockResolvedValue(mockRunResult),
      dataStandardOverview: vi.fn().mockResolvedValue({ stats: { datasetCount: 0, profiledCount: 0, compliantCount: 0, issueCount: 0, taskCount: 0 }, profiles: [], tasks: [] }),
      dataStandardProfile: vi.fn().mockResolvedValue({ datasetId: 'DATASET-1', datasetName: '数据集', datasetType: 'RAW', dataType: 'IMAGE', sourceType: 'IMPORT', profileStatus: 'READY', qualityScore: 90, fieldCount: 0, matchedFieldCount: 0, issueCount: 0, fields: [] }),
      updatePipeline: vi.fn().mockResolvedValue(pipelineDetail),
      savePipelineVersion: vi.fn().mockResolvedValue({}),
      restorePipelineVersion: vi.fn().mockResolvedValue(pipelineDetail),
      runPipeline: vi.fn().mockResolvedValue(mockRunResult),
      confirmPreprocessedDataset: vi.fn().mockResolvedValue({ ...mockRunResult.activation, confirmed: true, status: 'CONFIRMED', annotationEligible: true, confirmedAt: '2026-05-26T10:00:00Z', blockReason: null }),
      activatePreprocessedDataset: vi.fn().mockResolvedValue({ ...mockRunResult.activation, confirmed: true, status: 'ACTIVE', annotationEligible: true, confirmedAt: '2026-05-26T10:00:00Z', activatedAt: '2026-05-26T10:05:00Z', blockReason: null }),
      createDataStandardTask: vi.fn().mockResolvedValue({}),
      runDataStandardTask: vi.fn().mockResolvedValue({ outputDatasetId: 'DATASET-STD' }),
      updateDataset: vi.fn().mockResolvedValue({}),
      labelTemplates: vi.fn().mockResolvedValue([{ templateId: 'LT-WELD-BBOX', name: '焊缝缺陷 BBox 模板', scene: 'IMAGE_TAGGING', labelType: 'BOUNDING_BOX', labelSchemaJson: '{"labels":["裂纹","气孔"]}', labelStudioConfigXml: '<View/>', status: 'PUBLISHED', tenantId: 'TENANT-CABIN', createdBy: 'USR-001', updatedAt: '2026-05-26T00:00:00Z' }]),
      createLabelTemplate: vi.fn().mockResolvedValue({ templateId: 'LT-NEW', name: '新模板', scene: 'IMAGE_TAGGING', labelType: 'BOUNDING_BOX', labelSchemaJson: '{"labels":["裂纹"]}', labelStudioConfigXml: '<View/>', status: 'DRAFT', tenantId: 'TENANT-CABIN', createdBy: 'USR-001', updatedAt: '2026-05-26T00:00:00Z' }),
      publishLabelTemplate: vi.fn().mockResolvedValue({}),
      archiveLabelTemplate: vi.fn().mockResolvedValue({}),
    },
  };
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useSessionStore.setState({
    token: 'token-test',
    initialized: true,
    user: { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: [], menuPermissions: [], sessionVersion: 1 },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DataPipelineStandardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}


function renderTagManagementPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useSessionStore.setState({
    token: 'token-test',
    initialized: true,
    user: { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: [], menuPermissions: [], sessionVersion: 1 },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TagManagementPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TagManagementPage', () => {
  it('renders dataset tag catalog and supports dataset tag editing', async () => {
    renderTagManagementPage();
    expect(await screen.findByRole('heading', { name: '标签管理' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '标签总览' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '数据集标签' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '标注标签模板' })).toBeInTheDocument();
    expect(await screen.findByText('焊缝')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: '数据集标签' }));
    await user.click((await screen.findAllByText('编辑标签'))[0]);
    await user.click(screen.getByRole('button', { name: '保存数据集标签' }));
    await waitFor(() => expect(dataApi.updateDataset).toHaveBeenCalled());
  });
});

describe('DataPipelineStandardPage operator config panel', () => {
  it('starts from processing task list and opens editor from an existing task', async () => {
    // TASK-visual-preprocess-operators-pipeline AC-10
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Pipeline加工任务' })).toBeInTheDocument();
    expect(screen.getByText('加工任务列表')).toBeInTheDocument();
    expect(await screen.findByText('焊缝视频巡检数据集')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '进入编辑器' }));
    expect(await screen.findByRole('heading', { name: 'Pipeline编辑器' })).toBeInTheDocument();
    expect(screen.getByText('① 选择本次要加工的数据集')).toBeInTheDocument();
  });

  it('creates processing task by selecting dataset then enters pipeline editor', async () => {
    // TASK-visual-preprocess-operators-pipeline AC-10
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /新建加工任务/ }));
    expect(await screen.findByText('选择数据集后创建加工任务')).toBeInTheDocument();
    await user.click(screen.getByLabelText('新加工任务输入数据集'));
    await user.click(await screen.findByText(/新一批车间视频数据集/));
    await user.click(screen.getByRole('button', { name: '创建并进入编辑器' }));

    await waitFor(() => {
      expect(dataApi.createPipelineProcessingTask).toHaveBeenCalledWith({
        pipelineId: 'PIPE-VIDEO-PREP',
        sourceDatasetId: 'DATASET-NEW-VIDEO-002',
      });
    });
    expect(await screen.findByRole('heading', { name: 'Pipeline编辑器' })).toBeInTheDocument();
    expect(await screen.findByText('结果处置工作台')).toBeInTheDocument();
  });


  it('configures read dataset as common operator with dataset version selection', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '进入编辑器' }));
    expect(await screen.findByText('通用算子 / 数据输入 / 数据源')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '配置算子参数' }));
    await user.click(await screen.findByLabelText('读取数据集算子输入数据集'));
    await user.click(await screen.findByText(/预处理导出图片数据集/));
    expect(await screen.findByText('预处理导出图片数据集 · 预处理后 / 图片 · 待确认')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/"datasetId": "DATASET-PREP-OUT-001"/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/"versionId": "DVER-PREP-OUT-001"/)).toBeInTheDocument();

    await waitFor(() => {
      expect(dataApi.datasetDetail).toHaveBeenCalledWith('DATASET-PREP-OUT-001');
    });
    await user.click(screen.getByLabelText('读取数据集算子数据集版本'));
    expect((await screen.findAllByText(/抽帧结果v1 · DVER-PREP-OUT-001/)).length).toBeGreaterThan(0);
  });

  it('opens operator config from right drawer and updates watermark settings', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '进入编辑器' }));
    expect(await screen.findByText('点击画布节点后从右侧抽屉配置参数')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '配置算子参数' }));
    expect(await screen.findByText('数据源节点用于保存模板默认输入')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/"datasetId": "DATASET-WELD-VIDEO-001"/)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '下一节点' }).at(-1)!);
    expect(await screen.findByText('抽帧结果默认输出图片型 PREPROCESSED 数据集')).toBeInTheDocument();
    const intervalInput = screen.getAllByRole('spinbutton')[0];
    await user.clear(intervalInput);
    await user.type(intervalInput, '4');
    expect(screen.getByDisplayValue(/"intervalSeconds": 4/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /图片加水印 图片加水印/i }));
    expect(await screen.findByText('预览水印与产物水印分离')).toBeInTheDocument();
    const watermarkText = screen.getByPlaceholderText('例如：SMP Preview');
    await user.type(watermarkText, 'SMP Demo');
    expect(screen.getByDisplayValue(/"watermarkText": "SMP Demo"/)).toBeInTheDocument();
  });

  it('shows traditional-only hints for enhance operator', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '进入编辑器' }));
    await user.click(await screen.findByRole('button', { name: /图片质量提高 图片质量提高/i }));
    expect(await screen.findByText('一期仅支持传统增强')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/"enhancementMode": "TRADITIONAL_ONLY"/)).toBeInTheDocument();
  });

  it('shows editor status and node navigation helpers', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '进入编辑器' }));
    expect(await screen.findByText('已与后端同步')).toBeInTheDocument();
    expect(screen.getByText('运行前校验通过')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /图片加水印 图片加水印/i }));
    expect(await screen.findByText('恢复默认参数')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '恢复默认参数' }));
    expect(await screen.findByText(/"artifactWatermarkEnabled": false/)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: '上一节点' }).at(-1)!);
    expect(await screen.findByText('抽帧结果默认输出图片型 PREPROCESSED 数据集')).toBeInTheDocument();
  });

  it('renders run result workbench after sandbox run', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '进入编辑器' }));
    await user.click(await screen.findByRole('button', { name: /运行当前数据集/ }));
    await waitFor(() => {
      expect(dataApi.runPipeline).toHaveBeenCalledWith('PIPE-VIDEO-PREP', {
        triggerMode: 'MANUAL',
        sampleDatasetId: 'DATASET-WELD-VIDEO-001',
      });
    });
    expect(await screen.findByText('结果处置工作台')).toBeInTheDocument();
    expect(screen.getByText('样例预览工作台')).toBeInTheDocument();
    expect(screen.getByText('下一步请先人工确认结果，再执行激活')).toBeInTheDocument();
    expect(screen.getByText('失败 / 跳过摘要')).toBeInTheDocument();
    expect(screen.getByText('OP-VIDEO-FRAME-EXTRACT')).toBeInTheDocument();
  });

  it('places dataset selection first and separates template from processing records', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '进入编辑器' }));

    expect(await screen.findByText('① 选择本次要加工的数据集')).toBeInTheDocument();
    expect(screen.getByText('Pipeline 是可复用的算子组合；每次点击运行都会生成一条独立加工记录')).toBeInTheDocument();
    expect(screen.getByText('这里是每次加工任务的运行记录，不是 Pipeline 模板本身')).toBeInTheDocument();
    expect(screen.getByText('加工任务记录')).toBeInTheDocument();
    expect(screen.getAllByText('运行状态').length).toBeGreaterThan(0);
    expect(screen.getAllByText('处置状态').length).toBeGreaterThan(0);
    expect(screen.getByText('运行成功')).toBeInTheDocument();
    expect(screen.getByText('算子组合可保存为版本快照并反复复用')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: '本次要加工的数据集' }));
    await user.click(await screen.findByText(/新一批车间视频数据集/));
    await user.click(screen.getByRole('button', { name: /运行当前数据集/ }));

    await waitFor(() => {
      expect(dataApi.runPipeline).toHaveBeenCalledWith('PIPE-VIDEO-PREP', {
        triggerMode: 'MANUAL',
        sampleDatasetId: 'DATASET-NEW-VIDEO-002',
      });
    });
  });

  it('supports pointer dragging on pipeline canvas nodes', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '进入编辑器' }));
    const nodeButton = await screen.findByRole('button', { name: /固定间隔抽帧 固定间隔抽帧/i });
    expect((nodeButton as HTMLButtonElement).style.left).toBe('300px');
    expect((nodeButton as HTMLButtonElement).style.top).toBe('100px');

    fireEvent.pointerDown(nodeButton, { pointerId: 1, clientX: 100, clientY: 100, buttons: 1 });
    fireEvent.pointerMove(nodeButton, { pointerId: 1, clientX: 160, clientY: 150, buttons: 1 });
    fireEvent.pointerUp(nodeButton, { pointerId: 1, clientX: 160, clientY: 150 });

    expect((nodeButton as HTMLButtonElement).style.left).toBe('360px');
    expect((nodeButton as HTMLButtonElement).style.top).toBe('150px');
  });

  it('deletes selected node and prunes related edges before save', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '进入编辑器' }));
    await user.click(await screen.findByLabelText('删除 图片加水印'));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /图片加水印 图片加水印/i })).not.toBeInTheDocument();
    });
    expect(screen.getByText(/当前节点 3 个/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /💾 保存模板/i }));

    await waitFor(() => {
      expect(dataApi.updatePipeline).toHaveBeenCalled();
    });
    const saveInput = vi.mocked(dataApi.updatePipeline).mock.calls.at(-1)?.[1];
    expect(saveInput?.nodes).toHaveLength(3);
    expect(saveInput?.nodes.map((item) => item.nodeId)).toEqual(['read-video', 'extract', 'enhance']);
    expect(saveInput?.edges).toEqual([{ edgeId: 'edge-0', sourceNodeId: 'read-video', targetNodeId: 'extract', edgeType: 'DATA' }]);
    expect(saveInput?.sourceDatasetId).toBe('DATASET-WELD-VIDEO-001');
  });
});
