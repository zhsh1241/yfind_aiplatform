package com.yfind.aiplatform.training;

public record TrainingMetricSnapshot(
    int epoch,
    double loss,
    double accuracy,
    String capturedAt
) {}
