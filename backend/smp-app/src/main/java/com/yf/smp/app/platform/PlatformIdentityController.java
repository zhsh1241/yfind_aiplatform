package com.yf.smp.app.platform;

import com.yf.smp.common.api.ApiResponse;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
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
public class PlatformIdentityController {
    private final PlatformIdentityService service;

    public PlatformIdentityController(PlatformIdentityService service) {
        this.service = service;
    }

    @PostMapping("/auth/login")
    ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        return PlatformResponses.ok(service.login(request));
    }

    @PostMapping("/auth/logout")
    ResponseEntity<ApiResponse<Void>> logout(@RequestHeader(name = "Authorization", required = false) String authorization) {
        service.logout(authorization);
        return PlatformResponses.ok(null);
    }

    @PostMapping("/auth/refresh")
    ResponseEntity<ApiResponse<LoginResponse>> refresh(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return PlatformResponses.ok(service.refresh(authorization));
    }

    @GetMapping("/auth/me")
    ResponseEntity<ApiResponse<CurrentUserResponse>> me(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return PlatformResponses.ok(service.me(authorization));
    }

    @GetMapping("/platform/users")
    ResponseEntity<ApiResponse<PageResponse<UserSummary>>> users(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String roleCode,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        service.requirePermission(principal, "platform:user:read");
        return PlatformResponses.ok(service.searchUsers(principal, keyword, status, roleCode, page, pageSize));
    }

    @PostMapping("/platform/users")
    ResponseEntity<ApiResponse<UserSummary>> createUser(@RequestHeader(name = "Authorization", required = false) String authorization, @RequestBody CreateUserRequest request) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        return PlatformResponses.ok(service.toSummary(service.createUser(principal, request)));
    }

    @PatchMapping("/platform/users/{userId}/status")
    ResponseEntity<ApiResponse<Void>> updateStatus(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String userId, @RequestBody UpdateStatusRequest request) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        service.updateStatus(principal, userId, request.status());
        return PlatformResponses.ok(null);
    }

    @PostMapping("/platform/users/{userId}/unlock")
    ResponseEntity<ApiResponse<Void>> unlock(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String userId) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        service.unlock(principal, userId);
        return PlatformResponses.ok(null);
    }

    @PutMapping("/platform/users/{userId}/roles")
    ResponseEntity<ApiResponse<Void>> setRoles(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String userId, @RequestBody UpdateRolesRequest request) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        service.setRoles(principal, userId, request.roleCodes());
        return PlatformResponses.ok(null);
    }

    @GetMapping("/platform/roles")
    ResponseEntity<ApiResponse<List<RoleSummary>>> roles(@RequestHeader(name = "Authorization", required = false) String authorization) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        service.requirePermission(principal, "platform:role:read");
        return PlatformResponses.ok(service.rolesSummary());
    }

    @PostMapping("/platform/roles")
    ResponseEntity<ApiResponse<RoleSummary>> createRole(@RequestHeader(name = "Authorization", required = false) String authorization) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        service.requirePermission(principal, "platform:role:create");
        throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "自定义角色创建 seam 已保留，生产策略待 F007/F017 确认");
    }

    @GetMapping("/platform/permissions")
    ResponseEntity<ApiResponse<List<PermissionSummary>>> permissions(@RequestHeader(name = "Authorization", required = false) String authorization) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        service.requirePermission(principal, "platform:permission:read");
        return PlatformResponses.ok(service.permissions());
    }

    @GetMapping("/platform/permissions/matrix")
    ResponseEntity<ApiResponse<PermissionMatrix>> matrix(@RequestHeader(name = "Authorization", required = false) String authorization) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        service.requirePermission(principal, "platform:permission:read");
        return PlatformResponses.ok(service.permissionMatrix());
    }

    @PutMapping("/platform/roles/{roleCode}/permissions")
    ResponseEntity<ApiResponse<Void>> updateRolePermissions(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String roleCode) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        service.requirePermission(principal, "platform:permission:update");
        throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "预设角色权限只读，自定义角色权限更新留给后续 feature");
    }

    @GetMapping("/platform/audit-logs")
    ResponseEntity<ApiResponse<PageResponse<AuditLogSummary>>> auditLogs(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        @RequestParam(required = false) String actor,
        @RequestParam(required = false) String action,
        @RequestParam(required = false) String riskLevel,
        @RequestParam(required = false) String result,
        @RequestParam(required = false) OffsetDateTime startTime,
        @RequestParam(required = false) OffsetDateTime endTime,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        service.requirePermission(principal, "platform:audit:read");
        return PlatformResponses.ok(service.auditLogs(actor, action, riskLevel, result, startTime, endTime, page, pageSize));
    }

    @GetMapping("/platform/audit-logs/{eventId}")
    ResponseEntity<ApiResponse<PageResponse<AuditLogSummary>>> auditEvent(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String eventId) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        service.requirePermission(principal, "platform:audit:read");
        return PlatformResponses.ok(service.auditEvent(eventId));
    }

    @PostMapping("/platform/audit-logs/{eventId}/verify")
    ResponseEntity<ApiResponse<VerifyAuditResponse>> verifyAudit(@RequestHeader(name = "Authorization", required = false) String authorization, @PathVariable String eventId) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        service.requirePermission(principal, "platform:audit:read");
        return PlatformResponses.ok(service.verifyAudit(eventId, principal));
    }

    @PostMapping("/platform/audit-logs/export")
    ResponseEntity<ApiResponse<AuditExportResponse>> exportAudit(@RequestHeader(name = "Authorization", required = false) String authorization, @RequestBody(required = false) AuditExportRequest request) {
        PlatformPrincipal principal = service.requirePrincipal(authorization);
        service.requirePermission(principal, "platform:audit:export");
        return PlatformResponses.ok(service.exportAudit(principal));
    }

    @ExceptionHandler(PlatformException.class)
    ResponseEntity<ApiResponse<Void>> handlePlatform(PlatformException exception) {
        return PlatformResponses.fail(exception);
    }

    @ExceptionHandler(org.springframework.dao.EmptyResultDataAccessException.class)
    ResponseEntity<ApiResponse<Void>> handleNotFound(org.springframework.dao.EmptyResultDataAccessException exception) {
        return PlatformResponses.fail(PlatformError.NOT_FOUND, "资源不存在");
    }
}
