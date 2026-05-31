import { test, expect } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('TASK-dataset-annotation-task-export AC-01 AC-02 AC-06 AC-07 AC-08 dataset detail creates annotation task and export package', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('数据集管理').click();
  await expect(page.getByRole('heading', { name: '数据集管理' })).toBeVisible();
  await page.getByText('焊缝缺陷检测数据集').click();

  await expect(page.getByRole('heading', { name: '焊缝缺陷检测数据集' })).toBeVisible();
  await page.getByRole('tab', { name: '标注任务/训练导出' }).click();
  await expect(page.getByText('ACTIVE IMAGE 数据集可创建标注任务')).toBeVisible();
  await expect(page.getByText(/COCO\/YOLO\/VOC\/Mask 均包含图片副本/)).toBeVisible();
  await expect(page.getByText('焊缝缺陷检测标注任务')).toBeVisible();
  await page.getByRole('button', { name: '展开行' }).click();
  await expect(page.getByText('SMP_JSONL')).toBeVisible();
  await expect(page.getByText('包含').first()).toBeVisible();
  await expect(page.getByText('2026-08-19')).toBeVisible();

  const createTask = page.waitForResponse((response) => response.url().includes('/api/v1/datasets/DATASET-WELD-DEFECT/annotation-tasks') && response.request().method() === 'POST');
  await page.getByRole('button', { name: '从数据集创建标注任务' }).click();
  await expect(page.getByRole('dialog', { name: '从数据集创建标注任务' })).toBeVisible();
  await page.getByLabel('选择标签').click();
  await page.locator('.ant-select-dropdown:visible').getByText('裂纹', { exact: true }).click();
  await page.locator('.ant-select-dropdown:visible').getByText('气孔', { exact: true }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  expect((await (await createTask).json()).data.task.sourceDatasetId).toBeTruthy();
  await expect(page.getByText('已从数据集创建标注任务')).toBeVisible();

  const exportResponse = page.waitForResponse((response) => response.url().includes('/api/v1/annotation/tasks/ANN-WELD-Q2/exports') && response.request().method() === 'POST');
  await page.getByRole('button', { name: '生成训练包' }).first().click();
  await expect(page.getByText('超过 200MB 进入异步生成')).toBeVisible();
  await page.getByRole('button', { name: '生成训练包' }).last().click();
  const exportBody = await (await exportResponse).json();
  expect(exportBody.data.packageIncludesImages).toBeTruthy();
  expect(exportBody.data.expiresAt).toContain('2026-08-19');
  await expect(page.getByText(/导出请求已创建/)).toBeVisible();

  const download = page.waitForEvent('download');
  const contentRequest = page.waitForRequest((request) => request.url().includes('/api/v1/platform/files/FILE-AEXP-WELD-Q2-SMP/content'));
  await page.getByRole('button', { name: '下载到本地' }).last().click();
  expect((await contentRequest).headers().authorization).toBe('Bearer token-f006');
  expect((await download).suggestedFilename()).toBe('FILE-AEXP-WELD-Q2-SMP.zip');
  await expect(page.getByText(/训练包已下载到本地/)).toBeVisible();
});
