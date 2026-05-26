import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { DataPipelineStandardPage } from './DataPages';
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
      { nodeId: 'extract', operatorId: 'OP-VIDEO-FRAME-EXTRACT', operatorName: '固定间隔抽帧', label: '固定间隔抽帧', positionX: 100, positionY: 100, configJson: JSON.stringify({ mode: 'FIXED_INTERVAL', intervalSeconds: 2, outputImageFormat: 'JPG' }), status: 'READY' },
      { nodeId: 'watermark', operatorId: 'OP-IMG-WATERMARK', operatorName: '图片加水印', label: '图片加水印', positionX: 300, positionY: 100, configJson: JSON.stringify({ previewWatermarkEnabled: true, artifactWatermarkEnabled: false, watermarkText: '', position: 'BOTTOM_RIGHT', opacity: 0.4 }), status: 'READY' },
      { nodeId: 'enhance', operatorId: 'OP-IMG-ENHANCE', operatorName: '图片质量提高', label: '图片质量提高', positionX: 500, positionY: 100, configJson: JSON.stringify({ enhancementMode: 'TRADITIONAL_ONLY', sharpen: true, denoise: true, brightnessContrastOptimize: true }), status: 'READY' },
    ],
    edges: [
      { edgeId: 'edge-1', sourceNodeId: 'extract', targetNodeId: 'watermark', edgeType: 'DATA' },
      { edgeId: 'edge-2', sourceNodeId: 'watermark', targetNodeId: 'enhance', edgeType: 'DATA' },
    ],
    variables: [],
    versions: [],
    runs: [],
    validation: { valid: true, diagnosticCode: 'OK', diagnosticMessage: 'ok', errors: [], warnings: [] },
  };

  return {
    ...actual,
    getAccessToken: () => 'token-test',
    dataApi: {
      pipelines: vi.fn().mockResolvedValue({ items: [{ pipelineId: 'PIPE-VIDEO-PREP', name: '焊缝视频抽帧预处理' }], total: 1, page: 1, pageSize: 20 }),
      pipelineDetail: vi.fn().mockResolvedValue(pipelineDetail),
      operators: vi.fn().mockResolvedValue({ items: operatorItems, total: operatorItems.length, categories: [], stats: { total: operatorItems.length, builtin: operatorItems.length, custom: 0, published: operatorItems.length, submitted: 0 } }),
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

describe('DataPipelineStandardPage operator config panel', () => {
  it('renders structured config form and updates watermark settings', async () => {
    renderPage();
    expect(await screen.findByText('结构化参数面板')).toBeInTheDocument();
    expect(await screen.findByText('抽帧结果默认输出图片型 PREPROCESSED 数据集')).toBeInTheDocument();

    const user = userEvent.setup();
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
    await user.click(await screen.findByRole('button', { name: /图片质量提高 图片质量提高/i }));
    expect(await screen.findByText('一期仅支持传统增强')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/"enhancementMode": "TRADITIONAL_ONLY"/)).toBeInTheDocument();
  });

  it('shows editor status and node navigation helpers', async () => {
    renderPage();
    expect(await screen.findByText('已与后端同步')).toBeInTheDocument();
    expect(screen.getByText('运行前校验通过')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /图片加水印 图片加水印/i }));
    expect(await screen.findByText('恢复默认参数')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '恢复默认参数' }));
    expect(await screen.findByText(/"artifactWatermarkEnabled": false/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '上一节点' }));
    expect(await screen.findByText('抽帧结果默认输出图片型 PREPROCESSED 数据集')).toBeInTheDocument();
  });

  it('renders run result workbench after sandbox run', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /沙箱运行/ }));
    expect(await screen.findByText('结果处置工作台')).toBeInTheDocument();
    expect(screen.getByText('样例预览工作台')).toBeInTheDocument();
    expect(screen.getByText('下一步请先人工确认结果，再执行激活')).toBeInTheDocument();
    expect(screen.getByText('失败 / 跳过摘要')).toBeInTheDocument();
    expect(screen.getByText('OP-VIDEO-FRAME-EXTRACT')).toBeInTheDocument();
  });
});
