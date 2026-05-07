import { frontendUser, moduleRequiredPermissions, type ModuleKey } from "../prototype-data";
import {
  getSimulatedIdentity,
  getSimulatedIdentityWorkflow,
  makeOperatorProfile,
  setSimulatedIdentity,
  setSimulatedIdentityWorkflow,
  type IdentityApprovalRequest,
  type IdentityProfileKey,
  type IdentitySessionState,
} from "../simulationStore";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

type CurrentUserResponse = { username: string; displayName: string; organization: { name: string }; authMethod: string; iamProvider: string; permissions: string[]; featureTrace: string };
type PermissionDefinition = { key: string; module: string; action: string; description: string; highRisk: boolean };

type IdentityResult = {
  user: typeof frontendUser;
  permissionMap: Record<ModuleKey, string>;
  source: "backend" | "fallback";
  approvalRequests: IdentityApprovalRequest[];
  session: IdentitySessionState;
};

type IdentityApprovalFormValue = {
  requestedRole: IdentityProfileKey;
  reason: string;
};

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`身份权限 API 请求失败：${response.status}`);
  return await response.json() as T;
}

export async function loadIdentity(): Promise<IdentityResult> {
  const simulatedIdentity = getSimulatedIdentity();
  const workflow = getSimulatedIdentityWorkflow();
  try {
    const [user, permissions] = await Promise.all([requestJson<CurrentUserResponse>("/api/auth/me"), requestJson<PermissionDefinition[]>("/api/auth/permissions")]);
    const availableKeys = new Set(permissions.map((permission) => permission.key));
    return {
      source: "backend",
      user: { ...simulatedIdentity, username: user.username, displayName: user.displayName, organization: user.organization.name, authMethod: user.authMethod, iamProvider: user.iamProvider || simulatedIdentity.iamProvider },
      permissionMap: Object.fromEntries(Object.entries(moduleRequiredPermissions).map(([key, permission]) => [key, availableKeys.has(permission) ? permission : permission])) as Record<ModuleKey, string>,
      approvalRequests: workflow.requests,
      session: workflow.session,
    };
  } catch (error) {
    console.warn("身份权限后端不可用，已回退到本地 fallback 数据。", error);
    return { source: "fallback", user: simulatedIdentity, permissionMap: moduleRequiredPermissions, approvalRequests: workflow.requests, session: workflow.session };
  }
}

export function createIdentityApprovalRequest(values: IdentityApprovalFormValue, currentUserName: string): IdentityApprovalRequest {
  const workflow = getSimulatedIdentityWorkflow();
  const request: IdentityApprovalRequest = {
    requestId: `AUTH-${Date.now()}`,
    requestedRole: values.requestedRole,
    requestedRoleLabel: values.requestedRole === "admin" ? "平台管理员" : "质检复核员",
    reason: values.reason,
    status: "PENDING",
    submittedBy: currentUserName,
    submittedAt: new Date().toLocaleString("zh-CN"),
  };
  setSimulatedIdentityWorkflow({
    ...workflow,
    requests: [request, ...workflow.requests],
    session: {
      ...workflow.session,
      loginStatus: "PENDING",
      authTicket: request.requestId,
      approver: "待审批",
    },
  });
  return request;
}

export function approveIdentityRequest(requestId: string, approverName: string) {
  const workflow = getSimulatedIdentityWorkflow();
  const request = workflow.requests.find((item) => item.requestId === requestId);
  if (!request) return null;

  const approvedAt = new Date().toLocaleString("zh-CN");
  const updatedRequest: IdentityApprovalRequest = {
    ...request,
    status: "APPROVED",
    approvedBy: approverName,
    approvedAt,
  };
  const nextRequests = workflow.requests.map((item) => (item.requestId === requestId ? updatedRequest : item));
  const nextProfile = makeOperatorProfile(request.requestedRole);
  setSimulatedIdentity(nextProfile);
  setSimulatedIdentityWorkflow({
    requests: nextRequests,
    session: {
      loginStatus: "ACTIVE",
      authTicket: requestId,
      lastLoginAt: approvedAt,
      expiresAt: "2026-05-07 21:00",
      approver: approverName,
    },
  });
  return { profile: nextProfile, request: updatedRequest };
}

export function signOutIdentitySession() {
  const workflow = getSimulatedIdentityWorkflow();
  setSimulatedIdentityWorkflow({
    ...workflow,
    session: {
      ...workflow.session,
      loginStatus: "SIGNED_OUT",
      authTicket: "AUTH-LOCAL-SIGNED-OUT",
      approver: "用户主动退出",
    },
  });
}

export function restoreIdentitySession() {
  const workflow = getSimulatedIdentityWorkflow();
  setSimulatedIdentityWorkflow({
    ...workflow,
    session: {
      ...workflow.session,
      loginStatus: "ACTIVE",
      authTicket: "AUTH-LOCAL-RESTORED",
      lastLoginAt: new Date().toLocaleString("zh-CN"),
      expiresAt: "2026-05-07 21:00",
      approver: "本地恢复登录",
    },
  });
}
