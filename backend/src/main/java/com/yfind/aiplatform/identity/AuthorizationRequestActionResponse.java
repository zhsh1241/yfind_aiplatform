package com.yfind.aiplatform.identity;

public record AuthorizationRequestActionResponse(
    String requestId,
    String status,
    String requestedRole,
    String submittedBy,
    String approvedBy,
    String featureTrace
) {}
