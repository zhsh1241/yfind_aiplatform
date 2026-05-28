package com.yf.smp.app.platform;

import java.time.OffsetDateTime;
import java.util.List;

record PipelineListResponse(List<PipelineSummaryResponse> items, long total, int page, int pageSize) {}
record PipelineSummaryResponse(String pipelineId, String name, String tenantId, String projectId, String status, String currentVersionId, String ownerId, String ownerName, int nodeCount, int runCount, String description, String templateCode, String sourceDatasetId, String sourceVersionId, String sourceDatasetDataType, OffsetDateTime updatedAt) {}
record PipelineDetailResponse(PipelineSummaryResponse pipeline, List<PipelineNodeResponse> nodes, List<PipelineEdgeResponse> edges, List<PipelineVariableResponse> variables, List<PipelineVersionResponse> versions, List<PipelineRunSummaryResponse> runs, PipelineValidationResponse validation) {}
record PipelineSaveRequest(String name, String tenantId, String projectId, String description, String templateCode, String sourceDatasetId, String sourceVersionId, ResultDatasetConfigRequest resultDatasetConfig, List<PipelineNodeRequest> nodes, List<PipelineEdgeRequest> edges, List<PipelineVariableRequest> variables) {}
record PipelineNodeRequest(String nodeId, String operatorId, String label, Integer positionX, Integer positionY, String configJson) {}
record PipelineEdgeRequest(String edgeId, String sourceNodeId, String targetNodeId, String edgeType) {}
record PipelineVariableRequest(String name, String valueType, String valueKind, String valueJson, Boolean required) {}
record PipelineNodeResponse(String nodeId, String operatorId, String operatorName, String label, int positionX, int positionY, String configJson, String status) {}
record PipelineEdgeResponse(String edgeId, String sourceNodeId, String targetNodeId, String edgeType) {}
record PipelineVariableResponse(String name, String valueType, String valueKind, String valueMasked, boolean required) {}
record PipelineVersionRequest(String versionName, String note) {}
record PipelineVersionResponse(String versionId, String pipelineId, String versionName, String note, String dagJson, String createdBy, OffsetDateTime createdAt) {}
record PipelineValidationResponse(boolean valid, String diagnosticCode, String diagnosticMessage, List<PipelineValidationIssue> errors, List<String> warnings) {}
record PipelineValidationIssue(String code, String message, String nodeId, String edgeId) {}
record PipelineRunRequest(String triggerMode, String sampleDatasetId) {}
record PipelineRunSummaryResponse(String runId, String pipelineId, String versionId, String status, String triggerMode, String diagnosticCode, String diagnosticMessage, String outputDatasetId, String resultDatasetStatus, Long durationMs, Long totalCount, Long successCount, Long skippedCount, Long failedCount, OffsetDateTime startedAt, OffsetDateTime endedAt) {}
record PipelineRunDetailResponse(PipelineRunSummaryResponse run, List<PipelineRunNodeResponse> nodeRuns, PreprocessedDatasetPreviewResponse preview, PreprocessedDatasetActivationStateResponse activation, boolean debugMode) {}
record PipelineRunNodeResponse(String nodeRunId, String runId, String nodeId, String operatorName, String status, Long durationMs, String logSummary, String errorCode) {}
record PipelineProcessingTaskCreateRequest(String pipelineId, String sourceDatasetId) {}
record PipelineProcessingTaskListResponse(List<PipelineProcessingTaskSummaryResponse> items, long total, int page, int pageSize) {}
record PipelineProcessingTaskSummaryResponse(String taskId, String pipelineId, String pipelineName, String sourceDatasetId, String sourceDatasetName, String sourceVersionId, String outputDatasetId, String status, String resultDatasetStatus, String diagnosticCode, String diagnosticMessage, Long durationMs, Long totalCount, Long successCount, Long skippedCount, Long failedCount, OffsetDateTime createdAt, OffsetDateTime endedAt) {}

record OperatorListResponse(List<OperatorSummaryResponse> items, long total, List<OperatorCategoryResponse> categories, OperatorStatsResponse stats) {}
record OperatorStatsResponse(long total, long builtin, long custom, long published, long submitted) {}
record OperatorCategoryResponse(String category, long count) {}
record OperatorSummaryResponse(String operatorId, String name, String categoryGroup, String category, String subCategory, String dataType, String stage, String kind, String status, boolean supportsPreview, String enhancementMode, String defaultOutputDatasetDataType, String annotationRiskLevel, String description, String beforeExample, String afterExample, long usageCount, long pipelineCount, double errorRate) {}
record OperatorDetailResponse(OperatorSummaryResponse operator, String parameterSchemaJson, String inputSchemaJson, String outputSchemaJson, String endpointMasked, String credentialRefMasked, Integer timeoutSeconds, Integer concurrencyLimit, VisualOperatorFrozenDefaultsResponse frozenDefaults, String annotationRiskNotice, List<OperatorReviewResponse> reviews) {}
record OperatorCustomRequest(String name, String category, String stage, String description, String parameterSchemaJson, String inputSchemaJson, String outputSchemaJson, String endpoint, String credentialRef, Integer timeoutSeconds, Integer concurrencyLimit) {}
record OperatorReviewRequest(String reason) {}
record OperatorReviewResponse(String reviewId, String operatorId, String submitterId, String reviewerId, String status, String reason, OffsetDateTime submittedAt, OffsetDateTime reviewedAt) {}
record ResultDatasetConfigRequest(String datasetName, String datasetType, String datasetDataType, Boolean autoActivate) {}
record ResultDatasetConfigResponse(String datasetType, String datasetDataType, boolean autoActivate, boolean confirmRequired) {}
record VisualOperatorFrozenDefaultsResponse(Boolean previewWatermarkEnabled, Boolean artifactWatermarkEnabled, Boolean annotationEligibleWhenArtifactWatermarked) {}
record PreviewSamplePairResponse(String beforeExample, String afterExample, String label) {}
record PreprocessedDatasetPreviewResponse(String datasetId, String runId, String pipelineId, String sourceDatasetId, String sourceVersionId, String status, String datasetDataType, boolean previewWatermarkApplied, boolean artifactWatermarkApplied, boolean artifactWatermarkBlocksAnnotation, String enhancementMode, String frameExtractionMode, long totalCount, long successCount, long skippedCount, long failedCount, List<PreviewSamplePairResponse> samplePairs, List<String> warnings, List<String> failedReasons, List<String> skippedReasons, String processParamsJson, String operatorChainJson) {}
record PreprocessedDatasetConfirmRequest(String decision, String comment) {}
record PreprocessedDatasetActivateRequest(String targetVersionId, String activationNote) {}
record PreprocessedDatasetActivationStateResponse(String datasetId, String status, boolean confirmed, boolean annotationEligible, String blockReason, String targetVersionId, OffsetDateTime confirmedAt, OffsetDateTime activatedAt) {}
