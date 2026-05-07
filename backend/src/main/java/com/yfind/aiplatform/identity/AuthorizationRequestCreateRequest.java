package com.yfind.aiplatform.identity;

public record AuthorizationRequestCreateRequest(
    String requestedRole,
    String reason
) {}
