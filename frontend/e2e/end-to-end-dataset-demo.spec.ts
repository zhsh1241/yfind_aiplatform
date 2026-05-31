import { test, expect } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

const datasets = [
  {
    name: '焊缝缺陷检测数据集',
    id: 'DATASET-WELD-DEFECT',
    type: 'IMAGE',
    shouldAnnotate: true,
  },
  {
    name: '工单文本分类语料库',
    id: 'DATASET-WORKORDER-TEXT',
    type: 'TEXT',
    currentVersionId: 'DVER-TEXT-001',
    shouldAnnotate: false,
  },
];

test.describe('已完成功能跨模块串联演示', () => {
  for (const dataset of datasets) {
    test(`DEMO ${dataset.name} 从数据接入到加工${dataset.shouldAnnotate ? '、标注发布' : ''}的完整演示`, async ({ page }) => {
      await seedAuthenticatedSession(page);

      await test.step('1. 数据源接入与同步任务', async () => {
        await page.getByText('数据源管理').click();
        await expect(page.getByRole('heading', { name: '数据源管理' })).toBeVisible();
        await expect(page.getByText('数据集导入方式')).toBeVisible();
        await page.getByRole('button', { name: '测试连接' }).first().click();
        await expect(page.getByText(/SUCCESS: SANDBOX OBJECT_STORAGE connector verified/)).toBeVisible();
        await page.getByRole('tab', { name: '同步任务' }).click();
        await expect(page.getByText('生产图像同步')).toBeVisible();
        await page.getByRole('button', { name: '立即同步' }).first().click();
        await expect(page.getByText(/SUCCEEDED: SANDBOX_RELATIONAL_DB_IMPORT_READY/)).toBeVisible();
      });

      await test.step(`2. 打开数据集并检查版本、文件、血缘：${dataset.name}`, async () => {
        await page.getByText('数据集管理').click();
        await expect(page.getByRole('heading', { name: '数据集管理' })).toBeVisible();
        await page.getByPlaceholder('搜索数据集名称...').fill(dataset.name);
        await page.keyboard.press('Enter');
        await expect(page.getByRole('cell', { name: dataset.name })).toBeVisible();
        if (dataset.name === '工单文本分类语料库') {
          const detailResponse = {
            dataset: {
              datasetId: dataset.id,
              name: dataset.name,
              datasetType: 'RAW',
              dataType: 'TEXT',
              tenantId: 'TENANT-YF',
              projectId: null,
              currentVersionId: dataset.currentVersionId,
              currentVersionName: 'v2.1.0',
              status: 'ACTIVE',
              accessLevel: 'PUBLIC',
              tags: ['工单', 'NLP'],
              recordCount: 125600,
              sizeBytes: 2048,
              ownerId: 'USR-ADMIN',
              ownerName: '平台管理员',
              description: '工单文本公开样例数据集',
              updatedAt: '2026-05-18T00:00:00Z',
            },
            versions: [{
              versionId: dataset.currentVersionId,
              datasetId: dataset.id,
              versionName: 'v2.1.0',
              status: 'PUBLISHED',
              recordCount: 125600,
              sizeBytes: 2048,
              contentSafetyStatus: 'PASSED',
              diagnosticCode: 'OK',
              diagnosticMessage: 'SANDBOX_TEXT_CONTENT_READY',
              createdAt: '2026-05-18T00:00:00Z',
              publishedAt: '2026-05-18T00:00:00Z',
            }],
            files: [{
              id: 'DF-TEXT-001',
              datasetId: dataset.id,
              versionId: dataset.currentVersionId,
              fileId: 'FILE-DATASET-TEXT-001',
              fileRole: 'RAW',
              status: 'BOUND',
              objectKey: 'TENANT-YF/dataset/FILE-DATASET-TEXT-001.jsonl',
              contentType: 'application/jsonl',
              sizeBytes: 2048,
              sha256: 'sha256-text-001',
            }],
            grants: [],
            lineage: [{
              lineageId: 'LIN-API-TEXT-001',
              sourceType: 'DATA_SOURCE',
              sourceId: 'DSRC-YF-API',
              targetType: 'DATASET_VERSION',
              targetId: dataset.currentVersionId,
              transformType: 'IMPORT',
              createdAt: '2026-05-18T00:00:00Z',
            }],
            previewStatus: 'SUPPORTED',
            previewDiagnostic: '文本样本可预览',
          };
          await page.route('**/api/v1/datasets/DATASET-WORKORDER-TEXT', async (route) => {
            await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-flow', timestamp: new Date().toISOString(), data: detailResponse } });
          });
          await page.route('**/api/v1/datasets/DATASET-WORKORDER-TEXT/lineage', async (route) => {
            await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e-flow', timestamp: new Date().toISOString(), data: detailResponse.lineage } });
          });
        }
        await page.getByRole('row', { name: new RegExp(dataset.name) }).getByText('详情').click();
        await expect(page.getByRole('heading', { name: dataset.name })).toBeVisible();
        await expect(page.getByText(dataset.type === 'IMAGE' ? '图片' : '文本', { exact: true })).toBeVisible();
        await expect(page.getByText('版本历史')).toBeVisible();
        await page.getByRole('tab', { name: '血缘' }).click();
        await expect(page.getByRole('cell', { name: 'DATA_SOURCE' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'IMPORT' })).toBeVisible();
        await page.getByRole('button', { name: '请求引用检查' }).click();
        await expect(page.getByText(/DatasetReference 可用/)).toBeVisible();
      });

      await test.step(`3. Pipeline 数据集读取节点绑定当前数据集：${dataset.name}`, async () => {
        await page.getByText('Pipeline编辑器').click();
        await expect(page.getByRole('heading', { name: 'Pipeline编辑器' })).toBeVisible();
        await expect(page.getByText('视觉预处理闭环')).toBeVisible();
        await expect(page.getByText('DAG 画布', { exact: true })).toBeVisible();
        await expect(page.getByText('图片质量提高').first()).toBeVisible();
        await page.locator('.node-config-card textarea').fill(JSON.stringify({ datasetId: dataset.id }, null, 2));
        await page.getByRole('button', { name: '💾 保存' }).click();
        await expect(page.getByText('Pipeline DAG 已保存并通过校验')).toBeVisible();
      });

      await test.step(`4. Pipeline DAG 配置、快照与运行：${dataset.name}`, async () => {
        await page.getByRole('button', { name: /＋ 添加算子/ }).click();
        await expect(page.getByText('添加算子', { exact: true })).toBeVisible();
        await page.locator('.ant-drawer').getByText(dataset.type === 'IMAGE' ? '图片加水印' : '固定帧率抽帧').first().click();
        await expect(page.getByText(/已添加算子：/)).toBeVisible();
        await page.getByRole('button', { name: '保存快照' }).click();
        await expect(page.getByText('版本快照已保存')).toBeVisible();
        await page.getByRole('button', { name: /配置并运行|配置调试运行/ }).click();
        await expect(page.getByText('加工任务运行完成，已生成加工记录和预处理数据集。')).toBeVisible();
        await expect(page.getByLabel('运行详情').getByText('VISUAL_PREPROCESS_RUN_SUCCEEDED')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByLabel('运行详情')).toBeHidden();
      });

      if (dataset.shouldAnnotate) {
        await test.step('5. 标注任务、Label Studio 同步、审核、质量检查与发布', async () => {
          await page.getByText('标注任务').click();
          await expect(page.getByRole('heading', { name: '标注任务管理' })).toBeVisible();
          await page.getByRole('button', { name: '＋ 新建标注任务' }).click();
          await expect(page.getByRole('dialog', { name: '＋ 新建标注任务' })).toBeVisible();
          await page.getByRole('textbox', { name: '标签列表' }).fill('裂纹，气孔，夹渣');
          await page.getByRole('button', { name: '创建任务' }).click();
          await expect(page.getByRole('dialog', { name: '＋ 新建标注任务' })).toBeHidden();
          await page.locator('a', { hasText: '同步 Label Studio project' }).click();
          await expect(page.getByText(/PROJECT_SYNCED/)).toBeVisible();

          await page.getByRole('button', { name: '进入标注' }).first().click();
          await expect(page.getByRole('heading', { name: '标注工作台' })).toBeVisible();
          await expect(page.getByLabel('原生标注画布')).toBeVisible();
          await page.getByRole('button', { name: '同步 Label Studio task' }).click();
          await expect(page.getByRole('link', { name: /打开 Label Studio task/ }).first()).toBeVisible();
          await page.getByRole('button', { name: '保存标注' }).click();
          await expect(page.getByText('草稿已保存')).toBeVisible();
          await page.getByRole('button', { name: '提交审核' }).click();
          await expect(page.getByText('标注结果已提交，等待审核')).toBeVisible();

          await page.getByText('标注审核').click();
          await expect(page.getByRole('heading', { name: '标注审核' })).toBeVisible();
          await page.getByRole('button', { name: '导入 Label Studio 结果' }).click();
          await page.getByRole('button', { name: '质量检查' }).click();
          await expect(page.getByText(/DAT-010 quality passed/)).toBeVisible();
          await page.getByRole('button', { name: '发布标注数据集' }).click();
          await expect(page.getByText(/已发布 ANNOTATED 数据集/)).toBeVisible();
        });
      } else {
        await test.step('5. 文本数据集不进入图像标注，演示停在加工后可供下游模型使用', async () => {
          await page.getByText('算子广场').click();
          await expect(page.getByRole('heading', { name: '算子广场' })).toBeVisible();
          await expect(page.getByText('视觉预处理冻结能力说明')).toBeVisible();
          await expect(page.getByText('视频抽帧').first()).toBeVisible();
        });
      }
    });
  }
});
