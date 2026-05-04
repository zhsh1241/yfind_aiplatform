package com.yfind.aiplatform.dataset;

public record DatasetVersionSummary(
  String versionKey,
  String versionLabel,
  String status,
  int fileCount,
  int sampleCount,
  boolean canDownload,
  String dedupStrategy,
  String processingStatus
) {}
