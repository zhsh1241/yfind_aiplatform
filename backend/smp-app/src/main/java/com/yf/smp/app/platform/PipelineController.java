package com.yf.smp.app.platform;

import com.yf.smp.common.api.ApiResponse;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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
public class PipelineController {
    private final PlatformIdentityService identityService;
    private final PipelineService service;

    public PipelineController(PlatformIdentityService identityService, PipelineService service) {
        this.identityService = identityService;
        this.service = service;
    }

    @GetMapping("/pipelines")
    ResponseEntity<ApiResponse<PipelineListResponse>> pipelines(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return PlatformResponses.ok(service.pipelines(principal(authorization), keyword, status, page, pageSize));
    }

    @PostMapping("/pipelines")
    ResponseEntity<ApiResponse<PipelineDetailResponse>> createPipeline(@RequestHeader(name = "Authorization", required = false) String authorization, @RequestBody PipelineSaveRequest request) {
        return PlatformResponses.ok(service.createPipeline(principal(authorization), request));
    }

    @GetMapping("/pipelines/{pipelineId}")
    ResponseEntity<ApiResponse<PipelineDetailResponse>> pipeline(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String pipelineId) {
        return PlatformResponses.ok(service.pipelineDetail(principal(authorization), pipelineId));
    }

    @PutMapping("/pipelines/{pipelineId}")
    ResponseEntity<ApiResponse<PipelineDetailResponse>> updatePipeline(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String pipelineId, @RequestBody PipelineSaveRequest request) {
        return PlatformResponses.ok(service.updatePipeline(principal(authorization), pipelineId, request));
    }

    @PostMapping("/pipelines/{pipelineId}/validate")
    ResponseEntity<ApiResponse<PipelineValidationResponse>> validate(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String pipelineId) {
        return PlatformResponses.ok(service.validatePipeline(principal(authorization), pipelineId));
    }

    @PostMapping("/pipelines/{pipelineId}/versions")
    ResponseEntity<ApiResponse<PipelineVersionResponse>> saveVersion(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String pipelineId, @RequestBody(required = false) PipelineVersionRequest request) {
        return PlatformResponses.ok(service.saveVersion(principal(authorization), pipelineId, request == null ? new PipelineVersionRequest(null, null) : request));
    }

    @GetMapping("/pipelines/{pipelineId}/versions")
    ResponseEntity<ApiResponse<List<PipelineVersionResponse>>> versions(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String pipelineId) {
        return PlatformResponses.ok(service.versions(principal(authorization), pipelineId));
    }

    @PostMapping("/pipelines/{pipelineId}/versions/{versionId}/restore")
    ResponseEntity<ApiResponse<PipelineDetailResponse>> restoreVersion(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String pipelineId, @PathVariable String versionId) {
        return PlatformResponses.ok(service.restoreVersion(principal(authorization), pipelineId, versionId));
    }

    @PostMapping("/pipelines/{pipelineId}/runs")
    ResponseEntity<ApiResponse<PipelineRunDetailResponse>> runPipeline(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String pipelineId, @RequestBody(required = false) PipelineRunRequest request) {
        return PlatformResponses.ok(service.runPipeline(principal(authorization), pipelineId, request == null ? new PipelineRunRequest(null, null) : request));
    }

    @GetMapping("/pipelines/{pipelineId}/runs")
    ResponseEntity<ApiResponse<List<PipelineRunSummaryResponse>>> runs(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String pipelineId) {
        return PlatformResponses.ok(service.runs(principal(authorization), pipelineId));
    }

    @GetMapping("/pipeline-runs/{runId}")
    ResponseEntity<ApiResponse<PipelineRunDetailResponse>> runDetail(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String runId) {
        return PlatformResponses.ok(service.runDetail(principal(authorization), runId));
    }

    @GetMapping("/preprocessed-datasets/{datasetId}/preview")
    ResponseEntity<ApiResponse<PreprocessedDatasetPreviewResponse>> preview(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String datasetId) {
        return PlatformResponses.ok(service.previewPreprocessedDataset(principal(authorization), datasetId));
    }

    @PostMapping("/preprocessed-datasets/{datasetId}/confirm")
    ResponseEntity<ApiResponse<PreprocessedDatasetActivationStateResponse>> confirm(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String datasetId, @RequestBody(required = false) PreprocessedDatasetConfirmRequest request) {
        return PlatformResponses.ok(service.confirmPreprocessedDataset(principal(authorization), datasetId, request == null ? new PreprocessedDatasetConfirmRequest("CONFIRM", null) : request));
    }

    @PostMapping("/preprocessed-datasets/{datasetId}/activate")
    ResponseEntity<ApiResponse<PreprocessedDatasetActivationStateResponse>> activate(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String datasetId, @RequestBody(required = false) PreprocessedDatasetActivateRequest request) {
        return PlatformResponses.ok(service.activatePreprocessedDataset(principal(authorization), datasetId, request == null ? new PreprocessedDatasetActivateRequest(null, null) : request));
    }

    @GetMapping("/operators")
    ResponseEntity<ApiResponse<OperatorListResponse>> operators(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String categoryGroup,
        @RequestParam(required = false) String dataType,
        @RequestParam(required = false) String stage,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Boolean supportsPreview
    ) {
        return PlatformResponses.ok(service.operators(principal(authorization), keyword, category, categoryGroup, dataType, stage, status, supportsPreview));
    }

    @GetMapping("/operators/{operatorId}")
    ResponseEntity<ApiResponse<OperatorDetailResponse>> operator(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String operatorId) {
        return PlatformResponses.ok(service.operatorDetail(principal(authorization), operatorId));
    }

    @PostMapping("/operators/custom")
    ResponseEntity<ApiResponse<OperatorDetailResponse>> createOperator(@RequestHeader(name = "Authorization", required = false) String authorization, @RequestBody OperatorCustomRequest request) {
        return PlatformResponses.ok(service.createCustomOperator(principal(authorization), request));
    }

    @PostMapping("/operators/{operatorId}/submit-review")
    ResponseEntity<ApiResponse<OperatorDetailResponse>> submitOperator(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String operatorId) {
        return PlatformResponses.ok(service.submitOperator(principal(authorization), operatorId));
    }

    @PostMapping("/operators/{operatorId}/approve")
    ResponseEntity<ApiResponse<OperatorDetailResponse>> approveOperator(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String operatorId, @RequestBody(required = false) OperatorReviewRequest request) {
        return PlatformResponses.ok(service.approveOperator(principal(authorization), operatorId, request == null ? new OperatorReviewRequest(null) : request));
    }

    @PostMapping("/operators/{operatorId}/reject")
    ResponseEntity<ApiResponse<OperatorDetailResponse>> rejectOperator(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String operatorId, @RequestBody(required = false) OperatorReviewRequest request) {
        return PlatformResponses.ok(service.rejectOperator(principal(authorization), operatorId, request == null ? new OperatorReviewRequest(null) : request));
    }

    private PlatformPrincipal principal(String authorization) {
        return identityService.requirePrincipal(authorization);
    }
}
