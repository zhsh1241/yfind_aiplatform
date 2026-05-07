package com.yfind.aiplatform.inference;

public record InferenceMetricPoint(String label, int qps, int latencyMs, double successRate) {}