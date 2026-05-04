package com.yfind.aiplatform.permission;

public record PermissionDefinition(
    String key,
    String module,
    String action,
    String description,
    boolean highRisk
) {}
