package com.yf.smp.app.platform;

import com.yf.smp.common.api.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class EdgeManagementController {
    private final PlatformIdentityService identityService;
    private final EdgeManagementService service;

    EdgeManagementController(PlatformIdentityService identityService, EdgeManagementService service) {
        this.identityService = identityService;
        this.service = service;
    }

    @GetMapping("/edge-servers")
    ResponseEntity<ApiResponse<PageResponse<EdgeServerResponse>>> listServers(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String organizationId,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return PlatformResponses.ok(service.listServers(principal(authorization), keyword, status, organizationId, page, pageSize));
    }

    @PostMapping("/edge-servers")
    ResponseEntity<ApiResponse<EdgeServerResponse>> createServer(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestBody EdgeServerCreateRequest request
    ) {
        return PlatformResponses.ok(service.createServer(principal(authorization), request));
    }

    @GetMapping("/edge-servers/{edgeServerId}")
    ResponseEntity<ApiResponse<EdgeServerResponse>> serverDetail(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String edgeServerId
    ) {
        return PlatformResponses.ok(service.serverDetail(principal(authorization), edgeServerId));
    }

    @PatchMapping("/edge-servers/{edgeServerId}")
    ResponseEntity<ApiResponse<EdgeServerResponse>> updateServer(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String edgeServerId,
        @RequestBody EdgeServerUpdateRequest request
    ) {
        return PlatformResponses.ok(service.updateServer(principal(authorization), edgeServerId, request));
    }

    @PostMapping("/edge-servers/{edgeServerId}/heartbeat")
    ResponseEntity<ApiResponse<EdgeServerResponse>> heartbeat(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String edgeServerId,
        @RequestBody EdgeHeartbeatRequest request
    ) {
        return PlatformResponses.ok(service.heartbeat(principal(authorization), edgeServerId, request));
    }

    @PostMapping("/edge-servers/{edgeServerId}/actions:decommission")
    ResponseEntity<ApiResponse<EdgeServerResponse>> decommission(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String edgeServerId
    ) {
        return PlatformResponses.ok(service.decommission(principal(authorization), edgeServerId));
    }

    @GetMapping("/edge-deployments")
    ResponseEntity<ApiResponse<PageResponse<EdgeDeploymentResponse>>> listDeployments(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String edgeServerId,
        @RequestParam(required = false) String modelId,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return PlatformResponses.ok(service.listDeployments(principal(authorization), edgeServerId, modelId, status, page, pageSize));
    }

    @PostMapping("/edge-deployments")
    ResponseEntity<ApiResponse<EdgeDeploymentResponse>> createDeployment(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestBody EdgeDeploymentCreateRequest request
    ) {
        return PlatformResponses.ok(service.createDeployment(principal(authorization), request));
    }

    @GetMapping("/edge-deployments/{deploymentId}")
    ResponseEntity<ApiResponse<EdgeDeploymentDetailResponse>> deploymentDetail(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String deploymentId
    ) {
        return PlatformResponses.ok(service.deploymentDetail(principal(authorization), deploymentId));
    }

    @PostMapping("/edge-deployments/{deploymentId}/approvals:approve")
    ResponseEntity<ApiResponse<EdgeDeploymentResponse>> approve(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String deploymentId,
        @RequestBody(required = false) EdgeApprovalRequest request
    ) {
        return PlatformResponses.ok(service.approve(principal(authorization), deploymentId, request));
    }

    @PostMapping("/edge-deployments/{deploymentId}/approvals:reject")
    ResponseEntity<ApiResponse<EdgeDeploymentResponse>> reject(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String deploymentId,
        @RequestBody(required = false) EdgeApprovalRequest request
    ) {
        return PlatformResponses.ok(service.reject(principal(authorization), deploymentId, request));
    }

    @PostMapping("/edge-deployments/{deploymentId}/actions:execute")
    ResponseEntity<ApiResponse<EdgeDeploymentResponse>> execute(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String deploymentId
    ) {
        return PlatformResponses.ok(service.execute(principal(authorization), deploymentId));
    }

    @PostMapping("/edge-deployments/{deploymentId}/actions:verify-integrity")
    ResponseEntity<ApiResponse<EdgeDeploymentDetailResponse>> verifyIntegrity(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String deploymentId,
        @RequestBody EdgeIntegrityVerifyRequest request
    ) {
        return PlatformResponses.ok(service.verifyIntegrity(principal(authorization), deploymentId, request));
    }

    @PostMapping("/edge-deployments/{deploymentId}/actions:rollback")
    ResponseEntity<ApiResponse<EdgeDeploymentResponse>> rollback(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String deploymentId,
        @RequestBody(required = false) EdgeRollbackRequest request
    ) {
        return PlatformResponses.ok(service.rollback(principal(authorization), deploymentId, request));
    }

    private PlatformPrincipal principal(String authorization) {
        return identityService.requirePrincipal(authorization);
    }
}
