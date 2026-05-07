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
