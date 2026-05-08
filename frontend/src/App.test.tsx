import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api/datasetApi", () => ({
  loadDatasets: vi.fn(async () => ({
    datasets: [{
      key: "dataset-1",
      name: "电机热成像数据集",
      owner: "数据运营",
      status: "ACTIVE",
      samples: 1280,
      quality: 96,
      versionCount: 3,
      previewType: "图片",
      canView: true,
      canDownloadLatestVersion: true,
      dedupStrategy: "SKIP_DUPLICATE",
      processingStatus: "SUCCEEDED",
      samplePreviewName: "motor-001.jpg",
      samplePreviewType: "image/jpeg",
    }],
    source: "fallback",
    featureTrace: "TASK-dataset-asset-mvp",
  })),
  createDataset: vi.fn(async (payload) => ({
    key: "dataset-created",
    name: payload.name,
    owner: "本地上传",
    status: "PROCESSING",
    samples: 100,
    quality: 88,
    versionCount: 1,
    previewType: payload.uploadType === "image" ? "图片" : "通用文件",
    canView: true,
    canDownloadLatestVersion: false,
    dedupStrategy: payload.dedupStrategy,
    processingStatus: "RUNNING",
    samplePreviewName: "preview.zip",
    samplePreviewType: "application/zip",
  })),
  createDatasetAccessRequest: vi.fn(async () => ({ requestId: "req-1", status: "PENDING", versionKey: "dataset-1-latest", downloadGranted: false, featureTrace: "trace" })),
  approveDatasetAccessRequest: vi.fn(async () => ({ requestId: "req-1", status: "APPROVED", versionKey: "dataset-1-latest", downloadGranted: true, featureTrace: "trace" })),
  loadPreparationJobs: vi.fn(async () => [{
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
    stages: ["数据收集", "数据清洗", "数据标注", "数据划分", "数据预处理", "数据增强", "格式转换与加载"].map((stageName) => ({ stageKey: stageName, stageName, status: stageName === "数据标注" ? "FAILED" : "PENDING", qualityScore: 80, gatePassed: stageName !== "数据标注", message: "等待增强" })),
    outputSnapshot: { snapshotKey: "motor-thermal-train-snapshot-v4", loaderType: "PAI_DLC_DATA_LOADER", readyForTraining: false, trainSplitCount: 8988, validationSplitCount: 1926, testSplitCount: 1926 },
  }]),
  rerunPreparationJob: vi.fn(async () => ({ jobId: "prep-motor-thermal-v3", status: "RUNNING", currentStage: "SPLIT", blocked: false, rerunCount: 2, featureTrace: "TASK-dataset-preparation-pipeline" })),
}));

vi.mock("./api/trainingApi", () => ({
  loadTraining: vi.fn(async () => ({
    jobs: [{ key: "job-1", name: "热成像异常检测", dataset: "电机热成像数据集 / v3", template: "small-cnn-vision", status: "RUNNING", queueStatus: "RUNNING", accelerator: "GPU x1", progress: 65, artifact: "oss://artifacts/job-1" }],
    templates: ["small-cnn-vision", "audio-anomaly-lite"],
    metricPoints: [{ epoch: 8, loss: 0.11, accuracy: 96 }],
    source: "fallback",
  })),
  createTrainingJobSimulation: vi.fn((payload) => ({
    key: "job-created",
    name: payload.jobName || "本地训练任务",
    dataset: payload.datasetVersion,
    template: payload.templateKey,
    status: "QUEUED",
    queueStatus: "SUBMITTED_TO_ADAPTER",
    accelerator: `CPU ${payload.cpuCores} 核 / GPU ${payload.gpuCards} 卡 / NPU ${payload.npuCards} 卡`,
    progress: 5,
    artifact: "local://artifacts/job-created",
  })),
}));

vi.mock("./api/modelRegistryApi", () => ({
  loadModelRegistry: vi.fn(async () => ({
    models: [{ key: "model-1", name: "motor-anomaly", versions: [{ key: "version-1", version: "v1", approvalStatus: "APPROVAL_PENDING", deployable: false }] }],
    source: "fallback",
    featureTrace: "trace",
  })),
  approveModelVersion: vi.fn(),
  rejectModelVersion: vi.fn(),
}));

vi.mock("./api/auditApi", () => ({
  loadAuditEvents: vi.fn(async () => ({
    events: [{ eventId: "audit-1", type: "越权下载", target: "dataset-1", actor: "ops.user", obligation: "需要主管审批", highRisk: true, featureTrace: "trace", actionHistory: [{ actionKey: "a1", createdAt: "2026-05-08 10:00", status: "OPEN", operator: "system", note: "待处理" }] }],
    source: "fallback",
  })),
  acknowledgeAuditEvent: vi.fn((event) => ({ ...event, actionHistory: [{ actionKey: "a2", createdAt: "2026-05-08 10:05", status: "ACKNOWLEDGED", operator: "reviewer", note: "已确认" }, ...event.actionHistory] })),
  silenceAuditEvent: vi.fn((event) => ({ ...event, actionHistory: [{ actionKey: "a3", createdAt: "2026-05-08 10:06", status: "SILENCED", operator: "reviewer", note: "已静默" }, ...event.actionHistory] })),
  escalateAuditEvent: vi.fn((event) => ({ ...event, actionHistory: [{ actionKey: "a4", createdAt: "2026-05-08 10:07", status: "ESCALATED", operator: "reviewer", note: "已升级" }, ...event.actionHistory] })),
}));

