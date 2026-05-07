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
  permissions: ["identity:role:manage", "dataset:manage", "training:execute", "model:manage", "inference:deploy", "audit:read"],
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
      { label: "运行状态", value: "已接入后端 API 与数据库持久化" },
      { label: "数据来源", value: "优先读取后端服务；后端不可用时使用本地 fallback" },
      { label: "外部依赖", value: "SSO、对象存储、KServe、边缘 agent 等仍保留 TODO_CONFIRM_* 占位" },
      { label: "设计语言", value: "Apple 风格：低 chrome、单一蓝色交互、满屏产品 tile" },
    ],
  };
}

export type ModelMetric = {
  name: string;
  value: string;
};

export type ModelVersion = {
  key: string;
  name: string;
  trainingJobKey: string;
  artifactUri: string;
  checksum: string;
  status: string;
  approvalStatus: string;
  deployable: boolean;
  metrics: ModelMetric[];
  approvedBy?: string;
  rejectReason?: string;
};

export type RegistryModel = {
  key: string;
  name: string;
  domain: string;
  owner: string;
  description: string;
  versions: ModelVersion[];
};

export const registryModels: RegistryModel[] = [
  {
    key: "bearing-defect-detector",
    name: "轴承缺陷检测模型",
    domain: "视觉质检",
    owner: "算法组",
    description: "承接 F005 train-bearing-v1 的轻量视觉缺陷检测模型",
    versions: [
      {
        key: "bearing-defect-detector-v1",
        name: "v1.0.0",
        trainingJobKey: "train-bearing-v1",
        artifactUri: "TODO_CONFIRM_MODEL_ARTIFACT_URI/train-bearing-v1",
        checksum: "sha256:train-bearing-v1",
        status: "APPROVED",
        approvalStatus: "APPROVED",
        deployable: true,
        metrics: [
          { name: "accuracy", value: "90%" },
          { name: "latency", value: "42ms" },
          { name: "modelSize", value: "18.5MB" },
        ],
        approvedBy: "local.admin",
      },
      {
        key: "bearing-defect-detector-v0",
        name: "v0.9.0",
        trainingJobKey: "train-audio-poc",
        artifactUri: "TODO_CONFIRM_MODEL_ARTIFACT_URI/train-audio-poc",
        checksum: "sha256:train-audio-poc",
        status: "REJECTED",
        approvalStatus: "REJECTED",
        deployable: false,
        metrics: [
          { name: "accuracy", value: "71%" },
          { name: "latency", value: "61ms" },
          { name: "modelSize", value: "24.1MB" },
        ],
        rejectReason: "accuracy 低于 MVP 示例阈值",
      },
    ],
  },
  {
    key: "audio-anomaly-lite",
    name: "声音异常检测模型",
    domain: "预测性维护",
    owner: "设备组",
    description: "承接 F005 声音异常检测 PoC 的轻量音频模型",
    versions: [
      {
        key: "audio-anomaly-lite-v1",
        name: "v1.0.0-rc1",
        trainingJobKey: "train-audio-poc",
        artifactUri: "TODO_CONFIRM_MODEL_ARTIFACT_URI/train-audio-poc",
        checksum: "sha256:audio-anomaly-lite-v1",
        status: "APPROVAL_PENDING",
        approvalStatus: "APPROVAL_PENDING",
        deployable: false,
        metrics: [
          { name: "accuracy", value: "84%" },
          { name: "latency", value: "55ms" },
          { name: "modelSize", value: "11.2MB" },
        ],
      },
    ],
  },
];
