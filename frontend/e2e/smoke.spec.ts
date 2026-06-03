import { test, expect } from '@playwright/test';
import { openNav, seedAuthenticatedSession } from './helpers';

test('TASK-frontend-foundation AC-04 keeps module routes reachable', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await expect(page.getByText('SMP 工业 AI 小模型平台')).toBeVisible();
  await openNav(page, '模型市场');
  await expect(page.getByRole('heading', { name: '模型中心' })).toBeVisible();
  await expect(page.getByText('模型目录')).toBeVisible();
  await expect(page.getByText('预训练模型选择器')).toBeVisible();
});
