package com.yfind.aiplatform.edge;

import java.util.List;

public record EdgeNodeListResponse(List<EdgeNodeSummary> items, String featureTrace) {}