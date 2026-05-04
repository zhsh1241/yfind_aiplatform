package com.yfind.aiplatform.dataset;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/datasets")
public class DatasetController {

  private final DatasetService datasetService;

  public DatasetController(DatasetService datasetService) {
    this.datasetService = datasetService;
  }

  @GetMapping
  public DatasetListResponse list(
      @RequestParam(value = "query", required = false) String query,
      @RequestParam(value = "status", required = false) String status) {
    return datasetService.list(query, status);
  }

  @GetMapping("/{datasetKey}")
  public DatasetDetailResponse detail(@PathVariable String datasetKey) {
    return datasetService.detail(datasetKey);
  }

  @PostMapping("/upload")
  public DatasetUploadResponse upload(@RequestBody DatasetUploadRequest request) {
    return datasetService.upload(request);
  }

  @PostMapping("/{datasetKey}/access-requests")
  public DatasetAccessRequestActionResponse createAccessRequest(@PathVariable String datasetKey, @RequestBody DatasetAccessRequestCreateRequest request) {
    return datasetService.createAccessRequest(datasetKey, request);
  }

  @PostMapping("/access-requests/{requestId}/approve")
  public DatasetAccessRequestActionResponse approve(@PathVariable String requestId) {
    return datasetService.approve(requestId);
  }

  @GetMapping("/access-requests")
  public DatasetAccessRequestListResponse requests() {
    return datasetService.listRequests();
  }
}
