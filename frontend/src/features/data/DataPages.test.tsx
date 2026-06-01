import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { dataApi } from '../platform/platformApi';
import { DataPipelineStandardPage, DatasetUploadPage, TagManagementPage } from './DataPages';
import { useSessionStore } from '../platform/sessionStore';

vi.mock('../platform/platformApi', async () => {
  const actual = await vi.importActual<typeof import('../platform/platformApi')>('../platform/platformApi');
  const mockRunResult = {
    run: { runId: 'RUN-001', pipelineId: 'PIPE-VIDEO-PREP', versionId: 'PV-1', status: 'SUCCEEDED', triggerMode: 'MANUAL', diagnosticCode: 'OK', outputDatasetId: 'DATASET-PREP-OUT-001', diagnosticMessage: 'VISUAL_PREPROCESS_RUN_SUCCEEDED' },
    debugMode: false,
    nodeRuns: [
      { nodeRunId: 'PNRUN-READ', runId: 'RUN-001', nodeId: 'read-video', operatorName: '读取数据集', status: 'SUCCEEDED', durationMs: 800, logSummary: 'SANDBOX 节点 读取数据集 处理完成，输出记录 12', errorCode: null },
      { nodeRunId: 'PNRUN-EXTRACT', runId: 'RUN-001', nodeId: 'extract', operatorName: '固定间隔抽帧', status: 'SUCCEEDED', durationMs: 1150, logSummary: '调试模式 · 步骤 2/4 · 固定间隔抽帧 · 输入 12 条 · 输出 12 条 · 状态 SUCCEEDED · 调试采样已记录', errorCode: null },
    ],
    preview: {
      datasetId: 'DATASET-PREP-OUT-001',
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
      datasetId: 'DATASET-PREP-OUT-001',
      status: 'PENDING_CONFIRMATION',
      confirmed: false,
      annotationEligible: false,
      blockReason: '尚未人工确认',
      targetVersionId: 'DVER-PREP-OUT-001',
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
        outputDatasetId: 'DATASET-PREP-OUT-001',
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
      dataSources: vi.fn().mockResolvedValue([]),
      createDatasetUploadSession: vi.fn().mockResolvedValue({
        sessionId: 'DUS-UNIT-001',
        datasetId: null,
        versionId: null,
        status: 'PENDING_UPLOAD',
        creationMode: 'LOCAL_UPLOAD',
        targetAction: 'CREATE_DATASET',
        targetDatasetId: null,
        targetVersionId: null,
        progress: { phase: 'PENDING_UPLOAD', percent: 0 },
        summary: { totalFiles: 0, acceptedFiles: 0, rejectedFiles: 0 },
        datasetStatus: null,
        versionStatus: null,
        diagnosticCode: 'OK',
        diagnosticMessage: 'SESSION_CREATED',
        files: [],
      }),
      uploadDatasetSessionFiles: vi.fn().mockResolvedValue({
        sessionId: 'DUS-UNIT-001',
        datasetId: null,
        versionId: null,
        status: 'UPLOADING',
        creationMode: 'LOCAL_UPLOAD',
        targetAction: 'CREATE_DATASET',
        targetDatasetId: null,
        targetVersionId: null,
        progress: { phase: 'UPLOADING_FILES', percent: 45 },
        summary: { totalFiles: 1, acceptedFiles: 1, rejectedFiles: 0 },
        datasetStatus: null,
        versionStatus: null,
        diagnosticCode: 'OK',
        diagnosticMessage: 'UPLOAD_SUMMARY_UPDATED',
        files: [{ fileName: 'line-1.jpg', fileId: 'FILE-UP-001', status: 'UPLOADED', sizeBytes: 1024, contentType: 'image/jpeg', diagnosticCode: 'OK', diagnosticMessage: 'FILE_ACCEPTED' }],
      }),
      datasetUploadSession: vi.fn().mockResolvedValue({}),
      commitDatasetUploadSession: vi.fn().mockResolvedValue({}),
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
            outputDatasetId: 'DATASET-PREP-OUT-001',
            outputDatasetName: '预处理导出图片数据集',
            outputDatasetType: 'PREPROCESSED',
            outputDatasetDataType: 'IMAGE',
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
      pipelineRunDetail: vi.fn().mockResolvedValue(mockRunResult),
      runPipeline: vi.fn().mockResolvedValue(mockRunResult),
      confirmPreprocessedDataset: vi.fn().mockResolvedValue({ ...mockRunResult.activation, confirmed: true, status: 'CONFIRMED', annotationEligible: true, confirmedAt: '2026-05-26T10:00:00Z', blockReason: null }),
      activatePreprocessedDataset: vi.fn().mockResolvedValue({ ...mockRunResult.activation, confirmed: true, status: 'ACTIVE', annotationEligible: true, confirmedAt: '2026-05-26T10:00:00Z', activatedAt: '2026-05-26T10:05:00Z', blockReason: null }),
      createDataStandardTask: vi.fn().mockResolvedValue({}),
      runDataStandardTask: vi.fn().mockResolvedValue({ outputDatasetId: 'DATASET-STD' }),
      updateDataset: vi.fn().mockResolvedValue({}),
      annotationTags: vi.fn().mockResolvedValue([{ tagId: 'ATAG-CRACK', name: '裂纹', color: '#E02020', description: '独立标签', status: 'ACTIVE', tenantId: 'TENANT-CABIN', createdBy: 'USR-001', updatedAt: '2026-05-26T00:00:00Z' }, { tagId: 'ATAG-PORE', name: '气孔', color: '#F59E0B', description: '独立标签', status: 'ACTIVE', tenantId: 'TENANT-CABIN', createdBy: 'USR-001', updatedAt: '2026-05-26T00:00:00Z' }]),
      createAnnotationTag: vi.fn().mockResolvedValue({ tagId: 'ATAG-NEW', name: '新标签', color: '#1677ff', description: '新增', status: 'ACTIVE', tenantId: 'TENANT-CABIN', createdBy: 'USR-001', updatedAt: '2026-05-26T00:00:00Z' }),
      updateAnnotationTag: vi.fn().mockResolvedValue({}),
      archiveAnnotationTag: vi.fn().mockResolvedValue({}),
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

function renderDatasetUploadPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useSessionStore.setState({
    token: 'token-test',
    initialized: true,
    user: { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-CABIN', tenantName: '座舱BU', buCode: 'CABIN', status: 'ACTIVE', roles: ['BU_ADMIN'], roleNames: ['BU管理员'], permissions: [], menuPermissions: [], sessionVersion: 1 },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DatasetUploadPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DatasetUploadPage local folder upload', () => {
  it('keeps extension-detected images visible after selecting a folder', async () => {
    renderDatasetUploadPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: '下一步：创建上传会话' }));
    expect(await screen.findByText(/上传会话 DUS-UNIT-001/)).toBeInTheDocument();

    const folderInput = document.querySelector('input[webkitdirectory]') as HTMLInputElement;
    const imageFile = new File(['image-bytes'], 'line-1.jpg', { type: '' });
    Object.defineProperty(imageFile, 'webkitRelativePath', { value: 'batch-a/line-1.jpg' });
    const textFile = new File(['text'], 'readme.txt', { type: 'text/plain' });
    Object.defineProperty(textFile, 'webkitRelativePath', { value: 'batch-a/readme.txt' });

    fireEvent.change(folderInput, { target: { files: [imageFile, textFile] } });

    expect(await screen.findByText('line-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('batch-a/line-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('image/jpeg')).toBeInTheDocument();
    expect(screen.queryByText('readme.txt')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '上传并登记到平台' }));
    await waitFor(() => expect(dataApi.uploadDatasetSessionFiles).toHaveBeenCalledTimes(1));
    expect(vi.mocked(dataApi.uploadDatasetSessionFiles).mock.calls[0]?.[1]).toHaveLength(1);
    expect(vi.mocked(dataApi.uploadDatasetSessionFiles).mock.calls[0]?.[1]?.[0]?.name).toBe('line-1.jpg');
  });
});

describe('TagManagementPage', () => {
  it('renders independent tag catalog and supports tag creation', async () => {
    renderTagManagementPage();
    expect(await screen.findByRole('heading', { name: '标签字典' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '独立标签目录' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '数据集标签' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '标注标签模板' })).toBeInTheDocument();
    expect(await screen.findByText('裂纹')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '＋ 新建标签' }));
    await user.clear(screen.getByLabelText('标签名称'));
    await user.type(screen.getByLabelText('标签名称'), '独立存在标签');
    await user.click(screen.getByRole('button', { name: '保存标签' }));
    await waitFor(() => expect(dataApi.createAnnotationTag).toHaveBeenCalledWith(expect.objectContaining({ name: '独立存在标签' }), expect.anything()));
  });
});

