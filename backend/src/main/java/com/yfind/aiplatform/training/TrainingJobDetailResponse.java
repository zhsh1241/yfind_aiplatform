package com.yfind.aiplatform.training;

import java.util.List;

public record TrainingJobDetailResponse(
    String jobKey,
    String name,
    String datasetKey,
    String datasetVersionKey,
    String templateKey,
    String status,
    String accelerator,
    int cpuCores,
    int gpuCount,
    int npuCount,
    int maxEpochs,
    String queueStatus,
    String adapterSubmissionId,
    List<TrainingMetricSnapshot> metrics,
    List<TrainingArtifactSummary> artifacts,
    List<TrainingLogEntry> logs,
    String featureTrace
) {}
