package com.yf.smp.app.platform;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

interface PaiResourceClient {
    PaiClientSyncResult sync(PaiConnectionRecord connection, PaiBindingRecord binding);
}

@Component
class DefaultPaiResourceClient implements PaiResourceClient {
    @Override
    public PaiClientSyncResult sync(PaiConnectionRecord connection, PaiBindingRecord binding) {
        if (connection == null || !connection.enabled() || containsTodo(connection.regionId()) || containsTodo(connection.workspaceId()) || containsTodo(connection.quotaId())) {
            return PaiClientSyncResult.unconfigured(binding.bindingId(), "TODO_CONFIRM_PAI_REGION;TODO_CONFIRM_PAI_WORKSPACE_ID;TODO_CONFIRM_PAI_QUOTA_ID");
        }
        if ("AUTH_FAILED".equalsIgnoreCase(connection.status())) {
            return new PaiClientSyncResult("FAILED", "AUTH_FAILED", "PAI_AUTH_FAILED", "PAI authentication failed", true, "SANDBOX-AUTH-FAILED", "[]", "[]", "[]", "[]");
        }
        if ("RATE_LIMITED".equalsIgnoreCase(connection.status())) {
            return new PaiClientSyncResult("FAILED", "RATE_LIMITED", "PAI_RATE_LIMITED", "PAI rate limited", true, "SANDBOX-RATE-LIMITED", "[]", "[]", "[]", "[]");
        }
        if ("UNAVAILABLE".equalsIgnoreCase(connection.status()) || "TIMEOUT".equalsIgnoreCase(connection.status())) {
            return new PaiClientSyncResult("FAILED", connection.status(), "TIMEOUT".equalsIgnoreCase(connection.status()) ? "PAI_TIMEOUT" : "PAI_UNAVAILABLE", "PAI service unavailable or timeout", true, "SANDBOX-UNAVAILABLE", "[]", "[]", "[]", "[]");
        }
        if (!isSandboxSeam(connection)) {
            return new PaiClientSyncResult("FAILED", "UNAVAILABLE", "PAI_CLIENT_NOT_CONFIGURED", "TODO_CONFIRM_PAI_SDK_OR_ADAPTER: real PAI client is not configured for this environment", true, "TODO_CONFIRM_PAI_REQUEST_ID_OR_SANDBOX", "[]", "[]", "[]", "[]");
        }
        return PaiClientSyncResult.sandbox(binding);
    }

    private boolean containsTodo(String value) {
        return value == null || value.isBlank() || value.startsWith("TODO_CONFIRM");
    }

    private boolean isSandboxSeam(PaiConnectionRecord connection) {
        return containsIgnoreCase(connection.endpoint(), "sandbox") || containsIgnoreCase(connection.credentialRefMasked(), "SANDBOX");
    }

    private boolean containsIgnoreCase(String value, String needle) {
        return value != null && value.toUpperCase(Locale.ROOT).contains(needle.toUpperCase(Locale.ROOT));
    }
}

@Service
public class PaiResourceService {
    private static final String TRACE_TAG = "TASK-pai-resource-integration";

    private final JdbcTemplate jdbc;
    private final PlatformIdentityService identityService;
    private final PaiResourceClient client;
    private final ObjectMapper objectMapper;

    public PaiResourceService(JdbcTemplate jdbc, PlatformIdentityService identityService, PaiResourceClient client) {
        this.jdbc = jdbc;
        this.identityService = identityService;
        this.client = client;
        this.objectMapper = new ObjectMapper();
    }

    public PaiResourceStatusResponse status(PlatformPrincipal principal) {
        identityService.requirePermission(principal, "platform:pai-resource:read");
        PaiConnectionRecord connection = connection();
        PaiSnapshotRecord snapshot = latestVisibleSnapshot(principal);
        boolean configured = connection.enabled() && !containsTodo(connection.regionId()) && !containsTodo(connection.workspaceId()) && !containsTodo(connection.quotaId());
        return new PaiResourceStatusResponse(
            connection.status(),
            configured,
            connection.enabled(),
            connection.regionId(),
            connection.endpoint(),
            connection.workspaceId(),
            connection.quotaId(),
            connection.resourceGroupId(),
            connection.credentialMode(),
            connection.credentialRefMasked(),
            connection.diagnosticCode(),
            connection.diagnosticMessage(),
            snapshot == null ? null : snapshot.lastSyncAt(),
            snapshot != null && snapshot.stale()
        );
    }

