import { flowNodes } from "../prototype-data";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

export type OverviewNodeView = { key: string; label: string; status: string; apiPath: string; featureTrace: string };

export async function loadOverview(): Promise<{ nodes: OverviewNodeView[]; source: "backend" | "fallback"; featureTrace: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/overview`);
    if (!response.ok) throw new Error(`平台总览 API 请求失败：${response.status}`);
    const body = await response.json() as { nodes: OverviewNodeView[]; featureTrace: string };
    return { nodes: body.nodes, source: "backend", featureTrace: body.featureTrace };
  } catch (error) {
    console.warn("平台总览后端不可用，已回退到本地 fallback 数据。", error);
    return { nodes: flowNodes.map((label, index) => ({ key: `fallback-${index}`, label, status: "DEMO", apiPath: "local://overview", featureTrace: "TASK-platform-integrated-runtime" })), source: "fallback", featureTrace: "TASK-platform-integrated-runtime" };
  }
}