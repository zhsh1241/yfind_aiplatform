package com.yfind.aiplatform.identity;

import java.time.Instant;
import java.util.List;

public record AuthSession(
    String token,
    String userId,
    String username,
    String displayName,
    String organizationCode,
    String organizationName,
    String roleKey,
    String roleName,
    List<String> permissions,
    Instant issuedAt,
    Instant expiresAt,
    String status,
    String approvedBy,
    String featureTrace
) {}
