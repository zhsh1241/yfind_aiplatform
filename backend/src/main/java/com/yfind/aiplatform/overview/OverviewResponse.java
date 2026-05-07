package com.yfind.aiplatform.overview;

import java.util.List;

public record OverviewResponse(List<OverviewNode> nodes, String featureTrace) {}