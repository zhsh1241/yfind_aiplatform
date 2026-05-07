import { authHeaders } from "./authSession";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

type TrainingJobListResponse = { items: TrainingJobSummaryResponse[]; featureTrace: string };
type TrainingJobSummaryResponse = { jobKey: string; name: string; datasetKey: string; templateKey: string; status: string; accelerator: string; progress: number; permission: string; featureTrace: string };
type TrainingJobDetailResponse = TrainingJobSummaryResponse & {
  datasetVersionKey: string; queueStatus: string; artifacts: Array<{ uri: string; status: string }>; metrics: Array<{ epoch: number; loss: number; accuracy: number }>;
};
type TrainingTemplateResponse = { templateKey: string; name: string; framework: string; accelerator: string; description: string };

export type TrainingJobView = { key: string; name: string; dataset: string; template: string; status: string; queueStatus: string; accelerator: string; progress: number; artifact: string };
export type TrainingLoadResult = { jobs: TrainingJobView[]; templates: string[]; metricPoints: Array<{ epoch: number; loss: number; accuracy: number }>; source: "backend" | "fallback" };

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: await authHeaders() });
  if (!response.ok) throw new Error(`训练 API 请求失败：${response.status}`);
  return await response.json() as T;
}

export async function loadTraining(): Promise<TrainingLoadResult> {
  const list = await requestJson<TrainingJobListResponse>("/api/training-jobs");
  const details = await Promise.all(list.items.map((item) => requestJson<TrainingJobDetailResponse>(`/api/training-jobs/${item.jobKey}`)));
  const templates = await requestJson<TrainingTemplateResponse[]>("/api/training-jobs/templates");
  return {
    source: "backend",
    jobs: details.map((job) => ({
      key: job.jobKey,
      name: job.name,
      dataset: `${job.datasetKey} / ${job.datasetVersionKey}`,
      template: job.templateKey,
      status: job.status,
      queueStatus: job.queueStatus,
      accelerator: `${job.accelerator}${job.accelerator.includes("GPU") ? " x1" : ""}`,
      progress: job.progress,
      artifact: job.artifacts[0]?.uri ?? "TODO_CONFIRM_MODEL_ARTIFACT_URI",
    })),
    templates: templates.map((template) => template.name),
    metricPoints: details[0]?.metrics.map((metric) => ({ epoch: metric.epoch, loss: metric.loss, accuracy: Math.round(metric.accuracy * 100) })) ?? [],
  };
}

export type CreateTrainingJobPayload = {
  datasetVersion: string;
  templateKey: string;
  cpuCores: number;
  gpuCards: number;
  npuCards: number;
};

export function createTrainingJobSimulation(payload: CreateTrainingJobPayload) {
  const nowKey = `train-local-${Date.now()}`;
  return {
    key: nowKey,
    name: `本地训练任务 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`,
    dataset: payload.datasetVersion,
    template: payload.templateKey,
    status: "QUEUED",
    queueStatus: "SUBMITTED_TO_ADAPTER",
    accelerator: `CPU ${payload.cpuCores} 核 / GPU ${payload.gpuCards} 卡 / NPU ${payload.npuCards} 卡`,
    progress: 5,
    artifact: `local://artifacts/${nowKey}`,
  } satisfies TrainingJobView;
}
