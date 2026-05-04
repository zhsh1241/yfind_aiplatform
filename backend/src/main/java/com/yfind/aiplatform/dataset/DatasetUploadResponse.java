package com.yfind.aiplatform.dataset;

public record DatasetUploadResponse(
  String datasetKey,
  String versionKey,
  String dedupStrategy,
  String jobStatus,
  String featureTrace
) {}
