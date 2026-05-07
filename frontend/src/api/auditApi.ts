import { getSimulatedAuditEvents } from "../simulationStore";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

export type AuditActionRecord = {
  actionKey: string;
  status: "OPEN" | "ACKNOWLEDGED" | "SILENCED" | "ESCALATED" | "RESOLVED";
  operator: string;
  note: string;
  createdAt: string;
};

export type AuditEventView = {
  eventId: string;
  type: string;
  actor: string;
  target: string;
  result: string;
  highRisk: boolean;
  obligation: string;
  featureTrace: string;
  actionHistory: AuditActionRecord[];
};

function makeAuditAction(partial?: Partial<AuditActionRecord>): AuditActionRecord {
  return {
    actionKey: partial?.actionKey ?? `audit-action-${Date.now()}`,
    status: partial?.status ?? "OPEN",
    operator: partial?.operator ?? "ops.oncall",
    note: partial?.note ?? "待值班人确认告警。",
    createdAt: partial?.createdAt ?? new Date().toLocaleString("zh-CN"),
  };
}

const fallbackEvents: AuditEventView[] = [
  {
    eventId: "fallback-training-alert",
    type: "训练失败告警",
    actor: "system",
    target: "training",
    result: "WARN",
    highRisk: false,
    obligation: "查看指标、日志、Trace ID 和审计上下文。",
    featureTrace: "TASK-platform-integrated-runtime",
    actionHistory: [makeAuditAction({ actionKey: "audit-action-training-open", status: "OPEN", note: "待值班人确认训练失败原因。" })],
  },
  {
    eventId: "fallback-permission-audit",
    type: "权限变更审计",
    actor: "local.admin",
    target: "permission",
    result: "PENDING_REAL_STORAGE",
    highRisk: true,
    obligation: "权限变更需保留审计。",
    featureTrace: "TASK-platform-integrated-runtime",
    actionHistory: [makeAuditAction({ actionKey: "audit-action-permission-open", status: "OPEN", note: "高风险权限变更待审计确认。" })],
  },
];

export async function loadAuditEvents(): Promise<{ events: AuditEventView[]; source: "backend" | "fallback" }> {
  const simulated = getSimulatedAuditEvents();
  try {
    const response = await fetch(`${API_BASE_URL}/api/audit/events`);
    if (!response.ok) throw new Error(`审计 API 请求失败：${response.status}`);
    const body = (await response.json()) as Array<Omit<AuditEventView, "actionHistory">>;
    const events = body.map((event) => ({
      ...event,
      actionHistory: [
        makeAuditAction({
          actionKey: `audit-action-${event.eventId}`,
          status: "OPEN",
          note: "来自后端 API 的当前告警事件。",
        }),
      ],
    }));
    return { events: simulated.length > 0 ? simulated : events, source: "backend" };
  } catch (error) {
    console.warn("审计后端不可用，已回退到本地 fallback 数据。", error);
    return { source: "fallback", events: simulated.length > 0 ? simulated : fallbackEvents };
  }
}

export function acknowledgeAuditEvent(event: AuditEventView): AuditEventView {
  return {
    ...event,
    actionHistory: [
      makeAuditAction({ status: "ACKNOWLEDGED", note: "值班人已确认并接手处置。" }),
      ...event.actionHistory,
    ],
  };
}

export function silenceAuditEvent(event: AuditEventView): AuditEventView {
  return {
    ...event,
    actionHistory: [
      makeAuditAction({ status: "SILENCED", note: "已进入静默窗口，等待下个巡检周期。" }),
      ...event.actionHistory,
    ],
  };
}

export function escalateAuditEvent(event: AuditEventView): AuditEventView {
  return {
    ...event,
    highRisk: true,
    actionHistory: [
      makeAuditAction({ status: "ESCALATED", note: "已升级给平台主管和值班负责人。" }),
      ...event.actionHistory,
    ],
  };
}
