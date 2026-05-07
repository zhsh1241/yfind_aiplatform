const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

type PlatformHealthResponse = {
  status: string;
  service: string;
  feature: string;
};

export type PlatformStatus = PlatformHealthResponse & { source: "backend" | "fallback" };

export async function loadPlatformStatus(): Promise<PlatformStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) throw new Error(`平台健康检查请求失败：${response.status}`);
    const health = await response.json() as PlatformHealthResponse;
    return { ...health, source: "backend" };
  } catch (error) {
    console.warn("平台后端健康检查不可用，已回退到本地运行状态。", error);
    return { status: "DEMO", service: "local-fallback", feature: "TASK-platform-integrated-runtime", source: "fallback" };
  }
}