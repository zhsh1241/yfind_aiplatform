import { expect, test } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('TASK-local-dataset-upload AC-01 AC-02 无可用数据源时展示本地上传入口', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.route('**/api/v1/data-sources', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-f015', timestamp: new Date().toISOString(), data: [] } });
  });
  await page.getByText('数据集管理').click();
  await page.getByRole('button', { name: '＋ 新建数据集' }).click();
  await expect(page.getByRole('heading', { name: '新建数据集 / 上传向导' })).toBeVisible();
  await expect(page.getByText('当前无可用数据源')).toBeVisible();
  await expect(page.getByRole('button', { name: '直接上传图片' })).toBeVisible();
  await expect(page.getByText('本地上传图片', { exact: true })).toBeVisible();
});

test('TASK-local-dataset-upload AC-05 本地上传提交后可在详情页继续发起标注任务', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.route('**/api/v1/data-sources', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-f015', timestamp: new Date().toISOString(), data: [] } });
  });

  await page.getByText('数据集管理').click();
  await page.getByRole('button', { name: '＋ 新建数据集' }).click();
  await expect(page.getByRole('heading', { name: '新建数据集 / 上传向导' })).toBeVisible();
  await page.locator('input.ant-input').first().fill('F015 本地上传数据集');
  await page.getByRole('button', { name: '下一步：创建上传会话' }).click();
  await expect(page.getByText(/上传会话 DUS-E2E-001/)).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'weld-1.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('fake-jpg-binary'),
  });
  await page.getByRole('button', { name: '上传并登记到平台' }).click();
  await expect(page.getByText(/已接收 1 个文件/)).toBeVisible();

  await page.getByRole('button', { name: '提交并创建数据集' }).click();
  await expect(page.getByText(/阶段进度：SECURITY_SCAN · 70%/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '焊缝缺陷检测数据集' })).toBeVisible();
  await expect(page.getByRole('button', { name: '创建标注任务' })).toBeEnabled();
  await page.getByRole('button', { name: '创建标注任务' }).click();
  await expect(page.getByRole('heading', { name: '标注任务管理' })).toBeVisible();
});

test('TASK-local-dataset-upload AC-01 AC-03 AC-05 数据源导入旧路径仍可继续使用', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.getByText('数据集管理').click();
  await page.getByRole('button', { name: '＋ 新建数据集' }).click();
  await expect(page.getByRole('heading', { name: '新建数据集 / 上传向导' })).toBeVisible();
  await expect(page.getByText('来源数据源')).toBeVisible();
  await page.locator('input.ant-input').first().fill('F015 数据源导入回归');
  await page.getByRole('combobox', { name: /\*?\s*来源数据源/ }).click();
  await page.getByTitle('Image bucket · 对象存储').click();
  await page.getByRole('button', { name: '下一步：初始化数据集' }).click();
  await expect(page.getByRole('button', { name: '完成文件登记并绑定版本' })).toBeVisible();
});

