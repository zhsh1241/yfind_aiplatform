package com.yfind.aiplatform.labeling;

import java.util.List;

public record LabelingTaskListResponse(List<LabelingTaskSummary> items, String featureTrace) {}