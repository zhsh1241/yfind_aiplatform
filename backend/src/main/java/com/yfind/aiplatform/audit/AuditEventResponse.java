package com.yfind.aiplatform.audit;

public record AuditEventResponse(
    String eventId,
    String type,
    String actor,
    String target,
    String result,
    boolean highRisk,
    String obligation,
    String featureTrace
) {}
