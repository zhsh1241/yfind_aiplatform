package com.yfind.aiplatform.training;

public record TrainingJobSummary(
    String jobKey,
    String name,
    String datasetKey,
    String templateKey,
    String status,
    String accelerator,
    int progress,
    String permission,
    String featureTrace
) {}
