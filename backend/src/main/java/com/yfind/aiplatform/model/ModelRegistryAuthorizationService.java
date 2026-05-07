package com.yfind.aiplatform.model;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import com.yfind.aiplatform.permission.PermissionService;

@Service
public class ModelRegistryAuthorizationService {

  public static final String LOCAL_DEV_TOKEN = "LOCAL_DEV_TOKEN";

  private final PermissionService permissionService;

  public ModelRegistryAuthorizationService(PermissionService permissionService) {
    this.permissionService = permissionService;
  }

  public void require(String authorizationHeader, String permissionHeader, String requiredPermission) {
    if (authorizationHeader == null || !authorizationHeader.equals("Bearer " + LOCAL_DEV_TOKEN)) {
      throw new ModelRegistryUnauthorizedException("模型仓库 API 需要有效 Authorization: Bearer LOCAL_DEV_TOKEN");
    }
    Set<String> grantedPermissions = resolveGrantedPermissions(permissionHeader);
    if (!grantedPermissions.contains(requiredPermission)) {
      throw new ModelRegistryForbiddenException("当前主体缺少模型仓库权限: " + requiredPermission);
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