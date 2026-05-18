import { test, expect } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('TASK-data-source-dataset-management AC-01 AC-02 datasrc API driven diagnostics', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('数据源管理').click();
  await expect(page.getByRole('heading', { name: '数据源管理' })).toBeVisible();
  await expect(page.getByText('数据源列表')).toBeVisible();
  await expect(page.getByText('图像存储桶')).toBeVisible();
  await expect(page.getByText('TODO_CONFIRM_WORKORDER_API_ENDPOINT', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '测试连接' }).first().click();
  await expect(page.getByText(/SUCCESS: SANDBOX connection verified/)).toBeVisible();
  await page.getByRole('tab', { name: '同步任务' }).click();
  await expect(page.getByText('生产图像同步')).toBeVisible();
});

test('TASK-data-source-dataset-management AC-03 AC-06 dataset list and detail preserve prototype IA', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('数据集管理').click();
  await expect(page.getByRole('heading', { name: '数据集管理' })).toBeVisible();
  await expect(page.getByText('数据集总数')).toBeVisible();
  await expect(page.getByRole('cell', { name: '焊缝缺陷检测数据集' })).toBeVisible();
  await page.getByText('详情').first().click();
  await expect(page.getByRole('heading', { name: '焊缝缺陷检测数据集' })).toBeVisible();
  await expect(page.getByText('版本历史')).toBeVisible();
  await expect(page.getByRole('tab', { name: '血缘' })).toBeVisible();
  await expect(page.getByText(/非图片\/不可预览文件/)).toBeVisible();
});

test('TASK-data-source-dataset-management AC-04 upload wizard exposes F007 file seam', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('数据集管理').click();
  await page.getByRole('button', { name: '＋ 新建数据集' }).click();
  await expect(page.getByRole('heading', { name: '新建数据集 / 上传向导' })).toBeVisible();
  await expect(page.getByText(/复用 F007 文件元数据 seam/)).toBeVisible();
  await page.getByRole('button', { name: '下一步：初始化数据集' }).click();
  await expect(page.getByText('文件登记 seam')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'FILE-001', exact: true })).toBeVisible();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: '完成文件登记并绑定版本' }).click();
  await expect(page.getByText('文件上传 seam 已初始化')).toBeVisible();
  await expect(page.getByText(/TODO_CONFIRM_MINIO/)).toBeVisible();
});
