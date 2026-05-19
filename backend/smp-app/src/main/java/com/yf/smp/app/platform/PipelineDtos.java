package com.yf.smp.app.platform;

import java.time.OffsetDateTime;
import java.util.List;

record PipelineListResponse(List<PipelineSummaryResponse> items, long total, int page, int pageSize) {}
record PipelineSummaryResponse(String pipelineId, String name, String tenantId, String projectId, String status, String currentVersionId, String ownerId, String ownerName, int nodeCount, int runCount, String description, OffsetDateTime updatedAt) {}
record PipelineDetailResponse(PipelineSummaryResponse pipeline, List<PipelineNodeResponse> nodes, List<PipelineEdgeResponse> edges, List<PipelineVariableResponse> variables, List<PipelineVersionResponse> versions, List<PipelineRunSummaryResponse> runs, PipelineValidationResponse validation) {}
record PipelineSaveRequest(String name, String tenantId, String projectId, String description, List<PipelineNodeRequest> nodes, List<PipelineEdgeRequest> edges, List<PipelineVariableRequest> variables) {}
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
record PipelineRunSummaryResponse(String runId, String pipelineId, String versionId, String status, String triggerMode, String diagnosticCode, String diagnosticMessage, String outputDatasetId, Long durationMs, OffsetDateTime startedAt, OffsetDateTime endedAt) {}
record PipelineRunDetailResponse(PipelineRunSummaryResponse run, List<PipelineRunNodeResponse> nodeRuns) {}
record PipelineRunNodeResponse(String nodeRunId, String runId, String nodeId, String operatorName, String status, Long durationMs, String logSummary, String errorCode) {}

record OperatorListResponse(List<OperatorSummaryResponse> items, long total, List<OperatorCategoryResponse> categories, OperatorStatsResponse stats) {}
record OperatorStatsResponse(long total, long builtin, long custom, long published, long submitted) {}
record OperatorCategoryResponse(String category, long count) {}
record OperatorSummaryResponse(String operatorId, String name, String category, String stage, String kind, String status, String description, String beforeExample, String afterExample, long usageCount, long pipelineCount, double errorRate) {}
record OperatorDetailResponse(OperatorSummaryResponse operator, String parameterSchemaJson, String inputSchemaJson, String outputSchemaJson, String endpointMasked, String credentialRefMasked, Integer timeoutSeconds, Integer concurrencyLimit, List<OperatorReviewResponse> reviews) {}
record OperatorCustomRequest(String name, String category, String stage, String description, String parameterSchemaJson, String inputSchemaJson, String outputSchemaJson, String endpoint, String credentialRef, Integer timeoutSeconds, Integer concurrencyLimit) {}
record OperatorReviewRequest(String reason) {}
record OperatorReviewResponse(String reviewId, String operatorId, String submitterId, String reviewerId, String status, String reason, OffsetDateTime submittedAt, OffsetDateTime reviewedAt) {}
