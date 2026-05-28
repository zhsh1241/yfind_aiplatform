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
@RequestMapping("/api/v1/annotation")
public class AnnotationController {
    private final PlatformIdentityService identityService;
    private final AnnotationService service;

    public AnnotationController(PlatformIdentityService identityService, AnnotationService service) {
        this.identityService = identityService;
        this.service = service;
    }

    @GetMapping("/overview")
    ResponseEntity<ApiResponse<AnnotationOverviewResponse>> overview(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return PlatformResponses.ok(service.overview(principal(authorization)));
    }

    @GetMapping("/tasks")
    ResponseEntity<ApiResponse<AnnotationTaskListResponse>> tasks(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String keyword,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return PlatformResponses.ok(service.tasks(principal(authorization), status, keyword, page, pageSize));
    }

    @PostMapping("/tasks")
    ResponseEntity<ApiResponse<AnnotationTaskDetailResponse>> createTask(@RequestHeader(name = "Authorization", required = false) String authorization, @RequestBody AnnotationTaskCreateRequest request) {
        return PlatformResponses.ok(service.createTask(principal(authorization), request));
    }

    @GetMapping("/source-datasets")
    ResponseEntity<ApiResponse<AnnotationSourceDatasetListResponse>> sourceDatasets(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String sourceType,
        @RequestParam(required = false) String scene,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return PlatformResponses.ok(service.sourceDatasets(principal(authorization), keyword, sourceType, scene, page, pageSize));
    }

    @GetMapping("/tasks/{taskId}")
    ResponseEntity<ApiResponse<AnnotationTaskDetailResponse>> task(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String taskId) {
        return PlatformResponses.ok(service.taskDetail(principal(authorization), taskId));
    }


    @GetMapping("/tasks/{taskId}/exports")
    ResponseEntity<ApiResponse<List<AnnotationTrainingExportResponse>>> exports(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String taskId) {
        return PlatformResponses.ok(service.exports(principal(authorization), taskId));
    }

    @PostMapping("/tasks/{taskId}/exports")
    ResponseEntity<ApiResponse<AnnotationTrainingExportResponse>> createExport(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String taskId, @RequestBody AnnotationTrainingExportRequest request) {
        return PlatformResponses.ok(service.createExport(principal(authorization), taskId, request));
    }

    @GetMapping("/exports/{exportId}")
    ResponseEntity<ApiResponse<AnnotationTrainingExportResponse>> export(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String exportId) {
        return PlatformResponses.ok(service.export(principal(authorization), exportId));
    }

    @GetMapping("/exports/{exportId}/download-url")
    ResponseEntity<ApiResponse<AnnotationTrainingExportResponse>> exportDownloadUrl(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String exportId) {
        return PlatformResponses.ok(service.exportDownloadUrl(principal(authorization), exportId));
    }

    @PostMapping("/tasks/{taskId}/assign")
    ResponseEntity<ApiResponse<AnnotationTaskDetailResponse>> assign(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String taskId, @RequestBody AnnotationTaskAssignRequest request) {
        return PlatformResponses.ok(service.assign(principal(authorization), taskId, request));
    }

    @PostMapping("/tasks/{taskId}/start")
    ResponseEntity<ApiResponse<AnnotationTaskDetailResponse>> start(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String taskId) {
        return PlatformResponses.ok(service.start(principal(authorization), taskId));
    }

    @PostMapping("/tasks/{taskId}/pause")
    ResponseEntity<ApiResponse<AnnotationTaskDetailResponse>> pause(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String taskId) {
        return PlatformResponses.ok(service.pause(principal(authorization), taskId));
    }

    @PostMapping("/tasks/{taskId}/cancel")
    ResponseEntity<ApiResponse<AnnotationTaskDetailResponse>> cancel(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String taskId) {
        return PlatformResponses.ok(service.cancel(principal(authorization), taskId));
    }


    @GetMapping("/tags")
    ResponseEntity<ApiResponse<List<AnnotationTagResponse>>> tags(@RequestHeader(name = "Authorization", required = false) String authorization, @RequestParam(required = false) String status, @RequestParam(required = false) String keyword) {
        return PlatformResponses.ok(service.tags(principal(authorization), status, keyword));
    }

    @PostMapping("/tags")
    ResponseEntity<ApiResponse<AnnotationTagResponse>> createTag(@RequestHeader(name = "Authorization", required = false) String authorization, @RequestBody AnnotationTagRequest request) {
        return PlatformResponses.ok(service.createTag(principal(authorization), request));
    }

    @PutMapping("/tags/{tagId}")
    ResponseEntity<ApiResponse<AnnotationTagResponse>> updateTag(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String tagId, @RequestBody AnnotationTagRequest request) {
        return PlatformResponses.ok(service.updateTag(principal(authorization), tagId, request));
    }

    @PostMapping("/tags/{tagId}/archive")
    ResponseEntity<ApiResponse<AnnotationTagResponse>> archiveTag(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String tagId) {
        return PlatformResponses.ok(service.archiveTag(principal(authorization), tagId));
    }

    @GetMapping("/label-templates")
    ResponseEntity<ApiResponse<List<AnnotationLabelTemplateResponse>>> labelTemplates(@RequestHeader(name = "Authorization", required = false) String authorization, @RequestParam(required = false) String status, @RequestParam(required = false) String scene) {
        return PlatformResponses.ok(service.labelTemplates(principal(authorization), status, scene));
    }

