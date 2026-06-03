import { test, expect } from '@playwright/test';
import { openNav, seedAuthenticatedSession } from './helpers';

test('TASK-visual-preprocess-operators-pipeline AC-01 AC-02 AC-03 AC-06 AC-07 AC-08 AC-09 pipeline editor and operator marketplace', async ({ page }) => {
  await seedAuthenticatedSession(page);

  await openNav(page, 'Pipeline编辑器');
  await page.getByRole('button', { name: '进入Pipeline编辑器' }).click();
  await expect(page.getByRole('heading', { name: 'Pipeline编辑器' })).toBeVisible();
  await expect(page.getByText('算子库', { exact: true })).toBeVisible();
  await expect(page.getByText('DAG 画布', { exact: true })).toBeVisible();
  await expect(page.getByText(/视频抽帧|算子配置/).first()).toBeVisible();
  await expect(page.getByText('加工任务记录', { exact: true })).toBeVisible();
  await expect(page.getByText('原始数据集（输入）').first()).toBeVisible();
  await expect(page.getByText('预处理数据集（输出）').first()).toBeVisible();
  await expect(page.getByText('版本快照', { exact: true })).toBeVisible();
  await expect(page.getByText('全局变量与结果策略', { exact: true })).toBeVisible();
  await expect(page.getByText('视频抽帧默认输出图片型 PREPROCESSED 数据集', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /图片质量提高/ }).first()).toBeVisible();

  await page.getByRole('button', { name: /＋ 添加算子/ }).click();
  await expect(page.getByText('添加算子', { exact: true })).toBeVisible();
  await page.locator('.ant-drawer').getByText('图片加水印').first().click();
  await expect(page.getByText('已添加算子：图片加水印')).toBeVisible();
  await expect(page.getByText(/当前节点 4 个/)).toBeVisible();

  await page.getByLabel('删除 图片加水印').click();
  await expect(page.getByText(/已删除节点：图片加水印/)).toBeVisible();
  await expect(page.getByText(/当前节点 3 个/)).toBeVisible();

  await page.getByRole('button', { name: '保存快照' }).click();
  await expect(page.getByText('版本快照已保存')).toBeVisible();

  await page.getByRole('button', { name: '配置并运行' }).click();
  await expect(page.getByLabel('配置本次运行').getByText('运行前确认输出数据集名称')).toBeVisible();
  await expect(page.getByLabel('配置本次运行').getByText('原始数据集（输入）')).toBeVisible();
  await page.getByRole('button', { name: '确认运行并生成数据集' }).click();
  await expect(page.getByText('加工任务运行完成，已生成加工记录和预处理数据集。')).toBeVisible();
  await expect(page.getByLabel('运行详情').getByText('VISUAL_PREPROCESS_RUN_SUCCEEDED')).toBeVisible();
  await expect(page.getByLabel('运行详情').getByText('预处理数据集（输出）')).toBeVisible();
  await expect(page.getByLabel('运行详情').getByText('结果处置工作台')).toBeVisible();
  await expect(page.getByLabel('运行详情').getByText('样例预览工作台')).toBeVisible();
  await expect(page.getByLabel('运行详情').getByText('下一步请先人工确认结果，再执行激活')).toBeVisible();
  await expect(page.getByLabel('运行详情').getByText('抽帧样本', { exact: true })).toBeVisible();
  await expect(page.getByText(/失败原因：少量帧解码失败/)).toBeVisible();
  await expect(page.getByRole('button', { name: '确认预处理结果' })).toBeVisible();
  await page.getByRole('button', { name: '确认预处理结果' }).click();
  await expect(page.getByText('预处理结果已确认，可继续激活。')).toBeVisible();
  await page.getByRole('button', { name: '激活为标注可用数据集' }).click();
  await expect(page.getByText('预处理数据集已激活，可用于标注。')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('运行详情')).toBeHidden();

  await openNav(page, '算子广场');
  await expect(page.getByRole('heading', { name: '算子广场' })).toBeVisible();
  await expect(page.getByText('视觉预处理冻结能力说明')).toBeVisible();
  await expect(page.getByText('多 Tab 算子目录')).toBeVisible();
  await expect(page.getByText('图片质量提高').first()).toBeVisible();
  await expect(page.getByText('引用Pipeline数').first()).toBeVisible();
  await expect(page.getByText('一期固定传统增强：锐化、去噪、亮度/对比度优化')).toBeVisible();
  await expect(page.getByText('支持预览', { exact: true }).first()).toBeVisible();
  await page.locator('.opmarket-layout .ant-select').first().click();
  await page.locator('.ant-select-dropdown:visible').getByText('视频', { exact: true }).click();
  await expect(page.getByRole('heading', { name: '视频抽帧' })).toBeVisible();
  await page.locator('.opmarket-layout .ant-select .ant-select-clear').first().click();

  await page.getByText('HTTP 自定义算子').first().click();
  await expect(page.getByText('参数 JSON Schema', { exact: true })).toBeVisible();
  await expect(page.getByText('通过受控 HTTP Endpoint 扩展视觉预处理能力').last()).toBeVisible();
  await expect(page.getByRole('button', { name: '审核通过' })).toBeVisible();

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
