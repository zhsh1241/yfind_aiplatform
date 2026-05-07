package com.yfind.aiplatform.edge;

public record EdgeNodeSummary(String nodeKey, String name, String plant, String status, String modelVersionKey, int packageVersion, String lastSyncAt, String permission) {}