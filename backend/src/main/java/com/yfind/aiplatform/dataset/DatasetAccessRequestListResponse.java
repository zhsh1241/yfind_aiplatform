package com.yfind.aiplatform.dataset;

import java.util.List;

public record DatasetAccessRequestListResponse(
  List<DatasetAccessRequestSummary> items,
  String featureTrace
) {}
