import { inferenceMetrics } from "../prototype-data";
import { getSimulatedInferenceServices } from "../simulationStore";
import { authHeaders } from "./authSession";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

export type InferenceMetricView = { label: string; qps: number; latency: number; success: number };
export type InferenceReleaseRecord = {
  releaseKey: string;
  versionKey: string;
  stage: "CANARY" | "FULL" | "ROLLED_BACK";
  status: "DEPLOYING" | "HEALTHY" | "ROLLED_BACK";
  replicas: number;
  trafficPercent: number;
  window: string;
  createdAt: string;
  operator: string;
  note: string;
};
export type InferenceDeployFormValue = { replicas: number; trafficPercent: number; window: string; note: string };
export type InferenceServiceView = {
  serviceKey: string;
  serviceName: string;
  modelKey: string;
  versionKey: string;
  status: string;
  replicas: number;
  trafficPercent: number;
  endpoint: string;
  metrics: InferenceMetricView[];
  releaseHistory: InferenceReleaseRecord[];
};

type InferenceServiceResponse = {
  serviceKey: string;
  serviceName: string;
  modelKey: string;
  versionKey: string;
  status: string;
  replicas: number;
  trafficPercent: number;
  endpoint: string;
  metrics: Array<{ label: string; qps: number; latencyMs: number; successRate: number }>;
};
type InferenceListResponse = { items: InferenceServiceResponse[]; featureTrace: string };

function makeReleaseRecord(partial?: Partial<InferenceReleaseRecord>): InferenceReleaseRecord {
  return {
    releaseKey: partial?.releaseKey ?? `release-${Date.now()}`,
    versionKey: partial?.versionKey ?? "bearing-defect-detector-v1",
    stage: partial?.stage ?? "CANARY",
    status: partial?.status ?? "DEPLOYING",
    replicas: partial?.replicas ?? 2,
    trafficPercent: partial?.trafficPercent ?? 10,
    window: partial?.window ?? "今日 18:00 灰度窗口",
    createdAt: partial?.createdAt ?? new Date().toLocaleString("zh-CN"),
    operator: partial?.operator ?? "local.admin",
    note: partial?.note ?? "控制台发起本地部署模拟",
  };
}

function fallbackService(): InferenceServiceView {
  return {
    serviceKey: "fallback-inference",
    serviceName: "本地推理服务",
    modelKey: "bearing-defect-detector",
    versionKey: "bearing-defect-detector-v1",
    status: "DEMO",
    replicas: 1,
    trafficPercent: 100,
    endpoint: "local://inference",
    metrics: inferenceMetrics,
    releaseHistory: [
      makeReleaseRecord({
        releaseKey: "release-fallback-stable",
        stage: "FULL",
        status: "HEALTHY",
        replicas: 1,
        trafficPercent: 100,
        window: "已生效",
        note: "本地稳定版本基线",
      }),
    ],
  };
}

function mapService(item: InferenceServiceResponse): InferenceServiceView {
  return {
    ...item,
    metrics: item.metrics.map((metric) => ({ label: metric.label, qps: metric.qps, latency: metric.latencyMs, success: metric.successRate })),
    releaseHistory: [
      makeReleaseRecord({
        releaseKey: `release-${item.serviceKey}`,
        versionKey: item.versionKey,
        stage: item.trafficPercent >= 100 ? "FULL" : "CANARY",
        status: item.status === "RUNNING" ? "HEALTHY" : "DEPLOYING",
        replicas: item.replicas,
        trafficPercent: item.trafficPercent,
        window: item.trafficPercent >= 100 ? "已全量" : "今日 18:00 灰度窗口",
        note: "来自后端 API 的当前发布态",
      }),
    ],
  };
}

