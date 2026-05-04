package com.yfind.aiplatform.dataset;

import java.util.List;

public record DatasetListResponse(
  List<DatasetSummary> items,
  String featureTrace
) {}
