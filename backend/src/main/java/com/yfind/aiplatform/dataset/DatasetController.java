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
  private final PlatformAuthorizationService authorizationService;

  public DatasetController(DatasetService datasetService, PlatformAuthorizationService authorizationService) {
    this.datasetService = datasetService;
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
}
