import { expect, test } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('TASK-model-registry-foundation AC-10 ModelSelector 返回可训练复用且未废弃的版本 ID', async ({ page }) => {
  test.setTimeout(90000);
  await seedAuthenticatedSession(page);

  await page.goto('/hub');
  await expect(page.getByRole('heading', { name: '模型中心' })).toBeVisible();
  await page.getByRole('combobox', { name: 'model-selector' }).click();

  await expect(page.getByText('焊缝缺陷检测 YOLOv8 · v1.0 · PYTORCH')).toBeVisible();
  await expect(page.getByText('工单文本分类 BERT · v2.1 · ONNX')).toBeVisible();
  await expect(page.getByText('工单文本分类 BERT · v3.0 · ONNX')).toHaveCount(0);
  await expect(page.getByText('缺陷分割实验模型 · v1.2 · ONNX')).toHaveCount(0);

  await page.getByText('工单文本分类 BERT · v2.1 · ONNX').click();
  await expect(page.getByText('已选择版本 MVER-BERT-003-V2')).toBeVisible();
});
