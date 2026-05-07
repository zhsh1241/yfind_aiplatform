package com.yfind.aiplatform.labeling;

public record LabelingActionResponse(String taskKey, String status, String featureTrace) {}