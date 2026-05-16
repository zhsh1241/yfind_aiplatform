import { test, expect } from '@playwright/test';
import { mockPlatformApis } from './helpers';

test('TASK-platform-identity-audit AC-08 keeps login usermgmt perm prototype paths reachable', async ({ page }) => {
  await mockPlatformApis(page);

  await page.goto('/login');
  await expect(page.getByText('\u2699 SMP')).toBeVisible();
  await expect(page.getByRole('heading', { name: '\u8d26\u53f7\u767b\u5f55' })).toBeVisible();
  await page.getByLabel('\u5bc6\u7801').fill('Smp@123456');
  await page.getByRole('button', { name: /\u767b\s*\u5f55/ }).click();
  await expect(page.getByText('SMP \u5de5\u4e1a AI \u5c0f\u6a21\u578b\u5e73\u53f0')).toBeVisible();

  await page.getByText('\u7528\u6237\u7ba1\u7406').click();
  await expect(page.getByText(/\u8d26\u53f7\u7ba1\u7406.*\u89d2\u8272\u5206\u914d.*GPU.*\u7528\u91cf\u7edf\u8ba1/)).toBeVisible();
  await expect(page.getByRole('tab', { name: '\u7528\u6237\u5217\u8868' })).toBeVisible();
  await expect(page.getByText('\u5e73\u53f0\u7ba1\u7406\u5458').first()).toBeVisible();

  await page.getByText('\u6743\u9650\u7ba1\u7406').click();
  await expect(page.getByText(/RBAC.*\u89d2\u8272\u6743\u9650\u77e9\u9635.*6.*\u4e2a\u9884\u8bbe\u89d2\u8272/)).toBeVisible();
  await expect(page.getByRole('tab', { name: '\u5f53\u524d\u6743\u9650\u6982\u89c8' })).toBeVisible();
  await expect(page.getByText('\u5f85\u5ba1\u6279')).toBeVisible();
  await expect(page.getByText('\u6570\u636e\u96c6\u8bbf\u95ee\u6388\u6743')).toBeVisible();
});
