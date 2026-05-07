package com.yfind.aiplatform.model;

import java.util.List;

public record ModelVersionSummary(
    String versionKey,
    String versionName,
    String trainingJobKey,
    String artifactUri,
    String checksum,
    String status,
    String approvalStatus,
    boolean deployable,
    List<ModelMetricSummary> metrics,
    String createdAt,
    String approvedBy,
    String rejectReason
) {}