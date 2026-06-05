package com.yf.smp.app.platform;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

record ModelEvaluationRunResponse(
    String evaluationRunId,
    String modelId,
    String modelName,
    String versionId,
    String versionNo,
    String datasetId,
    String datasetName,
    String datasetVersionId,
    String datasetVersionName,
    String taskType,
    String status,
    Map<String, Object> metricConfig,
    Map<String, Object> thresholdConfig,
    Map<String, Object> resultSummary,
    String reportSummary,
    String executorType,
    String externalRunId,
    String ownerUserId,
    String ownerOrgId,
    String tenantId,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    OffsetDateTime completedAt
) {
}

record ModelEvaluationMetricResponse(
    String metricId,
    String evaluationRunId,
    String metricName,
    double metricValue,
    Double thresholdValue,
    boolean passed,
    String category,
    OffsetDateTime createdAt
) {
}

record ModelEvaluationArtifactResponse(
    String artifactId,
    String evaluationRunId,
    String artifactType,
    String fileObjectId,
    String name,
    String downloadPolicy,
    OffsetDateTime createdAt
) {
}

record ModelEvaluationDetailResponse(
    ModelEvaluationRunResponse run,
    List<ModelEvaluationMetricResponse> metrics,
    List<ModelEvaluationArtifactResponse> artifacts,
    Map<String, Object> curveData,
    Map<String, Object> confusionMatrix,
    List<Object> errorCases
) {
}

record ModelEvaluationCreateRequest(
    String modelId,
    String versionId,
    String datasetVersionId,
    String taskType,
    Map<String, Object> metricConfig,
    Map<String, Object> thresholdConfig,
    String executorType,
    String notes
) {
}

record ModelEvaluationResultImportRequest(
    Map<String, Object> metricResults,
    String reportSummary,
    Map<String, Object> curveData,
    Map<String, Object> confusionMatrix,
    List<Object> errorCases,
    List<ModelEvaluationArtifactInput> artifacts,
    String externalRunId
) {
}

record ModelEvaluationArtifactInput(
    String artifactType,
    String fileObjectId,
    String name
) {
}

record ModelEvaluationCompareResponse(
    String modelId,
    List<String> versionIds,
    List<ModelEvaluationCompareMetricRow> rows
) {
}

record ModelEvaluationCompareMetricRow(
    String metricName,
    List<ModelEvaluationCompareMetricValue> values
) {
}

record ModelEvaluationCompareMetricValue(
    String versionId,
    String versionNo,
    String evaluationRunId,
    String status,
    Double value,
    boolean best
) {
}

record ModelEvaluationArtifactDownloadResponse(
    String artifactId,
    String downloadUrl,
    int expiresInSeconds,
    String diagnostic
) {
}
