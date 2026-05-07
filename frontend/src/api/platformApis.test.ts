import { afterEach, describe, expect, it, vi } from "vitest";
import { loadAuditEvents } from "./auditApi";
import { loadDatasets } from "./datasetApi";
import { loadEdgeNodes } from "./edgeApi";
import { loadIdentity } from "./identityApi";
import { loadInferenceServices } from "./inferenceApi";
import { loadLabelingTasks } from "./labelingApi";
import { loadOverview } from "./overviewApi";
import { loadPlatformStatus } from "./platformStatusApi";
import { loadTraining } from "./trainingApi";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) } as Response);
}

describe("TASK-platform-frontend-backend-integration 其它页面 API 接入", () => {
  afterEach(() => vi.restoreAllMocks());

  it("数据资产页映射后端数据集详情并保留本地缺省数据", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockReturnValueOnce(jsonResponse({ featureTrace: "TASK-dataset-asset-mvp", items: [{ key: "bearing-audio" }] }))
      .mockReturnValueOnce(jsonResponse({
        key: "bearing-audio", name: "轴承异响音频集", owner: "设备组", status: "PROCESSING", previewType: "FILE", canView: true, canDownloadLatestVersion: false,
        versions: [{ versionKey: "bearing-audio-v1", sampleCount: 6200, canDownload: false, dedupStrategy: "WARN_DUPLICATE", processingStatus: "RUNNING" }],
        sampleFiles: [{ fileName: "bearing-001.wav", contentType: "audio/wav" }], featureTrace: "TASK-dataset-asset-mvp",
      })));

    const result = await loadDatasets();

    expect(result.source).toBe("backend");
    expect(result.datasets.some((dataset) => dataset.key === "bearing-audio")).toBe(true);
    expect(result.datasets.some((dataset) => dataset.key === "welding-vision")).toBe(true);
  });

  it("训练页拉取训练任务详情与模板", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockReturnValueOnce(jsonResponse({ featureTrace: "TASK-training-job-mvp", items: [{ jobKey: "train-bearing-v1" }] }))
      .mockReturnValueOnce(jsonResponse({
        jobKey: "train-bearing-v1", name: "轴承缺陷检测 v1", datasetKey: "motor-thermal", datasetVersionKey: "motor-thermal-v3", templateKey: "small-cnn-vision", status: "RUNNING", accelerator: "GPU", progress: 72, queueStatus: "SUBMITTED_TO_ADAPTER",
        artifacts: [{ uri: "TODO_CONFIRM_MODEL_ARTIFACT_URI/train-bearing-v1", status: "AVAILABLE" }], metrics: [{ epoch: 1, loss: 0.4, accuracy: 0.9 }], featureTrace: "TASK-training-job-mvp",
      }))
      .mockReturnValueOnce(jsonResponse([{ templateKey: "small-cnn-vision", name: "小样本视觉缺陷检测", framework: "PyTorch", accelerator: "GPU", description: "模板" }])));

    const result = await loadTraining();

    expect(result.source).toBe("backend");
    expect(result.jobs[0].artifact).toContain("train-bearing-v1");
    expect(result.templates).toContain("小样本视觉缺陷检测");
  });

  it("组织权限页拉取当前用户和权限定义", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockReturnValueOnce(jsonResponse({ username: "local.admin", displayName: "本地平台管理员", organization: { name: "YFI 智造中心（本地占位）" }, authMethod: "LOCAL_DEV_PRINCIPAL", iamProvider: "TODO_CONFIRM_IAM_PROVIDER", permissions: ["dataset:manage"], featureTrace: "TASK-identity-org-permission" }))
      .mockReturnValueOnce(jsonResponse([{ key: "dataset:manage", module: "dataset", action: "manage", description: "管理数据资产", highRisk: true }]))
      .mockReturnValueOnce(jsonResponse({ items: [], featureTrace: "TASK-identity-org-permission" })));

    const result = await loadIdentity();

    expect(result.source).toBe("backend");
    expect(result.user.username).toBe("local.admin");
    expect(result.user.permissions).toContain("dataset:manage");
  });

  it("监控审计页拉取审计事件", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(jsonResponse([{ eventId: "audit-login-local-admin", type: "LOGIN", actor: "local.admin", target: "YFI-LOCAL", result: "SUCCESS", highRisk: false, obligation: "记录登录来源", featureTrace: "TASK-identity-org-permission" }])));

    const result = await loadAuditEvents();

    expect(result.source).toBe("backend");
    expect(result.events[0].type).toBe("LOGIN");
  });

  it("通用页面拉取平台健康状态作为后端接入信号", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(jsonResponse({ status: "UP", service: "yfind-aiplatform-backend", feature: "TASK-platform-architecture-baseline" })));

    const result = await loadPlatformStatus();

    expect(result.source).toBe("backend");
    expect(result.status).toBe("UP");
  });

  it("平台总览拉取全链路模块 API 接入状态", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(jsonResponse({ featureTrace: "TASK-platform-overview-integration", nodes: [{ key: "inference", label: "推理发布", status: "CONNECTED", apiPath: "/api/inference-services", featureTrace: "TASK-inference-service-integration" }] })));

    const result = await loadOverview();

    expect(result.source).toBe("backend");
    expect(result.nodes[0].apiPath).toBe("/api/inference-services");
  });

  it("推理服务页拉取服务和指标", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(jsonResponse({ featureTrace: "TASK-inference-service-integration", items: [{ serviceKey: "svc", serviceName: "轴承缺陷检测在线服务", modelKey: "bearing-defect-detector", versionKey: "bearing-defect-detector-v1", status: "RUNNING", replicas: 2, trafficPercent: 100, endpoint: "https://TODO_CONFIRM_INFERENCE_GATEWAY/svc", metrics: [{ label: "14:00", qps: 93, latencyMs: 128, successRate: 99.9 }] }] })));

    const result = await loadInferenceServices();

    expect(result.source).toBe("backend");
    expect(result.services[0].metrics[0].latency).toBe(128);
  });

  it("标注任务页拉取标注队列", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(jsonResponse({ featureTrace: "TASK-labeling-workflow-integration", items: [{ taskKey: "label-welding-v2", name: "焊点外观缺陷复核", datasetKey: "welding-vision", status: "REVIEWING", totalItems: 100, completedItems: 60, qualityScore: 96.2, assignee: "质检组", permission: "labeling:read" }] })));

    const result = await loadLabelingTasks();

    expect(result.source).toBe("backend");
    expect(result.tasks[0].taskKey).toBe("label-welding-v2");
  });

  it("边缘下发页拉取边缘节点", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(jsonResponse({ featureTrace: "TASK-edge-dispatch-integration", items: [{ nodeKey: "edge-suzhou-line-01", name: "苏州一号线边缘盒", plant: "苏州工厂", status: "ONLINE", modelVersionKey: "bearing-defect-detector-v1", packageVersion: 7, lastSyncAt: "2026-05-06T08:40:00+08:00", permission: "edge:read" }] })));

    const result = await loadEdgeNodes();

    expect(result.source).toBe("backend");
    expect(result.nodes[0].status).toBe("ONLINE");
  });
});
