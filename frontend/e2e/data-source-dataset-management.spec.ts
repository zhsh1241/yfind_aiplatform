import { test, expect } from '@playwright/test';
import path from 'node:path';
import { seedAuthenticatedSession } from './helpers';

test('TASK-data-source-dataset-management AC-01 AC-02 datasrc API driven diagnostics', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('数据源管理').click();
  await expect(page.getByRole('heading', { name: '数据源管理' })).toBeVisible();
  await expect(page.getByText('数据源列表')).toBeVisible();
  await expect(page.getByText('对象存储', { exact: true })).toBeVisible();
  await expect(page.getByText('关系型数据库', { exact: true })).toBeVisible();
  await expect(page.getByText('流数据', { exact: true })).toBeVisible();
  await expect(page.getByText('时序库', { exact: true })).toBeVisible();
  await expect(page.getByText('工业协议', { exact: true })).toBeVisible();
  await expect(page.getByText('外部接口', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '测试连接' }).first().click();
  await expect(page.getByText(/SUCCESS: SANDBOX OBJECT_STORAGE connector verified/)).toBeVisible();
  await page.getByRole('tab', { name: '同步任务' }).click();
  await expect(page.getByText('生产图像同步')).toBeVisible();
  await page.getByRole('button', { name: '立即同步' }).first().click();
  await expect(page.getByText(/SUCCEEDED: SANDBOX_RELATIONAL_DB_IMPORT_READY/)).toBeVisible();
});

test('TASK-data-source-dataset-management AC-03 AC-06 dataset list and detail preserve prototype IA', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('数据集管理').click();
  await expect(page.getByRole('heading', { name: '数据集管理' })).toBeVisible();
  await expect(page.getByText('数据集总数')).toBeVisible();
  await expect(page.getByText('如何导入数据集')).toBeVisible();
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
  await expect(page.getByText(/Ant Design Upload\.Dragger/)).toBeVisible();
  await page.getByRole('button', { name: '下一步：初始化数据集' }).click();
  await expect(page.getByText('拖拽文件或文件夹')).toBeVisible();
  const sampleDir = path.resolve(process.cwd(), 'public/industrial-samples');
  await page.locator('.ant-upload input[type="file"]').setInputFiles(sampleDir);
  await expect(page.getByText('foundry-blowhole.jpg', { exact: true })).toBeVisible();
  await expect(page.getByText('tig-welding.jpg', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '开始真实上传并绑定版本' }).click();
  await expect(page.getByText('文件上传已完成')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('当前数据集版本文件')).toBeVisible();
  await page.getByRole('button', { name: '完成并返回数据集管理' }).click();
  await expect(page.getByRole('heading', { name: '数据集管理' })).toBeVisible();
});
