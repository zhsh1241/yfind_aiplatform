import { test, expect } from '@playwright/test';
import { openNav, seedAuthenticatedSession } from './helpers';

test('TASK-data-standardization-pipeline AC-01 AC-05 pipeline dataset standardization flow', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await openNav(page, 'Pipeline编辑器');
  await page.getByRole('button', { name: '进入Pipeline编辑器' }).click();
  await expect(page.getByRole('heading', { name: 'Pipeline编辑器' })).toBeVisible();
  await expect(page.getByText('视觉预处理闭环')).toBeVisible();
  await expect(page.getByText('图片质量提高').first()).toBeVisible();
  await expect(page.getByText('视频抽帧').first()).toBeVisible();
  await expect(page.getByText('图片加水印').first()).toBeVisible();
  await expect(page.getByText('DAG 画布', { exact: true })).toBeVisible();
  await expect(page.getByText('加工任务记录', { exact: true })).toBeVisible();
  await expect(page.getByText('版本快照', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /配置并运行|配置调试运行/ }).click();
  await expect(page.getByLabel('配置本次运行').getByText('运行前确认输出数据集名称')).toBeVisible();
  await page.getByRole('button', { name: '确认运行并生成数据集' }).click();
  await expect(page.getByText('加工任务运行完成，已生成加工记录和预处理数据集。')).toBeVisible();
});
