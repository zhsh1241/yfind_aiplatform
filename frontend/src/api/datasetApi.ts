import { datasets as fallbackDatasets, type Dataset } from "../prototype-data";
import { getSimulatedDatasets } from "../simulationStore";
import { authJsonHeaders } from "./authSession";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

type DatasetListResponse = { items: DatasetSummaryResponse[]; featureTrace: string };
type DatasetSummaryResponse = { key: string; name: string; owner: string; status: string; sampleCount: number; versionCount: number; previewType: string; canView: boolean; canManage: boolean };
type DatasetDetailResponse = {
  key: string; name: string; owner: string; status: string; previewType: string; canView: boolean; canDownloadLatestVersion: boolean;
  versions: Array<{ versionKey: string; sampleCount: number; canDownload: boolean; dedupStrategy: string; processingStatus: string }>;
  sampleFiles: Array<{ fileName: string; contentType: string }>;
  featureTrace: string;
};
type AccessRequestResponse = { requestId: string; status: string; versionKey: string; downloadGranted: boolean; featureTrace: string };
export type CreateDatasetPayload = {
  name: string;
  uploadType: "file" | "image";
  dedupStrategy: "SKIP_DUPLICATE" | "WARN_DUPLICATE";
  description?: string;
};

export type DatasetLoadResult = { datasets: Dataset[]; source: "backend" | "fallback"; featureTrace: string };

export type PreparationStage = {
  stageKey: string;
  stageName: string;
  status: string;
  qualityScore: number;
  gatePassed: boolean;
  message: string;
};

export type PreparationJob = {
  jobId: string;
  datasetKey: string;
  datasetName: string;
  status: string;
  currentStage: string;
  progressPercent: number;
  blocked: boolean;
  blockedReason: string;
  qualityScore: number;
  rerunCount: number;
  outputSnapshotKey: string;
  stages: PreparationStage[];
  outputSnapshot: {
    snapshotKey: string;
    loaderType: string;
    readyForTraining: boolean;
    trainSplitCount: number;
    validationSplitCount: number;
    testSplitCount: number;
  };
};

type PreparationJobListResponse = { items: Array<Omit<PreparationJob, "stages" | "outputSnapshot">>; featureTrace: string };
type PreparationJobDetailResponse = PreparationJob & { featureTrace: string };
type PreparationActionResponse = { jobId: string; status: string; currentStage: string; blocked: boolean; rerunCount: number; featureTrace: string };

export const fallbackPreparationJobs: PreparationJob[] = [{
  jobId: "prep-motor-thermal-v3",
  datasetKey: "motor-thermal",
  datasetName: "电机温升异常图像集",
  status: "BLOCKED",
  currentStage: "LABELING",
  progressPercent: 38,
  blocked: true,
  blockedReason: "标注一致性低于阈值",
  qualityScore: 72,
  rerunCount: 1,
  outputSnapshotKey: "motor-thermal-train-snapshot-v4",
  stages: [
    { stageKey: "COLLECTION", stageName: "数据收集", status: "SUCCEEDED", qualityScore: 96, gatePassed: true, message: "来源登记与样本清单完成" },
    { stageKey: "CLEANING", stageName: "数据清洗", status: "SUCCEEDED", qualityScore: 93, gatePassed: true, message: "去重和缺失值处理完成" },
    { stageKey: "LABELING", stageName: "数据标注", status: "FAILED", qualityScore: 72, gatePassed: false, message: "标注一致性低于阈值" },
    { stageKey: "SPLIT", stageName: "数据划分", status: "PENDING", qualityScore: 0, gatePassed: false, message: "等待标注通过" },
    { stageKey: "PREPROCESSING", stageName: "数据预处理", status: "PENDING", qualityScore: 0, gatePassed: false, message: "等待数据划分" },
    { stageKey: "AUGMENTATION", stageName: "数据增强", status: "PENDING", qualityScore: 0, gatePassed: false, message: "等待预处理" },
    { stageKey: "FORMAT_LOADING", stageName: "格式转换与加载", status: "PENDING", qualityScore: 0, gatePassed: false, message: "等待增强" },
  ],
  outputSnapshot: {
    snapshotKey: "motor-thermal-train-snapshot-v4",
    loaderType: "PAI_DLC_DATA_LOADER",
    readyForTraining: false,
    trainSplitCount: 8988,
    validationSplitCount: 1926,
    testSplitCount: 1926,
  },
}];

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...(await authJsonHeaders()), ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error(`数据资产 API 请求失败：${response.status}`);
  return await response.json() as T;
}

function toPreviewLabel(previewType: string) {
  return previewType === "IMAGE" ? "图片" : "通用文件";
}

