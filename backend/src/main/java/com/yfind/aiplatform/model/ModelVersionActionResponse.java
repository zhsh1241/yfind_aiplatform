package com.yfind.aiplatform.model;

public record ModelVersionActionResponse(
    String modelKey,
    String versionKey,
    String status,
    String approvalStatus,
    boolean deployable,
    String featureTrace
) {}