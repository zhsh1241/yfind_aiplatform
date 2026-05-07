package com.yfind.aiplatform.labeling;

public record LabelingMutationEvent(String type, String taskKey) {
  public static LabelingMutationEvent approved(String taskKey) { return new LabelingMutationEvent("APPROVED", taskKey); }
}