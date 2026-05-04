package com.yfind.aiplatform.dataset;

public record DatasetProcessingJobSummary(
  String jobId,
  String jobType,
  String status,
  String dedupStrategy,
  String message
) {}
