import { test, expect } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('TASK-data-standardization-pipeline AC-01 AC-05 pipeline dataset standardization flow', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('Pipeline编辑器').click();
  await expect(page.getByRole('heading', { name: 'Pipeline编辑器' })).toBeVisible();
  await expect(page.getByText('视觉预处理闭环')).toBeVisible();
  await expect(page.getByText('图片质量提高').first()).toBeVisible();
  await expect(page.getByText('视频抽帧').first()).toBeVisible();
  await expect(page.getByText('图片加水印').first()).toBeVisible();
  await expect(page.getByText('DAG 画布', { exact: true })).toBeVisible();
  await expect(page.getByText('运行历史', { exact: true })).toBeVisible();
  await expect(page.getByText('版本快照', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /配置并运行|配置调试运行/ }).click();
  await expect(page.getByText('加工任务运行完成，已生成加工记录和预处理数据集。')).toBeVisible();
});
