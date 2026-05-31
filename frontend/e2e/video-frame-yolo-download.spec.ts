import { expect, test, type APIResponse } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';

type ApiEnvelope<T> = { code: number; message: string; data: T };

type LoginResponse = { accessToken: string };
type PipelineRunDetail = { run: { outputDatasetId: string } };
type DatasetDetail = { dataset: { currentVersionId: string; name: string; dataType: string }; files: Array<{ fileId: string; contentType: string; objectKey: string }> };
type AnnotationTaskDetail = { task: { taskId: string } };
type WorkItems = { items: Array<{ workItemId: string }> };
type Publication = { qualityStatus?: string; annotationArtifactFileId?: string };
type TrainingExport = { exportId: string; fileId: string; format: string; sizeBytes: number };

const apiBaseUrl = process.env.REAL_API_BASE_URL ?? 'http://localhost:8080';

async function unwrap<T>(response: APIResponse): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${response.url()} -> ${response.status()} ${await response.text().catch(() => '')}`);
  }
  const body = (await response.json()) as ApiEnvelope<T>;
  expect(body.code, body.message).toBe(0);
  return body.data;
}

test('真实接口完成视频抽帧、自定义命名、标注、YOLO训练集生成与本地下载', async ({ request }, testInfo) => {
  const login = await unwrap<LoginResponse>(await request.post(`${apiBaseUrl}/api/v1/auth/login`, {
    data: { username: 'buadmin', password: 'Smp@123456', tenantCode: 'CABIN' },
  }));
  const headers = { Authorization: `Bearer ${login.accessToken}` };
  const outputDatasetName = `真实E2E抽帧YOLO数据集-${Date.now()}`;

  const run = await unwrap<PipelineRunDetail>(await request.post(`${apiBaseUrl}/api/v1/pipelines/PIPE-VIDEO-PREP/runs`, {
    headers,
    data: { triggerMode: 'MANUAL', sampleDatasetId: 'DATASET-WELD-VIDEO-001', outputDatasetName },
  }));
  const datasetId = run.run.outputDatasetId;

  const sourceDataset = await unwrap<DatasetDetail>(await request.get(`${apiBaseUrl}/api/v1/datasets/DATASET-WELD-VIDEO-001`, { headers }));
  expect(sourceDataset.dataset.dataType).toBe('AUDIO_VIDEO');
  expect(sourceDataset.files.length).toBeGreaterThanOrEqual(1);
  const sourceVideo = await request.get(`${apiBaseUrl}/api/v1/platform/files/${sourceDataset.files[0].fileId}/content`, { headers });
  expect(sourceVideo.ok()).toBeTruthy();
  const sourceVideoBytes = Buffer.from(await sourceVideo.body());
  const sourceFramePayloads = extractJpegFramePayloads(sourceVideoBytes);
  const sourceFrameHashes = new Set(sourceFramePayloads.map((frame) => sha256(frame)));
  expect(sourceFramePayloads.length).toBeGreaterThanOrEqual(6);
  expect(sourceFrameHashes.size).toBeGreaterThanOrEqual(2);

  const dataset = await unwrap<DatasetDetail>(await request.get(`${apiBaseUrl}/api/v1/datasets/${datasetId}`, { headers }));
  expect(dataset.dataset.name).toBe(outputDatasetName);
  expect(dataset.dataset.dataType).toBe('IMAGE');
  expect(dataset.files.length).toBeGreaterThanOrEqual(6);
  expect(dataset.files.every((file) => file.contentType.startsWith('image/'))).toBeTruthy();
  const frameHashes = new Set<string>();
  for (const file of dataset.files) {
    const frame = await request.get(`${apiBaseUrl}/api/v1/platform/files/${file.fileId}/content`, { headers });
    expect(frame.ok()).toBeTruthy();
    const frameBytes = Buffer.from(await frame.body());
    expect(frameBytes.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    const frameHash = sha256(frameBytes);
    expect(sourceFrameHashes.has(frameHash)).toBeTruthy();
    frameHashes.add(frameHash);
  }

  await unwrap(await request.post(`${apiBaseUrl}/api/v1/preprocessed-datasets/${datasetId}/confirm`, {
    headers,
    data: { decision: 'CONFIRM', comment: '真实 E2E 确认抽帧结果' },
  }));
  await unwrap(await request.post(`${apiBaseUrl}/api/v1/preprocessed-datasets/${datasetId}/activate`, {
    headers,
    data: { targetVersionId: dataset.dataset.currentVersionId, activationNote: '真实 E2E 激活标注数据集' },
  }));

  const task = await unwrap<AnnotationTaskDetail>(await request.post(`${apiBaseUrl}/api/v1/annotation/tasks`, {
    headers,
    data: {
      sourceDatasetId: datasetId,
      sourceVersionId: dataset.dataset.currentVersionId,
      name: `真实E2E YOLO标注任务-${Date.now()}`,
      scene: 'IMAGE_TAGGING',
      reviewEnabled: false,
      prelabelEnabled: false,
      labelStudioEnabled: false,
      inlineLabels: ['缺陷'],
    },
  }));
  const taskId = task.task.taskId;

  const workItems = await unwrap<WorkItems>(await request.get(`${apiBaseUrl}/api/v1/annotation/tasks/${taskId}/work-items?pageSize=50`, { headers }));
  expect(workItems.items.length).toBeGreaterThanOrEqual(6);
  for (const item of workItems.items) {
    await unwrap(await request.post(`${apiBaseUrl}/api/v1/annotation/work-items/${item.workItemId}/submit`, {
      headers,
      data: {
        annotationJson: JSON.stringify({
          boxes: [
            { label: '缺陷', x: 120, y: 118, w: 78, h: 58 },
            { label: '缺陷', x: 258, y: 142, w: 86, h: 66 },
            { label: '缺陷', x: 392, y: 128, w: 74, h: 62 },
          ],
        }),
      },
    }));
  }

  const quality = await unwrap<Publication>(await request.post(`${apiBaseUrl}/api/v1/annotation/tasks/${taskId}/quality-check`, { headers, data: {} }));
  expect(quality.qualityStatus).toBe('PASSED');
  const publication = await unwrap<Publication>(await request.post(`${apiBaseUrl}/api/v1/annotation/tasks/${taskId}/publish-dataset`, { headers, data: {} }));
  expect(publication.annotationArtifactFileId).toMatch(/^FILE-ANN-/);

  const createdExport = await unwrap<TrainingExport>(await request.post(`${apiBaseUrl}/api/v1/annotation/tasks/${taskId}/exports`, {
    headers,
    data: { format: 'YOLO_DETECTION', optionsJson: JSON.stringify({ split: 'train' }) },
  }));
  expect(createdExport.format).toBe('YOLO_DETECTION');
  expect(createdExport.fileId).toMatch(/^FILE-AEXP-/);
  expect(createdExport.sizeBytes).toBeGreaterThan(0);

  const downloadInfo = await unwrap<TrainingExport>(await request.get(`${apiBaseUrl}/api/v1/annotation/exports/${createdExport.exportId}/download-url`, { headers }));
  const download = await request.get(`${apiBaseUrl}/api/v1/platform/files/${downloadInfo.fileId}/content`, { headers });
  expect(download.ok()).toBeTruthy();
  expect(download.headers()['content-type']).toContain('application/zip');
  const zipBytes = Buffer.from(await download.body());
  expect(zipBytes.subarray(0, 2)).toEqual(Buffer.from('PK'));
  const entries = unzipStoredEntries(zipBytes);
  expect(entries.has('data.yaml')).toBeTruthy();
  expect(entries.has('images/train/frame-0001.jpg')).toBeTruthy();
  expect(entries.has('labels/train/frame-0001.txt')).toBeTruthy();
  const imageEntries = [...entries.entries()].filter(([name]) => name.startsWith('images/train/') && name.endsWith('.jpg'));
  const labelEntries = [...entries.entries()].filter(([name]) => name.startsWith('labels/train/') && name.endsWith('.txt'));
  expect(imageEntries.length).toBeGreaterThanOrEqual(6);
  expect(labelEntries.length).toBe(imageEntries.length);
  for (const [, imageBytes] of imageEntries) {
    const imageHash = sha256(imageBytes);
    expect(frameHashes.has(imageHash)).toBeTruthy();
    expect(sourceFrameHashes.has(imageHash)).toBeTruthy();
  }
  for (const [, labelBytes] of labelEntries) {
    expect(labelBytes.toString('utf8').split(/\r?\n/).filter(Boolean)).toHaveLength(3);
  }

  const outputDir = path.join(testInfo.project.outputDir, 'real-yolo-download');
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, `${downloadInfo.fileId}.zip`), zipBytes);
});

function extractJpegFramePayloads(videoBytes: Buffer): Buffer[] {
  const frames: Buffer[] = [];
  let offset = 0;
  while (offset < videoBytes.length) {
    const start = videoBytes.indexOf(Buffer.from([0xff, 0xd8]), offset);
    if (start < 0) {
      break;
    }
    const end = videoBytes.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
    if (end < 0) {
      break;
    }
    frames.push(videoBytes.subarray(start, end + 2));
    offset = end + 2;
  }
  return frames;
}

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function unzipStoredEntries(zipBytes: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  const eocdOffset = findSignatureBackwards(zipBytes, 0x06054b50);
  if (eocdOffset < 0) {
    throw new Error('ZIP EOCD not found');
  }
  const centralDirectorySize = zipBytes.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = zipBytes.readUInt32LE(eocdOffset + 16);
  let offset = centralDirectoryOffset;
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  while (offset < centralDirectoryEnd) {
    if (zipBytes.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`ZIP central directory signature mismatch at ${offset}`);
    }
    const compression = zipBytes.readUInt16LE(offset + 10);
    const compressedSize = zipBytes.readUInt32LE(offset + 20);
    const fileNameLength = zipBytes.readUInt16LE(offset + 28);
    const extraLength = zipBytes.readUInt16LE(offset + 30);
    const commentLength = zipBytes.readUInt16LE(offset + 32);
    const localHeaderOffset = zipBytes.readUInt32LE(offset + 42);
    const name = zipBytes.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf8');

    const localNameLength = zipBytes.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = zipBytes.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = zipBytes.subarray(dataStart, dataStart + compressedSize);
    const content = compression === 0 ? compressed : compression === 8 ? inflateRawSync(compressed) : undefined;
    if (content) {
      entries.set(name, content);
    }
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function findSignatureBackwards(buffer: Buffer, signature: number): number {
  for (let offset = buffer.length - 4; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) {
      return offset;
    }
  }
  return -1;
}
