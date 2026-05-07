package com.yfind.aiplatform.model;

public record ModelVersionRegisterRequest(
    String versionName,
    String trainingJobKey,
    String artifactUri,
    String checksum,
    double accuracy,
    int latencyMs,
    double modelSizeMb
) {}