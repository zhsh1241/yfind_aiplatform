package com.yfind.aiplatform.identity;

import java.util.List;
import org.springframework.stereotype.Service;
import com.yfind.aiplatform.organization.OrganizationSummary;
import com.yfind.aiplatform.permission.PermissionService;

@Service
public class LocalIdentityService {

  private static final String FEATURE_TRACE = "TASK-identity-org-permission";
  private final PermissionService permissionService;

  public LocalIdentityService(PermissionService permissionService) {
    this.permissionService = permissionService;
  }

  public AuthStatusResponse status() {
    return new AuthStatusResponse(
      true,
      "LOCAL_DEV_PRINCIPAL",
      "local-dev-profile",
      "TODO_CONFIRM_IAM_PROVIDER",
      "TODO_CONFIRM_SSO_ISSUER",
      FEATURE_TRACE
    );
  }

  public CurrentUserResponse currentUser() {
    return new CurrentUserResponse(
      "local-admin",
      "local.admin",
      "本地平台管理员",
      currentOrganization(),
      List.of(
        new RoleSummary("platform-admin", "平台管理员", "本地开发/测试管理员角色，禁止直接作为生产角色"),
        new RoleSummary("algorithm-engineer", "算法工程师", "可执行训练、模型与推理 MVP 操作")
      ),
      permissionService.localAdminPermissionKeys(),
      "LOCAL_DEV_PRINCIPAL",
      "TODO_CONFIRM_IAM_PROVIDER",
      FEATURE_TRACE
    );
  }

  public OrganizationSummary currentOrganization() {
    return new OrganizationSummary(
      "org-yfi-local",
      "YFI-LOCAL",
      "YFI 智造中心（本地占位）",
      "tenant",
      null
    );
  }
}
