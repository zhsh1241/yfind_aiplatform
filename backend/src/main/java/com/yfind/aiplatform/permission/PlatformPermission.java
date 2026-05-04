package com.yfind.aiplatform.permission;

import java.util.Arrays;
import java.util.Optional;

public enum PlatformPermission {
  IDENTITY_USER_READ("identity:user:read", "identity", "read", "查看用户与组织成员", false),
  IDENTITY_USER_MANAGE("identity:user:manage", "identity", "manage", "管理用户与组织成员", true),
  IDENTITY_ROLE_READ("identity:role:read", "identity", "read", "查看角色与权限", false),
  IDENTITY_ROLE_MANAGE("identity:role:manage", "identity", "manage", "管理角色与权限", true),
  DATASET_READ("dataset:read", "dataset", "read", "查看数据资产", false),
  DATASET_MANAGE("dataset:manage", "dataset", "manage", "管理数据资产", true),
  LABELING_READ("labeling:read", "labeling", "read", "查看标注任务", false),
  LABELING_MANAGE("labeling:manage", "labeling", "manage", "管理标注任务", true),
  TRAINING_READ("training:read", "training", "read", "查看训练任务", false),
  TRAINING_EXECUTE("training:execute", "training", "execute", "启动训练任务", true),
  TRAINING_MANAGE("training:manage", "training", "manage", "管理训练资源与任务", true),
  MODEL_READ("model:read", "model", "read", "查看模型仓库", false),
  MODEL_MANAGE("model:manage", "model", "manage", "管理模型版本与审批", true),
  INFERENCE_READ("inference:read", "inference", "read", "查看推理服务", false),
  INFERENCE_DEPLOY("inference:deploy", "inference", "deploy", "部署推理服务", true),
  INFERENCE_MANAGE("inference:manage", "inference", "manage", "管理推理服务", true),
  EDGE_READ("edge:read", "edge", "read", "查看边缘节点", false),
  EDGE_DEPLOY("edge:deploy", "edge", "deploy", "下发边缘模型", true),
  EDGE_MANAGE("edge:manage", "edge", "manage", "管理边缘部署", true),
  RESOURCE_READ("resource:read", "resource", "read", "查看资源监控", false),
  RESOURCE_MANAGE("resource:manage", "resource", "manage", "管理平台资源", true),
  AUDIT_READ("audit:read", "audit", "read", "查看审计事件", false);

  private final String key;
  private final String module;
  private final String action;
  private final String description;
  private final boolean highRisk;

  PlatformPermission(String key, String module, String action, String description, boolean highRisk) {
    this.key = key;
    this.module = module;
    this.action = action;
    this.description = description;
    this.highRisk = highRisk;
  }

  public String key() {
    return key;
  }

  public String module() {
    return module;
  }

  public String action() {
    return action;
  }

  public String description() {
    return description;
  }

  public boolean highRisk() {
    return highRisk;
  }

  public PermissionDefinition toDefinition() {
    return new PermissionDefinition(key, module, action, description, highRisk);
  }

  public static Optional<PlatformPermission> fromKey(String key) {
    return Arrays.stream(values()).filter(permission -> permission.key.equals(key)).findFirst();
  }
}
