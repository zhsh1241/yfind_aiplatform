package com.yfind.aiplatform.training;

public record TrainingArtifactSummary(
    String artifactKey,
    String type,
    String uri,
    String checksum,
    String status
) {}
