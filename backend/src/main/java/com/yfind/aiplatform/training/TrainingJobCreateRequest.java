package com.yfind.aiplatform.training;

public record TrainingJobCreateRequest(
    String name,
    String datasetKey,
    String datasetVersionKey,
    String templateKey,
    String accelerator,
    int cpuCores,
    int gpuCount,
    int npuCount,
    int maxEpochs
) {}
