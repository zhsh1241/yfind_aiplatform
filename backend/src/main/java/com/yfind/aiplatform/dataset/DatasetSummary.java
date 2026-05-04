package com.yfind.aiplatform.dataset;

public record DatasetSummary(
  String key,
  String name,
  String owner,
  String status,
  int sampleCount,
  int versionCount,
  String previewType,
  boolean canView,
  boolean canManage
) {}
