package com.yf.smp.app.platform;

import java.time.OffsetDateTime;
import java.util.List;

record PlatformUser(
    String id,
    String username,
    String passwordHash,
    String displayName,
    String email,
    String tenantId,
    String tenantName,
    String buCode,
    String status,
    String authType,
    int failedLoginCount,
    OffsetDateTime lockedUntil,
    int sessionVersion,
    OffsetDateTime lastLoginAt
) {
}

record PlatformSession(String accessToken, String refreshToken, String userId, int sessionVersion, OffsetDateTime expiresAt, OffsetDateTime revokedAt) {
}

record PlatformPrincipal(PlatformUser user, PlatformSession session, List<String> roles, List<String> roleNames, List<String> permissions, List<String> menuPermissions) {
    boolean hasPermission(String permission) {
        return permissions.contains(permission);
    }

    boolean isSuperAdmin() {
        return roles.contains("SUPER_ADMIN");
    }

    boolean isBuAdmin() {
        return roles.contains("BU_ADMIN");
    }
}
