package com.yf.smp.app.platform;

import com.yf.smp.common.api.ApiResponse;
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
@RequestMapping("/api/v1/platform/pai-resources")
public class PlatformPaiResourceController {
    private final PlatformIdentityService identityService;
    private final PaiResourceService service;

    public PlatformPaiResourceController(PlatformIdentityService identityService, PaiResourceService service) {
        this.identityService = identityService;
        this.service = service;
    }

    @GetMapping("/status")
    ResponseEntity<ApiResponse<PaiResourceStatusResponse>> status(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return PlatformResponses.ok(service.status(principal(authorization)));
    }

    @GetMapping("/overview")
    ResponseEntity<ApiResponse<PaiResourceOverviewResponse>> overview(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String organizationId
    ) {
        return PlatformResponses.ok(service.overview(principal(authorization), organizationId));
    }

    @GetMapping("/workspaces")
    ResponseEntity<ApiResponse<PageResponse<PaiResourceBindingResponse>>> workspaces(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return PlatformResponses.ok(service.workspaces(principal(authorization)));
    }

    @GetMapping("/nodes")
    ResponseEntity<ApiResponse<PageResponse<PaiResourceNodeResponse>>> nodes(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String bindingId
    ) {
        return PlatformResponses.ok(service.nodes(principal(authorization), bindingId));
    }

    @GetMapping("/pools")
    ResponseEntity<ApiResponse<PageResponse<PaiResourcePoolResponse>>> pools(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String bindingId
    ) {
        return PlatformResponses.ok(service.pools(principal(authorization), bindingId));
    }

    @GetMapping("/storage")
    ResponseEntity<ApiResponse<PageResponse<PaiResourceStorageResponse>>> storage(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String bindingId
    ) {
        return PlatformResponses.ok(service.storage(principal(authorization), bindingId));
    }

    @PostMapping("/sync")
    ResponseEntity<ApiResponse<PaiSyncResponse>> sync(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestBody(required = false) PaiResourceSyncRequest request
    ) {
        return PlatformResponses.ok(service.sync(principal(authorization), request));
    }

    @PutMapping("/connection")
    ResponseEntity<ApiResponse<PaiResourceStatusResponse>> updateConnection(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestBody PaiConnectionUpdateRequest request
    ) {
        return PlatformResponses.ok(service.updateConnection(principal(authorization), request));
    }

    @PutMapping("/bindings/{bindingId}")
    ResponseEntity<ApiResponse<PaiResourceBindingResponse>> updateBinding(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String bindingId,
        @RequestBody PaiResourceBindingUpdateRequest request
    ) {
        return PlatformResponses.ok(service.updateBinding(principal(authorization), bindingId, request));
    }

    @GetMapping("/references")
    ResponseEntity<ApiResponse<PaiResourceReferenceResponse>> references(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String organizationId
    ) {
        return PlatformResponses.ok(service.reference(principal(authorization), organizationId));
    }

    private PlatformPrincipal principal(String authorization) {
        return identityService.requirePrincipal(authorization);
    }
}
