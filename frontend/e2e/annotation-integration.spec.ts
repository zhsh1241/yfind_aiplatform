import { test, expect } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('TASK-annotation-integration TASK-label-studio-production-integration AC-01 AC-02 AC-03 annotation task list and Label Studio project sync', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('标注任务').click();
  await expect(page.getByRole('heading', { name: '标注任务管理' })).toBeVisible();
  await expect(page.getByText('焊缝缺陷检测标注任务')).toBeVisible();
  await expect(page.getByRole('button', { name: '标签模板' })).toBeVisible();
  await expect(page.getByText(/外部标注工具 \/ Label Studio/)).toBeVisible();
  const syncProjectResponse = page.waitForResponse((response) => response.url().includes('/api/v1/annotation/tasks/ANN-WELD-Q2/label-studio/sync-project') && response.request().method() === 'POST');
  await page.locator('a', { hasText: '同步 Label Studio project' }).click();
  const syncProjectBody = await (await syncProjectResponse).json();
  expect(syncProjectBody.data.configStatus).toBe('CONFIGURED');
  expect(syncProjectBody.data.externalProjectId).toBe('123');
  await expect(page.getByText(/PROJECT_SYNCED/)).toBeVisible();
});

test('TASK-annotation-integration TASK-label-studio-production-integration AC-04 AC-05 workbench draft submit and Label Studio task sync', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('标注工作台').click();
  await expect(page.getByRole('heading', { name: '标注工作台' })).toBeVisible();
  await expect(page.getByText('样本队列', { exact: true })).toBeVisible();
  await expect(page.getByText('weld/0001.jpg')).toBeVisible();
  const syncTaskResponse = page.waitForResponse((response) => response.url().includes('/api/v1/annotation/work-items/AWI-WELD-001/label-studio/sync-task') && response.request().method() === 'POST');
  await page.getByRole('button', { name: '同步 Label Studio task' }).click();
  const syncTaskBody = await (await syncTaskResponse).json();
  expect(syncTaskBody.data.externalTaskId).toBe('456');
  await expect(page.getByRole('link', { name: '打开 Label Studio task', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page.getByText('草稿已保存')).toBeVisible();
  await page.getByRole('button', { name: '提交审核' }).click();
  await expect(page.getByText('标注结果已提交，等待审核')).toBeVisible();
});

test('TASK-annotation-integration TASK-label-studio-production-integration AC-06 AC-07 AC-08 AC-09 review quality import and publication flow', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('标注审核').click();
  await expect(page.getByRole('heading', { name: '标注审核' })).toBeVisible();
  await expect(page.getByText(/DAT-004/)).toBeVisible();
  const importResponse = page.waitForResponse((response) => response.url().includes('/api/v1/annotation/tasks/ANN-WELD-Q2/label-studio/import-results') && response.request().method() === 'POST');
  await page.getByRole('button', { name: '导入 Label Studio 结果' }).click();
  const importBody = await (await importResponse).json();
  expect(importBody.data.lastSyncStatus).toBe('RESULT_IMPORTED');
  const qualityResponse = page.waitForResponse((response) => response.url().includes('/api/v1/annotation/tasks/ANN-WELD-Q2/quality-check') && response.request().method() === 'POST');
  await page.getByRole('button', { name: '质量检查' }).click();
  const qualityBody = await (await qualityResponse).json();
  expect(qualityBody.data.diagnosticMessage).toContain('DAT-010 quality passed');
  const publishResponse = page.waitForResponse((response) => response.url().includes('/api/v1/annotation/tasks/ANN-WELD-Q2/publish-dataset') && response.request().method() === 'POST');
  await page.getByRole('button', { name: '发布标注数据集' }).click();
  const publishBody = await (await publishResponse).json();
  expect(publishBody.data.outputDatasetId).toBe('DATASET-WELD-ANNOTATED');
  await expect(page.getByText(/已发布 ANNOTATED 数据集/)).toBeVisible();
});
