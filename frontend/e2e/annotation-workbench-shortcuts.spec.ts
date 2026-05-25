import { expect, test } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

const success = (data: unknown) => ({
  code: 0,
  message: 'success',
  traceId: 'e2e',
  timestamp: new Date().toISOString(),
  data,
});

test('annotation workbench keeps existing labels and auto saves before navigation', async ({ page }) => {
  await seedAuthenticatedSession(page);

  const task = {
    taskId: 'ANN-WELD-Q2',
    name: '焊缝缺陷检测标注任务',
    scene: 'IMAGE_TAGGING',
    sceneLabel: '图片打标',
    sourceDatasetId: 'DATASET-WELD-DEFECT',
    sourceDatasetName: '焊缝缺陷检测数据集',
    templateId: 'LT-WELD-BBOX',
    templateName: '焊缝 BBox 模板',
    tenantId: 'TENANT-CABIN',
    status: 'IN_PROGRESS',
    reviewEnabled: true,
    prelabelEnabled: false,
    labelStudioEnabled: true,
    totalCount: 2,
    annotatedCount: 0,
    reviewedCount: 0,
    qualityScore: null,
    assignees: [{ userId: 'USR-ANNOTATOR', displayName: '标注工程师', role: 'ANNOTATOR' }],
    deadline: '2026-06-02T00:00:00Z',
    updatedAt: '2026-05-19T00:00:00Z',
  };

  const externalBinding = {
    bindingId: 'AEXT-WELD-Q2',
    taskId: 'ANN-WELD-Q2',
    provider: 'LABEL_STUDIO',
    externalProjectId: null,
    externalUrl: 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL',
    externalTaskId: null,
    externalTaskUrl: null,
    configStatus: 'UNCONFIGURED',
    lastSyncStatus: 'UNCONFIGURED',
    diagnosticCode: 'LABEL_STUDIO_UNCONFIGURED',
    diagnosticMessage: 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL;TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET',
    launchUrl: null,
    retryable: false,
    lastSyncAt: null,
  };

  const workItems = [
    {
      workItemId: 'AWI-WELD-001',
      taskId: 'ANN-WELD-Q2',
      sampleKey: 'weld/0001.jpg',
      sampleFileId: null,
      sampleImageUrl: '/industrial-samples/tig-welding.jpg',
      annotatorId: 'USR-ANNOTATOR',
      annotatorName: '标注工程师',
      status: 'DRAFT',
      predictionJson: null,
      annotationJson: null,
      submittedAt: null,
      updatedAt: '2026-05-19T00:00:00Z',
    },
    {
      workItemId: 'AWI-WELD-002',
      taskId: 'ANN-WELD-Q2',
      sampleKey: 'TENANT-CABIN/weld/batch3/0002.jpg',
      sampleFileId: null,
      sampleImageUrl: '/industrial-samples/foundry-blowhole.jpg',
      annotatorId: 'USR-ANNOTATOR',
      annotatorName: '标注工程师',
      status: 'DRAFT',
      predictionJson: null,
      annotationJson: null,
      submittedAt: null,
      updatedAt: '2026-05-19T00:00:00Z',
    },
  ];

  const detailPayload = () => ({
    task,
    assignments: [],
    workItems,
    reviewItems: [],
    publications: [],
    externalBinding,
  });

  await page.unroute(/\/api\/v1\/annotation\/tasks\/[^/]+\/work-items(?:\?.*)?$/);
  await page.unroute(/\/api\/v1\/annotation\/tasks\/[^/?]+(?:\?.*)?$/);
  await page.unroute(/\/api\/v1\/annotation\/work-items\/[^/]+\/(?:draft|submit)(?:\?.*)?$/);

  await page.route(/\/api\/v1\/annotation\/tasks\/[^/]+\/work-items(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const pageNo = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '50');
    await route.fulfill({ json: success({ items: workItems, total: workItems.length, page: pageNo, pageSize }) });
  });

  await page.route(/\/api\/v1\/annotation\/tasks\/[^/?]+(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: success(detailPayload()) });
  });

  await page.route(/\/api\/v1\/annotation\/work-items\/[^/]+\/(?:draft|submit)(?:\?.*)?$/, async (route) => {
    const request = route.request();
    const workItemId = request.url().split('/').slice(-2, -1)[0];
    const body = JSON.parse(request.postData() ?? '{}') as { annotationJson?: string };
    const item = workItems.find((entry) => entry.workItemId === workItemId);
    if (item && body.annotationJson) {
      item.annotationJson = body.annotationJson;
      item.updatedAt = '2026-05-25T00:00:00Z';
    }
    await route.fulfill({
      json: success({
        ...(item ?? workItems[0]),
        annotationJson: body.annotationJson ?? item?.annotationJson ?? null,
        status: request.url().endsWith('/submit') ? 'REVIEW_PENDING' : item?.status ?? 'DRAFT',
      }),
    });
  });

  await page.goto('/annwork?taskId=ANN-WELD-Q2');

  await expect(page.getByRole('heading', { name: '标注工作台' })).toBeVisible();
  await expect(page.getByLabel('样本队列')).toBeVisible();
  await expect(page.getByLabel('焊缝缺陷标注画布')).toBeVisible();

  await page.getByLabel('焊缝缺陷标注画布').focus();
  await page.keyboard.press('W');
  await expect(page.getByTestId('annotation-box-count')).toHaveText('1');
  await expect(page.getByTestId('annotation-current-label')).toHaveText('焊接气孔');

  await page.keyboard.press('2');
  await expect(page.getByRole('button', { name: /裂纹\s+2/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('annotation-current-label')).toHaveText('焊接气孔');

  await page.keyboard.press('E');
  await expect(page.getByTestId('annotation-box-count')).toHaveText('2');
  await expect(page.getByTestId('annotation-current-shape')).toHaveText('椭圆');
  await expect(page.getByTestId('annotation-current-label')).toHaveText('裂纹');

  const spaceDraftRequest = page.waitForRequest((request) => request.url().includes('/api/v1/annotation/work-items/AWI-WELD-001/draft') && request.method() === 'POST');
  await page.keyboard.press('Space');
  const spaceDraftBody = JSON.parse((await spaceDraftRequest).postData() ?? '{}') as { annotationJson?: string };
  expect(JSON.parse(spaceDraftBody.annotationJson ?? '{}').boxes).toHaveLength(2);
  await expect(page.getByRole('button', { name: /TENANT-CABIN\/weld\/batch3\/0002\.jpg/i })).toHaveClass(/active/);

  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('button', { name: /weld\/0001\.jpg/i })).toHaveClass(/active/);
  await expect(page.getByTestId('annotation-box-count')).toHaveText('2');

  await page.keyboard.press('W');
  await expect(page.getByTestId('annotation-box-count')).toHaveText('3');
  const thumbnailDraftRequest = page.waitForRequest((request) => request.url().includes('/api/v1/annotation/work-items/AWI-WELD-001/draft') && request.method() === 'POST');
  await page.getByRole('button', { name: /TENANT-CABIN\/weld\/batch3\/0002\.jpg/i }).click();
  const thumbnailDraftBody = JSON.parse((await thumbnailDraftRequest).postData() ?? '{}') as { annotationJson?: string };
  expect(JSON.parse(thumbnailDraftBody.annotationJson ?? '{}').boxes).toHaveLength(3);
  await expect(page.getByRole('button', { name: /TENANT-CABIN\/weld\/batch3\/0002\.jpg/i })).toHaveClass(/active/);
});
