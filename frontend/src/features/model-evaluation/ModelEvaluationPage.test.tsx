import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModelEvaluationPage } from './ModelEvaluationPage';
import { platformApi } from '../platform/platformApi';

const mockData = vi.hoisted(() => {
  const run = {
    evaluationRunId: 'EVAL-RUN-001',
    modelId: 'MODEL-YOLO-001',
    modelName: '焊缝缺陷检测 YOLOv8',
    versionId: 'MVER-YOLO-001-V1',
    versionNo: 'v1.0',
    datasetId: 'DATASET-WELD-001',
    datasetName: '焊缝缺陷验证集',
    datasetVersionId: 'DVER-WELD-001',
    datasetVersionName: 'v2026.06',
    taskType: 'OBJECT_DETECTION',
    status: 'READY',
    metricConfig: {},
    thresholdConfig: { mAP50: 0.9, latencyMs: 30 },
    resultSummary: null,
    reportSummary: null,
    executorType: 'IMPORTED',
    externalRunId: null,
    ownerUserId: 'USR-BU-CABIN',
    ownerOrgId: 'TENANT-CABIN',
    tenantId: 'TENANT-CABIN',
    createdAt: '2026-06-05T00:00:00Z',
    updatedAt: '2026-06-05T00:00:00Z',
    completedAt: null,
  };
  const detail = {
    run,
    metrics: [
      { metricId: 'MET-001', evaluationRunId: run.evaluationRunId, metricName: 'mAP50', metricValue: 0.92, thresholdValue: 0.9, passed: true, category: 'PRIMARY', createdAt: '2026-06-05T00:00:00Z' },
    ],
    artifacts: [
      { artifactId: 'ART-001', evaluationRunId: run.evaluationRunId, artifactType: 'REPORT_JSON', fileObjectId: 'FILE-REPORT-001', name: 'f020-report.json', downloadPolicy: 'AUTHENTICATED', createdAt: '2026-06-05T00:00:00Z' },
    ],
    curveData: { pr: [[0, 1], [1, 0.88]] },
    confusionMatrix: { labels: ['OK', 'NG'], matrix: [[98, 2], [4, 96]] },
    errorCases: [{ sampleId: 'IMG-001', reason: '反光误检' }],
  };
  return { run, detail };
});

vi.mock('../platform/platformApi', async () => {
  const actual = await vi.importActual<typeof import('../platform/platformApi')>('../platform/platformApi');
  return {
    ...actual,
    platformApi: {
      ...actual.platformApi,
      modelEvaluations: vi.fn().mockResolvedValue({ items: [mockData.run], total: 1, page: 1, pageSize: 20 }),
      modelEvaluationDetail: vi.fn().mockResolvedValue(mockData.detail),
      createModelEvaluation: vi.fn().mockResolvedValue({ ...mockData.run, evaluationRunId: 'EVAL-RUN-NEW' }),
      importModelEvaluationResults: vi.fn().mockResolvedValue({ ...mockData.detail, run: { ...mockData.run, status: 'PASSED', reportSummary: '通过' } }),
      compareModelEvaluations: vi.fn().mockResolvedValue({
        modelId: mockData.run.modelId,
        versionIds: ['MVER-YOLO-001-V1', 'MVER-YOLO-001-V2'],
        rows: [{ metricName: 'mAP50', values: [
          { versionId: 'MVER-YOLO-001-V1', versionNo: 'v1.0', evaluationRunId: 'EVAL-RUN-001', status: 'PASSED', value: 0.92, best: false },
          { versionId: 'MVER-YOLO-001-V2', versionNo: 'v2.0', evaluationRunId: 'EVAL-RUN-002', status: 'PASSED', value: 0.94, best: true },
        ] }],
      }),
      modelEvaluationArtifactDownloadUrl: vi.fn().mockResolvedValue({ artifactId: 'ART-001', downloadUrl: '/api/v1/platform/files/FILE-REPORT-001/content', expiresInSeconds: 600, diagnostic: 'AUTHENTICATED_CONTENT_ENDPOINT_READY' }),
    },
  };
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ModelEvaluationPage />
    </QueryClientProvider>,
  );
}

describe('ModelEvaluationPage', () => {
  it('TASK-model-evaluation-readiness AC-06 AC-07 AC-08 AC-09 AC-12 展示详情、导入和下载', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('heading', { name: '模型评估' })).toBeInTheDocument();
    expect(await screen.findByText('焊缝缺陷检测 YOLOv8')).toBeInTheDocument();
    expect(screen.getByText(/TASK-model-evaluation-readiness/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /详情/ }));
    await screen.findByText('评估 ID');
    expect(screen.getByText('mAP50')).toBeInTheDocument();
    expect(screen.getByText('f020-report.json')).toBeInTheDocument();
    expect(screen.getByText('PR 曲线数据')).toBeInTheDocument();
    expect(screen.getByText('混淆矩阵')).toBeInTheDocument();
    expect(screen.getByText('错误样例摘要')).toBeInTheDocument();
    expect(screen.getByText(/IMG-001/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /导入结果/ }));
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(platformApi.importModelEvaluationResults).toHaveBeenCalledWith('EVAL-RUN-001', expect.objectContaining({
      metricResults: { mAP50: 0.92 },
      curveData: { pr: [[0, 1], [1, 0.88]] },
      confusionMatrix: { labels: ['OK', 'NG'], matrix: [[98, 2], [4, 96]] },
      errorCases: [{ sampleId: 'IMG-001', reason: '反光误检' }],
      artifacts: [],
    })));

    await user.click(screen.getByRole('button', { name: /下载地址/ }));
    await waitFor(() => expect(platformApi.modelEvaluationArtifactDownloadUrl).toHaveBeenCalledWith('EVAL-RUN-001', 'ART-001'));
    expect(await screen.findByText(/报告 artifact 下载地址已生成/)).toBeInTheDocument();
  });

  it('TASK-model-evaluation-readiness AC-01 创建评估任务', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /创建评估/ }));
    await user.type(screen.getByLabelText('模型 ID'), 'MODEL-YOLO-001');
    await user.type(screen.getByLabelText('版本 ID'), 'MVER-YOLO-001-V1');
    await user.type(screen.getByLabelText('验证数据集版本 ID'), 'DVER-WELD-001');
    await user.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(platformApi.createModelEvaluation).toHaveBeenCalledWith(expect.objectContaining({
      modelId: 'MODEL-YOLO-001',
      versionId: 'MVER-YOLO-001-V1',
      datasetVersionId: 'DVER-WELD-001',
      thresholdConfig: { mAP50: 0.9 },
    })));
  });
});
