package com.yfind.aiplatform.labeling;

import com.yfind.aiplatform.training.TrainingAuthorizationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/labeling-tasks")
public class LabelingController {
  private final LabelingService labelingService;
  private final TrainingAuthorizationService authorizationService;

  public LabelingController(LabelingService labelingService, TrainingAuthorizationService authorizationService) {
    this.labelingService = labelingService;
    this.authorizationService = authorizationService;
  }

  @GetMapping
  public LabelingTaskListResponse list(@RequestHeader(value = "Authorization", required = false) String authorization, @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, "labeling:read");
    return labelingService.list();
  }

  @PostMapping("/{taskKey}/approve")
  public LabelingActionResponse approve(@PathVariable String taskKey, @RequestHeader(value = "Authorization", required = false) String authorization, @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, "labeling:manage");
    return labelingService.approve(taskKey);
  }
}