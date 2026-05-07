package com.yfind.aiplatform.training;

public record TrainingJobActionResponse(
    String jobKey,
    String status,
    String queueStatus,
    String adapterSubmissionId,
    String featureTrace
) {}
