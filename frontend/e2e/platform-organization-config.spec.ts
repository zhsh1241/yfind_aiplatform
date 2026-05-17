// TASK-platform-organization-config AC-08
import { test, expect } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('F007 AC-08 org page keeps prototype tabs and API-driven organization data', async ({ page }) => {
  await seedAuthenticatedSession(page);

  await page.getByText('组织管理').click();
  await expect(page.getByText('花叔工业智能 · 组织架构管理')).toBeVisible();
  await expect(page.getByRole('tab', { name: '组织架构' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '部门管理' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '成员管理' })).toBeVisible();
  await expect(page.getByText('智能座舱事业部').first()).toBeVisible();
  await expect(page.getByText('视觉质检项目').first()).toBeVisible();

  await page.getByRole('tab', { name: '成员管理' }).click();
  await expect(page.getByText('成员与作用域')).toBeVisible();
  await expect(page.getByText('平台管理员').first()).toBeVisible();
  await page.getByRole('button', { name: '添加成员' }).click();
  await expect(page.getByRole('dialog', { name: /添加成员/ })).toBeVisible();
  await page.keyboard.press('Escape');
});

test('F007 AC-08 sys page exposes config, UNCONFIGURED notification and one-time API key path', async ({ page }) => {
  await seedAuthenticatedSession(page);

  await page.getByText('系统配置').click();
  await expect(page.getByText('基础设置 · 存储配置 · 通知设置 · API 密钥 · 数据安全 · 认证集成 · 标签管理')).toBeVisible();
  await expect(page.getByRole('tab', { name: '基础设置' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '存储配置' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '通知设置' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'API 密钥' })).toBeVisible();

  await page.getByRole('tab', { name: '通知设置' }).click();
  await expect(page.getByText('UNCONFIGURED')).toBeVisible();
  await expect(page.getByText('TODO_CONFIRM_SMTP_HOST').first()).toBeVisible();
  await page.getByRole('button', { name: /测\s*试/ }).click();
  await expect(page.getByText(/通知测试返回 UNCONFIGURED/)).toBeVisible();

  await page.getByRole('tab', { name: 'API 密钥' }).click();
  await expect(page.getByText('CI/CD 集成 Key')).toBeVisible();
  await page.getByRole('button', { name: '＋ 新建 API Key' }).click();
  await page.getByLabel('Key 名称').fill('E2E Key');
  await page.getByRole('button', { name: '创建并一次性展示' }).click();
  await expect(page.getByText('一次性明文展示')).toBeVisible();
  await expect(page.getByText('smp_live_new_plaintext_once')).toBeVisible();
});
