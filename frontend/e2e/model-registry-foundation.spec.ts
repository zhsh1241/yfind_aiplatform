import { expect, test } from '@playwright/test';
import { openNav, seedAuthenticatedSession } from './helpers';

test('TASK-model-registry-foundation AC-01 AC-02 AC-03 AC-05 AC-06 AC-07 AC-09 AC-11 模型中心主链路', async ({ page }) => {
  test.setTimeout(90000);
  await seedAuthenticatedSession(page);

  await openNav(page, '模型市场');
  await expect(page.getByRole('heading', { name: '模型中心' })).toBeVisible();
  await expect(page.getByText('统一纳管模型、模型版本、下载审计与跨 BU 复用入口。')).toBeVisible();
  await expect(page.getByText('焊缝缺陷检测 YOLOv8')).toBeVisible();
  await expect(page.getByText('TASK-model-registry-foundation')).toBeVisible();

  await page.getByPlaceholder('按标签筛选').fill('NLP');
  await page.getByPlaceholder('按标签筛选').press('Enter');
  await expect(page.getByText('工单文本分类 BERT')).toBeVisible();
  await expect(page.getByText('焊缝缺陷检测 YOLOv8')).toHaveCount(0);
  await page.getByPlaceholder('Owner BU / 组织 ID').fill('TENANT-CABIN');
  await page.getByPlaceholder('Owner BU / 组织 ID').press('Enter');
  await expect(page.getByText('暂无可见模型，请调整筛选条件或先创建模型。')).toBeVisible();
  await page.getByPlaceholder('按标签筛选').clear();
  await page.getByPlaceholder('按标签筛选').press('Enter');
  await expect(page.getByText('缺陷分割实验模型')).toBeVisible();
  await page.getByPlaceholder('Owner BU / 组织 ID').clear();
  await page.getByPlaceholder('Owner BU / 组织 ID').press('Enter');
  await expect(page.getByText('焊缝缺陷检测 YOLOv8')).toBeVisible();

  await page.getByRole('button', { name: '焊缝缺陷检测 YOLOv8' }).click();
  const detailDrawer = page.getByRole('dialog', { name: /模型详情/ });
  await expect(detailDrawer).toBeVisible();
  await expect(page.getByText('MODEL_VERSION_PUBLISH_BLOCKED')).toBeVisible();

  await detailDrawer.getByRole('button', { name: '创建版本' }).click();
  const createVersionDialog = page.getByRole('dialog', { name: '创建版本' });
  await createVersionDialog.getByLabel('版本号').fill('v3.0');
  await createVersionDialog.getByLabel('平台文件对象').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await createVersionDialog.getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('版本 v3.0 已创建')).toBeVisible();

  await detailDrawer.getByRole('button', { name: '发布 Production' }).click();
  await expect(page.getByText('该模型版本尚未通过评估，请先执行模型评估或导入评估证明')).toBeVisible();

  await detailDrawer.getByRole('button', { name: /删\s*除/ }).first().click();
  const blockedDialog = page.getByRole('dialog').filter({ hasText: '该模型版本当前被推理服务引用，请先下线相关服务' });
  await expect(blockedDialog).toContainText('该模型版本当前被推理服务引用，请先下线相关服务');
  await expect(blockedDialog).toContainText('焊缝在线检测 · RUNNING');
  await blockedDialog.getByRole('button', { name: '知道了' }).click();

  await detailDrawer.getByRole('button', { name: '下载' }).first().click();
  await expect(page.getByText('下载地址已生成，有效期 600 秒')).toBeVisible();

  await detailDrawer.getByRole('button', { name: '跨 BU 访问申请' }).click();
  const accessDialog = page.getByRole('dialog', { name: '跨 BU 访问申请' });
  await accessDialog.getByLabel('申请原因').fill('用于座舱缺陷检测训练对比');
  await accessDialog.getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('跨 BU 访问申请已提交').last()).toBeVisible();
  await expect(detailDrawer.getByText('MACC-001')).toBeVisible();
  await detailDrawer.getByRole('button', { name: /拒\s*绝/ }).click();
  await expect(page.getByText('模型访问申请已拒绝')).toBeVisible();
  await expect(detailDrawer.getByText('暂无待处理访问申请')).toBeVisible();

  await detailDrawer.getByRole('button', { name: '跨 BU 访问申请' }).click();
  const secondAccessDialog = page.getByRole('dialog', { name: '跨 BU 访问申请' });
  await secondAccessDialog.getByLabel('申请原因').fill('拒绝后重新申请训练复用');
  await secondAccessDialog.getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('跨 BU 访问申请已提交').last()).toBeVisible();
  await expect(detailDrawer.getByText('MACC-001')).toBeVisible();
  await detailDrawer.getByRole('button', { name: '审批通过' }).click();
  await expect(page.getByText('模型访问申请已审批通过')).toBeVisible();
  await expect(detailDrawer.getByText('暂无待处理访问申请')).toBeVisible();
});