    public PaiResourceOverviewResponse overview(PlatformPrincipal principal, String organizationId) {
        identityService.requirePermission(principal, "platform:pai-resource:read");
        PaiBindingRecord binding = bindingForScope(principal, organizationId);
        PaiSnapshotRecord snapshot = latestSnapshot(binding.bindingId());
        if (snapshot == null) {
            return new PaiResourceOverviewResponse(binding.status(), binding.scopeType(), binding.organizationId(), binding.bindingId(), binding.workspaceId(), binding.quotaId(), binding.resourceGroupId(), null, false, binding.diagnosticCode(), binding.diagnosticMessage(), List.of(), "NO_SNAPSHOT");
        }
        return new PaiResourceOverviewResponse(snapshot.status(), binding.scopeType(), binding.organizationId(), binding.bindingId(), binding.workspaceId(), binding.quotaId(), binding.resourceGroupId(), snapshot.lastSyncAt(), snapshot.stale(), snapshot.diagnosticCode(), snapshot.diagnosticMessage(), readList(snapshot.usageSummaryJson(), new TypeReference<List<PaiResourceUsageCard>>() {}), "PAI_SNAPSHOT");
    }

    public PageResponse<PaiResourceBindingResponse> workspaces(PlatformPrincipal principal) {
        identityService.requirePermission(principal, "platform:pai-resource:binding:read");
        List<PaiResourceBindingResponse> items = visibleBindings(principal).stream().map(binding -> new PaiResourceBindingResponse(binding.bindingId(), binding.organizationId(), binding.organizationName(), binding.scopeType(), binding.workspaceId(), binding.workspaceName(), binding.quotaId(), binding.quotaName(), binding.resourceGroupId(), binding.status(), binding.diagnosticCode(), binding.diagnosticMessage(), latestSyncAt(binding.bindingId()))).toList();
        return new PageResponse<>(items, items.size(), 1, Math.max(items.size(), 1));
    }

    public PageResponse<PaiResourceNodeResponse> nodes(PlatformPrincipal principal, String bindingId) {
        identityService.requirePermission(principal, "platform:pai-resource:read");
        PaiSnapshotRecord snapshot = snapshotForVisibleBinding(principal, bindingId);
        List<PaiResourceNodeResponse> items = readList(snapshot.nodeSummaryJson(), new TypeReference<List<PaiResourceNodeResponse>>() {});
        return new PageResponse<>(items, items.size(), 1, Math.max(items.size(), 1));
    }

    public PageResponse<PaiResourcePoolResponse> pools(PlatformPrincipal principal, String bindingId) {
        identityService.requirePermission(principal, "platform:pai-resource:read");
        PaiSnapshotRecord snapshot = snapshotForVisibleBinding(principal, bindingId);
        List<PaiResourcePoolResponse> items = readList(snapshot.poolSummaryJson(), new TypeReference<List<PaiResourcePoolResponse>>() {});
        return new PageResponse<>(items, items.size(), 1, Math.max(items.size(), 1));
    }