vi.mock("./api/identityApi", () => ({
  loadIdentity: vi.fn(async () => ({
    source: "fallback",
    user: {
      displayName: "平台管理员",
      username: "local.admin",
      organization: "YFind",
      authMethod: "Password",
      iamProvider: "Local IAM",
      permissions: ["dataset:read", "training:submit", "audit:read", "model:approve"],
    },
    session: {
      loginStatus: "ACTIVE",
      authTicket: "ticket-local-001",
      approver: "security.admin",
      lastLoginAt: "2026-05-08 09:30",
    },
    permissionMap: {
      identity: "audit:read",
      dataset: "dataset:read",
      training: "training:submit",
      model: "model:approve",
      governance: "audit:read",
    },
    approvalRequests: [{ requestId: "req-1", requestedRoleLabel: "训练管理员", submittedBy: "ops.user", reason: "训练问题排查", status: "PENDING" }],
  })),
  approveBackendIdentityRequest: vi.fn(),
  approveIdentityRequest: vi.fn(() => ({ request: { requestedRoleLabel: "训练管理员" } })),
  loginWithApprovedAuthorization: vi.fn(),
  restoreIdentitySession: vi.fn(),
  signOutIdentitySession: vi.fn(),
  loginWithPassword: vi.fn(async () => undefined),
  createBackendIdentityApprovalRequest: vi.fn(async () => ({ requestedRoleLabel: "训练管理员" })),
  createIdentityApprovalRequest: vi.fn(() => ({ requestedRoleLabel: "训练管理员" })),
}));

import { App } from "./App";

beforeEach(() => {
  window.localStorage.clear();
});

describe("训练平台控制台", () => {
  it("默认展示真实业务导航", async () => {
    render(<App />);
    expect(screen.getByText("YFind 训练平台")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "平台总览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "权限与会话" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "数据准备" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "训练任务" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "治理中心" })).toBeInTheDocument();
  });

  it("可以从总览页打开上传数据集弹窗", async () => {
    const user = userEvent.setup();
    render(<App />);
    const uploadAction = await screen.findByText("上传新数据集");
    await user.click(uploadAction.closest("button") as HTMLElement);
    expect(await screen.findByRole("dialog", { name: "上传数据集" })).toBeInTheDocument();
  });

  it("可以进入训练页并打开新建训练任务弹窗", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "训练任务" }));
    expect(await screen.findByRole("heading", { name: "训练任务" })).toBeInTheDocument();
    const createAction = await screen.findByText("新建训练任务");
    await user.click(createAction.closest("button") as HTMLElement);
    expect(await screen.findByRole("dialog", { name: "新建训练任务" })).toBeInTheDocument();
    expect(screen.getByText("选择训练数据与模板")).toBeInTheDocument();
  });

  it("可以进入治理中心查看审计事件", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "治理中心" }));
    expect(await screen.findByRole("heading", { name: "治理中心" })).toBeInTheDocument();
    const queueTitle = await screen.findByText("审计事件队列");
    const queueCard = queueTitle.closest(".ant-card");
    expect(queueCard).not.toBeNull();
    expect(within(queueCard as HTMLElement).getByText("越权下载")).toBeInTheDocument();
  });
});

describe("TASK-dataset-preparation-pipeline", () => {
  it("AC-01 AC-02 AC-05 AC-07 展示独立重做的数据准备工作台、阻断原因和重跑入口", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "数据准备" }));
    expect(await screen.findByRole("heading", { name: "数据准备流水线工作台" })).toBeInTheDocument();
    expect(screen.getByText("独立工作台")).toBeInTheDocument();
    expect(screen.getByText(/不再沿用原数据资产列表页/)).toBeInTheDocument();
    expect(screen.getByText("TASK-dataset-preparation-pipeline")).toBeInTheDocument();
    expect(screen.getByText("平台内置覆盖数据收集、清洗、标注、划分、预处理、增强、格式转换与加载 7 个训练前步骤；失败即阻断，人工修正后重跑。")).toBeInTheDocument();
    expect(screen.queryByText("数据集列表")).not.toBeInTheDocument();
    expect(screen.getByText("阻断原因：标注一致性低于阈值")).toBeInTheDocument();
    expect(screen.getByText(/PAI_DLC_DATA_LOADER/)).toBeInTheDocument();
    for (const stage of ["数据收集", "数据清洗", "数据标注", "数据划分", "数据预处理", "数据增强", "格式转换与加载"]) {
      expect(screen.getAllByText(new RegExp(stage)).length).toBeGreaterThan(0);
    }

    await user.click(screen.getByRole("button", { name: "人工修正后重跑" }));
    expect(await screen.findByText("数据准备阶段已人工修正并重跑通过")).toBeInTheDocument();
  });
});
