import { expect, test } from '@playwright/test';
import { openNav, seedAuthenticatedSession } from './helpers';

const evaluationRun = {
  evaluationRunId: 'EVAL-RUN-E2E-001',
  modelId: 'MODEL-YOLO-001',
  modelName: '焊缝缺陷检测 YOLOv8',
  versionId: 'MVER-YOLO-001-V1',
  versionNo: 'v1.0',
  datasetId: 'DATASET-WELD-DEFECT',
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
  ownerUserId: 'USR-ADMIN',
  ownerOrgId: 'TENANT-CABIN',
  tenantId: 'TENANT-CABIN',
  createdAt: '2026-06-05T00:00:00Z',
  updatedAt: '2026-06-05T00:00:00Z',
  completedAt: null,
};

const evaluationDetail = {
  run: evaluationRun,
  metrics: [{ metricId: 'MET-E2E-001', evaluationRunId: evaluationRun.evaluationRunId, metricName: 'mAP50', metricValue: 0.92, thresholdValue: 0.9, passed: true, category: 'PRIMARY', createdAt: '2026-06-05T00:00:00Z' }],
  artifacts: [{ artifactId: 'ART-E2E-001', evaluationRunId: evaluationRun.evaluationRunId, artifactType: 'REPORT_JSON', fileObjectId: 'FILE-REPORT-E2E', name: 'f020-report.json', downloadPolicy: 'AUTHENTICATED', createdAt: '2026-06-05T00:00:00Z' }],
  curveData: { pr: [[0, 1], [1, 0.88]] },
  confusionMatrix: { labels: ['OK', 'NG'], matrix: [[98, 2], [4, 96]] },
  errorCases: [{ sampleId: 'IMG-001', reason: '反光误检' }],
};

test('TASK-model-evaluation-readiness AC-07 AC-08 AC-09 AC-12 模型评估页面主链路', async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === '/api/v1/model-evaluations' && method === 'POST') {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-f020', timestamp: new Date().toISOString(), data: { ...evaluationRun, evaluationRunId: 'EVAL-RUN-E2E-NEW' } } });
      return;
    }
    if (url.pathname === '/api/v1/model-evaluations') {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-f020', timestamp: new Date().toISOString(), data: { items: [evaluationRun], total: 1, page: 1, pageSize: 20 } } });
      return;
    }
    if (url.pathname.endsWith('/results:import')) {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-f020', timestamp: new Date().toISOString(), data: { ...evaluationDetail, run: { ...evaluationRun, status: 'PASSED', reportSummary: '导入评估通过' } } } });
      return;
    }
    if (url.pathname.endsWith('/download-url')) {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-f020', timestamp: new Date().toISOString(), data: { artifactId: 'ART-E2E-001', downloadUrl: '/api/v1/platform/files/FILE-REPORT-E2E/content', expiresInSeconds: 600, diagnostic: 'AUTHENTICATED_CONTENT_ENDPOINT_READY' } } });
      return;
    }
    if (url.pathname.endsWith('/versions:compare-evaluations')) {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-f020', timestamp: new Date().toISOString(), data: { modelId: 'MODEL-YOLO-001', versionIds: ['MVER-YOLO-001-V1', 'MVER-YOLO-001-V2'], rows: [{ metricName: 'mAP50', values: [{ versionId: 'MVER-YOLO-001-V1', versionNo: 'v1.0', evaluationRunId: 'EVAL-RUN-E2E-001', status: 'PASSED', value: 0.92, best: false }, { versionId: 'MVER-YOLO-001-V2', versionNo: 'v2.0', evaluationRunId: 'EVAL-RUN-E2E-002', status: 'PASSED', value: 0.94, best: true }] }] } } });
      return;
    }
    if (url.pathname.startsWith('/api/v1/model-evaluations/')) {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-f020', timestamp: new Date().toISOString(), data: evaluationDetail } });
      return;
    }
    await route.continue();
  });

  await seedAuthenticatedSession(page);
  await openNav(page, '模型评估');

  await expect(page.getByRole('heading', { name: '模型评估' })).toBeVisible();
  await expect(page.getByText('TASK-model-evaluation-readiness')).toBeVisible();
  await expect(page.getByText('焊缝缺陷检测 YOLOv8')).toBeVisible();

  await page.getByRole('button', { name: /详情/ }).click();
  const drawer = page.getByRole('dialog', { name: '评估详情' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('f020-report.json')).toBeVisible();
  await expect(drawer.getByText('PR 曲线数据')).toBeVisible();
  await expect(drawer.getByText('混淆矩阵')).toBeVisible();
  await expect(drawer.getByText('错误样例摘要')).toBeVisible();
  await expect(drawer.getByText('IMG-001')).toBeVisible();
  await expect(drawer.getByText('Production 发布必须存在 PASSED 评估记录')).toBeVisible();

  await drawer.getByRole('combobox').click();
  await page.keyboard.type('MVER-YOLO-001-V2');
  await page.keyboard.press('Enter');
  await expect(drawer.getByText(/v2\.0: 0\.9400 · best/)).toBeVisible();

  await drawer.getByRole('button', { name: /导入结果/ }).evaluate((element: HTMLElement) => element.click());
  const importDialog = page.getByRole('dialog').filter({ hasText: '导入评估结果' });
  await expect(importDialog).toBeVisible();
  await expect(importDialog.getByLabel('曲线数据 JSON')).toHaveValue('{"pr":[[0,1],[1,0.88]]}');
  await expect(importDialog.getByLabel('混淆矩阵 JSON')).toHaveValue('{"labels":["OK","NG"],"matrix":[[98,2],[4,96]]}');
  await expect(importDialog.getByLabel('错误样例 JSON 数组')).toHaveValue('[{"sampleId":"IMG-001","reason":"反光误检"}]');
  await importDialog.getByRole('button', { name: /确|OK/ }).click();
  await expect(page.getByText('评估结果已导入，状态 PASSED')).toBeVisible();

  await page.getByRole('button', { name: /下载地址/ }).evaluate((element: HTMLElement) => element.click());
  await expect(page.getByText('报告 artifact 下载地址已生成，有效期 600 秒')).toBeVisible();


});
