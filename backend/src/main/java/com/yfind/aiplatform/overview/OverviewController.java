package com.yfind.aiplatform.overview;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OverviewController {
  @GetMapping("/api/overview")
  public OverviewResponse overview() {
    return new OverviewResponse(List.of(
      new OverviewNode("identity", "组织登录", "CONNECTED", "/api/auth/me", "TASK-identity-org-permission"),
      new OverviewNode("dataset", "数据上传", "CONNECTED", "/api/datasets", "TASK-dataset-asset-mvp"),
      new OverviewNode("labeling", "标注复核", "CONNECTED", "/api/labeling-tasks", "TASK-labeling-workflow-integration"),
      new OverviewNode("training", "启动训练", "CONNECTED", "/api/training-jobs", "TASK-training-job-mvp"),
      new OverviewNode("model", "模型注册", "CONNECTED", "/api/models", "TASK-model-registry-mvp"),
      new OverviewNode("inference", "推理发布", "CONNECTED", "/api/inference-services", "TASK-inference-service-integration"),
      new OverviewNode("edge", "边缘下发", "CONNECTED", "/api/edge-nodes", "TASK-edge-dispatch-integration"),
      new OverviewNode("monitoring", "监控审计", "CONNECTED", "/api/audit/events", "TASK-identity-org-permission")
    ), "TASK-platform-overview-integration");
  }
}