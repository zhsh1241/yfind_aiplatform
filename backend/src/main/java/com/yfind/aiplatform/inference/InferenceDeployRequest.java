package com.yfind.aiplatform.inference;

public record InferenceDeployRequest(String modelKey, String versionKey, int replicas, int trafficPercent) {}