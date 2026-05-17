package com.yf.smp.app.platform;

import java.time.OffsetDateTime;
import java.util.List;

record OrganizationTreeResponse(List<OrganizationNodeResponse> nodes) {
}

record OrganizationNodeResponse(
    String id,
    String code,
    String name,
    String tenantType,
    String parentId,
    String path,
    String status,
    String timezone,
    String defaultLocale,
    int quotaGpu,
    int quotaStorageTb,
    int apiRateLimitPerDay,
    int userCount,
    int usedGpu,
    List<OrganizationNodeResponse> children
) {
}

record OrganizationRequest(
    String name,
    String code,
    String tenantType,
    String parentId,
    String timezone,
    String defaultLocale,
    Integer quotaGpu,
    Integer quotaStorageTb,
    Integer apiRateLimitPerDay
) {
}

record OrganizationUpdateRequest(
    String name,
    String timezone,
    String defaultLocale,
    Integer quotaGpu,
    Integer quotaStorageTb,
    Integer apiRateLimitPerDay
) {
}

record OrganizationMemberResponse(
    String id,
    String organizationId,
    String organizationName,
    String userId,
    String username,
    String displayName,
    String roleCode,
    String scopeType,
    String scopeId,
    String status,
    OffsetDateTime expiresAt
) {
}

record OrganizationMemberRequest(String userId, String roleCode, String scopeType, String scopeId, OffsetDateTime expiresAt) {
}

record ConfigItemResponse(
    String key,
    String groupName,
    String displayName,
    String valueType,
    List<String> scopeAllowed,
    boolean sensitive,
    String defaultValue,
    String scopeType,
    String scopeId,
    String scopeValue,
    String effectiveValue,
    String inheritedFrom,
    int version,
    String status
) {
}

record ConfigUpdateRequest(String scopeType, String scopeId, String value, String reason) {
}

record ConfigEffectiveResponse(String key, String value, String inheritedFrom, boolean sensitive) {
}

record FileObjectResponse(
    String fileId,
    String assetType,
    String tenantId,
    String projectId,
    String bucket,
    String objectKey,
    String expectedSha256,
    String sha256,
    Long expectedSizeBytes,
    Long sizeBytes,
    String contentType,
    String storageTier,
    String status,
    String ownerId,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
}

record FileInitRequest(String assetType, String tenantId, String projectId, String filename, String expectedSha256, Long expectedSizeBytes, String contentType, String storageTier) {
}

record FileCompleteRequest(String sha256, Long sizeBytes) {
}

record FileDownloadResponse(String fileId, String status, String downloadUrl, String diagnostic) {
}

record NotificationChannelResponse(
    String channelId,
    String channelType,
    String scopeType,
    String scopeId,
    String name,
    boolean enabled,
    String configMasked,
    String status,
    String diagnostic,
    OffsetDateTime lastTestAt
) {
}

record NotificationChannelUpdateRequest(Boolean enabled, String configMasked, String diagnostic) {
}

record NotificationTestResponse(String channelId, String result, String diagnostic, OffsetDateTime testedAt) {
}

record ApiKeyResponse(
    String id,
    String name,
    String prefix,
    String maskedKey,
    String plainTextKey,
    String scopeType,
    String scopeId,
    List<String> permissions,
    String status,
    OffsetDateTime expiresAt,
    OffsetDateTime revokedAt,
    OffsetDateTime createdAt,
    OffsetDateTime lastUsedAt
) {
}

record ApiKeyCreateRequest(String name, String scopeType, String scopeId, Integer expiresInDays, List<String> permissions) {
}
