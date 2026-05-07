package com.yfind.aiplatform.identity;

import java.time.Instant;

public record IdentityMutationEvent(
    String type,
    String requestId,
    String requestedRole,
    String reason,
    String status,
    String submittedBy,
    String approvedBy,
    Instant occurredAt
) {}
