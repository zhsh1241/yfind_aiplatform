import { expect, test } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('TASK-dataset-lifecycle-management AC-01 AC-05 数据集详情支持版本切换、版本数展示与历史版本只读', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('数据集管理').click();
  await expect(page.getByRole('cell', { name: '焊缝缺陷检测数据集' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '2' }).first()).toBeVisible();
  await page.getByText('详情').first().click();
  await expect(page.getByRole('heading', { name: '焊缝缺陷检测数据集' })).toBeVisible();
  await expect(page.getByText('所选版本', { exact: true })).toBeVisible();
  await page.getByText('v2（当前）').click();
  await page.getByTitle('v1').click();
  await expect(page.getByText('当前为只读版本视图')).toBeVisible();
  await expect(page.getByRole('button', { name: '追加文件' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '上传向导追加' })).toBeDisabled();
  await expect(page.getByRole('cell', { name: 'FILE-DATASET-WELD-001', exact: true })).toBeVisible();
});

test('TASK-dataset-lifecycle-management AC-06 数据集列表区分归档与管理员硬删除入口', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('数据集管理').click();
  await expect(page.getByText('归档')).toBeVisible();
  await expect(page.getByText('彻底删除').first()).toBeVisible();
  await page.getByText('彻底删除').nth(1).click();
  await expect(page.getByText('该操作不可恢复')).toBeVisible();
});

test('TASK-dataset-lifecycle-management AC-07 上传向导支持 APPEND_VERSION 并回到目标版本详情', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('数据集管理').click();
  await page.getByText('详情').first().click();
  await page.getByRole('button', { name: '上传向导追加' }).click();
  await expect(page.getByRole('heading', { name: '新建数据集 / 上传向导' })).toBeVisible();
  await expect(page.getByText(/追加模式说明/)).toBeVisible();
  await page.getByRole('button', { name: '下一步：创建上传会话' }).click();
  await expect(page.getByText(/本次将追加到既有版本/)).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'append-1.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('fake-append-jpg'),
  });
  await page.getByRole('button', { name: '上传并登记到平台' }).click();
  await expect(page.getByText(/目标 dataset\/version：DATASET-WELD-DEFECT \/ DVER-WELD-002/)).toBeVisible();
  await page.getByRole('button', { name: '提交并追加到既有版本' }).click();
  await expect(page.getByRole('heading', { name: '焊缝缺陷检测数据集' })).toBeVisible();
  await expect(page.getByText(/versionStatus=SECURITY_PENDING/)).toBeVisible();
});
