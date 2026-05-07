package com.yfind.aiplatform.inference;

public record InferenceMutationEvent(String type, String serviceKey, String modelKey, String versionKey, int replicas, int trafficPercent) {
  public static InferenceMutationEvent deployed(String serviceKey, InferenceDeployRequest request) {
    return new InferenceMutationEvent("DEPLOYED", serviceKey, request.modelKey(), request.versionKey(), request.replicas(), request.trafficPercent());
  }
}