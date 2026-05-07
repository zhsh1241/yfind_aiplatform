package com.yfind.aiplatform.model;

import java.util.List;

public record ModelDetailResponse(
    String modelKey,
    String modelName,
    String domain,
    String owner,
    String description,
    String latestVersionKey,
    String deployableVersionKey,
    List<ModelVersionSummary> versions,
    String evalPolicy,
    String approvalPolicy,
    String featureTrace
) {}