describe('DataPipelineStandardPage operator config panel', () => {
  it('starts from processing task list and opens editor from an existing task', async () => {
    // TASK-visual-preprocess-operators-pipeline AC-10
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Pipeline加工任务' })).toBeInTheDocument();
    expect(screen.getByText('加工任务列表')).toBeInTheDocument();
    expect(screen.getAllByText('原始数据集（输入）').length).toBeGreaterThan(0);
    expect(screen.getAllByText('预处理数据集（输出）').length).toBeGreaterThan(0);
    expect(await screen.findByText('焊缝视频巡检数据集')).toBeInTheDocument();
    expect(await screen.findByText('预处理导出图片数据集')).toBeInTheDocument();

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
        outputDatasetName: '新一批车间视频数据集 抽帧结果',
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
    await user.click((await screen.findAllByText(/预处理导出图片数据集/)).at(-1)!);
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
    expect(await screen.findByText('数据源节点用于保存流程默认输入')).toBeInTheDocument();
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
    await user.click(await screen.findByRole('button', { name: /配置并运行/ }));
    expect(await screen.findByText('运行前确认输出数据集名称')).toBeInTheDocument();
    expect(screen.getByDisplayValue('焊缝视频巡检数据集 抽帧结果')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认运行并生成数据集' }));
    await waitFor(() => {
      expect(dataApi.runPipeline).toHaveBeenCalledWith('PIPE-VIDEO-PREP', {
        triggerMode: 'MANUAL',
        sampleDatasetId: 'DATASET-WELD-VIDEO-001',
        outputDatasetName: '焊缝视频巡检数据集 抽帧结果',
      });
    });
    expect(await screen.findByText('结果处置工作台')).toBeInTheDocument();
    expect(screen.getByText('样例预览工作台')).toBeInTheDocument();
    expect(screen.getByText('中间步骤监控')).toBeInTheDocument();
    expect(screen.getAllByText('固定间隔抽帧').length).toBeGreaterThan(0);
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
    expect(screen.getByText('这里按每次运行展示加工任务记录')).toBeInTheDocument();
    expect(screen.getByText('加工任务记录')).toBeInTheDocument();
    expect(screen.getAllByText('原始数据集（输入）').length).toBeGreaterThan(0);
    expect(screen.getAllByText('预处理数据集（输出）').length).toBeGreaterThan(0);
    expect(screen.getAllByText('运行状态').length).toBeGreaterThan(0);
    expect(screen.getAllByText('处置状态').length).toBeGreaterThan(0);
    expect(screen.getByText('运行成功')).toBeInTheDocument();
    expect(screen.getByText('算子流程可保存为版本快照并反复复用')).toBeInTheDocument();
    expect(screen.queryByText('Pipeline模板')).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: '本次要加工的数据集' }));
    await user.click(await screen.findByText(/新一批车间视频数据集/));
    await user.click(screen.getByRole('button', { name: /配置并运行/ }));
    await user.clear(screen.getByRole('textbox', { name: '输出预处理数据集名称' }));
    await user.type(screen.getByRole('textbox', { name: '输出预处理数据集名称' }), '自定义抽帧结果集');
    await user.click(screen.getByRole('button', { name: '确认运行并生成数据集' }));

    await waitFor(() => {
      expect(dataApi.runPipeline).toHaveBeenCalledWith('PIPE-VIDEO-PREP', {
        triggerMode: 'MANUAL',
        sampleDatasetId: 'DATASET-NEW-VIDEO-002',
        outputDatasetName: '自定义抽帧结果集',
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

    await user.click(screen.getByRole('button', { name: /💾 保存流程/i }));

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
