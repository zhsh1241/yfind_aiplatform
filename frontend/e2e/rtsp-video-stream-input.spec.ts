import { test, expect } from '@playwright/test';
import { seedAuthenticatedSession } from './helpers';

test('TASK-rtsp-video-stream-input AC-01 AC-02 AC-03 AC-04 AC-05 AC-06 AC-07 supports RTSP stream sampling dataset workflow', async ({ page }) => {
  await seedAuthenticatedSession(page);

  await page.getByText('数据源管理').click();
  await expect(page.getByRole('heading', { name: '数据源管理' })).toBeVisible();
  await expect(page.getByText('RTSP视频流', { exact: true })).toBeVisible();
  await expect(page.getByText('rtsp://camera.sandbox.internal/live/weld')).toBeVisible();

  await page.getByRole('button', { name: '测试连接' }).nth(6).click();
  await expect(page.getByText(/SUCCESS: SANDBOX RTSP_STREAM connector verified/)).toBeVisible();

  await page.getByRole('tab', { name: '同步任务' }).click();
  await expect(page.getByText('F018 RTSP 手动采样')).toBeVisible();
  await expect(page.getByText('durationSeconds=10;sampleName=weld-line')).toBeVisible();
  await page.getByRole('button', { name: '立即采样' }).click();
  await expect(page.getByText(/SUCCEEDED: SANDBOX_RTSP_STREAM_SAMPLE_READY/)).toBeVisible();

  await page.getByText('数据集管理').click();
  await expect(page.getByRole('heading', { name: '数据集管理' })).toBeVisible();
  await page.getByRole('cell', { name: 'F018 RTSP 采样视频数据集' }).getByText('F018 RTSP 采样视频数据集').click();
  await expect(page.getByRole('heading', { name: 'F018 RTSP 采样视频数据集' })).toBeVisible();
  await expect(page.getByText('video/mp4')).toBeVisible();
  await page.getByRole('tab', { name: '血缘' }).click();
  await expect(page.getByRole('cell', { name: 'RTSP_STREAM', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'CAPTURE_SAMPLE', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: '标注任务/训练导出' }).click();
  await expect(page.getByText('RTSP_STREAM 采样生成的视频原始数据集需先经过抽帧预处理生成 IMAGE 数据集后再标注。')).toBeVisible();
});
