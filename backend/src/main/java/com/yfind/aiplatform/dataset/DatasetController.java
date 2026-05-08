package com.yfind.aiplatform.dataset;

import com.yfind.aiplatform.identity.PlatformAuthorizationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/datasets")
public class DatasetController {

  private final DatasetService datasetService;
  private final DatasetPreparationService preparationService;
  private final PlatformAuthorizationService authorizationService;

  public DatasetController(DatasetService datasetService, DatasetPreparationService preparationService, PlatformAuthorizationService authorizationService) {
    this.datasetService = datasetService;
    this.preparationService = preparationService;
    this.authorizationService = authorizationService;
  }

  @GetMapping
  public DatasetListResponse list(
      @RequestParam(value = "query", required = false) String query,
      @RequestParam(value = "status", required = false) String status,
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    authorizationService.require(authorization, "dataset:read");
    return datasetService.list(query, status);
  }

  @GetMapping("/{datasetKey}")
  public DatasetDetailResponse detail(@PathVariable String datasetKey, @RequestHeader(value = "Authorization", required = false) String authorization) {
    authorizationService.require(authorization, "dataset:read");
    return datasetService.detail(datasetKey);
  }

  @PostMapping("/upload")
  public DatasetUploadResponse upload(@RequestBody DatasetUploadRequest request, @RequestHeader(value = "Authorization", required = false) String authorization) {
    authorizationService.require(authorization, "dataset:manage");
    return datasetService.upload(request);
  }

  @PostMapping("/{datasetKey}/access-requests")
  public DatasetAccessRequestActionResponse createAccessRequest(@PathVariable String datasetKey, @RequestBody DatasetAccessRequestCreateRequest request, @RequestHeader(value = "Authorization", required = false) String authorization) {
    authorizationService.require(authorization, "dataset:read");
    return datasetService.createAccessRequest(datasetKey, request);
  }

  @PostMapping("/access-requests/{requestId}/approve")
  public DatasetAccessRequestActionResponse approve(@PathVariable String requestId, @RequestHeader(value = "Authorization", required = false) String authorization) {
    authorizationService.require(authorization, "dataset:manage");
    return datasetService.approve(requestId);
  }

  @GetMapping("/access-requests")
  public DatasetAccessRequestListResponse requests(@RequestHeader(value = "Authorization", required = false) String authorization) {
    authorizationService.require(authorization, "dataset:manage");
    return datasetService.listRequests();
  }

  @GetMapping("/preparation-jobs")
  public DatasetPreparationDtos.PreparationJobListResponse listPreparationJobs(
      @RequestParam(value = "datasetKey", required = false) String datasetKey,
      @RequestParam(value = "status", required = false) String status,
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    authorizationService.require(authorization, "dataset:read");
    return preparationService.list(datasetKey, status);
  }

  @GetMapping("/preparation-jobs/{jobId}")
  public DatasetPreparationDtos.PreparationJobDetailResponse preparationJobDetail(@PathVariable String jobId, @RequestHeader(value = "Authorization", required = false) String authorization) {
    authorizationService.require(authorization, "dataset:read");
    return preparationService.detail(jobId);
  }

  @PostMapping("/preparation-jobs")
  public DatasetPreparationDtos.PreparationJobActionResponse createPreparationJob(@RequestBody DatasetPreparationDtos.CreatePreparationJobRequest request, @RequestHeader(value = "Authorization", required = false) String authorization) {
    authorizationService.require(authorization, "dataset:manage");
    return preparationService.create(request);
  }

  @PostMapping("/preparation-jobs/{jobId}/run-next-stage")
  public DatasetPreparationDtos.PreparationJobActionResponse runNextPreparationStage(@PathVariable String jobId, @RequestBody(required = false) DatasetPreparationDtos.RunStageRequest request, @RequestHeader(value = "Authorization", required = false) String authorization) {
    authorizationService.require(authorization, "dataset:manage");
    return preparationService.runNextStage(jobId, request);
  }

  @PostMapping("/preparation-jobs/{jobId}/rerun-blocked-stage")
  public DatasetPreparationDtos.PreparationJobActionResponse rerunBlockedPreparationStage(@PathVariable String jobId, @RequestBody DatasetPreparationDtos.RerunBlockedStageRequest request, @RequestHeader(value = "Authorization", required = false) String authorization) {
    authorizationService.require(authorization, "dataset:manage");
    return preparationService.rerunBlockedStage(jobId, request);
  }

  @GetMapping("/training-datasets/{artifactKey}")
  public DatasetPreparationDtos.TrainingDatasetArtifactResponse trainingDatasetArtifact(@PathVariable String artifactKey, @RequestHeader(value = "Authorization", required = false) String authorization) {
    authorizationService.require(authorization, "dataset:read");
    return preparationService.artifact(artifactKey);
  }
}