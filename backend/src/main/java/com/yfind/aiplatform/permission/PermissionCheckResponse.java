package com.yfind.aiplatform.permission;

public record PermissionCheckResponse(
    String permission,
    boolean known,
    boolean granted,
    String decision,
    String reason,
    String featureTrace
) {}
