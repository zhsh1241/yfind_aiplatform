import { test, expect } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('TASK-pai-resource-integration AC-01 AC-02 AC-05 AC-06 keeps resource page PAI-driven', async ({ page }) => {
  await seedAuthenticatedSession(page);

  await page.getByText('资源管理').click();
  await expect(page.getByRole('heading', { name: '资源管理' })).toBeVisible();
  await expect(page.getByText(/阿里云 PAI Workspace/)).toBeVisible();
  await expect(page.getByRole('tab', { name: '集群总览' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'GPU 节点' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '资源池' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '存储' })).toBeVisible();
  await expect(page.getByText('PAI 连接尚未配置')).toBeVisible();
  await expect(page.getByText('Region: TODO_CONFIRM_PAI_REGION')).toBeVisible();
  await expect(page.getByText('PAI 连接配置', { exact: true })).toBeVisible();
  await expect(page.getByText('GPU 总量')).toBeVisible();

  await page.getByRole('button', { name: '手动同步 PAI' }).click();
  await expect(page.getByText(/PAI 同步返回 UNCONFIGURED/)).toBeVisible();
});

test('TASK-pai-resource-integration AC-07 AC-09 resource tabs expose PAI quota and storage semantics', async ({ page }) => {
  await seedAuthenticatedSession(page);

  await page.getByText('资源管理').click();
  await page.getByRole('tab', { name: '资源池' }).click();
  await expect(page.getByText('PAI Resource Quota / Resource Group')).toBeVisible();
  await expect(page.getByText('PAI_RESOURCE_QUOTA')).toBeVisible();
  await page.getByRole('tab', { name: '存储' }).click();
  await expect(page.getByText('PAI / OSS 存储摘要')).toBeVisible();
  await expect(page.getByText('不替代 F007 文件元数据服务')).toBeVisible();
});
