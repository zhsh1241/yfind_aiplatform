import { test, expect } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('TASK-annotation-integration AC-01 AC-02 AC-03 annotation task list and template seam', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('标注任务').click();
  await expect(page.getByRole('heading', { name: '标注任务管理' })).toBeVisible();
  await expect(page.getByText('焊缝缺陷检测标注任务')).toBeVisible();
  await expect(page.getByRole('button', { name: '标签模板' })).toBeVisible();
  await expect(page.getByText(/外部标注工具未配置/)).toBeVisible();
  const syncProjectResponse = page.waitForResponse((response) => response.url().includes('/api/v1/annotation/tasks/ANN-WELD-Q2/label-studio/sync-project') && response.request().method() === 'POST');
  await page.locator('a', { hasText: 'Label Studio' }).click();
  const syncProjectBody = await (await syncProjectResponse).json();
  expect(syncProjectBody.data.configStatus).toBe('UNCONFIGURED');
  await expect(page.getByText(/TODO_CONFIRM_LABEL_STUDIO_BASE_URL/)).toBeVisible();
});

test('TASK-annotation-integration AC-04 AC-05 workbench draft and submit flow', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('标注工作台').click();
  await expect(page.getByRole('heading', { name: '标注工作台' })).toBeVisible();
  await expect(page.getByText('样本队列', { exact: true })).toBeVisible();
  await expect(page.getByText('weld/0001.jpg')).toBeVisible();
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page.getByText('草稿已保存')).toBeVisible();
  await page.getByRole('button', { name: '提交审核' }).click();
  await expect(page.getByText('标注结果已提交，等待审核')).toBeVisible();
});

test('TASK-annotation-integration AC-06 AC-07 AC-08 review quality and publication flow', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('标注审核').click();
  await expect(page.getByRole('heading', { name: '标注审核' })).toBeVisible();
  await expect(page.getByText(/DAT-004/)).toBeVisible();
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
