package com.yfind.aiplatform.edge;

public record EdgeDispatchResponse(String nodeKey, String status, String modelVersionKey, String featureTrace) {}