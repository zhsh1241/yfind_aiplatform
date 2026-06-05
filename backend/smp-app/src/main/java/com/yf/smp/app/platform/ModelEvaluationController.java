package com.yf.smp.app.platform;

import com.yf.smp.common.api.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ModelEvaluationController {
    private final PlatformIdentityService identityService;
    private final ModelEvaluationService service;

    public ModelEvaluationController(PlatformIdentityService identityService, ModelEvaluationService service) {
        this.identityService = identityService;
        this.service = service;
    }

    @GetMapping("/model-evaluations")
    ResponseEntity<ApiResponse<PageResponse<ModelEvaluationRunResponse>>> listEvaluations(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String modelId,
        @RequestParam(required = false) String versionId,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return PlatformResponses.ok(service.listEvaluations(principal(authorization), keyword, modelId, versionId, status, page, pageSize));
    }

    @PostMapping("/model-evaluations")
    ResponseEntity<ApiResponse<ModelEvaluationRunResponse>> createEvaluation(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestBody ModelEvaluationCreateRequest request
    ) {
        return PlatformResponses.ok(service.createEvaluation(principal(authorization), request));
    }

    @GetMapping("/model-evaluations/{evaluationRunId}")
    ResponseEntity<ApiResponse<ModelEvaluationDetailResponse>> detail(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String evaluationRunId
    ) {
        return PlatformResponses.ok(service.detail(principal(authorization), evaluationRunId));
    }

    @PostMapping("/model-evaluations/{evaluationRunId}/results:import")
    ResponseEntity<ApiResponse<ModelEvaluationDetailResponse>> importResults(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String evaluationRunId,
        @RequestBody ModelEvaluationResultImportRequest request
    ) {
        return PlatformResponses.ok(service.importResults(principal(authorization), evaluationRunId, request));
    }

    @GetMapping("/models/{modelId}/versions/{versionId}/evaluations")
    ResponseEntity<ApiResponse<java.util.List<ModelEvaluationRunResponse>>> versionEvaluations(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String modelId,
        @PathVariable String versionId
    ) {
        return PlatformResponses.ok(service.versionEvaluations(principal(authorization), modelId, versionId));
    }

    @GetMapping("/models/{modelId}/versions:compare-evaluations")
    ResponseEntity<ApiResponse<ModelEvaluationCompareResponse>> compare(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String modelId,
        @RequestParam String versionIds
    ) {
        return PlatformResponses.ok(service.compare(principal(authorization), modelId, versionIds));
    }

    @GetMapping("/model-evaluations/{evaluationRunId}/artifacts/{artifactId}/download-url")
    ResponseEntity<ApiResponse<ModelEvaluationArtifactDownloadResponse>> artifactDownloadUrl(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String evaluationRunId,
        @PathVariable String artifactId
    ) {
        return PlatformResponses.ok(service.artifactDownloadUrl(principal(authorization), evaluationRunId, artifactId));
    }

    private PlatformPrincipal principal(String authorization) {
        return identityService.requirePrincipal(authorization);
    }
}
