package com.yf.smp.app.platform;

import java.time.OffsetDateTime;
import java.util.List;

record DataSourceResponse(String sourceId, String name, String sourceType, String tenantId, String projectId, String endpoint, Integer port, String databaseName, String credentialMode, String secretRefMasked, String sharedScope, String description, String status, OffsetDateTime lastTestAt, String diagnosticCode, String diagnosticMessage, Integer latencyMs, OffsetDateTime updatedAt) {}
record DataSourceRequest(String name, String sourceType, String tenantId, String projectId, String endpoint, Integer port, String databaseName, String credentialMode, String secretRef, String sharedScope, String description) {}
record DataSourceTestResponse(String sourceId, String result, String status, String diagnosticCode, String diagnosticMessage, Integer latencyMs, String traceId, OffsetDateTime testedAt) {}
record DataSourceSyncTaskResponse(String taskId, String sourceId, String sourceName, String targetDatasetId, String targetDatasetName, String name, String scheduleMode, String syncScope, String status, OffsetDateTime lastRunAt, String lastResult, String diagnosticCode, String diagnosticMessage) {}
record DataSourceSyncTaskRequest(String sourceId, String targetDatasetId, String name, String scheduleMode, String syncScope) {}
record DatasetUploadSessionCreateRequest(String name, String tenantId, String datasetType, String dataType, String accessLevel, List<String> tags, String description, String creationMode) {}
record DatasetUploadSessionCommitRequest(Boolean publishRequested) {}
record DatasetUploadProgressResponse(String phase, int percent) {}
record DatasetUploadSummaryResponse(int totalFiles, int acceptedFiles, int rejectedFiles) {}
record DatasetUploadFileResponse(String fileName, String fileId, String status, Long sizeBytes, String contentType, String diagnosticCode, String diagnosticMessage) {}
record DatasetUploadSessionResponse(String sessionId, String datasetId, String versionId, String status, String creationMode, DatasetUploadProgressResponse progress, DatasetUploadSummaryResponse summary, String datasetStatus, String versionStatus, String diagnosticCode, String diagnosticMessage, List<DatasetUploadFileResponse> files) {}
record DatasetSummaryResponse(String datasetId, String name, String datasetType, String dataType, String tenantId, String projectId, String currentVersionId, String currentVersionName, String status, String accessLevel, List<String> tags, long recordCount, long sizeBytes, String ownerId, String ownerName, String description, OffsetDateTime updatedAt) {}
record DatasetStatsResponse(long total, long raw, long preprocessed, long annotated, long restricted, long totalSizeBytes) {}
record DatasetListResponse(List<DatasetSummaryResponse> items, long total, int page, int pageSize, DatasetStatsResponse stats) {}
record DatasetCreateRequest(String name, String datasetType, String dataType, String tenantId, String projectId, String accessLevel, List<String> tags, String description, Long recordCount, String sourceId) {}
record DatasetUpdateRequest(String name, String accessLevel, List<String> tags, String description) {}
record DatasetDetailResponse(DatasetSummaryResponse dataset, List<DatasetVersionResponse> versions, List<DatasetFileResponse> files, List<DatasetAccessGrantResponse> grants, List<DataLineageResponse> lineage, String previewStatus, String previewDiagnostic) {}
record DatasetVersionResponse(String versionId, String datasetId, String versionName, String status, long recordCount, long sizeBytes, String contentSafetyStatus, String diagnosticCode, String diagnosticMessage, OffsetDateTime createdAt, OffsetDateTime publishedAt) {}
record DatasetVersionCreateRequest(String versionName, Long recordCount) {}
record DatasetFileResponse(String id, String datasetId, String versionId, String fileId, String fileRole, String status, String objectKey, String contentType, Long sizeBytes, String sha256) {}
record DatasetFileAttachRequest(String fileId, String fileRole) {}
record DataLineageResponse(String lineageId, String sourceType, String sourceId, String targetType, String targetId, String transformType, OffsetDateTime createdAt) {}
record DatasetAccessRequestCreateRequest(String purpose) {}
record DatasetAccessRequestResponse(String requestId, String datasetId, String requesterId, String requesterName, String purpose, String status, OffsetDateTime createdAt, String reviewedBy, OffsetDateTime reviewedAt) {}
record DatasetAccessReviewRequest(OffsetDateTime expiresAt, String reason) {}
record DatasetAccessGrantResponse(String grantId, String datasetId, String versionId, String userId, String userName, String grantedBy, OffsetDateTime expiresAt, String status) {}
record DatasetReferenceResponse(String datasetId, String versionId, String status, boolean usable, String diagnosticCode, String diagnosticMessage) {}
record DataStandardOverviewResponse(DataStandardStatsResponse stats, List<DataStandardProfileResponse> profiles, List<DataStandardTaskResponse> tasks) {}
record DataStandardStatsResponse(long datasetCount, long profiledCount, long compliantCount, long issueCount, long taskCount) {}
record DataStandardProfileResponse(String datasetId, String datasetName, String datasetType, String dataType, String sourceType, String profileStatus, int qualityScore, int fieldCount, int matchedFieldCount, int issueCount, List<DataStandardFieldResponse> fields) {}
record DataStandardFieldResponse(String sourceField, String standardField, String displayName, String dataType, String unit, boolean required, String mappingStatus, String rule) {}
record DataStandardTaskRequest(String datasetId, String name, String standardProfile, String ruleJson) {}
record DataStandardTaskResponse(String taskId, String sourceDatasetId, String sourceDatasetName, String sourceVersionId, String outputDatasetId, String outputDatasetName, String name, String standardProfile, String status, Integer qualityScoreBefore, Integer qualityScoreAfter, String diagnosticCode, String diagnosticMessage, OffsetDateTime lastRunAt, OffsetDateTime updatedAt) {}

record DataSourceRecord(String sourceId, String name, String sourceType, String tenantId, String projectId, String endpoint, Integer port, String databaseName, String credentialMode, String secretRef, String sharedScope, String description, String status, java.time.OffsetDateTime lastTestAt, String diagnosticCode, String diagnosticMessage, Integer latencyMs, String createdBy, java.time.OffsetDateTime createdAt, java.time.OffsetDateTime updatedAt) {}
