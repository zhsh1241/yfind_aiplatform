package com.yfind.aiplatform.inference;

import java.util.List;

public record InferenceServiceSummary(
  String serviceKey,
  String serviceName,
  String modelKey,
  String versionKey,
  String status,
  int replicas,
  int trafficPercent,
  String endpoint,
  String permission,
  List<InferenceMetricPoint> metrics
) {}