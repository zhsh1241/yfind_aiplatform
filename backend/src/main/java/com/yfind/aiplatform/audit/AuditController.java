package com.yfind.aiplatform.audit;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuditController {

  @GetMapping("/api/audit/events")
  public List<AuditEventResponse> events() {
    return List.of(
      new AuditEventResponse(
        "audit-login-local-admin",
        "LOGIN",
        "local.admin",
        "YFI-LOCAL",
        "SUCCESS",
        false,
        "记录登录来源、组织、角色与 IAM provider，占位值不得进入生产配置",
        "TASK-identity-org-permission"
      ),
      new AuditEventResponse(
        "audit-role-change-template",
        "ROLE_PERMISSION_CHANGE",
        "platform-admin",
        "role:algorithm-engineer",
        "PENDING_REAL_STORAGE",
        true,
        "角色与权限变更必须记录变更前后权限、审批来源和操作者",
        "TASK-identity-org-permission"
      ),
      new AuditEventResponse(
        "audit-denied-access-template",
        "DENIED_HIGH_RISK_ACCESS",
        "unknown-principal",
        "permission:unknown",
        "DENY",
        true,
        "未知权限或缺失组织映射必须默认拒绝并进入审计",
        "TASK-identity-org-permission"
      )
    );
  }
}
