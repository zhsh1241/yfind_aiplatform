package com.yfind.aiplatform.identity;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.yfind.aiplatform.permission.PermissionCheckResponse;
import com.yfind.aiplatform.permission.PermissionDefinition;
import com.yfind.aiplatform.permission.PermissionService;

@RestController
public class AuthController {

  private final LocalIdentityService identityService;
  private final PermissionService permissionService;

  public AuthController(LocalIdentityService identityService, PermissionService permissionService) {
    this.identityService = identityService;
    this.permissionService = permissionService;
  }

  @GetMapping("/api/auth/status")
  public AuthStatusResponse status() {
    return identityService.status();
  }

  @GetMapping("/api/auth/me")
  public CurrentUserResponse me() {
    return identityService.currentUser();
  }

  @GetMapping("/api/auth/permissions")
  public List<PermissionDefinition> permissions() {
    return permissionService.definitions();
  }

  @GetMapping("/api/auth/check")
  public PermissionCheckResponse check(@RequestParam("permission") String permission) {
    return permissionService.check(permission);
  }
}
