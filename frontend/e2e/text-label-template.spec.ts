import { test, expect } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { openNav, seedAuthenticatedSession } from './helpers';

const textTemplate = {
  templateId: 'LT-TEXT-E2E',
  name: '工单意图文本分类模板',
  scene: 'TEXT_LABELING',
  labelType: 'TEXT_CLASSIFICATION',
  labelSchemaJson: '{"labels":["质量投诉","设备故障","工艺咨询"],"dataType":"TEXT"}',
  labelStudioConfigXml: '<View><Text name="text" value="$text"/><Choices name="label" toName="text" choice="single"><Choice value="质量投诉"/><Choice value="设备故障"/><Choice value="工艺咨询"/></Choices></View>',
  status: 'PUBLISHED',
  tenantId: 'TENANT-YF',
  createdBy: 'USR-ADMIN',
  updatedAt: '2026-05-20T00:00:00Z',
};

async function mockTextTemplatePersistence(page: Page) {
  let created = false;
  let requestBody: unknown;

  await page.route(/\/api\/v1\/annotation\/label-templates\/[^/]+\/publish(?:\?.*)?$/, async (route: Route) => {
    created = true;
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-text-template', timestamp: new Date().toISOString(), data: textTemplate } });
  });

  await page.route(/\/api\/v1\/annotation\/label-templates(?:\?.*)?$/, async (route: Route) => {
    if (route.request().method() === 'POST') {
      requestBody = route.request().postDataJSON();
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-text-template', timestamp: new Date().toISOString(), data: { ...textTemplate, status: 'DRAFT' } } });
      return;
    }
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-text-template', timestamp: new Date().toISOString(), data: created ? [textTemplate] : [] } });
  });

  return {
    requestBody: () => requestBody as typeof textTemplate | undefined,
  };
}

test('DEMO 创建并发布文本标注标签模板', async ({ page }) => {
  await seedAuthenticatedSession(page);
  const state = await mockTextTemplatePersistence(page);

  await openNav(page, '标注任务');
  await expect(page.getByRole('heading', { name: '标注任务管理' })).toBeVisible();

  await page.getByRole('button', { name: '标签模板' }).click();
  await expect(page.getByRole('heading', { name: '标签模板' })).toBeVisible();
  await expect(page.getByText('标签模板配置')).toBeVisible();

  await page.getByLabel('模板名称').fill(textTemplate.name);
  await page.getByLabel('BU').fill(textTemplate.tenantId);
  await page.getByLabel('场景').click();
  await page.getByTitle('文本分类').click();
  await page.getByLabel('标注类型').click();
  await page.getByTitle('文本分类').last().click();
  await page.getByLabel('标签 Schema').fill(textTemplate.labelSchemaJson);
  await expect(page.getByText('文本分类模板将按标签 Schema 自动生成配置')).toBeVisible();

  await page.getByRole('button', { name: '创建并发布模板' }).click();
  await expect(page.getByText('标签模板已发布并生成模板配置')).toBeVisible();
  await expect(page.getByRole('cell', { name: textTemplate.name })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'TEXT_LABELING' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'TEXT_CLASSIFICATION' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'PUBLISHED' })).toBeVisible();

  const body = state.requestBody();
  expect(body?.scene).toBe('TEXT_LABELING');
  expect(body?.labelType).toBe('TEXT_CLASSIFICATION');
  expect(body?.labelStudioConfigXml).toContain('<Text name="text" value="$text"/>');
  expect(body?.labelStudioConfigXml).toContain('<Choices name="label" toName="text"');
});
