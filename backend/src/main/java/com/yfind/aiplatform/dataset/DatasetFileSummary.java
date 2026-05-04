package com.yfind.aiplatform.dataset;

public record DatasetFileSummary(
  String fileKey,
  String fileName,
  String contentType,
  long sizeBytes,
  String sha256,
  boolean previewAvailable,
  boolean duplicate,
  String previewLabel
) {}
