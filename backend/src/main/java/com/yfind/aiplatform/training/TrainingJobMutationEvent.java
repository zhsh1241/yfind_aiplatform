package com.yfind.aiplatform.training;

public record TrainingJobMutationEvent(
  String type,
  String jobKey,
  String name,
  String datasetKey,
  String datasetVersionKey,
  String templateKey,
  String accelerator,
  int cpuCores,
  int gpuCount,
  int npuCount,
  int maxEpochs,
  String adapterSubmissionId,
  String occurredAt
) {
  public static TrainingJobMutationEvent created(String jobKey, TrainingJobCreateRequest request, String adapterSubmissionId, String occurredAt) {
    return new TrainingJobMutationEvent("CREATED", jobKey, request.name(), request.datasetKey(), request.datasetVersionKey(), request.templateKey(), request.accelerator(), request.cpuCores(), request.gpuCount(), request.npuCount(), request.maxEpochs(), adapterSubmissionId, occurredAt);
  }

  public static TrainingJobMutationEvent cancelled(String jobKey, String occurredAt) {
    return new TrainingJobMutationEvent("CANCELLED", jobKey, null, null, null, null, null, 0, 0, 0, 0, null, occurredAt);
  }
}