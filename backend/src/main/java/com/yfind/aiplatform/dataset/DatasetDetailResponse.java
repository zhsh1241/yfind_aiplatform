package com.yfind.aiplatform.dataset;

import java.util.List;

public record DatasetDetailResponse(
  String key,
  String name,
  String owner,
  String status,
  String description,
  String previewType,
  boolean canView,
  boolean canManage,
  boolean canDownloadLatestVersion,
  List<String> tags,
  List<DatasetVersionSummary> versions,
  List<DatasetFileSummary> sampleFiles,
  List<DatasetAccessRequestSummary> accessRequests,
  List<DatasetProcessingJobSummary> processingJobs,
  String featureTrace
) {}
