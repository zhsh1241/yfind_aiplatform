package com.yfind.aiplatform.permission;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class PermissionService {

  private static final Set<PlatformPermission> LOCAL_ADMIN_PERMISSIONS = EnumSet.allOf(PlatformPermission.class);

  public List<PermissionDefinition> definitions() {
    return Arrays.stream(PlatformPermission.values()).map(PlatformPermission::toDefinition).toList();
  }

  public List<String> localAdminPermissionKeys() {
    return LOCAL_ADMIN_PERMISSIONS.stream().map(PlatformPermission::key).sorted().toList();
  }

  public PermissionCheckResponse check(String permissionKey) {
    return PlatformPermission.fromKey(permissionKey)
      .map(permission -> new PermissionCheckResponse(
        permissionKey,
        true,
        LOCAL_ADMIN_PERMISSIONS.contains(permission),
        LOCAL_ADMIN_PERMISSIONS.contains(permission) ? "ALLOW" : "DENY",
        LOCAL_ADMIN_PERMISSIONS.contains(permission) ? "本地开发管理员拥有该 MVP 权限" : "当前主体缺少该权限",
        "TASK-identity-org-permission"
      ))
      .orElseGet(() -> new PermissionCheckResponse(
        permissionKey,
        false,
        false,
        "DENY",
        "未知权限默认拒绝，并应写入高风险访问审计",
        "TASK-identity-org-permission"
      ));
  }
}
