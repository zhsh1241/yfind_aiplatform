package com.yf.smp.app.platform;

import com.yf.smp.common.api.ApiResponse;
import java.util.List;
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
@RequestMapping("/api/v1/platform")
public class PlatformOrganizationConfigController {
    private final PlatformIdentityService identityService;
    private final PlatformOrganizationConfigService service;

    public PlatformOrganizationConfigController(PlatformIdentityService identityService, PlatformOrganizationConfigService service) {
        this.identityService = identityService;
        this.service = service;
    }

    @GetMapping("/organizations/tree")
    ResponseEntity<ApiResponse<OrganizationTreeResponse>> organizationTree(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return PlatformResponses.ok(service.organizationTree(principal(authorization)));
    }

    @PostMapping("/organizations")
    ResponseEntity<ApiResponse<OrganizationNodeResponse>> createOrganization(@RequestHeader(name = "Authorization", required = false) String authorization, @RequestBody OrganizationRequest request) {
        return PlatformResponses.ok(service.createOrganization(principal(authorization), request));
    }

    @PatchMapping("/organizations/{organizationId}")
    ResponseEntity<ApiResponse<OrganizationNodeResponse>> updateOrganization(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String organizationId, @RequestBody OrganizationUpdateRequest request) {
        return PlatformResponses.ok(service.updateOrganization(principal(authorization), organizationId, request));
    }

    @DeleteMapping("/organizations/{organizationId}")
    ResponseEntity<ApiResponse<Void>> deleteOrganization(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String organizationId) {
        service.deleteOrganization(principal(authorization), organizationId);
        return PlatformResponses.ok(null);
    }

    @GetMapping("/organizations/members")
    ResponseEntity<ApiResponse<PageResponse<OrganizationMemberResponse>>> members(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return PlatformResponses.ok(service.members(principal(authorization)));
    }

    @PostMapping("/organizations/{organizationId}/members")
    ResponseEntity<ApiResponse<OrganizationMemberResponse>> assignMember(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String organizationId, @RequestBody OrganizationMemberRequest request) {
        return PlatformResponses.ok(service.assignMember(principal(authorization), organizationId, request));
    }

    @DeleteMapping("/organizations/{organizationId}/members/{memberId}")
    ResponseEntity<ApiResponse<Void>> removeMember(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String organizationId, @PathVariable String memberId) {
        service.removeMember(principal(authorization), organizationId, memberId);
        return PlatformResponses.ok(null);
    }

    @GetMapping("/configs")
    ResponseEntity<ApiResponse<List<ConfigItemResponse>>> configs(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String scopeType,
        @RequestParam(required = false) String scopeId
    ) {
        return PlatformResponses.ok(service.configs(principal(authorization), scopeType, scopeId));
    }

    @GetMapping("/configs/effective/{key}")
    ResponseEntity<ApiResponse<ConfigEffectiveResponse>> effectiveConfig(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @PathVariable String key,
        @RequestParam(required = false) String scopeType,
        @RequestParam(required = false) String scopeId
    ) {
        return PlatformResponses.ok(service.effective(principal(authorization), key, scopeType, scopeId));
    }

    @PutMapping("/configs/{key}")
    ResponseEntity<ApiResponse<ConfigItemResponse>> updateConfig(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String key, @RequestBody ConfigUpdateRequest request) {
        return PlatformResponses.ok(service.updateConfig(principal(authorization), key, request));
    }

    @GetMapping("/files")
    ResponseEntity<ApiResponse<PageResponse<FileObjectResponse>>> files(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String assetType,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String organizationId
    ) {
        return PlatformResponses.ok(service.files(principal(authorization), assetType, status, organizationId));
    }

    @PostMapping("/files/init")
    ResponseEntity<ApiResponse<FileObjectResponse>> initFile(@RequestHeader(name = "Authorization", required = false) String authorization, @RequestBody FileInitRequest request) {
        return PlatformResponses.ok(service.initFile(principal(authorization), request));
    }

    @PostMapping("/files/{fileId}/complete")
    ResponseEntity<ApiResponse<FileObjectResponse>> completeFile(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String fileId, @RequestBody FileCompleteRequest request) {
        return PlatformResponses.ok(service.completeFile(principal(authorization), fileId, request));
    }

    @PostMapping("/files/{fileId}/delete")
    ResponseEntity<ApiResponse<Void>> deleteFile(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String fileId) {
        service.deleteFile(principal(authorization), fileId);
        return PlatformResponses.ok(null);
    }

    @PostMapping("/files/{fileId}/restore")
    ResponseEntity<ApiResponse<FileObjectResponse>> restoreFile(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String fileId) {
        return PlatformResponses.ok(service.restoreFile(principal(authorization), fileId));
    }

    @GetMapping("/files/{fileId}/download-url")
    ResponseEntity<ApiResponse<FileDownloadResponse>> downloadUrl(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String fileId) {
        return PlatformResponses.ok(service.downloadUrl(principal(authorization), fileId));
    }

    @GetMapping("/notification-channels")
    ResponseEntity<ApiResponse<List<NotificationChannelResponse>>> notificationChannels(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return PlatformResponses.ok(service.notificationChannels(principal(authorization)));
    }

    @PutMapping("/notification-channels/{channelId}")
    ResponseEntity<ApiResponse<NotificationChannelResponse>> updateNotificationChannel(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String channelId, @RequestBody NotificationChannelUpdateRequest request) {
        return PlatformResponses.ok(service.updateNotificationChannel(principal(authorization), channelId, request));
    }

    @PostMapping("/notification-channels/{channelId}/test")
    ResponseEntity<ApiResponse<NotificationTestResponse>> testNotificationChannel(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String channelId) {
        return PlatformResponses.ok(service.testNotificationChannel(principal(authorization), channelId));
    }

    @GetMapping("/api-keys")
    ResponseEntity<ApiResponse<List<ApiKeyResponse>>> apiKeys(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return PlatformResponses.ok(service.apiKeys(principal(authorization)));
    }

    @PostMapping("/api-keys")
    ResponseEntity<ApiResponse<ApiKeyResponse>> createApiKey(@RequestHeader(name = "Authorization", required = false) String authorization, @RequestBody ApiKeyCreateRequest request) {
        return PlatformResponses.ok(service.createApiKey(principal(authorization), request));
    }

    @PostMapping("/api-keys/{keyId}/revoke")
    ResponseEntity<ApiResponse<ApiKeyResponse>> revokeApiKey(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String keyId) {
        return PlatformResponses.ok(service.revokeApiKey(principal(authorization), keyId));
    }

    private PlatformPrincipal principal(String authorization) {
        return identityService.requirePrincipal(authorization);
    }
}
