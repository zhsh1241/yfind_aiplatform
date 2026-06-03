package com.yf.smp.app.platform;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

record ModelRegistryListResponse(
    List<ModelSummaryResponse> items,
    long total,
    int page,
    int pageSize
) {
}

record ModelSummaryResponse(
    String modelId,
    String name,
    String description,
    String framework,
    String taskType,
    String inputFormat,
    String outputFormat,
    List<String> tags,
    String scope,
    String source,
    String ownerUserId,
    String ownerOrgId,
    String tenantId,
    String currentVersionId,
    String currentVersionNo,
    String currentVersionStatus,
    String evaluationStatus,
    ModelPermissionSummary permissionSummary,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
}

record ModelDetailResponse(
    String modelId,
    String name,
    String description,
    String framework,
    String taskType,
    String inputFormat,
    String outputFormat,
    String runtimeRequirements,
    List<String> tags,
    String scope,
    String source,
    String ownerUserId,
    String ownerOrgId,
    String tenantId,
    String currentVersionId,
    ModelPermissionSummary permissionSummary,
    List<ModelVersionResponse> versions,
    List<ModelAuditEventResponse> auditEvents,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
}

record ModelVersionResponse(
    String versionId,
    String modelId,
    String versionNo,
    String fileObjectId,
    String fileName,
    String fileExtension,
    long fileSizeBytes,
    String checksum,
    String storageBucket,
    String storageKey,
    String runtimeRequirements,
    Map<String, Object> metricsSummary,
    String securityScanStatus,
    String evaluationStatus,
    String evaluationRecordId,
    String evaluationProof,
    String status,
    int activeDeploymentCount,
    List<ActiveReferenceResponse> activeReferences,
    ModelPermissionSummary permissionSummary,
    boolean downloadAvailable,
    List<String> transitionActions,
    String createdBy,
    OffsetDateTime createdAt
) {
}

record ModelAccessRequestResponse(
    String requestId,
    String modelId,
    String versionId,
    String requesterUserId,
    String requesterOrgId,
    String ownerOrgId,
    String permission,
    String reason,
    String status,
    String reviewComment,
    String reviewedBy,
    OffsetDateTime reviewedAt,
    OffsetDateTime expiresAt
) {
}

record ModelDownloadResponse(
    String modelId,
    String versionId,
    String fileObjectId,
    String downloadUrl,
    int expiresInSeconds,
    String diagnostic
) {
}

record ModelVersionDeleteResponse(
    String versionId,
    boolean deleted,
    boolean blocked,
    List<ActiveReferenceResponse> activeReferences
) {
}

record ModelPermissionSummary(
    boolean canView,
    boolean canDownload,
    boolean canUseForTraining,
    boolean canDeploy,
    boolean canManage,
    boolean canEditModel,
    boolean canCreateVersion,
    boolean canDeleteVersion,
    boolean canApproveAccess
) {
}

record ActiveReferenceResponse(
    String serviceId,
    String serviceName,
    String status
) {
}

record ModelAuditEventResponse(
    String eventId,
    String action,
    String operatorName,
    OffsetDateTime occurredAt,
    String result
) {
}

record ModelCreateRequest(
    String name,
    String description,
    String framework,
    String taskType,
    String inputFormat,
    String outputFormat,
    String runtimeRequirements,
    List<String> tags,
    String scope,
    String source
) {
}

record ModelUpdateRequest(
    String name,
    String description,
    String inputFormat,
    String outputFormat,
    String runtimeRequirements,
    List<String> tags,
    String scope,
    String scopeChangeReason
) {
}

record ModelVersionCreateRequest(
    String versionNo,
    String fileObjectId,
    String runtimeRequirements,
    Map<String, Object> metricsSummary,
    String evaluationStatus,
    String evaluationProof,
    Boolean setAsCurrent
) {
}

record ModelVersionTransitionRequest(
    String targetStatus,
    String reason
) {
}

record ModelAccessRequestCreateRequest(
    String versionId,
    String permission,
    String reason,
    OffsetDateTime expiresAt
) {
}

record ModelAccessReviewRequest(
    String reviewComment,
    OffsetDateTime expiresAt
) {
}
