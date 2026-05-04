package com.yfind.aiplatform.dataset;

public record DatasetAccessRequestActionResponse(
  String requestId,
  String status,
  String versionKey,
  boolean downloadGranted,
  String featureTrace
) {}