    @PostMapping("/label-templates")
    ResponseEntity<ApiResponse<AnnotationLabelTemplateResponse>> createTemplate(@RequestHeader(name = "Authorization", required = false) String authorization, @RequestBody AnnotationLabelTemplateRequest request) {
        return PlatformResponses.ok(service.createTemplate(principal(authorization), request));
    }

    @PutMapping("/label-templates/{templateId}")
    ResponseEntity<ApiResponse<AnnotationLabelTemplateResponse>> updateTemplate(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String templateId, @RequestBody AnnotationLabelTemplateRequest request) {
        return PlatformResponses.ok(service.updateTemplate(principal(authorization), templateId, request));
    }

    @PostMapping("/label-templates/{templateId}/publish")
    ResponseEntity<ApiResponse<AnnotationLabelTemplateResponse>> publishTemplate(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String templateId) {
        return PlatformResponses.ok(service.publishTemplate(principal(authorization), templateId));
    }

    @PostMapping("/label-templates/{templateId}/archive")
    ResponseEntity<ApiResponse<AnnotationLabelTemplateResponse>> archiveTemplate(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String templateId) {
        return PlatformResponses.ok(service.archiveTemplate(principal(authorization), templateId));
    }

    @GetMapping("/label-templates/{templateId}/label-studio-config")
    ResponseEntity<ApiResponse<AnnotationLabelStudioConfigResponse>> labelStudioConfig(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String templateId) {
        return PlatformResponses.ok(service.labelStudioConfig(principal(authorization), templateId));
    }

    @GetMapping("/tasks/{taskId}/work-items")
    ResponseEntity<ApiResponse<AnnotationWorkItemPageResponse>> workItems(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String taskId,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "50") int pageSize
    ) {
        return PlatformResponses.ok(service.workItems(principal(authorization), taskId, page, pageSize));
    }

    @PostMapping("/work-items/{workItemId}/draft")
    ResponseEntity<ApiResponse<AnnotationWorkItemResponse>> draft(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String workItemId, @RequestBody AnnotationWorkItemRequest request) {
        return PlatformResponses.ok(service.saveDraft(principal(authorization), workItemId, request));
    }

    @PostMapping("/work-items/{workItemId}/submit")
    ResponseEntity<ApiResponse<AnnotationWorkItemResponse>> submit(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String workItemId, @RequestBody AnnotationWorkItemRequest request) {
        return PlatformResponses.ok(service.submit(principal(authorization), workItemId, request));
    }

    @PostMapping("/work-items/{workItemId}/label-studio/sync-task")
    ResponseEntity<ApiResponse<AnnotationExternalBindingResponse>> syncLabelStudioTask(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String workItemId) {
        return PlatformResponses.ok(service.syncLabelStudioTask(principal(authorization), workItemId));
    }

    @GetMapping("/review-items")
    ResponseEntity<ApiResponse<List<AnnotationReviewItemResponse>>> reviewItems(@RequestHeader(name = "Authorization", required = false) String authorization, @RequestParam(required = false) String status, @RequestParam(required = false) String taskId) {
        return PlatformResponses.ok(service.reviewItems(principal(authorization), status, taskId));
    }

    @PostMapping("/review-items/{reviewItemId}/approve")
    ResponseEntity<ApiResponse<AnnotationReviewItemResponse>> approve(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String reviewItemId) {
        return PlatformResponses.ok(service.approve(principal(authorization), reviewItemId));
    }

    @PostMapping("/review-items/{reviewItemId}/reject")
    ResponseEntity<ApiResponse<AnnotationReviewItemResponse>> reject(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String reviewItemId, @RequestBody(required = false) AnnotationReviewRequest request) {
        return PlatformResponses.ok(service.reject(principal(authorization), reviewItemId, request == null ? new AnnotationReviewRequest(null) : request));
    }

    @PostMapping("/tasks/{taskId}/quality-check")
    ResponseEntity<ApiResponse<AnnotationPublicationResponse>> qualityCheck(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String taskId) {
        return PlatformResponses.ok(service.qualityCheck(principal(authorization), taskId));
    }

    @PostMapping("/tasks/{taskId}/publish-dataset")
    ResponseEntity<ApiResponse<AnnotationPublicationResponse>> publishDataset(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String taskId) {
        return PlatformResponses.ok(service.publishDataset(principal(authorization), taskId));
    }

    @GetMapping("/tasks/{taskId}/label-studio/status")
    ResponseEntity<ApiResponse<AnnotationExternalBindingResponse>> labelStudioStatus(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String taskId) {
        return PlatformResponses.ok(service.labelStudioStatus(principal(authorization), taskId));
    }

    @PostMapping("/tasks/{taskId}/label-studio/sync-project")
    ResponseEntity<ApiResponse<AnnotationExternalBindingResponse>> syncLabelStudioProject(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String taskId) {
        return PlatformResponses.ok(service.syncLabelStudioProject(principal(authorization), taskId));
    }

    @PostMapping("/tasks/{taskId}/label-studio/import-results")
    ResponseEntity<ApiResponse<AnnotationExternalBindingResponse>> importLabelStudioResults(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String taskId) {
        return PlatformResponses.ok(service.importLabelStudioResults(principal(authorization), taskId));
    }

    private PlatformPrincipal principal(String authorization) {
        return identityService.requirePrincipal(authorization);
    }
}
