package com.yfind.aiplatform.training;

public record TrainingTemplateSummary(
    String templateKey,
    String name,
    String framework,
    String accelerator,
    String description
) {}
