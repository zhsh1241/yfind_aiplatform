package com.yfind.aiplatform.identity;

import java.util.List;

public record AuthPrincipal(
    String userId,
    String username,
    String displayName,
    String organizationCode,
    String organizationName,
    String roleKey,
    String roleName,
    List<String> permissions,
    String token,
    String approvedBy
) {
  public boolean hasPermission(String permission) {
    return permissions.contains(permission);
  }
}
