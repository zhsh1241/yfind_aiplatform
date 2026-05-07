package com.yfind.aiplatform.model;

public record ModelMetricSummary(
    String metricName,
    double metricValue,
    String metricUnit
) {}