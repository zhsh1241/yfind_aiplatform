import { authHeaders } from "./authSession";
﻿const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";
export type EdgeDispatchRecord = {
  dispatchKey: string;
  modelVersionKey: string;
  packageVersion: number;
  status: "SYNCING" | "ONLINE" | "ROLLED_BACK";
  channel: "CANARY" | "FULL" | "ROLLBACK";
  window: string;
  operator: string;
  note: string;
  createdAt: string;
};

export type EdgeNodeView = {
  nodeKey: string;
  name: string;
  plant: string;
  status: string;
  modelVersionKey: string;
  packageVersion: number;
  lastSyncAt: string;
  permission: string;
  releaseHistory: EdgeDispatchRecord[];
};

function makeDispatchRecord(partial?: Partial<EdgeDispatchRecord>): EdgeDispatchRecord {
  return {
    dispatchKey: partial?.dispatchKey ?? `edge-dispatch-${Date.now()}`,
    modelVersionKey: partial?.modelVersionKey ?? "bearing-defect-detector-v1",
    packageVersion: partial?.packageVersion ?? 1,
    status: partial?.status ?? "SYNCING",
    channel: partial?.channel ?? "CANARY",
    window: partial?.window ?? "今日 18:00 边缘同步窗口",
    operator: partial?.operator ?? "local.admin",
    note: partial?.note ?? "控制台发起本地下发模拟",
    createdAt: partial?.createdAt ?? new Date().toLocaleString("zh-CN"),
  };
}

const fallbackNodes: EdgeNodeView[] = [
  {
    nodeKey: "fallback-edge",
    name: "本地边缘盒",
    plant: "演示工厂",
    status: "DEMO",
    modelVersionKey: "bearing-defect-detector-v1",
    packageVersion: 1,
    lastSyncAt: "本地时间",
    permission: "edge:read",
    releaseHistory: [
      makeDispatchRecord({
        dispatchKey: "edge-dispatch-fallback-stable",
        packageVersion: 1,
        status: "ONLINE",
        channel: "FULL",
        window: "已生效",
        note: "本地稳定包基线",
      }),
    ],
  },
];

export async function loadEdgeNodes(): Promise<{ nodes: EdgeNodeView[]; source: "backend" | "fallback"; featureTrace: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/edge-nodes`, { headers: await authHeaders() });
    if (!response.ok) throw new Error(`边缘节点 API 请求失败：${response.status}`);
    const body = (await response.json()) as { items: Array<Omit<EdgeNodeView, "releaseHistory">>; featureTrace: string };
    return {
      nodes: body.items.map((item) => ({
        ...item,
        releaseHistory: [
          makeDispatchRecord({
            dispatchKey: `edge-dispatch-${item.nodeKey}`,
            modelVersionKey: item.modelVersionKey,
            packageVersion: item.packageVersion,
            status: item.status === "ONLINE" ? "ONLINE" : "SYNCING",
            channel: item.status === "ONLINE" ? "FULL" : "CANARY",
            window: item.status === "ONLINE" ? "已生效" : "今日 18:00 边缘同步窗口",
            note: "来自后端 API 的当前下发态",
          }),
        ],
      })),
      source: "backend",
      featureTrace: body.featureTrace,
    };
  } catch (error) {
    console.warn("边缘下发后端不可用，已回退到本地 fallback 数据。", error);
    return { nodes: fallbackNodes, source: "fallback", featureTrace: "TASK-platform-integrated-runtime" };
  }
}

export async function dispatchEdgeModel(nodeKey: string, modelVersionKey = "bearing-defect-detector-v1", packageVersion?: number) {
  const response = await fetch(`${API_BASE_URL}/api/edge-nodes/dispatches`, {
    method: "POST",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify({ nodeKey, modelVersionKey, packageVersion }),
  });
  if (!response.ok) throw new Error(`边缘下发 API 请求失败：${response.status}`);
  return (await response.json()) as { nodeKey: string; status: string; modelVersionKey: string; featureTrace: string };
}

export function createEdgeDispatchSimulation(node: EdgeNodeView, partial?: { note?: string; window?: string; modelVersionKey?: string }) {
  const nextPackageVersion = node.packageVersion + 1;
  const modelVersionKey = partial?.modelVersionKey ?? node.modelVersionKey;
  return {
    ...node,
    status: "SYNCING",
    modelVersionKey,
    packageVersion: nextPackageVersion,
    lastSyncAt: new Date().toLocaleString("zh-CN"),
    releaseHistory: [
      makeDispatchRecord({
        modelVersionKey,
        packageVersion: nextPackageVersion,
        status: "SYNCING",
        channel: "CANARY",
        window: partial?.window ?? "今日 18:00 边缘同步窗口",
        note: partial?.note ?? "控制台发起本地下发模拟",
      }),
      ...node.releaseHistory,
    ],
  } satisfies EdgeNodeView;
}

export function markEdgeNodeOnline(node: EdgeNodeView): EdgeNodeView {
  const current = node.releaseHistory[0];
  return {
    ...node,
    status: "ONLINE",
    lastSyncAt: new Date().toLocaleString("zh-CN"),
    releaseHistory: current
      ? [{ ...current, status: "ONLINE", channel: current.packageVersion > 1 ? "FULL" : current.channel }, ...node.releaseHistory.slice(1)]
      : node.releaseHistory,
  };
}

export function rollbackEdgeNode(node: EdgeNodeView): EdgeNodeView {
  const previousStable = node.releaseHistory.find((item, index) => index > 0 && item.status === "ONLINE") ??
    makeDispatchRecord({
      dispatchKey: "edge-dispatch-fallback-stable",
      modelVersionKey: "bearing-defect-detector-v1",
      packageVersion: 1,
      status: "ONLINE",
      channel: "FULL",
      window: "已生效",
      note: "回滚至本地稳定包基线",
    });
  const current = node.releaseHistory[0];
  const rolledCurrent = current ? { ...current, status: "ROLLED_BACK" as const, channel: "ROLLBACK" as const } : undefined;
  return {
    ...node,
    status: "ONLINE",
    modelVersionKey: previousStable.modelVersionKey,
    packageVersion: previousStable.packageVersion,
    lastSyncAt: new Date().toLocaleString("zh-CN"),
    releaseHistory: [previousStable, ...(rolledCurrent ? [rolledCurrent] : []), ...node.releaseHistory.slice(1)],
  };
}