function qualityFor(status: string) {
  if (status === "ACTIVE") return 96;
  if (status === "PROCESSING") return 91;
  return 88;
}

function mapDetail(detail: DatasetDetailResponse): Dataset {
  const latest = detail.versions[0];
  const sample = detail.sampleFiles[0];
  return {
    key: detail.key,
    name: detail.name,
    owner: detail.owner,
    status: detail.status,
    samples: latest?.sampleCount ?? 0,
    quality: qualityFor(detail.status),
    versionCount: detail.versions.length,
    previewType: toPreviewLabel(detail.previewType),
    canView: detail.canView,
    canDownloadLatestVersion: latest?.canDownload ?? detail.canDownloadLatestVersion,
    dedupStrategy: latest?.dedupStrategy ?? "SKIP_DUPLICATE",
    processingStatus: latest?.processingStatus ?? "QUEUED",
    samplePreviewName: sample?.fileName ?? "暂无样例",
    samplePreviewType: sample?.contentType ?? "application/octet-stream",
  };
}

export async function loadDatasets(): Promise<DatasetLoadResult> {
  const simulated = getSimulatedDatasets();
  try {
    const list = await requestJson<DatasetListResponse>("/api/datasets");
    const details = await Promise.all(list.items.map((item) => requestJson<DatasetDetailResponse>(`/api/datasets/${item.key}`)));
    const backendDatasets = details.map(mapDetail);
    const mergedBase = [...backendDatasets, ...fallbackDatasets.filter((item) => backendDatasets.every((backendItem) => backendItem.key !== item.key))];
    const merged = [...simulated, ...mergedBase.filter((item) => simulated.every((simulatedItem) => simulatedItem.key !== item.key))];
    return { datasets: merged, source: "backend", featureTrace: list.featureTrace };
  } catch (error) {
    console.warn("数据资产后端不可用，已回退到本地 fallback 数据。", error);
    const merged = [...simulated, ...fallbackDatasets.filter((item) => simulated.every((simulatedItem) => simulatedItem.key !== item.key))];
    return { datasets: merged, source: "fallback", featureTrace: "TASK-dataset-asset-mvp" };
  }
}

export async function createDatasetAccessRequest(dataset: Dataset, reason = "页面发起下载申请"): Promise<AccessRequestResponse> {
  return await requestJson<AccessRequestResponse>(`/api/datasets/${dataset.key}/access-requests`, {
    method: "POST",
    body: JSON.stringify({ requester: "local.admin", versionKey: `${dataset.key}-latest`, reason }),
  });
}

export async function approveDatasetAccessRequest(requestId: string): Promise<AccessRequestResponse> {
  return await requestJson<AccessRequestResponse>(`/api/datasets/access-requests/${requestId}/approve`, { method: "POST" });
}

export async function createDataset(payload: CreateDatasetPayload): Promise<Dataset> {
  const key = `${payload.name}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    key,
    name: payload.name,
    owner: "本地上传",
    status: "PROCESSING",
    samples: payload.uploadType === "image" ? 320 : 120,
    quality: 89,
    versionCount: 1,
    previewType: payload.uploadType === "image" ? "图片" : "通用文件",
    canView: true,
    canDownloadLatestVersion: false,
    dedupStrategy: payload.dedupStrategy,
    processingStatus: "RUNNING",
    samplePreviewName: payload.uploadType === "image" ? "upload-preview.jpg" : "upload-preview.zip",
    samplePreviewType: payload.uploadType === "image" ? "image/jpeg" : "application/zip",
  };
}


export async function loadPreparationJobs(): Promise<PreparationJob[]> {
  if (import.meta.env.MODE === "test") return fallbackPreparationJobs;
  try {
    const list = await requestJson<PreparationJobListResponse>("/api/datasets/preparation-jobs");
    return await Promise.all(list.items.map((item) => requestJson<PreparationJobDetailResponse>(`/api/datasets/preparation-jobs/${item.jobId}`)));
  } catch (error) {
    console.warn("数据准备流水线后端不可用，已回退到本地 fallback 数据。", error);
    return fallbackPreparationJobs;
  }
}

export async function rerunPreparationJob(jobId: string): Promise<PreparationActionResponse> {
  return await requestJson<PreparationActionResponse>(`/api/datasets/preparation-jobs/${jobId}/rerun-blocked-stage`, {
    method: "POST",
    body: JSON.stringify({
      operator: "local.admin",
      reason: "来源登记与样本清单完成",
      qualityScoreOverride: 91,
      labelAgreementOverride: 0.95,
      duplicateRateOverride: 0.01,
    }),
  });
}
