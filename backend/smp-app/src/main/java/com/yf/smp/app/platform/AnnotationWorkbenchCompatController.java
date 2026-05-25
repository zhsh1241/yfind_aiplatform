package com.yf.smp.app.platform;

import com.yf.smp.common.api.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/annotation-tasks")
class AnnotationWorkbenchCompatController {
    private final PlatformIdentityService identityService;
    private final AnnotationService annotationService;

    AnnotationWorkbenchCompatController(PlatformIdentityService identityService, AnnotationService annotationService) {
        this.identityService = identityService;
        this.annotationService = annotationService;
    }

    @GetMapping("/{taskId}/workbench")
    ResponseEntity<ApiResponse<AnnotationTaskDetailResponse>> workbench(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String taskId
    ) {
        return PlatformResponses.ok(annotationService.taskDetail(principal(authorization), taskId));
    }

    private PlatformPrincipal principal(String authorization) {
        return identityService.requirePrincipal(authorization);
    }
}
