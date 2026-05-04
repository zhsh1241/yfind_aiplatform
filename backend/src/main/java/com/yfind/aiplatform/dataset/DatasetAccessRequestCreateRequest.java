package com.yfind.aiplatform.dataset;

public record DatasetAccessRequestCreateRequest(
  String requester,
  String versionKey,
  String reason
) {}
