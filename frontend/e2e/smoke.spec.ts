import { test, expect } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('TASK-frontend-foundation AC-04 keeps prototype routes reachable', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await expect(page.getByText('SMP 工业 AI 小模型平台')).toBeVisible();
  await page.getByText('模型市场').click();
  await expect(page.getByText('业务分组')).toBeVisible();
  await expect(page.getByText('页面 key')).toBeVisible();
  await expect(page.getByText('hub').first()).toBeVisible();
});
