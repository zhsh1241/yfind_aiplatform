package com.yf.smp.app.platform;

import com.yf.smp.common.api.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ModelRegistryController {
    private final PlatformIdentityService identityService;
    private final ModelRegistryService service;

    public ModelRegistryController(PlatformIdentityService identityService, ModelRegistryService service) {
        this.identityService = identityService;
        this.service = service;
    }

    @GetMapping("/models")
    ResponseEntity<ApiResponse<ModelRegistryListResponse>> listModels(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String tag,
        @RequestParam(required = false) String framework,
        @RequestParam(required = false) String taskType,
        @RequestParam(required = false) String scope,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String ownerOrgId,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return PlatformResponses.ok(service.listModels(principal(authorization), keyword, tag, framework, taskType, scope, status, ownerOrgId, page, pageSize));
    }

    @PostMapping("/models")
    ResponseEntity<ApiResponse<ModelSummaryResponse>> createModel(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestBody ModelCreateRequest request
    ) {
        return PlatformResponses.ok(service.createModel(principal(authorization), request));
    }

    @GetMapping("/models/{modelId}")
    ResponseEntity<ApiResponse<ModelDetailResponse>> modelDetail(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String modelId
    ) {
        return PlatformResponses.ok(service.modelDetail(principal(authorization), modelId));
    }

    @PatchMapping("/models/{modelId}")
    ResponseEntity<ApiResponse<ModelSummaryResponse>> updateModel(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String modelId,
        @RequestBody ModelUpdateRequest request
    ) {
        return PlatformResponses.ok(service.updateModel(principal(authorization), modelId, request));
    }

    @GetMapping("/models/{modelId}/versions")
    ResponseEntity<ApiResponse<java.util.List<ModelVersionResponse>>> versions(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String modelId
    ) {
        return PlatformResponses.ok(service.versions(principal(authorization), modelId));
    }

    @PostMapping("/models/{modelId}/versions")
    ResponseEntity<ApiResponse<ModelVersionResponse>> createVersion(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String modelId,
        @RequestBody ModelVersionCreateRequest request
    ) {
        return PlatformResponses.ok(service.createVersion(principal(authorization), modelId, request));
    }

    @GetMapping("/models/{modelId}/versions/{versionId}")
    ResponseEntity<ApiResponse<ModelVersionResponse>> versionDetail(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String modelId,
        @PathVariable String versionId
    ) {
        return PlatformResponses.ok(service.versionDetail(principal(authorization), modelId, versionId));
    }

    @PostMapping("/models/{modelId}/versions/{versionId}/transition")
    ResponseEntity<ApiResponse<ModelVersionResponse>> transitionVersion(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String modelId,
        @PathVariable String versionId,
        @RequestBody ModelVersionTransitionRequest request
    ) {
        return PlatformResponses.ok(service.transitionVersion(principal(authorization), modelId, versionId, request));
    }

    @DeleteMapping("/models/{modelId}/versions/{versionId}")
    ResponseEntity<ApiResponse<ModelVersionDeleteResponse>> deleteVersion(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String modelId,
        @PathVariable String versionId
    ) {
        return service.deleteVersionResponse(principal(authorization), modelId, versionId);
    }


    @GetMapping("/models/{modelId}/access-requests")
    ResponseEntity<ApiResponse<java.util.List<ModelAccessRequestResponse>>> accessRequests(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String modelId,
        @RequestParam(required = false) String status
    ) {
        return PlatformResponses.ok(service.accessRequests(principal(authorization), modelId, status));
    }

    @PostMapping("/models/{modelId}/access-requests")
    ResponseEntity<ApiResponse<ModelAccessRequestResponse>> requestAccess(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String modelId,
        @RequestBody ModelAccessRequestCreateRequest request
    ) {
        return PlatformResponses.ok(service.requestAccess(principal(authorization), modelId, request));
    }

    @PutMapping("/model-access-requests/{requestId}/approve")
    ResponseEntity<ApiResponse<ModelAccessRequestResponse>> approveRequest(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String requestId,
        @RequestBody ModelAccessReviewRequest request
    ) {
        return PlatformResponses.ok(service.approveRequest(principal(authorization), requestId, request));
    }

    @PutMapping("/model-access-requests/{requestId}/reject")
    ResponseEntity<ApiResponse<ModelAccessRequestResponse>> rejectRequest(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String requestId,
        @RequestBody ModelAccessReviewRequest request
    ) {
        return PlatformResponses.ok(service.rejectRequest(principal(authorization), requestId, request));
    }

    @PostMapping("/models/{modelId}/versions/{versionId}/download-url")
    ResponseEntity<ApiResponse<ModelDownloadResponse>> downloadUrl(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String modelId,
        @PathVariable String versionId
    ) {
        return PlatformResponses.ok(service.downloadUrl(principal(authorization), modelId, versionId));
    }

    private PlatformPrincipal principal(String authorization) {
        return identityService.requirePrincipal(authorization);
    }
}
