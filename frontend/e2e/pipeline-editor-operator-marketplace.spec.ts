import { test, expect } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('TASK-pipeline-editor-operator-marketplace AC-01 AC-02 AC-03 AC-05 AC-06 AC-07 pipeline editor and operator marketplace', async ({ page }) => {
  await seedAuthenticatedSession(page);

  await page.getByText('Pipeline编辑器').click();
  await page.waitForURL('**/pipeline');
  await expect(page.getByRole('heading', { name: 'Pipeline编辑器' })).toBeVisible();
  await expect(page.getByText('算子库', { exact: true })).toBeVisible();
  await expect(page.getByText('DAG 画布', { exact: true })).toBeVisible();
  await expect(page.getByText(/归一化|算子配置/).first()).toBeVisible();
  await expect(page.getByText('运行历史', { exact: true })).toBeVisible();
  await expect(page.getByText('版本快照', { exact: true })).toBeVisible();
  await expect(page.getByText('全局变量', { exact: true })).toBeVisible();
  await expect(page.getByText('TODO_CONFIRM_PIPELINE_SCHEDULER_TARGET')).toBeVisible();
  await expect(page.getByRole('button', { name: /归一化/ }).first()).toBeVisible();

  await page.getByRole('button', { name: /＋ 添加算子/ }).click();
  await expect(page.getByText('添加算子', { exact: true })).toBeVisible();
  await page.locator('.ant-drawer').getByText('归一化').first().click();
  await expect(page.getByText('已添加算子：归一化')).toBeVisible();
  await expect(page.getByText(/当前节点 5 个/)).toBeVisible();

  await page.getByRole('button', { name: '保存快照' }).click();
  await expect(page.getByText('版本快照已保存')).toBeVisible();

  await page.getByRole('button', { name: /沙箱运行/ }).click();
  await expect(page.getByText('沙箱运行完成，已生成输出数据集与血缘')).toBeVisible();
  await expect(page.getByText('SANDBOX_PIPELINE_RUN_SUCCEEDED')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('SANDBOX_PIPELINE_RUN_SUCCEEDED')).toBeHidden();

  await page.getByText('算子广场').click();
  await expect(page.getByRole('heading', { name: '算子广场' })).toBeVisible();
  await expect(page.getByText('HTTP 算子安全说明')).toBeVisible();
  await expect(page.getByText('TODO_CONFIRM_OPERATOR_CATALOG_SOURCE')).toBeVisible();
  await expect(page.getByText('归一化').first()).toBeVisible();
  await expect(page.getByText('引用Pipeline数').first()).toBeVisible();

  await page.getByText('HTTP 自定义算子').first().click();
  await expect(page.getByText('Before / After 示例')).toBeVisible();
  await expect(page.getByText('参数 Schema', { exact: true })).toBeVisible();
  await expect(page.getByText('TODO_CONFIRM_OPERATOR_HTTP_ENDPOINT')).toBeVisible();
  await expect(page.getByRole('button', { name: '审核通过并发布' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByText('Before / After 示例')).toBeHidden();
  await page.getByRole('button', { name: '+ 自定义算子' }).click();
  await expect(page.getByText('注册自定义算子')).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/v1/operators/custom') && response.request().method() === 'POST'),
    page.getByRole('button', { name: '提交审核' }).click(),
  ]);
  await expect(page.getByText('注册自定义算子')).toBeHidden();
  await expect(page.getByRole('heading', { name: '算子广场' })).toBeVisible();
});
