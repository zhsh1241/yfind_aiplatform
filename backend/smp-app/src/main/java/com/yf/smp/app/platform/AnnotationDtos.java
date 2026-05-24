package com.yf.smp.app.platform;

import java.time.OffsetDateTime;
import java.util.List;

record AnnotationOverviewResponse(AnnotationStatsResponse stats, List<AnnotationTaskSummaryResponse> tasks, List<AnnotationLabelTemplateResponse> templates) {}
record AnnotationStatsResponse(long total, long inProgress, long pendingReview, long completed, long templates) {}
record AnnotationTaskListResponse(List<AnnotationTaskSummaryResponse> items, long total, int page, int pageSize) {}
record AnnotationUserResponse(String userId, String displayName, String role) {}
record AnnotationTaskSummaryResponse(
    String taskId,
    String name,
    String scene,
    String sceneLabel,
    String sourceDatasetId,
    String sourceDatasetName,
    String templateId,
    String templateName,
    String tenantId,
    String status,
    boolean reviewEnabled,
    boolean prelabelEnabled,
    boolean labelStudioEnabled,
    long totalCount,
    long annotatedCount,
    long reviewedCount,
    Integer qualityScore,
    List<AnnotationUserResponse> assignees,
    OffsetDateTime deadline,
    OffsetDateTime updatedAt
) {}
record AnnotationTaskDetailResponse(
    AnnotationTaskSummaryResponse task,
    List<AnnotationAssignmentResponse> assignments,
    List<AnnotationWorkItemResponse> workItems,
    List<AnnotationReviewItemResponse> reviewItems,
    List<AnnotationPublicationResponse> publications,
    AnnotationExternalBindingResponse externalBinding
) {}
record AnnotationAssignmentResponse(String assignmentId, String taskId, String assigneeId, String assigneeName, String role, String status, String assignedBy, OffsetDateTime assignedAt) {}
record AnnotationLabelTemplateResponse(String templateId, String name, String scene, String labelType, String labelSchemaJson, String labelStudioConfigXml, String status, String tenantId, String createdBy, OffsetDateTime updatedAt) {}
record AnnotationLabelTemplateRequest(String name, String tenantId, String scene, String labelType, String labelSchemaJson, String labelStudioConfigXml) {}
record AnnotationLabelStudioConfigResponse(String templateId, String configXml, String diagnosticCode, String diagnosticMessage) {}
record AnnotationTaskCreateRequest(
    String name,
    String sourceDatasetId,
    String sourceVersionId,
    String templateId,
    String scene,
    Boolean reviewEnabled,
    Boolean prelabelEnabled,
    Boolean labelStudioEnabled,
    String prelabelModelSource,
    Double prelabelConfidence,
    List<String> assigneeIds,
    List<String> reviewerIds,
    OffsetDateTime deadline,
    String note
) {}
record AnnotationTaskAssignRequest(List<String> assigneeIds, List<String> reviewerIds) {}
record AnnotationWorkItemRequest(String annotationJson) {}
record AnnotationReviewRequest(String reason) {}
record AnnotationWorkItemResponse(
    String workItemId,
    String taskId,
    String sampleKey,
    String sampleFileId,
    String annotatorId,
    String annotatorName,
    String status,
    String predictionJson,
    String annotationJson,
    OffsetDateTime submittedAt,
    OffsetDateTime updatedAt
) {}
record AnnotationReviewItemResponse(
    String reviewItemId,
    String workItemId,
    String taskId,
    String taskName,
    String annotatorId,
    String annotatorName,
    String reviewerId,
    String reviewerName,
    String status,
    String reviewComment,
    OffsetDateTime reviewedAt
) {}
record AnnotationPublicationResponse(
    String publicationId,
    String taskId,
    String qualityStatus,
    double coverageRate,
    String formatStatus,
    String diagnosticCode,
    String diagnosticMessage,
    String outputDatasetId,
    String outputVersionId,
    String annotationArtifactFileId,
    String annotationArtifactRole,
    OffsetDateTime publishedAt
) {}
record AnnotationExternalBindingResponse(
    String bindingId,
    String taskId,
    String provider,
    String externalProjectId,
    String externalUrl,
    String externalTaskId,
    String externalTaskUrl,
    String configStatus,
    String lastSyncStatus,
    String diagnosticCode,
    String diagnosticMessage,
    String launchUrl,
    Boolean retryable,
    OffsetDateTime lastSyncAt
) {}

record AnnotationTrainingExportRequest(String format, String optionsJson) {}
record AnnotationTrainingExportResponse(
    String exportId,
    String taskId,
    String format,
    String formatVersion,
    String status,
    String diagnosticCode,
    String diagnosticMessage,
    String fileId,
    String downloadUrl,
    Long sizeBytes,
    Boolean asyncRequired,
    Boolean packageIncludesImages,
    OffsetDateTime requestedAt,
    OffsetDateTime generatedAt,
    OffsetDateTime expiresAt
) {}
record DatasetAnnotationCandidateResponse(
    String datasetId,
    String datasetName,
    String currentVersionId,
    String dataType,
    String status,
    boolean eligible,
    String diagnosticCode,
    String diagnosticMessage,
    List<AnnotationLabelTemplateResponse> templates,
    List<String> supportedFormats
) {}
record DatasetAnnotationTaskResponse(AnnotationTaskSummaryResponse task, List<AnnotationTrainingExportResponse> exports) {}
