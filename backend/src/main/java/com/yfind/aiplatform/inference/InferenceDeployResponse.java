package com.yfind.aiplatform.inference;

public record InferenceDeployResponse(String serviceKey, String status, String endpoint, String featureTrace) {}