    public PageResponse<PaiResourceStorageResponse> storage(PlatformPrincipal principal, String bindingId) {
        identityService.requirePermission(principal, "platform:pai-resource:read");
        PaiSnapshotRecord snapshot = snapshotForVisibleBinding(principal, bindingId);
        List<PaiResourceStorageResponse> items = readList(snapshot.storageSummaryJson(), new TypeReference<List<PaiResourceStorageResponse>>() {});
        return new PageResponse<>(items, items.size(), 1, Math.max(items.size(), 1));
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public PaiResourceStatusResponse updateConnection(PlatformPrincipal principal, PaiConnectionUpdateRequest request) {
        identityService.requirePermission(principal, "platform:pai-resource:configure");
        if (!principal.isSuperAdmin()) {
            recordAudit(principal, principal.user().tenantId(), "PAI_CONNECTION_UPDATE_DENIED", "PaiConnection", "PAI-CONN-GLOBAL", "FAILURE", "CRITICAL", null, null, TRACE_TAG);
            throw new PlatformException(PlatformError.FORBIDDEN, "仅超级管理员可维护全局 PAI 连接配置");
        }
        PaiConnectionRecord current = connection();
        rejectSecret(request.regionId());
        rejectSecret(request.endpoint());
        rejectSecret(request.workspaceId());
        rejectSecret(request.quotaId());
        rejectSecret(request.resourceGroupId());
        rejectSecret(request.credentialMode());
        rejectSecret(request.credentialRefMasked());
        String credentialRefMasked = maskCredential(blankToDefault(request.credentialRefMasked(), current.credentialRefMasked()));
        boolean enabled = request.enabled() != null ? request.enabled() : current.enabled();
        String regionId = blankToDefault(request.regionId(), current.regionId());
        String workspaceId = blankToDefault(request.workspaceId(), current.workspaceId());
        String quotaId = blankToDefault(request.quotaId(), current.quotaId());
        String diagnosticCode = enabled && !containsTodo(regionId) && !containsTodo(workspaceId) && !containsTodo(quotaId) ? "OK" : "PAI_UNCONFIGURED";
        String status = blankToDefault(request.status(), "OK".equals(diagnosticCode) ? "READY" : "UNCONFIGURED").toUpperCase(Locale.ROOT);
        String diagnosticMessage = blankToDefault(request.diagnosticMessage(), "OK".equals(diagnosticCode) ? "ready for PAI sync" : "TODO_CONFIRM_PAI_REGION;TODO_CONFIRM_PAI_WORKSPACE_ID;TODO_CONFIRM_PAI_QUOTA_ID");
        jdbc.update("""
            UPDATE platform_pai_connection
            SET region_id=?, endpoint=?, workspace_id=?, quota_id=?, resource_group_id=?, credential_mode=?, credential_ref_masked=?, enabled=?, status=?, diagnostic_code=?, diagnostic_message=?, updated_by=?, updated_at=?
            WHERE id=?
            """,
            regionId,
            blankToDefault(request.endpoint(), current.endpoint()),
            workspaceId,
            quotaId,
            blankToDefault(request.resourceGroupId(), current.resourceGroupId()),
            blankToDefault(request.credentialMode(), current.credentialMode()),
            credentialRefMasked,
            enabled,
            status,
            diagnosticCode,
            diagnosticMessage,
            principal.user().id(),
            now(),
            current.id()
        );
        recordAudit(principal, principal.user().tenantId(), "PAI_CONNECTION_UPDATED", "PaiConnection", current.id(), "SUCCESS", "CRITICAL", current.status() + ":" + current.regionId(), status + ":" + regionId, TRACE_TAG);
        return status(principal);
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public PaiResourceBindingResponse updateBinding(PlatformPrincipal principal, String bindingId, PaiResourceBindingUpdateRequest request) {
        identityService.requirePermission(principal, "platform:pai-resource:binding:update");
        PaiBindingRecord current = binding(bindingId);
        String organizationId = blankToDefault(request.organizationId(), current.organizationId());
        ensureCanSeeOrganization(principal, organizationId, true);
        rejectSecret(request.workspaceId());
        rejectSecret(request.quotaId());
        rejectSecret(request.resourceGroupId());
        OffsetDateTime now = now();
        int updatedRows = jdbc.update("""
                UPDATE platform_pai_resource_binding
                SET organization_id=?, scope_type=?, workspace_id=?, workspace_name=?, quota_id=?, quota_name=?, resource_group_id=?, status=?, diagnostic_code=?, diagnostic_message=?, updated_by=?, updated_at=?
                WHERE binding_id=?
                """,
            organizationId,
            scopeTypeForOrganization(organizationId),
            requireText(request.workspaceId(), "PAI Workspace ID 不能为空"),
            blankToDefault(request.workspaceName(), request.workspaceId()),
            requireText(request.quotaId(), "PAI Quota ID 不能为空"),
            blankToDefault(request.quotaName(), request.quotaId()),
            blankToDefault(request.resourceGroupId(), "TODO_CONFIRM_PAI_RESOURCE_GROUP_ID"),
            blankToDefault(request.status(), "ACTIVE").toUpperCase(Locale.ROOT),
            "OK",
            blankToDefault(request.diagnosticMessage(), "updated by SMP"),
            principal.user().id(),
            now,
            bindingId
        );
        if (updatedRows == 0) {
            throw new PlatformException(PlatformError.NOT_FOUND, "PAI binding not found: " + bindingId);
        }
        recordAudit(principal, organizationId, "PAI_BINDING_UPDATED", "PaiResourceBinding", bindingId, "SUCCESS", "CRITICAL", current.workspaceId() + ":" + current.quotaId(), request.workspaceId() + ":" + request.quotaId(), TRACE_TAG);
        PaiBindingRecord updated = binding(bindingId);
        return new PaiResourceBindingResponse(updated.bindingId(), updated.organizationId(), updated.organizationName(), updated.scopeType(), updated.workspaceId(), updated.workspaceName(), updated.quotaId(), updated.quotaName(), updated.resourceGroupId(), updated.status(), updated.diagnosticCode(), updated.diagnosticMessage(), latestSyncAt(updated.bindingId()));
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public PaiSyncResponse sync(PlatformPrincipal principal, PaiResourceSyncRequest request) {
        identityService.requirePermission(principal, "platform:pai-resource:sync");
        String bindingId = blankToDefault(request == null ? null : request.bindingId(), defaultBindingId(principal));
        PaiBindingRecord binding = visibleBinding(principal, bindingId);
        recordAudit(principal, binding.organizationId(), "PAI_SYNC_REQUESTED", "PaiResourceBinding", bindingId, "SUCCESS", "INFO", null, null, TRACE_TAG);
        OffsetDateTime started = now();
        PaiClientSyncResult result = client.sync(connection(), binding);
        OffsetDateTime finished = now();
        String syncId = "PAI-SYNC-" + randomHex(10).toUpperCase(Locale.ROOT);
        String traceId = PlatformResponses.traceId();
        boolean success = "SUCCESS".equals(result.result());
        PaiSnapshotRecord previous = latestSnapshot(binding.bindingId());
        OffsetDateTime lastSyncAt = success ? finished : (previous == null ? finished : previous.lastSyncAt());
        if (success) {
            jdbc.update("""
                INSERT INTO platform_pai_resource_snapshot (snapshot_id, binding_id, source_version, usage_summary_json, node_summary_json, pool_summary_json, storage_summary_json, status, stale, diagnostic_code, diagnostic_message, pai_request_id, trace_id, last_sync_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, ?, ?, ?)
                """, "PAI-SNAP-" + randomHex(10).toUpperCase(Locale.ROOT), binding.bindingId(), "SANDBOX-" + finished.toInstant().toEpochMilli(), result.usageSummaryJson(), result.nodeSummaryJson(), result.poolSummaryJson(), result.storageSummaryJson(), result.status(), result.diagnosticCode(), result.diagnosticMessage(), result.paiRequestId(), traceId, finished);
        } else if (previous != null) {
            jdbc.update("UPDATE platform_pai_resource_snapshot SET stale=TRUE, status=?, diagnostic_code=?, diagnostic_message=?, pai_request_id=?, trace_id=? WHERE snapshot_id=?", result.status(), result.diagnosticCode(), result.diagnosticMessage(), result.paiRequestId(), traceId, previous.snapshotId());
            recordAudit(principal, binding.organizationId(), "PAI_SYNC_STALE_SNAPSHOT_USED", "PaiResourceSnapshot", previous.snapshotId(), "SUCCESS", "WARNING", null, previous.status(), TRACE_TAG);
        }
        jdbc.update("""
            INSERT INTO platform_pai_sync_log (sync_id, binding_id, trigger_type, actor_user_id, started_at, finished_at, duration_ms, result, diagnostic_code, diagnostic_message, pai_request_id, trace_id)
            VALUES (?, ?, 'MANUAL', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, syncId, binding.bindingId(), principal.user().id(), started, finished, Math.max(0, Duration.between(started, finished).toMillis()), result.result(), result.diagnosticCode(), result.diagnosticMessage(), result.paiRequestId(), traceId);
        recordAudit(principal, binding.organizationId(), success ? "PAI_SYNC_SUCCEEDED" : "PAI_SYNC_FAILED", "PaiResourceBinding", binding.bindingId(), success ? "SUCCESS" : "FAILURE", success ? "INFO" : "WARNING", null, result.status(), TRACE_TAG + ";" + result.diagnosticCode());
        if (!success && previous == null) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, result.diagnosticCode() + ": " + result.diagnosticMessage());
        }
        return new PaiSyncResponse(syncId, binding.bindingId(), result.result(), result.status(), result.diagnosticCode(), result.diagnosticMessage(), lastSyncAt, !success, result.paiRequestId());
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public PaiResourceReferenceResponse reference(PlatformPrincipal principal, String organizationId) {
        identityService.requirePermission(principal, "platform:pai-resource:reference:read");
        PaiBindingRecord binding = bindingForScope(principal, organizationId);
        boolean usable = "ACTIVE".equals(binding.status()) && "OK".equals(binding.diagnosticCode());
        recordAudit(principal, binding.organizationId(), usable ? "PAI_RESOURCE_REFERENCE_REQUESTED" : "PAI_RESOURCE_REFERENCE_BLOCKED", "PaiResourceBinding", binding.bindingId(), usable ? "SUCCESS" : "FAILURE", usable ? "INFO" : "WARNING", null, binding.status(), TRACE_TAG);
        if (!usable) {
            throw new PlatformException(PlatformError.CONFLICT, "PAI_BINDING_DISABLED: " + binding.diagnosticMessage());
        }
        return new PaiResourceReferenceResponse(binding.bindingId(), binding.organizationId(), binding.workspaceId(), binding.quotaId(), binding.resourceGroupId(), binding.status(), true, binding.diagnosticCode(), binding.diagnosticMessage());
    }

    private PaiSnapshotRecord snapshotForVisibleBinding(PlatformPrincipal principal, String bindingId) {
        PaiBindingRecord binding = visibleBinding(principal, blankToDefault(bindingId, defaultBindingId(principal)));
        PaiSnapshotRecord snapshot = latestSnapshot(binding.bindingId());
        if (snapshot == null) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "PAI_UNCONFIGURED: no PAI snapshot available");
        }
        return snapshot;
    }

    private PaiBindingRecord bindingForScope(PlatformPrincipal principal, String organizationId) {
        if (organizationId != null && !organizationId.isBlank()) {
            ensureCanSeeOrganization(principal, organizationId, false);
            List<PaiBindingRecord> matches = jdbc.query("""
                SELECT b.*, t.name AS organization_name, t.path AS organization_path FROM platform_pai_resource_binding b JOIN platform_tenant t ON t.id=b.organization_id
                WHERE b.organization_id=? ORDER BY b.updated_at DESC
                """, (rs, rowNum) -> bindingRecord(rs), organizationId);
            if (!matches.isEmpty()) return matches.getFirst();
        }
        return visibleBinding(principal, defaultBindingId(principal));
    }

    private PaiBindingRecord visibleBinding(PlatformPrincipal principal, String bindingId) {
        PaiBindingRecord binding = binding(bindingId);
        ensureCanSeeOrganization(principal, binding.organizationId(), false);
        return binding;
    }

    private List<PaiBindingRecord> visibleBindings(PlatformPrincipal principal) {
        return jdbc.query("""
            SELECT b.*, t.name AS organization_name, t.path AS organization_path FROM platform_pai_resource_binding b JOIN platform_tenant t ON t.id=b.organization_id
            ORDER BY b.updated_at DESC
            """, (rs, rowNum) -> bindingRecord(rs)).stream().filter(binding -> canSeeOrganization(principal, binding.organizationId())).toList();
    }

    private PaiSnapshotRecord latestVisibleSnapshot(PlatformPrincipal principal) {
        for (PaiBindingRecord binding : visibleBindings(principal)) {
            PaiSnapshotRecord snapshot = latestSnapshot(binding.bindingId());
            if (snapshot != null) return snapshot;
        }
        return null;
    }

    private PaiBindingRecord binding(String bindingId) {
        return jdbc.queryForObject("""
            SELECT b.*, t.name AS organization_name, t.path AS organization_path FROM platform_pai_resource_binding b JOIN platform_tenant t ON t.id=b.organization_id WHERE b.binding_id=?
            """, (rs, rowNum) -> bindingRecord(rs), bindingId);
    }

    private PaiBindingRecord bindingRecord(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new PaiBindingRecord(rs.getString("binding_id"), rs.getString("organization_id"), rs.getString("organization_name"), rs.getString("organization_path"), rs.getString("scope_type"), rs.getString("workspace_id"), rs.getString("workspace_name"), rs.getString("quota_id"), rs.getString("quota_name"), rs.getString("resource_group_id"), rs.getString("status"), rs.getString("diagnostic_code"), rs.getString("diagnostic_message"), rs.getObject("updated_at", OffsetDateTime.class));
    }

    private PaiConnectionRecord connection() {
        return jdbc.queryForObject("SELECT * FROM platform_pai_connection WHERE id='PAI-CONN-GLOBAL'", (rs, rowNum) -> new PaiConnectionRecord(rs.getString("id"), rs.getString("scope_type"), rs.getString("scope_id"), rs.getString("region_id"), rs.getString("endpoint"), rs.getString("workspace_id"), rs.getString("quota_id"), rs.getString("resource_group_id"), rs.getString("credential_mode"), rs.getString("credential_ref_masked"), rs.getBoolean("enabled"), rs.getString("status"), rs.getString("diagnostic_code"), rs.getString("diagnostic_message"), rs.getObject("updated_at", OffsetDateTime.class)));
    }

    private PaiSnapshotRecord latestSnapshot(String bindingId) {
        List<PaiSnapshotRecord> snapshots = jdbc.query("SELECT * FROM platform_pai_resource_snapshot WHERE binding_id=? ORDER BY last_sync_at DESC LIMIT 1", (rs, rowNum) -> new PaiSnapshotRecord(rs.getString("snapshot_id"), rs.getString("binding_id"), rs.getString("source_version"), rs.getString("usage_summary_json"), rs.getString("node_summary_json"), rs.getString("pool_summary_json"), rs.getString("storage_summary_json"), rs.getString("status"), rs.getBoolean("stale"), rs.getString("diagnostic_code"), rs.getString("diagnostic_message"), rs.getString("pai_request_id"), rs.getString("trace_id"), rs.getObject("last_sync_at", OffsetDateTime.class)), bindingId);
        return snapshots.isEmpty() ? null : snapshots.getFirst();
    }

    private OffsetDateTime latestSyncAt(String bindingId) {
        PaiSnapshotRecord snapshot = latestSnapshot(bindingId);
        return snapshot == null ? null : snapshot.lastSyncAt();
    }

    private String defaultBindingId(PlatformPrincipal principal) {
        if (principal.isSuperAdmin()) return "PAI-BIND-CABIN";
        List<String> ids = jdbc.queryForList("SELECT binding_id FROM platform_pai_resource_binding WHERE organization_id=? ORDER BY updated_at DESC", String.class, principal.user().tenantId());
        if (ids.isEmpty()) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "PAI_UNCONFIGURED: no binding for organization");
        return ids.getFirst();
    }

    private boolean canSeeOrganization(PlatformPrincipal principal, String organizationId) {
        if (principal.isSuperAdmin()) return true;
        String ownPath = orgPathOrEmpty(principal.user().tenantId());
        String targetPath = orgPathOrEmpty(organizationId);
        if (ownPath.isBlank() || targetPath.isBlank()) return false;
        return targetPath.startsWith(ownPath);
    }

    private void ensureCanSeeOrganization(PlatformPrincipal principal, String organizationId, boolean write) {
        if (canSeeOrganization(principal, organizationId)) return;
        recordAudit(principal, principal.user().tenantId(), "PAI_CROSS_BU_ACCESS_DENIED", "Tenant", organizationId, "FAILURE", "CRITICAL", principal.user().tenantId(), organizationId, TRACE_TAG);
        throw new PlatformException(PlatformError.FORBIDDEN, write ? "您无权维护其他 BU 的 PAI 资源映射" : "您无权查看其他 BU 的 PAI 资源");
    }

    private String orgPath(String organizationId) {
        return jdbc.queryForObject("SELECT path FROM platform_tenant WHERE id=?", String.class, organizationId);
    }

    private String orgPathOrEmpty(String organizationId) {
        List<String> paths = jdbc.queryForList("SELECT path FROM platform_tenant WHERE id=?", String.class, organizationId);
        return paths.isEmpty() ? "" : paths.getFirst();
    }

    private String scopeTypeForOrganization(String organizationId) {
        return jdbc.queryForObject("SELECT tenant_type FROM platform_tenant WHERE id=?", String.class, organizationId);
    }

    private void rejectSecret(String value) {
        if (value != null && (value.toLowerCase(Locale.ROOT).contains("credentialsecret") || value.toLowerCase(Locale.ROOT).contains("credentialkey"))) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "PAI_SECRET_NOT_ALLOWED: do not store plaintext credential key/secret");
        }
    }

    private String maskCredential(String value) {
        if (value == null || value.isBlank()) {
            return "TODO_CONFIRM_PAI_RAM_ROLE_ARN";
        }
        if (value.toUpperCase(Locale.ROOT).contains("SANDBOX")) {
            return value;
        }
        if (containsTodo(value)) {
            return value;
        }
        if (value.length() <= 12) {
            return value.charAt(0) + "****" + value.charAt(value.length() - 1);
        }
        return value.substring(0, 6) + "****" + value.substring(value.length() - 4);
    }

    private <T> List<T> readList(String json, TypeReference<List<T>> typeReference) {
        try {
            return objectMapper.readValue(json == null || json.isBlank() ? "[]" : json, typeReference);
        } catch (Exception exception) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "PAI_SNAPSHOT_INVALID: " + exception.getMessage());
        }
    }

    private void recordAudit(PlatformPrincipal principal, String tenantId, String action, String resourceType, String resourceId, String result, String riskLevel, String before, String after, String detail) {
        OffsetDateTime occurredAt = now();
        String eventId = "EVT-" + randomHex(8).toUpperCase(Locale.ROOT);
        String traceId = nullToEmpty(PlatformResponses.traceId());
        String operatorRole = String.join(",", principal.roleNames());
        String id = UUID.randomUUID().toString();
        String signature = auditSignature(id, eventId, tenantId, principal.user().id(), principal.user().displayName(), operatorRole, action, resourceType, resourceId, result, riskLevel, before, after, detail, traceId, occurredAt);
        jdbc.update("""
            INSERT INTO platform_audit_log (id, event_id, tenant_id, operator_id, operator_name, operator_role, action, resource_type, resource_id, result, risk_level, before_json, after_json, detail_json, trace_id, signature, occurred_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, id, eventId, tenantId, principal.user().id(), principal.user().displayName(), operatorRole, action, resourceType, resourceId, result, riskLevel, before, after, detail, traceId, signature, occurredAt);
    }

    private boolean containsTodo(String value) {
        return value == null || value.isBlank() || value.startsWith("TODO_CONFIRM");
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

    private String canonicalTime(OffsetDateTime value) {
        if (value == null) {
            return "";
        }
        return value.toInstant().truncatedTo(ChronoUnit.MICROS).atOffset(ZoneOffset.UTC).toString();
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, message);
        return value.trim();
    }

    private String blankToDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);
    }

    private String randomHex(int length) {
        return UUID.randomUUID().toString().replace("-", "").substring(0, length);
    }
}
