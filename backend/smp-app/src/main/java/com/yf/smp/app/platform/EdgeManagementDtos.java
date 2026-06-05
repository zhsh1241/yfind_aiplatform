package com.yf.smp.app.platform;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

record EdgeServerCreateRequest(
    String serverName,
    String location,
    String organizationId,
    String ownerUserId,
    String hostAddress,
    String agentVersion,
    Map<String, Object> hardwareSummary
) {
}

record EdgeServerUpdateRequest(
    String serverName,
    String location,
    String ownerUserId,
    String hostAddress,
    String agentVersion,
    Map<String, Object> hardwareSummary
) {
}

record EdgeHeartbeatRequest(
    String status,
    String agentVersion,
    Map<String, Object> resourceSummary,
    String diagnostic
) {
}

record EdgeDeploymentCreateRequest(
    String edgeServerId,
    String modelId,
    String versionId,
    String strategy,
    OffsetDateTime scheduledAt,
    String notes
) {
}

record EdgeApprovalRequest(String comment) {
}

record EdgeIntegrityVerifyRequest(String receivedSha256, String diagnostic) {
}

record EdgeRollbackRequest(String targetDeploymentId, String reason) {
}

record EdgeServerResponse(
    String edgeServerId,
    String serverName,
    String location,
    String organizationId,
    String ownerUserId,
    String ownerName,
    String hostAddress,
    String agentVersion,
    Map<String, Object> hardwareSummary,
    Map<String, Object> resourceSummary,
    String status,
    String diagnostic,
    String tenantId,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    OffsetDateTime lastHeartbeatAt,
    OffsetDateTime decommissionedAt,
    EdgePermissionSummary permissionSummary
) {
}

record EdgeDeploymentResponse(
    String deploymentId,
    String edgeServerId,
    String edgeServerName,
    String modelId,
    String modelName,
    String versionId,
    String versionNo,
    String artifactFileObjectId,
    String artifactSha256,
    String strategy,
    String status,
    String approvalStatus,
    String requestedBy,
    String approvedBy,
    String executedBy,
    String tenantId,
    String organizationId,
    String diagnostic,
    String failureReason,
    int retryCount,
    OffsetDateTime scheduledAt,
    OffsetDateTime requestedAt,
    OffsetDateTime approvedAt,
    OffsetDateTime executedAt,
    OffsetDateTime verifiedAt,
    OffsetDateTime deployedAt,
    OffsetDateTime rolledBackAt,
    String rollbackTargetDeploymentId,
    EdgePermissionSummary permissionSummary
) {
}

record EdgeDeploymentDetailResponse(
    EdgeDeploymentResponse deployment,
    EdgeServerResponse server,
    List<EdgeDeploymentApprovalResponse> approvals
) {
}

record EdgeDeploymentApprovalResponse(
    String approvalId,
    String deploymentId,
    String approverUserId,
    String decision,
    String comment,
    OffsetDateTime decidedAt
) {
}

record EdgePermissionSummary(
    boolean canRead,
    boolean canWrite,
    boolean canRequestDeployment,
    boolean canApproveDeployment,
    boolean canExecuteDeployment
) {
}
