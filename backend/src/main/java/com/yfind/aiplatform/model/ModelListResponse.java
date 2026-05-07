package com.yfind.aiplatform.model;

import java.util.List;

public record ModelListResponse(
    List<ModelSummary> items,
    String featureTrace
) {}