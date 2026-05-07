import type { AuditEventView } from "./api/auditApi";
import type { EdgeNodeView } from "./api/edgeApi";
import type { LabelingTaskView } from "./api/labelingApi";
import type { Dataset } from "./prototype-data";
import { frontendUser, type ModuleKey } from "./prototype-data";
import type { InferenceServiceView } from "./api/inferenceApi";
import type { TrainingJobView } from "./api/trainingApi";

const DATASET_KEY = "yfi.sim.datasets";
const TRAINING_KEY = "yfi.sim.trainingJobs";
const INFERENCE_KEY = "yfi.sim.inferenceServices";
const EDGE_KEY = "yfi.sim.edgeNodes";
const LABELING_KEY = "yfi.sim.labelingTasks";
const AUDIT_KEY = "yfi.sim.auditEvents";
const IDENTITY_KEY = "yfi.sim.identity";
const IDENTITY_WORKFLOW_KEY = "yfi.sim.identityWorkflow";

export const SIMULATION_EVENTS = {
  dataset: "yfi:sim:dataset",
  training: "yfi:sim:training",
  inference: "yfi:sim:inference",
  edge: "yfi:sim:edge",
  labeling: "yfi:sim:labeling",
  audit: "yfi:sim:audit",
  identity: "yfi:sim:identity",
} as const;

type SimulatedIdentity = typeof frontendUser;
export type IdentityProfileKey = "admin" | "reviewer";
export type IdentityApprovalRequest = {
  requestId: string;
  requestedRole: IdentityProfileKey;
  requestedRoleLabel: string;
  reason: string;
  status: "PENDING" | "APPROVED";
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
};
export type IdentitySessionState = {
  loginStatus: "ACTIVE" | "PENDING" | "SIGNED_OUT";
  authTicket: string;
  lastLoginAt: string;
  expiresAt: string;
  approver: string;
};
export type IdentityWorkflowState = {
  requests: IdentityApprovalRequest[];
  session: IdentitySessionState;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T, eventName: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(eventName));
}

export function getSimulatedDatasets() {
  return readJson<Dataset[]>(DATASET_KEY, []);
}

export function upsertSimulatedDataset(dataset: Dataset) {
  const current = getSimulatedDatasets();
  const next = [dataset, ...current.filter((item) => item.key !== dataset.key)];
  writeJson(DATASET_KEY, next, SIMULATION_EVENTS.dataset);
}

export function markDatasetDownloadGranted(datasetKey: string) {
  const current = getSimulatedDatasets();
  const next = current.map((item) => (item.key === datasetKey ? { ...item, canDownloadLatestVersion: true } : item));
  writeJson(DATASET_KEY, next, SIMULATION_EVENTS.dataset);
}

export function getSimulatedTrainingJobs() {
  return readJson<TrainingJobView[]>(TRAINING_KEY, []);
}

export function addSimulatedTrainingJob(job: TrainingJobView) {
  const current = getSimulatedTrainingJobs();
  writeJson(TRAINING_KEY, [job, ...current.filter((item) => item.key !== job.key)], SIMULATION_EVENTS.training);
}

export function getSimulatedInferenceServices() {
  return readJson<InferenceServiceView[]>(INFERENCE_KEY, []);
}

export function setSimulatedInferenceService(service: InferenceServiceView) {
  const current = getSimulatedInferenceServices();
  writeJson(INFERENCE_KEY, [service, ...current.filter((item) => item.serviceKey !== service.serviceKey)], SIMULATION_EVENTS.inference);
}

export function getSimulatedEdgeNodes() {
  return readJson<EdgeNodeView[]>(EDGE_KEY, []);
}

export function setSimulatedEdgeNode(node: EdgeNodeView) {
  const current = getSimulatedEdgeNodes();
  writeJson(EDGE_KEY, [node, ...current.filter((item) => item.nodeKey !== node.nodeKey)], SIMULATION_EVENTS.edge);
}

export function getSimulatedLabelingTasks() {
  return readJson<LabelingTaskView[]>(LABELING_KEY, []);
}

export function setSimulatedLabelingTask(task: LabelingTaskView) {
  const current = getSimulatedLabelingTasks();
  writeJson(LABELING_KEY, [task, ...current.filter((item) => item.taskKey !== task.taskKey)], SIMULATION_EVENTS.labeling);
}

export function getSimulatedAuditEvents() {
  return readJson<AuditEventView[]>(AUDIT_KEY, []);
}

export function setSimulatedAuditEvent(event: AuditEventView) {
  const current = getSimulatedAuditEvents();
  writeJson(AUDIT_KEY, [event, ...current.filter((item) => item.eventId !== event.eventId)], SIMULATION_EVENTS.audit);
}

export function getSimulatedIdentity() {
  return readJson<SimulatedIdentity>(IDENTITY_KEY, frontendUser);
}

export function setSimulatedIdentity(profile: SimulatedIdentity) {
  writeJson(IDENTITY_KEY, profile, SIMULATION_EVENTS.identity);
}

function makeDefaultSessionState(): IdentitySessionState {
  return {
    loginStatus: "ACTIVE",
    authTicket: "AUTH-LOCAL-READY",
    lastLoginAt: "2026-05-07 09:00",
    expiresAt: "2026-05-07 21:00",
    approver: "IAM 自动放行",
  };
}

export function getSimulatedIdentityWorkflow() {
  return readJson<IdentityWorkflowState>(IDENTITY_WORKFLOW_KEY, {
    requests: [],
    session: makeDefaultSessionState(),
  });
}

export function setSimulatedIdentityWorkflow(workflow: IdentityWorkflowState) {
  writeJson(IDENTITY_WORKFLOW_KEY, workflow, SIMULATION_EVENTS.identity);
}

export function makeOperatorProfile(profileKey: IdentityProfileKey): SimulatedIdentity {
  if (profileKey === "reviewer") {
    return {
      username: "quality.reviewer",
      displayName: "质检复核员",
      organization: "YFI 智造中心（本地占位）",
      authMethod: "LOCAL_DEV_PRINCIPAL",
      iamProvider: "LOCAL_SIMULATED_IDENTITY",
      permissions: ["dataset:manage", "labeling:manage", "audit:read", "model:manage"],
    };
  }

  return {
    ...frontendUser,
    iamProvider: "LOCAL_SIMULATED_IDENTITY",
  };
}

export function hasPermission(moduleKey: ModuleKey, permissions: string[], permissionMap: Record<ModuleKey, string>) {
  return permissions.includes(permissionMap[moduleKey]);
}
