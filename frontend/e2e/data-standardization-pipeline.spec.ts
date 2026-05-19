import { test, expect } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('TASK-data-standardization-pipeline AC-01 AC-05 pipeline dataset standardization flow', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('Pipeline编辑器').click();
  await expect(page.getByRole('heading', { name: 'Pipeline编辑器' })).toBeVisible();
  await expect(page.getByText('F011 完整 Pipeline 能力')).toBeVisible();
  await expect(page.getByText('数据集读取', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('归一化', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('格式转换', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('DAG 画布', { exact: true })).toBeVisible();
  await expect(page.getByText('运行历史', { exact: true })).toBeVisible();
  await expect(page.getByText('版本快照', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /沙箱运行/ }).click();
  await expect(page.getByText('沙箱运行完成，已生成输出数据集与血缘')).toBeVisible();
});
