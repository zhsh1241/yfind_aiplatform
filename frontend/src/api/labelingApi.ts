import { getSimulatedLabelingTasks } from "../simulationStore";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";
const AUTH_HEADERS = { Authorization: "Bearer LOCAL_DEV_TOKEN", "X-Platform-Permissions": "labeling:read,labeling:manage" };

export type LabelingReviewRecord = {
  reviewKey: string;
  status: "REVIEWING" | "APPROVED" | "CHANGES_REQUESTED" | "DELIVERED";
  operator: string;
  note: string;
  createdAt: string;
  deliveredItems: number;
};

export type LabelingTaskView = {
  taskKey: string;
  name: string;
  datasetKey: string;
  status: string;
  totalItems: number;
  completedItems: number;
  qualityScore: number;
  assignee: string;
  permission: string;
  releaseHistory: LabelingReviewRecord[];
};

function makeReviewRecord(partial?: Partial<LabelingReviewRecord>): LabelingReviewRecord {
  return {
    reviewKey: partial?.reviewKey ?? `label-review-${Date.now()}`,
    status: partial?.status ?? "REVIEWING",
    operator: partial?.operator ?? "quality.reviewer",
    note: partial?.note ?? "等待质检复核结论",
    createdAt: partial?.createdAt ?? new Date().toLocaleString("zh-CN"),
    deliveredItems: partial?.deliveredItems ?? 0,
  };
}

const fallbackTasks: LabelingTaskView[] = [
  {
    taskKey: "fallback-label-welding",
    name: "焊点外观缺陷复核",
    datasetKey: "welding-vision",
    status: "REVIEWING",
    totalItems: 8920,
    completedItems: 6410,
    qualityScore: 96.2,
    assignee: "质检组",
    permission: "labeling:read",
    releaseHistory: [
      makeReviewRecord({
        reviewKey: "label-review-fallback",
        status: "REVIEWING",
        note: "当前仍在复核中，待班组确认抽检结果",
        deliveredItems: 6410,
      }),
    ],
  },
];

export async function loadLabelingTasks(): Promise<{ tasks: LabelingTaskView[]; source: "backend" | "fallback"; featureTrace: string }> {
  const simulated = getSimulatedLabelingTasks();
  try {
    const response = await fetch(`${API_BASE_URL}/api/labeling-tasks`, { headers: AUTH_HEADERS });
    if (!response.ok) throw new Error(`标注任务 API 请求失败：${response.status}`);
    const body = (await response.json()) as { items: Array<Omit<LabelingTaskView, "releaseHistory">>; featureTrace: string };
    const tasks = body.items.map((item) => ({
      ...item,
      releaseHistory: [
        makeReviewRecord({
          reviewKey: `label-review-${item.taskKey}`,
          status: item.status === "APPROVED" ? "APPROVED" : "REVIEWING",
          note: item.status === "APPROVED" ? "来自后端 API 的已通过复核结果" : "来自后端 API 的当前复核队列",
          deliveredItems: item.completedItems,
        }),
      ],
    }));
    return { tasks: simulated.length > 0 ? simulated : tasks, source: "backend", featureTrace: body.featureTrace };
  } catch (error) {
    console.warn("标注任务后端不可用，已回退到本地 fallback 数据。", error);
    return { tasks: simulated.length > 0 ? simulated : fallbackTasks, source: "fallback", featureTrace: "TASK-platform-integrated-runtime" };
  }
}

export async function approveLabelingTask(taskKey: string) {
  const response = await fetch(`${API_BASE_URL}/api/labeling-tasks/${taskKey}/approve`, { method: "POST", headers: AUTH_HEADERS });
  if (!response.ok) throw new Error(`标注审批 API 请求失败：${response.status}`);
  return (await response.json()) as { taskKey: string; status: string; featureTrace: string };
}

export function approveLabelingTaskSimulation(task: LabelingTaskView): LabelingTaskView {
  return {
    ...task,
    status: "APPROVED",
    completedItems: task.totalItems,
    releaseHistory: [
      makeReviewRecord({
        status: "APPROVED",
        note: "质检复核通过，可进入交付阶段",
        deliveredItems: task.totalItems,
      }),
      ...task.releaseHistory,
    ],
  };
}

export function requestLabelingChangesSimulation(task: LabelingTaskView): LabelingTaskView {
  const fallbackCompleted = Math.max(0, task.completedItems - Math.min(200, task.completedItems));
  return {
    ...task,
    status: "CHANGES_REQUESTED",
    completedItems: fallbackCompleted,
    releaseHistory: [
      makeReviewRecord({
        status: "CHANGES_REQUESTED",
        note: "抽检存在缺陷，已退回补标",
        deliveredItems: fallbackCompleted,
      }),
      ...task.releaseHistory,
    ],
  };
}

export function deliverLabelingTaskSimulation(task: LabelingTaskView): LabelingTaskView {
  return {
    ...task,
    status: "DELIVERED",
    completedItems: task.totalItems,
    releaseHistory: [
      makeReviewRecord({
        status: "DELIVERED",
        note: "标注批次已交付下游训练环节",
        deliveredItems: task.totalItems,
      }),
      ...task.releaseHistory,
    ],
  };
}
