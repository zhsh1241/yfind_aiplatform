package com.yfind.aiplatform.model;

public record ModelRegistryMutationEvent(
  String type,
  String modelKey,
  String versionKey,
  String versionName,
  String trainingJobKey,
  String artifactUri,
  String checksum,
  double accuracy,
  double latencyMs,
  double modelSizeMb
) {
  public static ModelRegistryMutationEvent registered(String modelKey, String versionKey, ModelVersionRegisterRequest request) {
    return new ModelRegistryMutationEvent("REGISTERED", modelKey, versionKey, request.versionName(), request.trainingJobKey(), request.artifactUri(), request.checksum(), request.accuracy(), request.latencyMs(), request.modelSizeMb());
  }

  public static ModelRegistryMutationEvent action(String type, String modelKey, String versionKey) {
    return new ModelRegistryMutationEvent(type, modelKey, versionKey, null, null, null, null, 0, 0, 0);
  }
}