package com.yfind.aiplatform.labeling;

public record LabelingTaskSummary(String taskKey, String name, String datasetKey, String status, int totalItems, int completedItems, double qualityScore, String assignee, String permission) {}