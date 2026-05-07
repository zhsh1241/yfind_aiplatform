package com.yfind.aiplatform.training;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import com.yfind.aiplatform.permission.PermissionService;

@Service
public class TrainingAuthorizationService {

  public static final String LOCAL_DEV_TOKEN = "LOCAL_DEV_TOKEN";

  private final PermissionService permissionService;

  public TrainingAuthorizationService(PermissionService permissionService) {
    this.permissionService = permissionService;
  }

  public void require(String authorizationHeader, String permissionHeader, String requiredPermission) {
    if (authorizationHeader == null || !authorizationHeader.equals("Bearer " + LOCAL_DEV_TOKEN)) {
      throw new TrainingUnauthorizedException("训练 API 需要有效 Authorization: Bearer LOCAL_DEV_TOKEN");
    }

    Set<String> grantedPermissions = resolveGrantedPermissions(permissionHeader);
    if (!grantedPermissions.contains(requiredPermission)) {
      throw new TrainingForbiddenException("当前主体缺少训练权限: " + requiredPermission);
    }
  }

  private Set<String> resolveGrantedPermissions(String permissionHeader) {
    if (permissionHeader == null || permissionHeader.isBlank()) {
      return Set.copyOf(permissionService.localAdminPermissionKeys());
    }
    return Arrays.stream(permissionHeader.split(","))
      .map(String::trim)
      .filter(value -> !value.isBlank())
      .collect(Collectors.toSet());
  }
}
