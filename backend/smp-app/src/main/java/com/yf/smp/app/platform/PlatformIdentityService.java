package com.yf.smp.app.platform;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformIdentityService {
    private static final int MAX_FAILED_LOGIN = 5;
    private static final int LOCK_MINUTES = 30;
    private static final int TOKEN_SECONDS = 3600;

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;

    public PlatformIdentityService(JdbcTemplate jdbc, PasswordEncoder passwordEncoder) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public LoginResponse login(LoginRequest request) {
        String tenantCode = blankToDefault(request.tenantCode(), "YF");
        PlatformUser user = findUserForLogin(request.username(), tenantCode);
        OffsetDateTime now = now();
        if (user.lockedUntil() != null && user.lockedUntil().isAfter(now)) {
            recordAudit(user.tenantId(), user.id(), user.displayName(), roleNames(user.id()), "AUTH_ACCOUNT_LOCKED", "User", user.id(), "FAILURE", "WARNING", null, null, "lockedUntil=" + user.lockedUntil());
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "账号已被锁定，请稍后重试或联系管理员解锁");
        }
        if (!passwordEncoder.matches(request.password(), user.passwordHash())) {
            int failedCount = user.failedLoginCount() + 1;
            OffsetDateTime lockedUntil = failedCount >= MAX_FAILED_LOGIN ? now.plusMinutes(LOCK_MINUTES) : null;
            jdbc.update("UPDATE platform_user SET failed_login_count=?, locked_until=?, updated_at=? WHERE id=?", failedCount, lockedUntil, now, user.id());
            recordAudit(user.tenantId(), user.id(), user.displayName(), roleNames(user.id()), failedCount >= MAX_FAILED_LOGIN ? "AUTH_ACCOUNT_LOCKED" : "AUTH_LOGIN_FAILURE", "User", user.id(), "FAILURE", failedCount >= MAX_FAILED_LOGIN ? "WARNING" : "INFO", null, null, "failedLoginCount=" + failedCount);
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, failedCount >= MAX_FAILED_LOGIN ? "账号已被锁定，请稍后重试或联系管理员解锁" : "用户名或密码错误");
        }
        if (!"ACTIVE".equals(user.status())) {
            throw new PlatformException(PlatformError.FORBIDDEN, "账号状态不可登录");
        }
        jdbc.update("UPDATE platform_user SET failed_login_count=0, locked_until=NULL, last_login_at=?, updated_at=? WHERE id=?", now, now, user.id());
        PlatformUser fresh = findUserById(user.id());
        PlatformSession session = createSession(fresh);
        PlatformPrincipal principal = principalFromSession(session.accessToken());
        recordAudit(fresh.tenantId(), fresh.id(), fresh.displayName(), principal.roleNames(), "AUTH_LOGIN_SUCCESS", "User", fresh.id(), "SUCCESS", "INFO", null, null, "login");
        return new LoginResponse(session.accessToken(), session.refreshToken(), "Bearer", TOKEN_SECONDS, toCurrentUser(principal));
    }

    @Transactional
    public void logout(String token) {
        PlatformPrincipal principal = requirePrincipal(token);
        jdbc.update("UPDATE platform_session SET revoked_at=? WHERE access_token=?", now(), principal.session().accessToken());
        recordAudit(principal.user().tenantId(), principal.user().id(), principal.user().displayName(), principal.roleNames(), "AUTH_LOGOUT", "Session", principal.session().accessToken(), "SUCCESS", "INFO", null, null, "logout");
    }

    @Transactional
    public LoginResponse refresh(String token) {
        PlatformPrincipal principal = requirePrincipal(token);
        jdbc.update("UPDATE platform_session SET revoked_at=? WHERE access_token=?", now(), principal.session().accessToken());
        PlatformSession session = createSession(principal.user());
        PlatformPrincipal refreshed = principalFromSession(session.accessToken());
        recordAudit(principal.user().tenantId(), principal.user().id(), principal.user().displayName(), principal.roleNames(), "SESSION_REFRESHED", "Session", session.accessToken(), "SUCCESS", "INFO", principal.session().accessToken(), session.accessToken(), "refresh");
        return new LoginResponse(session.accessToken(), session.refreshToken(), "Bearer", TOKEN_SECONDS, toCurrentUser(refreshed));
    }

    public CurrentUserResponse me(String token) {
        return toCurrentUser(requirePrincipal(token));
    }

    public PlatformPrincipal requirePrincipal(String token) {
        if (token == null || token.isBlank()) {
            throw new PlatformException(PlatformError.UNAUTHORIZED, "未认证或 Token 缺失");
        }
        String cleaned = cleanToken(token);
        try {
            return principalFromSession(cleaned);
        } catch (PlatformException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new PlatformException(PlatformError.UNAUTHORIZED, "未认证或 Token 失效");
        }
    }

    private String cleanToken(String token) {
        return token.replaceFirst("(?i)^Bearer\\s+", "").trim();
    }

    public void requirePermission(PlatformPrincipal principal, String permission) {
        if (!principal.hasPermission(permission)) {
            recordAudit(principal.user().tenantId(), principal.user().id(), principal.user().displayName(), principal.roleNames(), "ACCESS_DENIED", "Permission", permission, "FAILURE", "WARNING", null, null, "missing=" + permission);
            throw new PlatformException(PlatformError.FORBIDDEN, "权限不足");
        }
    }

    public boolean canManageUser(PlatformPrincipal principal, PlatformUser target) {
        return principal.isSuperAdmin() || (principal.isBuAdmin() && Objects.equals(principal.user().tenantId(), target.tenantId()));
    }

    public PlatformUser findUserById(String userId) {
        return jdbc.queryForObject("""
            SELECT u.*, t.name AS tenant_name FROM platform_user u JOIN platform_tenant t ON t.id = u.tenant_id WHERE u.id = ?
            """, userMapper(), userId);
    }

    public List<PlatformUser> usersVisibleTo(PlatformPrincipal principal) {
        if (principal.isSuperAdmin()) {
            return jdbc.query("SELECT u.*, t.name AS tenant_name FROM platform_user u JOIN platform_tenant t ON t.id = u.tenant_id ORDER BY u.created_at", userMapper());
        }
        return jdbc.query("SELECT u.*, t.name AS tenant_name FROM platform_user u JOIN platform_tenant t ON t.id = u.tenant_id WHERE u.tenant_id=? ORDER BY u.created_at", userMapper(), principal.user().tenantId());
    }

    public PageResponse<UserSummary> searchUsers(PlatformPrincipal principal, String keyword, String status, String roleCode, int page, int pageSize) {
        int normalizedPage = Math.max(page, 1);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 100));
        List<UserSummary> filtered = usersVisibleTo(principal).stream()
            .filter(user -> matchesKeyword(user, keyword))
            .filter(user -> status == null || status.isBlank() || user.status().equalsIgnoreCase(status))
            .filter(user -> roleCode == null || roleCode.isBlank() || roles(user.id()).stream().anyMatch(role -> role.equalsIgnoreCase(roleCode)))
            .map(this::toSummary)
            .toList();
        int from = Math.min((normalizedPage - 1) * normalizedPageSize, filtered.size());
        int to = Math.min(from + normalizedPageSize, filtered.size());
        return new PageResponse<>(filtered.subList(from, to), filtered.size(), normalizedPage, normalizedPageSize);
    }

    private boolean matchesKeyword(PlatformUser user, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return true;
        }
        String normalized = keyword.toLowerCase(java.util.Locale.ROOT);
        return user.id().toLowerCase(java.util.Locale.ROOT).contains(normalized)
            || user.username().toLowerCase(java.util.Locale.ROOT).contains(normalized)
            || user.displayName().toLowerCase(java.util.Locale.ROOT).contains(normalized)
            || user.email().toLowerCase(java.util.Locale.ROOT).contains(normalized);
    }

    @Transactional
    public PlatformUser createUser(PlatformPrincipal principal, CreateUserRequest request) {
        requirePermission(principal, "platform:user:create");
        String tenantId = blankToDefault(request.tenantId(), principal.user().tenantId());
        String tenantName = tenantName(tenantId);
        if (!principal.isSuperAdmin() && !Objects.equals(principal.user().tenantId(), tenantId)) {
            recordCrossBu(principal, tenantId);
            throw new PlatformException(PlatformError.FORBIDDEN, "您无权操作其他 BU 的资源");
        }
        String id = "USR-" + request.username().toUpperCase().replaceAll("[^A-Z0-9]", "");
        OffsetDateTime now = now();
        jdbc.update("""
            INSERT INTO platform_user (id, username, password_hash, display_name, email, tenant_id, bu_code, status, auth_type, failed_login_count, locked_until, session_version, last_login_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'LOCAL', 0, NULL, 1, NULL, ?, ?)
            """, id, request.username(), passwordEncoder.encode(request.password()), request.displayName(), request.email(), tenantId, blankToDefault(request.buCode(), tenantId), now, now);
        PlatformUser created = new PlatformUser(id, request.username(), "<hashed>", request.displayName(), request.email(), tenantId, tenantName, blankToDefault(request.buCode(), tenantId), "ACTIVE", "LOCAL", 0, null, 1, null);
        recordAudit(tenantId, principal.user().id(), principal.user().displayName(), principal.roleNames(), "USER_CREATED", "User", id, "SUCCESS", "INFO", null, null, "zero-permission-user");
        return created;
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public void updateStatus(PlatformPrincipal principal, String userId, String status) {
        requirePermission(principal, "platform:user:update");
        PlatformUser target = findUserById(userId);
        if (!canManageUser(principal, target)) {
            recordCrossBu(principal, target.tenantId());
            throw new PlatformException(PlatformError.FORBIDDEN, "您无权操作其他 BU 的资源");
        }
        if ("DISABLED".equals(status) && isLastSuperAdmin(target.id())) {
            recordAudit(target.tenantId(), principal.user().id(), principal.user().displayName(), principal.roleNames(), "USER_DISABLED", "User", target.id(), "FAILURE", "CRITICAL", target.status(), status, "last-super-admin");
            throw new PlatformException(PlatformError.CONFLICT, "系统中仅剩一位超级管理员，无法停用");
        }
        jdbc.update("UPDATE platform_user SET status=?, session_version=session_version + 1, updated_at=? WHERE id=?", status, now(), userId);
        revokeSessions(userId);
        recordAudit(target.tenantId(), principal.user().id(), principal.user().displayName(), principal.roleNames(), "ACTIVE".equals(status) ? "USER_ENABLED" : "USER_DISABLED", "User", target.id(), "SUCCESS", "DISABLED".equals(status) ? "CRITICAL" : "INFO", target.status(), status, "status-change");
    }

    @Transactional
    public void unlock(PlatformPrincipal principal, String userId) {
        requirePermission(principal, "platform:user:update");
        PlatformUser target = findUserById(userId);
        if (!canManageUser(principal, target)) {
            recordCrossBu(principal, target.tenantId());
            throw new PlatformException(PlatformError.FORBIDDEN, "您无权操作其他 BU 的资源");
        }
        jdbc.update("UPDATE platform_user SET failed_login_count=0, locked_until=NULL, status='ACTIVE', session_version=session_version + 1, updated_at=? WHERE id=?", now(), userId);
        revokeSessions(userId);
        recordAudit(target.tenantId(), principal.user().id(), principal.user().displayName(), principal.roleNames(), "USER_UNLOCKED", "User", userId, "SUCCESS", "INFO", null, null, "unlock");
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public void setRoles(PlatformPrincipal principal, String userId, List<String> roleCodes) {
        requirePermission(principal, "platform:role:assign");
        PlatformUser target = findUserById(userId);
        if (!canManageUser(principal, target)) {
            recordCrossBu(principal, target.tenantId());
            throw new PlatformException(PlatformError.FORBIDDEN, "您无权操作其他 BU 的资源");
        }
        List<String> oldRoles = roles(target.id());
        List<String> newRoles = roleCodes == null ? List.of() : roleCodes.stream().distinct().toList();
        if (oldRoles.contains("SUPER_ADMIN") && !newRoles.contains("SUPER_ADMIN") && isLastSuperAdmin(target.id())) {
            recordAudit(target.tenantId(), principal.user().id(), principal.user().displayName(), principal.roleNames(), "ROLE_REVOKED", "User", userId, "FAILURE", "CRITICAL", oldRoles.toString(), newRoles.toString(), "last-super-admin");
            throw new PlatformException(PlatformError.CONFLICT, "系统中仅剩一位超级管理员，无法撤销其角色");
        }
        if ("ACTIVE".equals(target.status()) && !oldRoles.isEmpty() && newRoles.isEmpty()) {
            recordAudit(target.tenantId(), principal.user().id(), principal.user().displayName(), principal.roleNames(), "ROLE_REVOKED", "User", userId, "FAILURE", "WARNING", oldRoles.toString(), "[]", "last-role");
            throw new PlatformException(PlatformError.CONFLICT, "操作后用户将无任何角色，请先为该用户分配新角色后再撤销现有角色");
        }
        jdbc.update("DELETE FROM platform_user_role WHERE user_id=?", userId);
        OffsetDateTime now = now();
        for (String roleCode : newRoles) {
            jdbc.update("INSERT INTO platform_user_role (id, user_id, role_code, tenant_id, active, expires_at, created_at) VALUES (?, ?, ?, ?, TRUE, NULL, ?)", userId + "::" + roleCode + "::" + target.tenantId(), userId, roleCode, target.tenantId(), now);
        }
        jdbc.update("UPDATE platform_user SET session_version=session_version + 1, updated_at=? WHERE id=?", now, userId);
        revokeSessions(userId);
        recordAudit(target.tenantId(), principal.user().id(), principal.user().displayName(), principal.roleNames(), "ROLE_ASSIGNED", "User", userId, "SUCCESS", "CRITICAL", oldRoles.toString(), newRoles.toString(), "role-change");
        recordAudit(target.tenantId(), principal.user().id(), principal.user().displayName(), principal.roleNames(), "SESSION_INVALIDATED", "User", userId, "SUCCESS", "WARNING", null, null, "role-change");
    }

    public List<RoleSummary> rolesSummary() {
        return jdbc.query("""
            SELECT r.code, r.name, r.description, r.scope, r.preset, COUNT(ur.user_id) AS user_count
            FROM platform_role r LEFT JOIN platform_user_role ur ON ur.role_code = r.code AND ur.active = TRUE
            GROUP BY r.code, r.name, r.description, r.scope, r.preset
            ORDER BY CASE r.code WHEN 'SUPER_ADMIN' THEN 1 WHEN 'BU_ADMIN' THEN 2 WHEN 'DATA_ANNOTATOR' THEN 3 WHEN 'DATA_REVIEWER' THEN 4 WHEN 'MODEL_TRAINER' THEN 5 WHEN 'MODEL_OPS' THEN 6 ELSE 99 END
            """, (rs, rowNum) -> new RoleSummary(rs.getString("code"), rs.getString("name"), rs.getString("description"), rs.getString("scope"), rs.getBoolean("preset"), rs.getInt("user_count")));
    }

    public List<PermissionSummary> permissions() {
        return jdbc.query("SELECT * FROM platform_permission ORDER BY module, level, code", (rs, rowNum) -> new PermissionSummary(rs.getString("code"), rs.getString("module"), rs.getString("resource"), rs.getString("action"), rs.getInt("level"), rs.getString("description")));
    }

    public PermissionMatrix permissionMatrix() {
        List<RoleSummary> roles = rolesSummary();
        List<PermissionSummary> permissions = permissions();
        List<PermissionModule> modules = permissions.stream()
            .collect(java.util.stream.Collectors.groupingBy(PermissionSummary::module, java.util.LinkedHashMap::new, java.util.stream.Collectors.toList()))
            .entrySet().stream().map(entry -> new PermissionModule(entry.getKey(), entry.getValue())).toList();
        List<RolePermissionRow> rows = new ArrayList<>();
        for (PermissionSummary permission : permissions) {
            List<String> allowedRoles = jdbc.queryForList("SELECT role_code FROM platform_role_permission WHERE permission_code=? ORDER BY role_code", String.class, permission.code());
            rows.add(new RolePermissionRow(permission.module(), permission.code(), permission.description(), allowedRoles));
        }
        return new PermissionMatrix(roles, modules, rows);
    }

    public PageResponse<AuditLogSummary> auditLogs(String actor, String action, String riskLevel, String result, OffsetDateTime startTime, OffsetDateTime endTime, int page, int pageSize) {
        int normalizedPage = Math.max(page, 1);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 100));
        List<AuditLogSummary> filtered = jdbc.query("SELECT * FROM platform_audit_log ORDER BY occurred_at DESC", auditMapper())
            .stream()
            .filter(item -> matchesText(item.operatorId(), actor) || matchesText(item.operatorName(), actor))
            .filter(item -> action == null || action.isBlank() || item.action().equalsIgnoreCase(action))
            .filter(item -> riskLevel == null || riskLevel.isBlank() || item.riskLevel().equalsIgnoreCase(riskLevel))
            .filter(item -> result == null || result.isBlank() || item.result().equalsIgnoreCase(result))
            .filter(item -> startTime == null || !item.occurredAt().isBefore(startTime))
            .filter(item -> endTime == null || !item.occurredAt().isAfter(endTime))
            .toList();
        int from = Math.min((normalizedPage - 1) * normalizedPageSize, filtered.size());
        int to = Math.min(from + normalizedPageSize, filtered.size());
        return new PageResponse<>(filtered.subList(from, to), filtered.size(), normalizedPage, normalizedPageSize);
    }

    public PageResponse<AuditLogSummary> auditEvent(String eventId) {
        List<AuditLogSummary> items = jdbc.query("SELECT * FROM platform_audit_log WHERE event_id=? ORDER BY occurred_at", auditMapper(), eventId);
        return new PageResponse<>(items, items.size(), 1, Math.max(items.size(), 1));
    }

    @Transactional
    public VerifyAuditResponse verifyAudit(String eventId, PlatformPrincipal principal) {
        List<AuditLogSummary> items = auditEvent(eventId).items();
        if (items.isEmpty()) {
            throw new PlatformException(PlatformError.NOT_FOUND, "审计事件不存在");
        }
        boolean valid = items.stream().allMatch(item -> Objects.equals(item.signature(), auditSignature(item)));
        recordAudit(principal.user().tenantId(), principal.user().id(), principal.user().displayName(), principal.roleNames(), "AUDIT_SIGNATURE_VERIFIED", "AuditLog", eventId, valid ? "SUCCESS" : "FAILURE", valid ? "INFO" : "CRITICAL", null, null, "verify");
        return new VerifyAuditResponse(eventId, valid);
    }

    @Transactional
    public AuditExportResponse exportAudit(PlatformPrincipal principal) {
        recordAudit(principal.user().tenantId(), principal.user().id(), principal.user().displayName(), principal.roleNames(), "AUDIT_EXPORT_REQUESTED", "AuditLog", "EXPORT", "SUCCESS", "CRITICAL", null, null, "TODO_CONFIRM_AUDIT_COLD_STORAGE");
        return new AuditExportResponse("TODO_CONFIRM_AUDIT_COLD_STORAGE", "审计导出请求已记录；冷存储位置待确认");
    }

    UserSummary toSummary(PlatformUser user) {
        return new UserSummary(user.id(), user.username(), user.displayName(), user.email(), user.tenantId(), user.tenantName(), user.buCode(), user.status(), user.authType(), roles(user.id()), roleNames(user.id()), user.lastLoginAt(), user.failedLoginCount(), user.lockedUntil(), user.sessionVersion());
    }

    CurrentUserResponse toCurrentUser(PlatformPrincipal principal) {
        PlatformUser user = principal.user();
        return new CurrentUserResponse(user.id(), user.username(), user.displayName(), user.tenantId(), user.tenantName(), user.buCode(), user.status(), principal.roles(), principal.roleNames(), principal.permissions(), principal.menuPermissions(), user.sessionVersion());
    }

    private PlatformUser findUserForLogin(String username, String tenantCode) {
        List<PlatformUser> users = jdbc.query("""
            SELECT u.*, t.name AS tenant_name FROM platform_user u JOIN platform_tenant t ON t.id = u.tenant_id WHERE u.username=? AND t.code=?
            """, userMapper(), username, tenantCode);
        if (users.isEmpty()) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "用户名或密码错误");
        }
        return users.getFirst();
    }

    private PlatformSession createSession(PlatformUser user) {
        String access = "atk_" + UUID.randomUUID().toString().replace("-", "");
        String refresh = "rtk_" + UUID.randomUUID().toString().replace("-", "");
        OffsetDateTime now = now();
        OffsetDateTime expires = now.plusSeconds(TOKEN_SECONDS);
        jdbc.update("INSERT INTO platform_session (access_token, refresh_token, user_id, session_version, expires_at, revoked_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)", access, refresh, user.id(), user.sessionVersion(), expires, now);
        return new PlatformSession(access, refresh, user.id(), user.sessionVersion(), expires, null);
    }

    private PlatformPrincipal principalFromSession(String token) {
        PlatformSession session = jdbc.queryForObject("SELECT * FROM platform_session WHERE access_token=?", (rs, rowNum) -> new PlatformSession(rs.getString("access_token"), rs.getString("refresh_token"), rs.getString("user_id"), rs.getInt("session_version"), toOffset(rs.getObject("expires_at", java.time.OffsetDateTime.class)), nullableOffset(rs, "revoked_at")), token);
        if (session.revokedAt() != null || session.expiresAt().isBefore(now())) {
            throw new PlatformException(PlatformError.UNAUTHORIZED, "未认证或 Token 失效");
        }
        PlatformUser user = findUserById(session.userId());
        if (!"ACTIVE".equals(user.status()) || user.sessionVersion() != session.sessionVersion()) {
            throw new PlatformException(PlatformError.UNAUTHORIZED, "未认证或 Token 失效");
        }
        List<String> roles = roles(user.id());
        List<String> roleNames = roleNames(user.id());
        List<String> permissions = permissions(user.id());
        List<String> menuPermissions = permissions.stream().filter(permission -> permission.startsWith("menu:")).map(permission -> permission.substring("menu:".length())).toList();
        return new PlatformPrincipal(user, session, roles, roleNames, permissions, menuPermissions);
    }

    private List<String> roles(String userId) {
        return jdbc.queryForList("SELECT role_code FROM platform_user_role WHERE user_id=? AND active=TRUE ORDER BY role_code", String.class, userId);
    }

    private List<String> roleNames(String userId) {
        return jdbc.queryForList("SELECT r.name FROM platform_user_role ur JOIN platform_role r ON r.code=ur.role_code WHERE ur.user_id=? AND ur.active=TRUE ORDER BY r.code", String.class, userId);
    }

    private List<String> permissions(String userId) {
        return jdbc.queryForList("""
            SELECT DISTINCT rp.permission_code FROM platform_user_role ur JOIN platform_role_permission rp ON rp.role_code = ur.role_code WHERE ur.user_id=? AND ur.active=TRUE ORDER BY rp.permission_code
            """, String.class, userId);
    }

    private boolean isLastSuperAdmin(String targetUserId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM platform_user u JOIN platform_user_role ur ON ur.user_id=u.id WHERE u.status='ACTIVE' AND ur.active=TRUE AND ur.role_code='SUPER_ADMIN'
            """, Integer.class);
        Boolean targetIsSuper = jdbc.queryForObject("SELECT COUNT(*) > 0 FROM platform_user_role WHERE user_id=? AND role_code='SUPER_ADMIN' AND active=TRUE", Boolean.class, targetUserId);
        return count != null && count <= 1 && Boolean.TRUE.equals(targetIsSuper);
    }

    private void revokeSessions(String userId) {
        jdbc.update("UPDATE platform_session SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL", now(), userId);
    }

    private void recordCrossBu(PlatformPrincipal principal, String targetTenantId) {
        recordAudit(principal.user().tenantId(), principal.user().id(), principal.user().displayName(), principal.roleNames(), "CROSS_TENANT_ACCESS_ATTEMPT", "Tenant", targetTenantId, "FAILURE", "CRITICAL", principal.user().tenantId(), targetTenantId, "cross-bu");
    }

    private void recordAudit(String tenantId, String operatorId, String operatorName, List<String> operatorRoles, String action, String resourceType, String resourceId, String result, String riskLevel, String before, String after, String detail) {
        OffsetDateTime occurredAt = now();
        String eventId = "EVT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        String traceId = nullToEmpty(PlatformResponses.traceId());
        String operatorRole = String.join(",", operatorRoles);
        String id = UUID.randomUUID().toString();
        String signature = auditSignature(id, eventId, tenantId, operatorId, operatorName, operatorRole, action, resourceType, resourceId, result, riskLevel, before, after, detail, traceId, occurredAt);
        jdbc.update("""
            INSERT INTO platform_audit_log (id, event_id, tenant_id, operator_id, operator_name, operator_role, action, resource_type, resource_id, result, risk_level, before_json, after_json, detail_json, trace_id, signature, occurred_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, id, eventId, tenantId, operatorId, operatorName, operatorRole, action, resourceType, resourceId, result, riskLevel, before, after, detail, traceId, signature, occurredAt);
    }

    private String auditSignature(AuditLogSummary item) {
        return auditSignature(item.id(), item.eventId(), item.tenantId(), item.operatorId(), item.operatorName(), item.operatorRole(), item.action(), item.resourceType(), item.resourceId(), item.result(), item.riskLevel(), item.beforeJson(), item.afterJson(), item.detailJson(), nullToEmpty(item.traceId()), item.occurredAt());
    }

    private String auditSignature(String id, String eventId, String tenantId, String operatorId, String operatorName, String operatorRole, String action, String resourceType, String resourceId, String result, String riskLevel, String before, String after, String detail, String traceId, OffsetDateTime occurredAt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(String.join(
                "|",
                nullToEmpty(id),
                nullToEmpty(eventId),
                nullToEmpty(tenantId),
                nullToEmpty(operatorId),
                nullToEmpty(operatorName),
                nullToEmpty(operatorRole),
                nullToEmpty(action),
                nullToEmpty(resourceType),
                nullToEmpty(resourceId),
                nullToEmpty(result),
                nullToEmpty(riskLevel),
                nullToEmpty(before),
                nullToEmpty(after),
                nullToEmpty(detail),
                nullToEmpty(traceId),
                canonicalTime(occurredAt)
            ).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private boolean matchesText(String value, String keyword) {
        return keyword == null || keyword.isBlank() || (value != null && value.toLowerCase(java.util.Locale.ROOT).contains(keyword.toLowerCase(java.util.Locale.ROOT)));
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String canonicalTime(OffsetDateTime value) {
        if (value == null) {
            return "";
        }
        return value.toInstant().truncatedTo(ChronoUnit.MICROS).atOffset(ZoneOffset.UTC).toString();
    }


    private String tenantName(String tenantId) {
        return jdbc.queryForObject("SELECT name FROM platform_tenant WHERE id=?", String.class, tenantId);
    }

    private RowMapper<PlatformUser> userMapper() {
        return (rs, rowNum) -> new PlatformUser(
            rs.getString("id"),
            rs.getString("username"),
            rs.getString("password_hash"),
            rs.getString("display_name"),
            rs.getString("email"),
            rs.getString("tenant_id"),
            rs.getString("tenant_name"),
            rs.getString("bu_code"),
            rs.getString("status"),
            rs.getString("auth_type"),
            rs.getInt("failed_login_count"),
            toOffset(rs.getObject("locked_until", java.time.OffsetDateTime.class)),
            rs.getInt("session_version"),
            toOffset(rs.getObject("last_login_at", java.time.OffsetDateTime.class))
        );
    }

    private RowMapper<AuditLogSummary> auditMapper() {
        return (rs, rowNum) -> new AuditLogSummary(
            rs.getString("id"), rs.getString("event_id"), rs.getString("tenant_id"), rs.getString("operator_id"), rs.getString("operator_name"), rs.getString("operator_role"), rs.getString("action"), rs.getString("resource_type"), rs.getString("resource_id"), rs.getString("result"), rs.getString("risk_level"), rs.getString("before_json"), rs.getString("after_json"), rs.getString("detail_json"), rs.getString("trace_id"), rs.getString("signature"), toOffset(rs.getObject("occurred_at", java.time.OffsetDateTime.class))
        );
    }

    private OffsetDateTime toOffset(OffsetDateTime value) {
        return value;
    }

    private OffsetDateTime nullableOffset(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        java.sql.Timestamp timestamp = rs.getTimestamp(column);
        if (timestamp == null) {
            return null;
        }
        return timestamp.toInstant().atOffset(ZoneOffset.UTC);
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);
    }

    private String blankToDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }
}

@Component
class PlatformDevPasswordSeeder implements org.springframework.boot.ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final org.springframework.core.env.Environment environment;

    PlatformDevPasswordSeeder(JdbcTemplate jdbc, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder, org.springframework.core.env.Environment environment) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
    }

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        for (String profile : environment.getActiveProfiles()) {
            if ("test".equals(profile) || "dev".equals(profile) || "local".equals(profile)) {
                jdbc.update("UPDATE platform_user SET password_hash=? WHERE username IN ('admin','buadmin','annotator','qeuser')", passwordEncoder.encode("Smp@123456"));
                return;
            }
        }
    }
}
