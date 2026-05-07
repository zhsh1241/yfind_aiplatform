package com.yfind.aiplatform.model;

public record ModelSummary(
    String modelKey,
    String modelName,
    String domain,
    String owner,
    String latestVersionKey,
    String approvalStatus,
    boolean deployable,
    String permission,
    String featureTrace
) {}