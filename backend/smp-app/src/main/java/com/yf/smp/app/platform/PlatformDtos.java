package com.yf.smp.app.platform;

import java.time.OffsetDateTime;
import java.util.List;

record CurrentUserResponse(
    String id,
    String username,
    String displayName,
    String tenantId,
    String tenantName,
    String buCode,
    String status,
    List<String> roles,
    List<String> roleNames,
    List<String> permissions,
    List<String> menuPermissions,
    int sessionVersion
) {
}

record LoginRequest(String username, String password, String tenantCode) {
}

record LoginResponse(
    String accessToken,
    String refreshToken,
    String tokenType,
    long expiresInSeconds,
    CurrentUserResponse user
) {
}

record CreateUserRequest(String username, String displayName, String email, String tenantId, String buCode, String password) {
}

record UpdateStatusRequest(String status) {
}

record UpdateRolesRequest(List<String> roleCodes) {
}

record PageResponse<T>(List<T> items, long total, int page, int pageSize) {
}

record UserSummary(
    String id,
    String username,
    String displayName,
    String email,
    String tenantId,
    String tenantName,
    String buCode,
    String status,
    String authType,
    List<String> roles,
    List<String> roleNames,
    OffsetDateTime lastLoginAt,
    int failedLoginCount,
    OffsetDateTime lockedUntil,
    int sessionVersion
) {
}

record RoleSummary(String code, String name, String description, String scope, boolean preset, int userCount) {
}

record PermissionSummary(String code, String module, String resource, String action, int level, String description) {
}

record PermissionModule(String name, List<PermissionSummary> permissions) {
}

record PermissionMatrix(List<RoleSummary> roles, List<PermissionModule> modules, List<RolePermissionRow> rows) {
}

record RolePermissionRow(String module, String permissionCode, String permissionName, List<String> allowedRoles) {
}

record AuditLogSummary(
    String id,
    String eventId,
    String tenantId,
    String operatorId,
    String operatorName,
    String operatorRole,
    String action,
    String resourceType,
    String resourceId,
    String result,
    String riskLevel,
    String beforeJson,
    String afterJson,
    String detailJson,
    String traceId,
    String signature,
    OffsetDateTime occurredAt
) {
}

record VerifyAuditResponse(String eventId, boolean valid) {
}

record AuditExportRequest(String format) {
}

record AuditExportResponse(String status, String message) {
}

