package com.yfind.aiplatform.inference;

import com.yfind.aiplatform.training.TrainingAuthorizationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inference-services")
public class InferenceController {
  private final InferenceService inferenceService;
  private final TrainingAuthorizationService authorizationService;

  public InferenceController(InferenceService inferenceService, TrainingAuthorizationService authorizationService) {
    this.inferenceService = inferenceService;
    this.authorizationService = authorizationService;
  }

  @GetMapping
  public InferenceServiceListResponse list(@RequestHeader(value = "Authorization", required = false) String authorization, @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, "inference:read");
    return inferenceService.list();
  }

  @PostMapping("/deployments")
  public InferenceDeployResponse deploy(@RequestBody InferenceDeployRequest request, @RequestHeader(value = "Authorization", required = false) String authorization, @RequestHeader(value = "X-Platform-Permissions", required = false) String permissions) {
    authorizationService.require(authorization, permissions, "inference:deploy");
    return inferenceService.deploy(request);
  }
}