export async function loadInferenceServices(): Promise<{ services: InferenceServiceView[]; source: "backend" | "fallback"; featureTrace: string }> {
  const simulated = getSimulatedInferenceServices();
  try {
    const response = await fetch(`${API_BASE_URL}/api/inference-services`, { headers: await authHeaders() });
    if (!response.ok) throw new Error(`推理服务 API 请求失败：${response.status}`);
    const body = (await response.json()) as InferenceListResponse;
    const backendServices = body.items.map(mapService);
    const merged = simulated.length > 0 ? simulated : backendServices;
    return { services: merged, source: "backend", featureTrace: body.featureTrace };
  } catch (error) {
    console.warn("推理服务后端不可用，已回退到本地 fallback 数据。", error);
    return { services: simulated.length > 0 ? simulated : [fallbackService()], source: "fallback", featureTrace: "TASK-platform-integrated-runtime" };
  }
}

export async function deployDefaultInferenceService(values?: Partial<InferenceDeployFormValue>) {
  const replicas = values?.replicas ?? 2;
  const trafficPercent = values?.trafficPercent ?? 10;
  const response = await fetch(`${API_BASE_URL}/api/inference-services/deployments`, {
    method: "POST",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify({ modelKey: "bearing-defect-detector", versionKey: "bearing-defect-detector-v1", replicas, trafficPercent }),
  });
  if (!response.ok) throw new Error(`推理部署 API 请求失败：${response.status}`);
  return (await response.json()) as { serviceKey: string; status: string; endpoint: string; featureTrace: string };
}

export function createInferenceServiceSimulation(values?: Partial<InferenceDeployFormValue>) {
  const replicas = values?.replicas ?? 2;
  const trafficPercent = values?.trafficPercent ?? 10;
  const window = values?.window ?? "今日 18:00 灰度窗口";
  const note = values?.note?.trim() || "控制台发起本地部署模拟";

  return {
    serviceKey: `inference-local-${Date.now()}`,
    serviceName: "本地推理服务",
    modelKey: "bearing-defect-detector",
    versionKey: "bearing-defect-detector-v1",
    status: "DEPLOYING",
    replicas,
    trafficPercent,
    endpoint: "http://localhost:8080/mock/inference",
    metrics: inferenceMetrics,
    releaseHistory: [
      makeReleaseRecord({
        replicas,
        trafficPercent,
        window,
        note,
      }),
    ],
  } satisfies InferenceServiceView;
}

export function markInferenceServiceHealthy(service: InferenceServiceView): InferenceServiceView {
  const current = service.releaseHistory[0];
  return {
    ...service,
    status: "RUNNING",
    releaseHistory: current
      ? [{ ...current, status: "HEALTHY", stage: current.trafficPercent >= 100 ? "FULL" : "CANARY" }, ...service.releaseHistory.slice(1)]
      : service.releaseHistory,
  };
}

export function shiftInferenceTraffic(service: InferenceServiceView, trafficPercent: number): InferenceServiceView {
  const nextTraffic = Math.max(0, Math.min(100, trafficPercent));
  const current = service.releaseHistory[0];
  return {
    ...service,
    status: nextTraffic >= 100 ? "RUNNING" : service.status,
    trafficPercent: nextTraffic,
    releaseHistory: current
      ? [{ ...current, trafficPercent: nextTraffic, stage: nextTraffic >= 100 ? "FULL" : "CANARY", status: nextTraffic >= 100 ? "HEALTHY" : current.status }, ...service.releaseHistory.slice(1)]
      : service.releaseHistory,
  };
}

export function rollbackInferenceService(service: InferenceServiceView): InferenceServiceView {
  const previousStable = service.releaseHistory.find((item, index) => index > 0 && item.status === "HEALTHY") ??
    makeReleaseRecord({
      releaseKey: "release-fallback-stable",
      stage: "FULL",
      status: "HEALTHY",
      replicas: 1,
      trafficPercent: 100,
      window: "已生效",
      note: "回滚至本地稳定基线",
    });
  const current = service.releaseHistory[0];
  const rolledCurrent = current ? { ...current, status: "ROLLED_BACK" as const, stage: "ROLLED_BACK" as const, trafficPercent: 0 } : undefined;
  return {
    ...service,
    versionKey: previousStable.versionKey,
    status: "ROLLED_BACK",
    replicas: previousStable.replicas,
    trafficPercent: previousStable.trafficPercent,
    releaseHistory: [previousStable, ...(rolledCurrent ? [rolledCurrent] : []), ...service.releaseHistory.slice(1)],
  };
}
