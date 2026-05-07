package com.yfind.aiplatform.identity;

public record AuthorizationRequestResponse(
    String requestId,
    String requestedRole,
    String requestedRoleLabel,
    String reason,
    String status,
    String submittedBy,
    String submittedAt,
    String approvedBy,
    String approvedAt,
    String featureTrace
) {}
