package com.yfind.aiplatform.training;

public record TrainingLogEntry(
    String timestamp,
    String level,
    String message
) {}
