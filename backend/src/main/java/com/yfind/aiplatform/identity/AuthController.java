package com.yfind.aiplatform.identity;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
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

  @PostMapping("/api/auth/login")
  public AuthLoginResponse login(@RequestBody AuthLoginRequest request) {
    return identityService.login(request);
  }

  @PostMapping("/api/auth/logout")
  public void logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
    identityService.logout(authorization);
  }

  @GetMapping("/api/auth/status")
  public AuthStatusResponse status(@RequestHeader(value = "Authorization", required = false) String authorization) {
    return identityService.status(authorization);
  }

  @GetMapping("/api/auth/me")
  public CurrentUserResponse me(@RequestHeader(value = "Authorization", required = false) String authorization) {
    return identityService.currentUser(authorization);
  }

  @GetMapping("/api/auth/permissions")
  public List<PermissionDefinition> permissions() {
    return permissionService.definitions();
  }

  @GetMapping("/api/auth/check")
  public PermissionCheckResponse check(@RequestParam("permission") String permission, @RequestHeader(value = "Authorization", required = false) String authorization) {
    return identityService.check(authorization, permission);
  }

  @PostMapping("/api/auth/authorization-requests")
  public AuthorizationRequestActionResponse createAuthorizationRequest(
      @RequestBody AuthorizationRequestCreateRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    return identityService.createAuthorizationRequest(authorization, request);
  }

  @GetMapping("/api/auth/authorization-requests")
  public AuthorizationRequestListResponse authorizationRequests(@RequestHeader(value = "Authorization", required = false) String authorization) {
    identityService.requirePermission(authorization, "identity:role:read");
    return identityService.listAuthorizationRequests();
  }

  @PostMapping("/api/auth/authorization-requests/{requestId}/approve")
  public AuthorizationRequestActionResponse approveAuthorizationRequest(
      @PathVariable String requestId,
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    return identityService.approveAuthorizationRequest(authorization, requestId);
  }

  @PostMapping("/api/auth/authorization-requests/{requestId}/login")
  public AuthLoginResponse loginWithApprovedAuthorization(@PathVariable String requestId) {
    return identityService.loginWithApprovedAuthorization(requestId);
  }
}
