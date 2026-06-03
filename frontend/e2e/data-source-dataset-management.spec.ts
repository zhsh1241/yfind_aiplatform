import { test, expect } from '@playwright/test';
import { openNav, seedAuthenticatedSession } from './helpers';

test('TASK-data-source-dataset-management AC-01 AC-02 datasrc API driven diagnostics', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await openNav(page, '数据源管理');
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

test('TASK-data-source-dataset-management AC-03 AC-06 dataset list and detail preserve module IA', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await openNav(page, '数据集管理');
  await expect(page.getByRole('heading', { name: '数据集管理' })).toBeVisible();
  await expect(page.getByText('数据集总数')).toBeVisible();
  await expect(page.getByText('如何导入数据集')).toBeVisible();
  await expect(page.getByRole('cell', { name: '焊缝缺陷检测数据集' })).toBeVisible();
  await expect(page.getByText('版本数')).toBeVisible();
  await page.getByText('详情').first().click();
  await expect(page.getByRole('heading', { name: '焊缝缺陷检测数据集' })).toBeVisible();
  await expect(page.getByText('版本历史')).toBeVisible();
  await expect(page.getByRole('tab', { name: '血缘' })).toBeVisible();
  await expect(page.getByText('所选版本', { exact: true })).toBeVisible();
});

test('TASK-data-source-dataset-management AC-04 upload wizard exposes F007 file seam', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await openNav(page, '数据集管理');
  await page.getByRole('button', { name: '＋ 新建数据集' }).click();
  await expect(page.getByRole('heading', { name: '新建数据集 / 上传向导' })).toBeVisible();
  await expect(page.getByText(/Ant Design Upload\.Dragger/)).toBeVisible();
  await expect(page.getByText('来源数据源')).toBeVisible();
  await page.getByRole('combobox', { name: /\*?\s*来源数据源/ }).click();
  await page.getByTitle('Image bucket · 对象存储').click();
  await page.getByRole('button', { name: '下一步：初始化数据集' }).click();
  await expect(page.locator('.ant-upload').getByText('拖拽文件或文件夹').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '完成文件登记并绑定版本' })).toBeVisible();
  await page.locator('.ant-table-selection-column input[type="radio"]').first().check({ force: true });
  await page.getByRole('button', { name: '完成文件登记并绑定版本' }).click();
  await expect(page.getByText('文件登记已初始化')).toBeVisible();
  await expect(page.getByRole('button', { name: '查看数据集详情' })).toBeVisible();
  await page.getByRole('button', { name: '查看数据集详情' }).click();
  await expect(page.getByRole('heading', { name: '焊缝缺陷检测数据集' })).toBeVisible();
});
