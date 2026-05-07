package com.yfind.aiplatform.training;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/training-jobs")
public class TrainingJobController {

  private final TrainingJobService trainingJobService;
  private final TrainingAuthorizationService authorizationService;

  public TrainingJobController(TrainingJobService trainingJobService, TrainingAuthorizationService authorizationService) {
    this.trainingJobService = trainingJobService;
    this.authorizationService = authorizationService;
  }

  @GetMapping
  public TrainingJobListResponse list(
      @RequestParam(value = "status", required = false) String status,
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, "training:read");
    return trainingJobService.list(status);
  }

  @GetMapping("/{jobKey}")
  public TrainingJobDetailResponse detail(
      @PathVariable String jobKey,
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, "training:read");
    return trainingJobService.detail(jobKey);
  }

  @PostMapping
  public TrainingJobActionResponse create(
      @RequestBody TrainingJobCreateRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, "training:execute");
    return trainingJobService.create(request);
  }

  @PostMapping("/{jobKey}/cancel")
  public TrainingJobActionResponse cancel(
      @PathVariable String jobKey,
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, "training:manage");
    return trainingJobService.cancel(jobKey);
  }

  @GetMapping("/templates")
  public List<TrainingTemplateSummary> templates(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, "training:read");
    return trainingJobService.templates();
  }
}
