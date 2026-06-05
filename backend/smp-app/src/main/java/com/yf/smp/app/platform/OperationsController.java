package com.yf.smp.app.platform;

import com.yf.smp.common.api.ApiResponse;
import java.util.List;
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
@RequestMapping("/api/v1/operations")
class OperationsController {
    private final PlatformIdentityService identityService;
    private final OperationsService service;

    OperationsController(PlatformIdentityService identityService, OperationsService service) {
        this.identityService = identityService;
        this.service = service;
    }

    @GetMapping("/dashboard/overview")
    ResponseEntity<ApiResponse<OperationsDashboardOverview>> dashboardOverview(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String tenantId
    ) {
        return PlatformResponses.ok(service.dashboardOverview(principal(authorization), tenantId));
    }

    @GetMapping("/dashboard/todos")
    ResponseEntity<ApiResponse<PageResponse<OperationsTodo>>> dashboardTodos(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return PlatformResponses.ok(service.todos(principal(authorization), type, status, page, pageSize));
    }

    @GetMapping("/dashboard/activities")
    ResponseEntity<ApiResponse<PageResponse<OperationsActivity>>> dashboardActivities(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return PlatformResponses.ok(service.activities(principal(authorization), page, pageSize));
    }

    @GetMapping("/scheduler/overview")
    ResponseEntity<ApiResponse<SchedulerOverview>> schedulerOverview(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String tenantId
    ) {
        return PlatformResponses.ok(service.schedulerOverview(principal(authorization), tenantId));
    }

    @GetMapping("/scheduler/tasks")
    ResponseEntity<ApiResponse<PageResponse<SchedulerTask>>> schedulerTasks(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String taskType,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String tenantId,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return PlatformResponses.ok(service.schedulerTasks(principal(authorization), taskType, status, tenantId, page, pageSize));
    }

    @PostMapping("/scheduler/assistant:diagnose")
    ResponseEntity<ApiResponse<SchedulerAssistantResponse>> schedulerAssistant(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestBody(required = false) SchedulerAssistantRequest request
    ) {
        return PlatformResponses.ok(service.schedulerAssistant(principal(authorization), request));
    }

    @GetMapping("/alerts")
    ResponseEntity<ApiResponse<PageResponse<OperationAlert>>> alerts(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String severity,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String sourceType,
        @RequestParam(required = false) String tenantId,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return PlatformResponses.ok(service.alerts(principal(authorization), severity, status, sourceType, tenantId, page, pageSize));
    }

    @GetMapping("/alerts/{alertId}")
    ResponseEntity<ApiResponse<OperationAlertDetail>> alertDetail(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String alertId
    ) {
        return PlatformResponses.ok(service.alertDetail(principal(authorization), alertId));
    }

    @PostMapping("/alerts/{alertId}/acknowledge")
    ResponseEntity<ApiResponse<OperationAlert>> acknowledgeAlert(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String alertId,
        @RequestBody(required = false) AlertHandleRequest request
    ) {
        return PlatformResponses.ok(service.acknowledgeAlert(principal(authorization), alertId, request));
    }

    @PostMapping("/alerts/{alertId}/resolve")
    ResponseEntity<ApiResponse<OperationAlert>> resolveAlert(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String alertId,
        @RequestBody(required = false) AlertHandleRequest request
    ) {
        return PlatformResponses.ok(service.resolveAlert(principal(authorization), alertId, request));
    }

    @GetMapping("/alerts/rules")
    ResponseEntity<ApiResponse<List<OperationAlertRule>>> alertRules(
        @RequestHeader(name = "Authorization", required = false) String authorization
    ) {
        return PlatformResponses.ok(service.alertRules(principal(authorization)));
    }

    @GetMapping("/reports/overview")
    ResponseEntity<ApiResponse<OperationsReportOverview>> reportsOverview(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String tenantId
    ) {
        return PlatformResponses.ok(service.reportsOverview(principal(authorization), tenantId));
    }

    @GetMapping("/reports/{reportType}")
    ResponseEntity<ApiResponse<OperationsReportDetail>> reportDetail(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String reportType,
        @RequestParam(required = false) String tenantId
    ) {
        return PlatformResponses.ok(service.reportDetail(principal(authorization), reportType, tenantId));
    }

    @PostMapping("/reports/{reportType}/exports")
    ResponseEntity<ApiResponse<ReportExportRecord>> createReportExport(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String reportType,
        @RequestBody(required = false) ReportExportRequest request
    ) {
        return PlatformResponses.ok(service.createReportExport(principal(authorization), reportType, request));
    }

    @GetMapping("/reports/exports")
    ResponseEntity<ApiResponse<PageResponse<ReportExportRecord>>> reportExports(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return PlatformResponses.ok(service.reportExports(principal(authorization), status, page, pageSize));
    }

    private PlatformPrincipal principal(String authorization) {
        return identityService.requirePrincipal(authorization);
    }
}
