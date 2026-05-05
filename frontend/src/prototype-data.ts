export type ModuleKey =
  | "overview"
  | "identity"
  | "dataset"
  | "labeling"
  | "training"
  | "model"
  | "inference"
  | "edge"
  | "monitoring";

export type Detail = {
  title: string;
  description: string;
  items: Array<{ label: string; value: string }>;
};

export type Dataset = {
  key: string;
  name: string;
  owner: string;
  status: string;
  samples: number;
  quality: number;
  versionCount: number;
  previewType: string;
  canView: boolean;
  canDownloadLatestVersion: boolean;
  dedupStrategy: string;
  processingStatus: string;
  samplePreviewName: string;
  samplePreviewType: string;
};

export const flowNodes = ["组织登录", "数据上传", "标注复核", "启动训练", "模型注册", "推理发布", "边缘下发", "监控审计"];

export const inferenceMetrics = [
  { label: "08:00", qps: 46, latency: 94, success: 99.96 },
  { label: "10:00", qps: 72, latency: 112, success: 99.94 },
  { label: "12:00", qps: 64, latency: 108, success: 99.95 },
  { label: "14:00", qps: 93, latency: 128, success: 99.9 },
  { label: "16:00", qps: 81, latency: 119, success: 99.92 },
  { label: "18:00", qps: 58, latency: 101, success: 99.97 },
];

export const datasets: Dataset[] = [
  {
    key: "motor-thermal",
    name: "电机温升异常图像集",
    owner: "算法组",
    status: "ACTIVE",
    samples: 12840,
    quality: 96,
    versionCount: 3,
    previewType: "图片",
    canView: true,
    canDownloadLatestVersion: true,
    dedupStrategy: "SKIP_DUPLICATE",
    processingStatus: "SUCCEEDED",
    samplePreviewName: "sample-001.jpg",
    samplePreviewType: "image/jpeg",
  },
  {
    key: "bearing-audio",
    name: "轴承异响音频集",
    owner: "设备组",
    status: "PROCESSING",
    samples: 6200,
    quality: 91,
    versionCount: 1,
    previewType: "通用文件",
    canView: true,
    canDownloadLatestVersion: false,
    dedupStrategy: "WARN_DUPLICATE",
    processingStatus: "RUNNING",
    samplePreviewName: "bearing-001.wav",
    samplePreviewType: "audio/wav",
  },
  {
    key: "welding-vision",
    name: "焊点外观缺陷集",
    owner: "质检组",
    status: "PENDING_APPROVAL",
    samples: 8920,
    quality: 88,
    versionCount: 2,
    previewType: "图片",
    canView: true,
    canDownloadLatestVersion: false,
    dedupStrategy: "SKIP_DUPLICATE",
    processingStatus: "QUEUED",
    samplePreviewName: "weld-101.jpg",
    samplePreviewType: "image/jpeg",
  },
];

export const frontendUser = {
  username: "local.admin",
  displayName: "本地平台管理员",
  organization: "YFI 智造中心（本地占位）",
  authMethod: "LOCAL_DEV_PRINCIPAL",
  iamProvider: "TODO_CONFIRM_IAM_PROVIDER",
  permissions: ["identity:role:manage", "dataset:manage", "inference:deploy", "audit:read"],
};

export const moduleRequiredPermissions: Record<ModuleKey, string> = {
  overview: "identity:user:read",
  identity: "identity:role:manage",
  dataset: "dataset:manage",
  labeling: "labeling:manage",
  training: "training:execute",
  model: "model:manage",
  inference: "inference:deploy",
  edge: "edge:deploy",
  monitoring: "audit:read",
};

export function makeDetail(title: string, description: string): Detail {
  return {
    title,
    description,
    items: [
      { label: "原型状态", value: "已接入点击反馈" },
      { label: "真实接口", value: "后续 feature 接入" },
      { label: "设计语言", value: "Apple 风格：低 chrome、单一蓝色交互、满屏产品 tile" },
    ],
  };
}
