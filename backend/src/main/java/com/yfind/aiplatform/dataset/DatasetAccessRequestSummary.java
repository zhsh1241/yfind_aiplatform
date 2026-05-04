package com.yfind.aiplatform.dataset;

public record DatasetAccessRequestSummary(
  String requestId,
  String requester,
  String datasetKey,
  String versionKey,
  String status,
  String reason,
  String approvedBy
) {}
