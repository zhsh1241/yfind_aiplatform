package com.yfind.aiplatform.dataset;

import java.util.List;

public final class DatasetPreparationDtos {
  private DatasetPreparationDtos() {}

  public static final String FEATURE_TRACE = "TASK-dataset-preparation-pipeline";

  public record PreparationJobListResponse(List<PreparationJobSummary> items, String featureTrace) {}
  public record PreparationJobSummary(String jobId, String datasetKey, String datasetName, String status, String currentStage, int progressPercent, boolean blocked, String blockedReason, int qualityScore, int rerunCount, String outputSnapshotKey, String featureTrace) {}
  public record PreparationJobDetailResponse(String jobId, String datasetKey, String datasetName, String owner, String status, String currentStage, int progressPercent, SourceConfig sourceConfig, RuleSnapshot ruleSnapshot, QualityGate qualityGate, List<StageSummary> stages, OutputSnapshot outputSnapshot, List<RerunRecord> rerunRecords, List<AuditEvent> auditTrail, String featureTrace) {}
  public record SourceConfig(String sourceType, String sourceName, String uri, String complianceNote) {}
  public record RuleSnapshot(String cleaningPolicy, String splitRatio, String preprocessPolicy, String augmentationPolicy, String targetFormat) {}
  public record QualityGate(int minQualityScore, double minLabelAgreement, double maxDuplicateRate) {}
  public record StageSummary(String stageKey, String stageName, String status, int qualityScore, boolean gatePassed, String message, String startedAt, String finishedAt) {}
  public record OutputSnapshot(String snapshotKey, String trainVersionKey, String loaderType, String manifestUri, int trainSplitCount, int validationSplitCount, int testSplitCount, boolean readyForTraining) {}
  public record RerunRecord(String rerunId, String stageKey, String operator, String reason, String createdAt) {}
  public record AuditEvent(String eventType, String actor, String summary, String createdAt) {}
  public record CreatePreparationJobRequest(String datasetKey, String sourceType, String sourceName, String sourceUri, String splitRatio, String targetFormat, Integer minQualityScore, Double minLabelAgreement, Double maxDuplicateRate, String operator) {}
  public record PreparationJobActionResponse(String jobId, String datasetKey, String status, String currentStage, boolean blocked, String blockedReason, String nextAction, int rerunCount, StageResult stageResult, String featureTrace) {}
  public record StageResult(String stageKey, String status, int qualityScore, boolean gatePassed, String message) {}
  public record RunStageRequest(String operator, Integer qualityScoreOverride, Double labelAgreementOverride, Double duplicateRateOverride) {}
  public record RerunBlockedStageRequest(String operator, String reason, Integer qualityScoreOverride, Double labelAgreementOverride, Double duplicateRateOverride) {}
  public record TrainingDatasetArtifactResponse(String artifactKey, String datasetKey, String preparationJobKey, String snapshotVersion, String artifactStatus, String loaderType, String manifestUri, int trainSplitCount, int validationSplitCount, int testSplitCount, boolean readyForTraining, String featureTrace) {}
}