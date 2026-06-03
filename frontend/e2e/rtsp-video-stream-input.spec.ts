import { test, expect } from '@playwright/test';
import { openNav, seedAuthenticatedSession } from './helpers';

test('TASK-rtsp-video-stream-input AC-01 AC-02 AC-03 AC-04 AC-05 AC-06 AC-07 supports RTSP stream sampling dataset workflow', async ({ page }) => {
  await seedAuthenticatedSession(page);

  await openNav(page, '数据源管理');
  await expect(page.getByRole('heading', { name: '数据源管理' })).toBeVisible();
  await expect(page.getByText('RTSP视频流', { exact: true })).toBeVisible();
  await expect(page.getByText('rtsp://camera..internal/live/weld:554')).toBeVisible();

  await page.locator('.ant-card', { hasText: '焊缝 RTSP 视频流' }).getByRole('button', { name: '测试连接' }).click();
  await expect(page.getByText(/SUCCESS: RTSP_STREAM connector verified|SUCCESS: .*RTSP_STREAM connector verified/)).toBeVisible();

  await page.getByRole('tab', { name: '同步任务' }).click();
  await expect(page.getByText('F018 RTSP 手动采样')).toBeVisible();
  await expect(page.getByText('durationSeconds=10;sampleName=weld-line')).toBeVisible();
  const runResponse = page.waitForResponse((response) => response.url().includes('/api/v1/data-source-sync-tasks/DSYNC-RTSP-001/run') && response.request().method() === 'POST');
  await page.getByRole('button', { name: '立即采样' }).click();
  const runBody = await (await runResponse).json();
  expect(runBody.data.status).toBe('SUCCEEDED');
  expect(runBody.data.targetDatasetId).toBe('DATASET-RTSP-SAMPLE-E2E');
  expect(runBody.data.diagnosticMessage).toContain('RTSP_STREAM_SAMPLE_READY');
  await expect(page.getByText(/SUCCEEDED: .*SAMPLE_READY/)).toBeVisible();

  await openNav(page, '数据集管理');
  await expect(page.getByRole('heading', { name: '数据集管理' })).toBeVisible();
  await page.getByRole('cell', { name: 'F018 RTSP 采样视频数据集' }).getByText('F018 RTSP 采样视频数据集').click();
  await expect(page.getByRole('heading', { name: 'F018 RTSP 采样视频数据集' })).toBeVisible();
  await expect(page.getByText('video/mp4')).toBeVisible();
  const download = page.waitForEvent('download');
  const contentRequest = page.waitForRequest((request) => request.url().includes('/api/v1/platform/files/FILE-RTSP-SAMPLE-001/content'));
  await page.getByRole('button', { name: '获取下载链接' }).click();
  expect((await contentRequest).headers().authorization).toBe('Bearer token-f006');
  expect((await download).suggestedFilename()).toBe('FILE-RTSP-SAMPLE-001.mp4');
  await expect(page.getByText('文件下载已开始')).toBeVisible();
  await page.getByRole('tab', { name: '血缘' }).click();
  await expect(page.getByRole('cell', { name: 'RTSP_STREAM', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'CAPTURE_SAMPLE', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: '标注任务/训练导出' }).click();
  await expect(page.getByText('RTSP_STREAM 采样生成的视频原始数据集需先经过抽帧预处理生成 IMAGE 数据集后再标注。')).toBeVisible();
});