test('TASK-local-dataset-upload AC-04 高风险内容提交后展示安全待处理并阻断标注入口', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.route('**/api/v1/data-sources', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-f015', timestamp: new Date().toISOString(), data: [] } });
  });
  await page.route('**/api/v1/dataset-upload-sessions/*/files', async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        message: 'success',
        traceId: 'e2e-f015-risk',
        timestamp: new Date().toISOString(),
        data: {
          sessionId: 'DUS-E2E-RISK',
          datasetId: null,
          versionId: null,
          status: 'UPLOADING',
          creationMode: 'LOCAL_UPLOAD',
          progress: { phase: 'UPLOADING_FILES', percent: 45 },
          summary: { totalFiles: 1, acceptedFiles: 1, rejectedFiles: 0 },
          datasetStatus: 'DRAFT',
          versionStatus: 'DRAFT',
          diagnosticCode: 'OK',
          diagnosticMessage: 'UPLOAD_SUMMARY_UPDATED',
          files: [{ fileName: 'risk-photo.jpg', fileId: 'FILE-UPLOAD-RISK', status: 'UPLOADED', sizeBytes: 2048, contentType: 'image/jpeg', diagnosticCode: 'DATASET_UPLOAD_SECURITY_BLOCKED', diagnosticMessage: '检测到高风险内容' }],
        },
      },
    });
  });
  await page.route('**/api/v1/dataset-upload-sessions/*/commit', async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        message: 'success',
        traceId: 'e2e-f015-risk',
        timestamp: new Date().toISOString(),
        data: {
          sessionId: 'DUS-E2E-RISK',
          datasetId: 'DATASET-UPLOAD-RISK',
          versionId: 'DVER-UPLOAD-RISK',
          status: 'PROCESSING',
          creationMode: 'LOCAL_UPLOAD',
          progress: { phase: 'SECURITY_SCAN', percent: 70 },
          summary: { totalFiles: 1, acceptedFiles: 1, rejectedFiles: 0 },
          datasetStatus: 'DRAFT',
          versionStatus: 'DRAFT',
          diagnosticCode: 'OK',
          diagnosticMessage: 'SECURITY_SCAN',
          files: [{ fileName: 'risk-photo.jpg', fileId: 'FILE-UPLOAD-RISK', status: 'UPLOADED', sizeBytes: 2048, contentType: 'image/jpeg', diagnosticCode: 'DATASET_UPLOAD_SECURITY_BLOCKED', diagnosticMessage: '检测到高风险内容' }],
        },
      },
    });
  });
  await page.route('**/api/v1/datasets/DATASET-UPLOAD-RISK', async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        message: 'success',
        traceId: 'e2e-f015-risk',
        timestamp: new Date().toISOString(),
        data: {
          dataset: { datasetId: 'DATASET-UPLOAD-RISK', name: 'F015 高风险内容', datasetType: 'RAW', dataType: 'IMAGE', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-UPLOAD-RISK', currentVersionName: 'v0.1.0', status: 'DRAFT', accessLevel: 'TEAM', tags: [], recordCount: 0, sizeBytes: 2048, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '高风险内容待处理', updatedAt: new Date().toISOString() },
          versions: [{ versionId: 'DVER-UPLOAD-RISK', datasetId: 'DATASET-UPLOAD-RISK', versionName: 'v0.1.0', status: 'SECURITY_PENDING', recordCount: 0, sizeBytes: 2048, contentSafetyStatus: 'BLOCKED', diagnosticCode: 'DATASET_UPLOAD_SECURITY_BLOCKED', diagnosticMessage: 'SECURITY_BLOCKED', createdAt: new Date().toISOString(), publishedAt: null }],
          files: [],
          grants: [],
          lineage: [],
          previewStatus: 'UNSUPPORTED',
          previewDiagnostic: '高风险内容未进入可用版本',
        },
      },
    });
  });

  await page.getByText('数据集管理').click();
  await page.getByRole('button', { name: '＋ 新建数据集' }).click();
  await page.locator('input.ant-input').first().fill('F015 高风险内容');
  await page.getByRole('button', { name: '下一步：创建上传会话' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'risk-photo.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('fake-risk-jpg'),
  });
  await page.getByRole('button', { name: '上传并登记到平台' }).click();
  await expect(page.getByText(/已接收 1 个文件/)).toBeVisible();

  await page.getByRole('button', { name: '提交并创建数据集' }).click();
  await expect(page.getByText(/阶段进度：SECURITY_SCAN · 70%/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'F015 高风险内容' })).toBeVisible();
  await expect(page.getByText(/当前数据集尚未达到可发起标注任务的状态/)).toBeVisible();
  await expect(page.getByText(/SECURITY_BLOCKED/)).toBeVisible();
  await expect(page.getByRole('button', { name: '创建标注任务' })).toBeDisabled();
});
