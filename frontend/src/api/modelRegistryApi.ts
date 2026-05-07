import { registryModels, type ModelMetric, type ModelVersion, type RegistryModel } from "../prototype-data";

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const MODEL_AUTH_HEADERS = {
  Authorization: "Bearer LOCAL_DEV_TOKEN",
  "X-Platform-Permissions": "model:read,model:manage",
};

type ModelListResponse = {
  items: ModelSummaryResponse[];
  featureTrace: string;
};

type ModelSummaryResponse = {
  modelKey: string;
  modelName: string;
  domain: string;
  owner: string;
  latestVersionKey: string;
  approvalStatus: string;
  deployable: boolean;
  permission: string;
  featureTrace: string;
};

type ModelDetailResponse = {
  modelKey: string;
  modelName: string;
  domain: string;
  owner: string;
  description: string;
  latestVersionKey: string;
  deployableVersionKey?: string;
  versions: ModelVersionResponse[];
  evalPolicy: string;
  approvalPolicy: string;
  featureTrace: string;
};

type ModelVersionResponse = {
  versionKey: string;
  versionName: string;
  trainingJobKey: string;
  artifactUri: string;
  checksum: string;
  status: string;
  approvalStatus: string;
  deployable: boolean;
  metrics: ModelMetricResponse[];
  createdAt: string;
  approvedBy?: string;
  rejectReason?: string;
};

type ModelMetricResponse = {
  metricName: string;
  metricValue: number;
  metricUnit: string;
};

type ModelVersionActionResponse = {
  modelKey: string;
  versionKey: string;
  status: string;
  approvalStatus: string;
  deployable: boolean;
  featureTrace: string;
};

export type ModelRegistryLoadResult = {
  models: RegistryModel[];
  source: "backend" | "fallback";
  featureTrace: string;
};

function apiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_API_BASE_URL;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (typeof fetch !== "function") {
    throw new Error("当前运行环境不支持 fetch，使用模型仓库本地 fallback。 ");
  }

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...MODEL_AUTH_HEADERS,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`模型仓库 API 请求失败：${response.status}`);
  }

  return await response.json() as T;
}

function formatMetric(metric: ModelMetricResponse): ModelMetric {
  if (metric.metricUnit === "%") {
    const percentage = metric.metricValue <= 1 ? metric.metricValue * 100 : metric.metricValue;
    return { name: metric.metricName, value: `${Math.round(percentage)}%` };
  }

  return { name: metric.metricName, value: `${metric.metricValue}${metric.metricUnit}` };
}

function mapVersion(version: ModelVersionResponse): ModelVersion {
  return {
    key: version.versionKey,
    name: version.versionName,
    trainingJobKey: version.trainingJobKey,
    artifactUri: version.artifactUri,
    checksum: version.checksum,
    status: version.status,
    approvalStatus: version.approvalStatus,
    deployable: version.deployable,
    metrics: version.metrics.map(formatMetric),
    approvedBy: version.approvedBy,
    rejectReason: version.rejectReason,
  };
}

function mapModel(detail: ModelDetailResponse): RegistryModel {
  return {
    key: detail.modelKey,
    name: detail.modelName,
    domain: detail.domain,
    owner: detail.owner,
    description: detail.description,
    versions: detail.versions.map(mapVersion),
  };
}

export async function loadModelRegistry(): Promise<ModelRegistryLoadResult> {
  try {
    const list = await requestJson<ModelListResponse>("/api/models");
    const details = await Promise.all(list.items.map((item) => requestJson<ModelDetailResponse>(`/api/models/${item.modelKey}`)));
    return {
      models: details.map(mapModel),
      source: "backend",
      featureTrace: list.featureTrace,
    };
  } catch (error) {
    console.warn("模型仓库后端不可用，已回退到本地 fallback 数据。", error);
    return {
      models: registryModels,
      source: "fallback",
      featureTrace: "TASK-model-registry-mvp",
    };
  }
}

export async function approveModelVersion(modelKey: string, versionKey: string): Promise<ModelVersionActionResponse> {
  return await requestJson<ModelVersionActionResponse>(`/api/models/${modelKey}/versions/${versionKey}/approve`, { method: "POST" });
}

export async function rejectModelVersion(modelKey: string, versionKey: string): Promise<ModelVersionActionResponse> {
  return await requestJson<ModelVersionActionResponse>(`/api/models/${modelKey}/versions/${versionKey}/reject`, { method: "POST" });
}