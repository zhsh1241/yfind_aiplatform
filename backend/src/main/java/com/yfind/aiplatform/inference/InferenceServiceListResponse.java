package com.yfind.aiplatform.inference;

import java.util.List;

public record InferenceServiceListResponse(List<InferenceServiceSummary> items, String featureTrace) {}