package com.yfind.aiplatform.training;

import java.util.List;

public record TrainingJobListResponse(
    List<TrainingJobSummary> items,
    String featureTrace
) {}
