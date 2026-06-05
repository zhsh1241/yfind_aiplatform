package com.yf.smp.app.platform;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class EdgeManagementService {
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final JdbcTemplate jdbc;
    private final PlatformIdentityService identityService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    EdgeManagementService(JdbcTemplate jdbc, PlatformIdentityService identityService) {
        this.jdbc = jdbc;
        this.identityService = identityService;
    }

    @Transactional(readOnly = true)
    PageResponse<EdgeServerResponse> listServers(
        PlatformPrincipal principal,
        String keyword,
        String status,
        String organizationId,
        int page,
        int pageSize
    ) {
        requireEdgePermission(principal, "edge:server:read");
        int normalizedPage = Math.max(1, page);
        int normalizedPageSize = Math.max(1, Math.min(100, pageSize));
        StringBuilder where = new StringBuilder("tenant_id=?");
        java.util.ArrayList<Object> params = new java.util.ArrayList<>();
        params.add(principal.user().tenantId());
        if (!isBlank(keyword)) {
            where.append(" AND (LOWER(server_name) LIKE ? OR LOWER(location) LIKE ? OR LOWER(host_address) LIKE ?)");
            String kw = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            params.add(kw);
            params.add(kw);
            params.add(kw);
        }
        if (!isBlank(status)) {
            where.append(" AND status=?");
            params.add(normalizeServerStatus(status));
        }
        if (!isBlank(organizationId)) {
            where.append(" AND organization_id=?");
            params.add(organizationId.trim());
        }
        Integer total = jdbc.queryForObject("SELECT COUNT(*) FROM edge_server WHERE " + where, Integer.class, params.toArray());
        params.add(normalizedPageSize);
        params.add((normalizedPage - 1) * normalizedPageSize);
        List<EdgeServerResponse> items = jdbc.query(
            "SELECT * FROM edge_server WHERE " + where + " ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (rs, rowNum) -> serverRow(rs, principal),
            params.toArray()
        );
        return new PageResponse<>(items, total == null ? 0 : total, normalizedPage, normalizedPageSize);
    }

    @Transactional
    EdgeServerResponse createServer(PlatformPrincipal principal, EdgeServerCreateRequest request) {
        requireEdgePermission(principal, "edge:server:write");
        requireBody(request);
        String orgId = blankToDefault(request.organizationId(), principal.user().tenantId()).trim();
        ensureSameTenant(principal, orgId);
        ensureUserVisible(request.ownerUserId(), orgId);
        OffsetDateTime now = now();
        String id = "EDGE-" + randomIdPart(16);
        jdbc.update(
            """
            INSERT INTO edge_server (edge_server_id, server_name, location, organization_id, owner_user_id, host_address,
                agent_version, hardware_summary_json, resource_summary_json, status, diagnostic, tenant_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}', 'REGISTERED', 'MANUAL_AGENT_SEAM;TODO_CONFIRM_EDGE_AGENT_PROTOCOL', ?, ?, ?)
            """,
            id,
            requireText(request.serverName(), "边端服务器名称必填"),
            requireText(request.location(), "边端位置必填"),
            orgId,
            requireText(request.ownerUserId(), "owner 必填"),
            requireText(request.hostAddress(), "host 必填"),
            blankToNull(request.agentVersion()),
            toJson(defaultMap(request.hardwareSummary())),
            principal.user().tenantId(),
            now,
            now
        );
        EdgeServerResponse created = serverById(principal, id);
        recordAudit(principal, "EDGE_SERVER_REGISTERED", "EdgeServer", id, "SUCCESS", null, created.status(), "TASK-edge-management-delivery;AC-01");
        return created;
    }

    @Transactional(readOnly = true)
    EdgeServerResponse serverDetail(PlatformPrincipal principal, String edgeServerId) {
        requireEdgePermission(principal, "edge:server:read");
        return serverById(principal, edgeServerId);
    }

    @Transactional
    EdgeServerResponse updateServer(PlatformPrincipal principal, String edgeServerId, EdgeServerUpdateRequest request) {
        requireEdgePermission(principal, "edge:server:write");
        requireBody(request);
        EdgeServerRecord current = serverRecord(edgeServerId);
        ensureCanView(principal, current.tenantId());
        String nextOwner = blankToDefault(request.ownerUserId(), current.ownerUserId());
        ensureUserVisible(nextOwner, current.organizationId());
        OffsetDateTime now = now();
        jdbc.update(
            """
            UPDATE edge_server
            SET server_name=?, location=?, owner_user_id=?, host_address=?, agent_version=?, hardware_summary_json=?, updated_at=?
            WHERE edge_server_id=?
            """,
            blankToDefault(request.serverName(), current.serverName()),
            blankToDefault(request.location(), current.location()),
            nextOwner,
            blankToDefault(request.hostAddress(), current.hostAddress()),
            blankToDefault(request.agentVersion(), current.agentVersion()),
            toJson(request.hardwareSummary() == null ? current.hardwareSummary() : request.hardwareSummary()),
            now,
            edgeServerId
        );
        recordAudit(principal, "EDGE_SERVER_UPDATED", "EdgeServer", edgeServerId, "SUCCESS", current.serverName(), blankToDefault(request.serverName(), current.serverName()), "TASK-edge-management-delivery");
        return serverById(principal, edgeServerId);
    }

    @Transactional
    EdgeServerResponse heartbeat(PlatformPrincipal principal, String edgeServerId, EdgeHeartbeatRequest request) {
        requireEdgePermission(principal, "edge:server:write");
        requireBody(request);
        EdgeServerRecord current = serverRecord(edgeServerId);
        ensureCanView(principal, current.tenantId());
        if ("DECOMMISSIONED".equals(current.status())) {
            throw new PlatformException(40961, 409, "停用边端不可更新心跳");
        }
        String nextStatus = normalizeHeartbeatStatus(blankToDefault(request.status(), "ONLINE"));
        OffsetDateTime now = now();
        jdbc.update(
            """
            UPDATE edge_server SET status=?, agent_version=?, resource_summary_json=?, diagnostic=?, last_heartbeat_at=?, updated_at=? WHERE edge_server_id=?
            """,
            nextStatus,
            blankToDefault(request.agentVersion(), current.agentVersion()),
            toJson(defaultMap(request.resourceSummary())),
            blankToDefault(request.diagnostic(), "heartbeat"),
            now,
            now,
            edgeServerId
        );
        recordAudit(principal, "EDGE_SERVER_HEARTBEAT_RECEIVED", "EdgeServer", edgeServerId, "SUCCESS", current.status(), nextStatus, "TASK-edge-management-delivery;AC-02");
        return serverById(principal, edgeServerId);
    }

    @Transactional
    EdgeServerResponse decommission(PlatformPrincipal principal, String edgeServerId) {
        requireEdgePermission(principal, "edge:server:write");
        EdgeServerRecord current = serverRecord(edgeServerId);
        ensureCanView(principal, current.tenantId());
        OffsetDateTime now = now();
        jdbc.update("UPDATE edge_server SET status='DECOMMISSIONED', decommissioned_at=?, updated_at=? WHERE edge_server_id=?", now, now, edgeServerId);
        recordAudit(principal, "EDGE_SERVER_DECOMMISSIONED", "EdgeServer", edgeServerId, "SUCCESS", current.status(), "DECOMMISSIONED", "TASK-edge-management-delivery;AC-02");
        return serverById(principal, edgeServerId);
    }

    @Transactional(readOnly = true)
    PageResponse<EdgeDeploymentResponse> listDeployments(PlatformPrincipal principal, String edgeServerId, String modelId, String status, int page, int pageSize) {
        requireEdgePermission(principal, "edge:deployment:read");
        int normalizedPage = Math.max(1, page);
        int normalizedPageSize = Math.max(1, Math.min(100, pageSize));
        StringBuilder where = new StringBuilder("d.tenant_id=?");
        java.util.ArrayList<Object> params = new java.util.ArrayList<>();
        params.add(principal.user().tenantId());
        if (!isBlank(edgeServerId)) {
            where.append(" AND d.edge_server_id=?");
            params.add(edgeServerId);
        }
        if (!isBlank(modelId)) {
            where.append(" AND d.model_id=?");
            params.add(modelId);
        }
        if (!isBlank(status)) {
            where.append(" AND d.status=?");
            params.add(normalizedDeploymentStatus(status));
        }
        Integer total = jdbc.queryForObject("SELECT COUNT(*) FROM edge_deployment d WHERE " + where, Integer.class, params.toArray());
        params.add(normalizedPageSize);
        params.add((normalizedPage - 1) * normalizedPageSize);
        List<EdgeDeploymentResponse> items = jdbc.query(
            """
            SELECT d.*, s.server_name FROM edge_deployment d JOIN edge_server s ON s.edge_server_id=d.edge_server_id
            WHERE %s ORDER BY d.created_at DESC LIMIT ? OFFSET ?
            """.formatted(where),
            (rs, rowNum) -> deploymentRow(rs, principal),
            params.toArray()
        );
        return new PageResponse<>(items, total == null ? 0 : total, normalizedPage, normalizedPageSize);
    }

    @Transactional
    EdgeDeploymentResponse createDeployment(PlatformPrincipal principal, EdgeDeploymentCreateRequest request) {
        requireEdgePermission(principal, "edge:deployment:request");
        requireBody(request);
        String requestedEdgeServerId = requireText(request.edgeServerId(), "边端服务器必填");
        String requestedModelId = requireText(request.modelId(), "模型 ID 必填");
        String requestedVersionId = requireText(request.versionId(), "模型版本必填");
        EdgeServerRecord server = serverRecord(requestedEdgeServerId);
        ensureCanView(principal, server.tenantId());
        if ("DECOMMISSIONED".equals(server.status())) {
            throw new PlatformException(40961, 409, "停用边端不可下发");
        }
        ModelVersionRecord version = modelVersionRecord(requestedModelId, requestedVersionId);
        ensureCanUseModel(principal, version);
        if (!"PRODUCTION".equals(version.status())) {
            throw new PlatformException(42261, 422, "仅 Production 模型版本可下发到边端");
        }
        if (isBlank(version.fileObjectId()) || isBlank(version.trustedSha256()) || !"MODEL".equals(version.fileAssetType()) || !"AVAILABLE".equals(version.fileStatus()) || !Objects.equals(normalized(version.checksum()), normalized(version.trustedSha256()))) {
            throw new PlatformException(42262, 422, "模型 artifact/hash 缺失");
        }
        OffsetDateTime now = now();
        String id = "EDGEDEP-" + randomIdPart(16);
        jdbc.update(
            """
            INSERT INTO edge_deployment (deployment_id, edge_server_id, model_id, version_id, model_name, version_no,
                artifact_file_object_id, artifact_sha256, strategy, status, approval_status, requested_by, tenant_id, organization_id,
                diagnostic, failure_reason, retry_count, scheduled_at, requested_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'REQUESTED', 'PENDING', ?, ?, ?, 'TODO_CONFIRM_EDGE_APPROVAL_INTEGRATION', NULL, 0, ?, ?, ?, ?)
            """,
            id,
            server.edgeServerId(),
            version.modelId(),
            version.versionId(),
            version.modelName(),
            version.versionNo(),
            version.fileObjectId(),
            version.trustedSha256(),
            normalizeStrategy(request.strategy()),
            principal.user().id(),
            server.tenantId(),
            server.organizationId(),
            request.scheduledAt(),
            now,
            now,
            now
        );
        recordAudit(principal, "EDGE_DEPLOYMENT_REQUESTED", "EdgeDeployment", id, "SUCCESS", null, "REQUESTED", "TASK-edge-management-delivery;AC-03;AC-04;" + blankToDefault(request.notes(), "request"));
        return deploymentById(principal, id);
    }

    @Transactional(readOnly = true)
    EdgeDeploymentDetailResponse deploymentDetail(PlatformPrincipal principal, String deploymentId) {
        requireEdgePermission(principal, "edge:deployment:read");
        EdgeDeploymentRecord deployment = deploymentRecord(deploymentId);
        ensureCanView(principal, deployment.tenantId());
        return detail(principal, deploymentId);
    }

    @Transactional
    EdgeDeploymentResponse approve(PlatformPrincipal principal, String deploymentId, EdgeApprovalRequest request) {
        requireEdgePermission(principal, "edge:deployment:approve");
        EdgeDeploymentRecord deployment = deploymentRecord(deploymentId);
        ensureCanView(principal, deployment.tenantId());
        EdgeServerRecord server = serverRecord(deployment.edgeServerId());
        ensureServerCanDeploy(server);
        ensureOwnerApprover(principal, server);
        if (!"PENDING".equals(deployment.approvalStatus()) || !"REQUESTED".equals(deployment.status())) {
            throw new PlatformException(40963, 409, "终态部署不可重复审批");
        }
        OffsetDateTime now = now();
        jdbc.update("UPDATE edge_deployment SET status='APPROVED', approval_status='APPROVED', approved_by=?, approved_at=?, updated_at=? WHERE deployment_id=?", principal.user().id(), now, now, deploymentId);
        insertApproval(deploymentId, principal.user().id(), "APPROVED", request == null ? null : request.comment(), now);
        recordAudit(principal, "EDGE_DEPLOYMENT_APPROVED", "EdgeDeployment", deploymentId, "SUCCESS", deployment.status(), "APPROVED", "TASK-edge-management-delivery;AC-04");
        return deploymentById(principal, deploymentId);
    }

    @Transactional
    EdgeDeploymentResponse reject(PlatformPrincipal principal, String deploymentId, EdgeApprovalRequest request) {
        requireEdgePermission(principal, "edge:deployment:approve");
        EdgeDeploymentRecord deployment = deploymentRecord(deploymentId);
        ensureCanView(principal, deployment.tenantId());
        EdgeServerRecord server = serverRecord(deployment.edgeServerId());
        ensureServerCanDeploy(server);
        ensureOwnerApprover(principal, server);
        if (!"PENDING".equals(deployment.approvalStatus()) || !"REQUESTED".equals(deployment.status())) {
            throw new PlatformException(40963, 409, "终态部署不可重复审批");
        }
        OffsetDateTime now = now();
        jdbc.update("UPDATE edge_deployment SET status='REJECTED', approval_status='REJECTED', approved_by=?, approved_at=?, updated_at=? WHERE deployment_id=?", principal.user().id(), now, now, deploymentId);
        insertApproval(deploymentId, principal.user().id(), "REJECTED", request == null ? null : request.comment(), now);
        recordAudit(principal, "EDGE_DEPLOYMENT_REJECTED", "EdgeDeployment", deploymentId, "SUCCESS", deployment.status(), "REJECTED", "TASK-edge-management-delivery;AC-04");
        return deploymentById(principal, deploymentId);
    }

    @Transactional
    EdgeDeploymentResponse execute(PlatformPrincipal principal, String deploymentId) {
        requireEdgePermission(principal, "edge:deployment:execute");
        EdgeDeploymentRecord deployment = deploymentRecord(deploymentId);
        ensureCanView(principal, deployment.tenantId());
        EdgeServerRecord server = serverRecord(deployment.edgeServerId());
        ensureServerCanDeploy(server);
        if (!"APPROVED".equals(deployment.approvalStatus())) {
            throw new PlatformException(40962, 409, "未授权下发不可执行");
        }
        if (!List.of("APPROVED", "QUEUED", "TRANSFERRING").contains(deployment.status())) {
            throw new PlatformException(40963, 409, "终态部署不可重复执行");
        }
        OffsetDateTime now = now();
        jdbc.update(
            "UPDATE edge_deployment SET status='VERIFYING', executed_by=?, executed_at=?, diagnostic=?, updated_at=? WHERE deployment_id=?",
            principal.user().id(),
            now,
            "MANUAL_AGENT_SEAM;TODO_CONFIRM_EDGE_AGENT_PROTOCOL",
            now,
            deploymentId
        );
        recordAudit(principal, "EDGE_DEPLOYMENT_EXECUTION_STARTED", "EdgeDeployment", deploymentId, "SUCCESS", deployment.status(), "VERIFYING", "TASK-edge-management-delivery;AC-05");
        return deploymentById(principal, deploymentId);
    }

    @Transactional(noRollbackFor = PlatformException.class)
    EdgeDeploymentDetailResponse verifyIntegrity(PlatformPrincipal principal, String deploymentId, EdgeIntegrityVerifyRequest request) {
        requireEdgePermission(principal, "edge:deployment:execute");
        requireBody(request);
        EdgeDeploymentRecord deployment = deploymentRecord(deploymentId);
        ensureCanView(principal, deployment.tenantId());
        if (!"VERIFYING".equals(deployment.status())) {
            throw new PlatformException(40963, 409, "仅 VERIFYING 状态可校验完整性");
        }
        OffsetDateTime now = now();
        String received = request == null ? null : request.receivedSha256();
        if (isBlank(received) || !deployment.artifactSha256().equalsIgnoreCase(received.trim())) {
            jdbc.update(
                """
                UPDATE edge_deployment SET status='FAILED', failure_reason=?, retry_count=retry_count+1, diagnostic=?, verified_at=?, updated_at=? WHERE deployment_id=?
                """,
                "完整性校验失败: expected=" + deployment.artifactSha256() + ", received=" + blankToDefault(received, ""),
                blankToDefault(request == null ? null : request.diagnostic(), "integrity mismatch"),
                now,
                now,
                deploymentId
            );
            recordAudit(principal, "EDGE_DEPLOYMENT_INTEGRITY_FAILED", "EdgeDeployment", deploymentId, "FAILURE", deployment.artifactSha256(), blankToDefault(received, ""), "TASK-edge-management-delivery;AC-06");
            recordAudit(principal, "EDGE_DEPLOYMENT_FAILED", "EdgeDeployment", deploymentId, "FAILURE", deployment.status(), "FAILED", "TASK-edge-management-delivery;AC-06");
            throw new PlatformException(42263, 422, "完整性校验失败");
        }
        jdbc.update(
            "UPDATE edge_deployment SET status='DEPLOYED', diagnostic=?, verified_at=?, deployed_at=?, updated_at=? WHERE deployment_id=?",
            blankToDefault(request.diagnostic(), "integrity passed"),
            now,
            now,
            now,
            deploymentId
        );
        jdbc.update("UPDATE model_registry_version SET active_deployment_count=active_deployment_count+1 WHERE version_id=?", deployment.versionId());
        recordAudit(principal, "EDGE_DEPLOYMENT_INTEGRITY_PASSED", "EdgeDeployment", deploymentId, "SUCCESS", null, received, "TASK-edge-management-delivery;AC-06");
        recordAudit(principal, "EDGE_DEPLOYMENT_DEPLOYED", "EdgeDeployment", deploymentId, "SUCCESS", deployment.status(), "DEPLOYED", "TASK-edge-management-delivery;AC-05;AC-09");
        return detail(principal, deploymentId);
    }

    @Transactional
    EdgeDeploymentResponse rollback(PlatformPrincipal principal, String deploymentId, EdgeRollbackRequest request) {
        requireEdgePermission(principal, "edge:deployment:execute");
        EdgeDeploymentRecord deployment = deploymentRecord(deploymentId);
        ensureCanView(principal, deployment.tenantId());
        if (!List.of("DEPLOYED", "FAILED").contains(deployment.status())) {
            throw new PlatformException(40963, 409, "仅已部署或失败任务可回滚");
        }
        String targetDeploymentId = request == null ? null : request.targetDeploymentId();
        if (!isBlank(targetDeploymentId)) {
            EdgeDeploymentRecord target = deploymentRecord(targetDeploymentId);
            ensureCanView(principal, target.tenantId());
            if (!Objects.equals(deployment.edgeServerId(), target.edgeServerId()) || !Objects.equals(deployment.tenantId(), target.tenantId())) {
                throw new PlatformException(40304, 403, "无权访问回滚目标");
            }
        }
        OffsetDateTime now = now();
        jdbc.update(
            "UPDATE edge_deployment SET status='ROLLED_BACK', rollback_target_deployment_id=?, rolled_back_at=?, diagnostic=?, updated_at=? WHERE deployment_id=?",
            targetDeploymentId,
            now,
            "TODO_CONFIRM_EDGE_ROLLBACK_COMMAND;" + blankToDefault(request == null ? null : request.reason(), "rollback"),
            now,
            deploymentId
        );
        recordAudit(principal, "EDGE_DEPLOYMENT_ROLLED_BACK", "EdgeDeployment", deploymentId, "SUCCESS", deployment.status(), "ROLLED_BACK", "TASK-edge-management-delivery;AC-07");
        return deploymentById(principal, deploymentId);
    }

    private EdgeDeploymentDetailResponse detail(PlatformPrincipal principal, String deploymentId) {
        EdgeDeploymentResponse deployment = deploymentById(principal, deploymentId);
        EdgeServerResponse server = serverById(principal, deployment.edgeServerId());
        List<EdgeDeploymentApprovalResponse> approvals = jdbc.query(
            "SELECT * FROM edge_deployment_approval WHERE deployment_id=? ORDER BY decided_at DESC",
            (rs, rowNum) -> new EdgeDeploymentApprovalResponse(
                rs.getString("approval_id"),
                rs.getString("deployment_id"),
                rs.getString("approver_user_id"),
                rs.getString("decision"),
                rs.getString("comment"),
                rs.getObject("decided_at", OffsetDateTime.class)
            ),
            deploymentId
        );
        return new EdgeDeploymentDetailResponse(deployment, server, approvals);
    }

    private EdgeServerResponse serverById(PlatformPrincipal principal, String edgeServerId) {
        EdgeServerRecord record = serverRecord(edgeServerId);
        ensureCanView(principal, record.tenantId());
        return toServerResponse(record, principal);
    }

    private EdgeDeploymentResponse deploymentById(PlatformPrincipal principal, String deploymentId) {
        EdgeDeploymentRecord record = deploymentRecord(deploymentId);
        ensureCanView(principal, record.tenantId());
        return jdbc.queryForObject(
            "SELECT d.*, s.server_name FROM edge_deployment d JOIN edge_server s ON s.edge_server_id=d.edge_server_id WHERE d.deployment_id=?",
            (rs, rowNum) -> deploymentRow(rs, principal),
            deploymentId
        );
    }

    private EdgeServerRecord serverRecord(String edgeServerId) {
        try {
            return jdbc.queryForObject(
                "SELECT * FROM edge_server WHERE edge_server_id=?",
                (rs, rowNum) -> new EdgeServerRecord(
                    rs.getString("edge_server_id"),
                    rs.getString("server_name"),
                    rs.getString("location"),
                    rs.getString("organization_id"),
                    rs.getString("owner_user_id"),
                    rs.getString("host_address"),
                    rs.getString("agent_version"),
                    fromJsonMap(rs.getString("hardware_summary_json")),
                    fromJsonMap(rs.getString("resource_summary_json")),
                    rs.getString("status"),
                    rs.getString("diagnostic"),
                    rs.getString("tenant_id"),
                    rs.getObject("created_at", OffsetDateTime.class),
                    rs.getObject("updated_at", OffsetDateTime.class),
                    rs.getObject("last_heartbeat_at", OffsetDateTime.class),
                    rs.getObject("decommissioned_at", OffsetDateTime.class)
                ),
                edgeServerId
            );
        } catch (EmptyResultDataAccessException exception) {
            throw new PlatformException(40400, 404, "资源不存在");
        }
    }

    private EdgeDeploymentRecord deploymentRecord(String deploymentId) {
        try {
            return jdbc.queryForObject(
                "SELECT * FROM edge_deployment WHERE deployment_id=?",
                (rs, rowNum) -> new EdgeDeploymentRecord(
                    rs.getString("deployment_id"),
                    rs.getString("edge_server_id"),
                    rs.getString("model_id"),
                    rs.getString("version_id"),
                    rs.getString("artifact_sha256"),
                    rs.getString("status"),
                    rs.getString("approval_status"),
                    rs.getString("tenant_id"),
                    rs.getString("organization_id")
                ),
                deploymentId
            );
        } catch (EmptyResultDataAccessException exception) {
            throw new PlatformException(40400, 404, "资源不存在");
        }
    }

    private ModelVersionRecord modelVersionRecord(String modelId, String versionId) {
        try {
            return jdbc.queryForObject(
                """
                SELECT v.*, m.name AS model_name, m.owner_org_id, m.tenant_id,
                    f.asset_type AS file_asset_type, f.status AS file_status, f.sha256 AS trusted_sha256
                FROM model_registry_version v
                JOIN model_registry_model m ON m.model_id=v.model_id
                LEFT JOIN platform_file_object f ON f.file_id=v.file_object_id
                WHERE v.model_id=? AND v.version_id=?
                """,
                (rs, rowNum) -> new ModelVersionRecord(
                    rs.getString("model_id"),
                    rs.getString("version_id"),
                    rs.getString("version_no"),
                    rs.getString("status"),
                    rs.getString("file_object_id"),
                    rs.getString("checksum"),
                    rs.getString("trusted_sha256"),
                    rs.getString("file_asset_type"),
                    rs.getString("file_status"),
                    rs.getString("model_name"),
                    rs.getString("owner_org_id"),
                    rs.getString("tenant_id")
                ),
                modelId,
                versionId
            );
        } catch (EmptyResultDataAccessException exception) {
            throw new PlatformException(40400, 404, "资源不存在");
        }
    }

    private EdgeServerResponse serverRow(java.sql.ResultSet rs, PlatformPrincipal principal) throws java.sql.SQLException {
        return toServerResponse(
            new EdgeServerRecord(
                rs.getString("edge_server_id"),
                rs.getString("server_name"),
                rs.getString("location"),
                rs.getString("organization_id"),
                rs.getString("owner_user_id"),
                rs.getString("host_address"),
                rs.getString("agent_version"),
                fromJsonMap(rs.getString("hardware_summary_json")),
                fromJsonMap(rs.getString("resource_summary_json")),
                rs.getString("status"),
                rs.getString("diagnostic"),
                rs.getString("tenant_id"),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("updated_at", OffsetDateTime.class),
                rs.getObject("last_heartbeat_at", OffsetDateTime.class),
                rs.getObject("decommissioned_at", OffsetDateTime.class)
            ),
            principal
        );
    }

    private EdgeServerResponse toServerResponse(EdgeServerRecord record, PlatformPrincipal principal) {
        return new EdgeServerResponse(
            record.edgeServerId(),
            record.serverName(),
            record.location(),
            record.organizationId(),
            record.ownerUserId(),
            userName(record.ownerUserId()),
            record.hostAddress(),
            record.agentVersion(),
            record.hardwareSummary(),
            record.resourceSummary(),
            record.status(),
            record.diagnostic(),
            record.tenantId(),
            record.createdAt(),
            record.updatedAt(),
            record.lastHeartbeatAt(),
            record.decommissionedAt(),
            permissionSummary(principal)
        );
    }

    private EdgeDeploymentResponse deploymentRow(java.sql.ResultSet rs, PlatformPrincipal principal) throws java.sql.SQLException {
        return new EdgeDeploymentResponse(
            rs.getString("deployment_id"),
            rs.getString("edge_server_id"),
            rs.getString("server_name"),
            rs.getString("model_id"),
            rs.getString("model_name"),
            rs.getString("version_id"),
            rs.getString("version_no"),
            rs.getString("artifact_file_object_id"),
            rs.getString("artifact_sha256"),
            rs.getString("strategy"),
            rs.getString("status"),
            rs.getString("approval_status"),
            rs.getString("requested_by"),
            rs.getString("approved_by"),
            rs.getString("executed_by"),
            rs.getString("tenant_id"),
            rs.getString("organization_id"),
            rs.getString("diagnostic"),
            rs.getString("failure_reason"),
            rs.getInt("retry_count"),
            rs.getObject("scheduled_at", OffsetDateTime.class),
            rs.getObject("requested_at", OffsetDateTime.class),
            rs.getObject("approved_at", OffsetDateTime.class),
            rs.getObject("executed_at", OffsetDateTime.class),
            rs.getObject("verified_at", OffsetDateTime.class),
            rs.getObject("deployed_at", OffsetDateTime.class),
            rs.getObject("rolled_back_at", OffsetDateTime.class),
            rs.getString("rollback_target_deployment_id"),
            permissionSummary(principal)
        );
    }

    private void insertApproval(String deploymentId, String approverUserId, String decision, String comment, OffsetDateTime now) {
        jdbc.update(
            "INSERT INTO edge_deployment_approval (approval_id, deployment_id, approver_user_id, decision, comment, decided_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            "EDGEAPP-" + randomIdPart(16),
            deploymentId,
            approverUserId,
            decision,
            blankToNull(comment),
            now,
            now
        );
    }

    private void requireEdgePermission(PlatformPrincipal principal, String permissionCode) {
        try {
            identityService.requirePermission(principal, permissionCode);
        } catch (PlatformException exception) {
            if (exception.httpStatus() == 403) {
                throw new PlatformException(40304, 403, "无边端资源权限");
            }
            throw exception;
        }
    }

    private void ensureCanView(PlatformPrincipal principal, String tenantId) {
        if (!principal.isSuperAdmin() && !Objects.equals(principal.user().tenantId(), tenantId)) {
            recordAudit(principal, "EDGE_ACCESS_DENIED", "Tenant", tenantId, "FAILURE", principal.user().tenantId(), tenantId, "TASK-edge-management-delivery;AC-08");
            throw new PlatformException(40304, 403, "无权访问边端资源");
        }
    }

    private void ensureSameTenant(PlatformPrincipal principal, String tenantId) {
        if (!principal.isSuperAdmin() && !Objects.equals(principal.user().tenantId(), tenantId)) {
            throw new PlatformException(40304, 403, "无权操作其他 BU 的边端资源");
        }
    }

    private void ensureServerCanDeploy(EdgeServerRecord server) {
        if ("DECOMMISSIONED".equals(server.status())) {
            throw new PlatformException(40961, 409, "停用边端不可下发");
        }
    }

    private void ensureOwnerApprover(PlatformPrincipal principal, EdgeServerRecord server) {
        if (!principal.isSuperAdmin() && !Objects.equals(principal.user().id(), server.ownerUserId())) {
            throw new PlatformException(40304, 403, "边端下发必须经边端应用 owner 授权");
        }
    }

    private <T> T requireBody(T request) {
        if (request == null) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return request;
    }

    private void ensureUserVisible(String userId, String tenantId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM platform_user WHERE id=? AND tenant_id=?", Integer.class, userId, tenantId);
        if (count == null || count == 0) {
            throw new PlatformException(40400, 404, "资源不存在");
        }
    }

    private void ensureCanUseModel(PlatformPrincipal principal, ModelVersionRecord version) {
        if (principal.isSuperAdmin() || Objects.equals(principal.user().tenantId(), version.ownerOrgId())) {
            return;
        }
        Integer grantCount = jdbc.queryForObject(
            """
            SELECT COUNT(*) FROM model_access_grant
            WHERE model_id=? AND (version_id IS NULL OR version_id=?) AND requester_user_id=? AND permission IN ('DEPLOY','DOWNLOAD','VIEW') AND status='ACTIVE' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            """,
            Integer.class,
            version.modelId(),
            version.versionId(),
            principal.user().id()
        );
        if (grantCount == null || grantCount == 0) {
            throw new PlatformException(40304, 403, "无权访问模型版本");
        }
    }

    private String userName(String userId) {
        try {
            return jdbc.queryForObject("SELECT display_name FROM platform_user WHERE id=?", String.class, userId);
        } catch (RuntimeException exception) {
            return userId;
        }
    }

    private EdgePermissionSummary permissionSummary(PlatformPrincipal principal) {
        return new EdgePermissionSummary(
            principal.hasPermission("edge:server:read"),
            principal.hasPermission("edge:server:write"),
            principal.hasPermission("edge:deployment:request"),
            principal.hasPermission("edge:deployment:approve"),
            principal.hasPermission("edge:deployment:execute")
        );
    }

    private void recordAudit(PlatformPrincipal principal, String action, String resourceType, String resourceId, String result, String before, String after, String detail) {
        OffsetDateTime occurredAt = now();
        String id = UUID.randomUUID().toString();
        String eventId = "EVT-" + randomIdPart(16);
        String operatorRole = String.join(",", principal.roleNames());
        String traceId = PlatformResponses.traceId() == null ? "" : PlatformResponses.traceId();
        String signature = auditSignature(id, eventId, principal.user().tenantId(), principal.user().id(), principal.user().displayName(), operatorRole, action, resourceType, resourceId, result, "INFO", before, after, detail, traceId, occurredAt);
        jdbc.update(
            """
            INSERT INTO platform_audit_log (id, event_id, tenant_id, operator_id, operator_name, operator_role, action, resource_type, resource_id, result, risk_level, before_json, after_json, detail_json, trace_id, signature, occurred_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INFO', ?, ?, ?, ?, ?, ?)
            """,
            id,
            eventId,
            principal.user().tenantId(),
            principal.user().id(),
            principal.user().displayName(),
            operatorRole,
            action,
            resourceType,
            resourceId,
            result,
            before,
            after,
            detail,
            traceId,
            signature,
            occurredAt
        );
    }

    private String auditSignature(String id, String eventId, String tenantId, String operatorId, String operatorName, String operatorRole, String action, String resourceType, String resourceId, String result, String riskLevel, String before, String after, String detail, String traceId, OffsetDateTime occurredAt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(String.join("|", nullToEmpty(id), nullToEmpty(eventId), nullToEmpty(tenantId), nullToEmpty(operatorId), nullToEmpty(operatorName), nullToEmpty(operatorRole), nullToEmpty(action), nullToEmpty(resourceType), nullToEmpty(resourceId), nullToEmpty(result), nullToEmpty(riskLevel), nullToEmpty(before), nullToEmpty(after), nullToEmpty(detail), nullToEmpty(traceId), canonicalTime(occurredAt)).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private Map<String, Object> fromJsonMap(String value) {
        if (isBlank(value)) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(value, MAP_TYPE);
        } catch (Exception exception) {
            return Map.of();
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private Map<String, Object> defaultMap(Map<String, Object> value) {
        return value == null ? Map.of() : value;
    }

    private String normalizeServerStatus(String value) {
        String status = normalized(value);
        if (!List.of("REGISTERED", "ONLINE", "OFFLINE", "STALE", "DECOMMISSIONED").contains(status)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return status;
    }

    private String normalizeHeartbeatStatus(String value) {
        String status = normalized(value);
        if (!List.of("ONLINE", "OFFLINE", "STALE").contains(status)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return status;
    }

    private String normalizedDeploymentStatus(String value) {
        String status = normalized(value);
        if (!List.of("REQUESTED", "APPROVED", "REJECTED", "QUEUED", "TRANSFERRING", "VERIFYING", "DEPLOYED", "FAILED", "ROLLED_BACK", "CANCELLED").contains(status)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return status;
    }

    private String normalizeStrategy(String value) {
        String strategy = normalized(blankToDefault(value, "IMMEDIATE"));
        if (!List.of("IMMEDIATE", "SCHEDULED").contains(strategy)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return strategy;
    }

    private String normalized(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String requireText(String value, String message) {
        if (isBlank(value)) {
            throw new PlatformException(40000, 400, message);
        }
        return value.trim();
    }

    private String blankToDefault(String value, String defaultValue) {
        return isBlank(value) ? defaultValue : value;
    }

    private String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String randomIdPart(int length) {
        return UUID.randomUUID().toString().replace("-", "").substring(0, length).toUpperCase(Locale.ROOT);
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);
    }

    private String canonicalTime(OffsetDateTime value) {
        return value == null ? "" : value.toInstant().truncatedTo(ChronoUnit.MICROS).atOffset(ZoneOffset.UTC).toString();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private record EdgeServerRecord(String edgeServerId, String serverName, String location, String organizationId, String ownerUserId, String hostAddress, String agentVersion, Map<String, Object> hardwareSummary, Map<String, Object> resourceSummary, String status, String diagnostic, String tenantId, OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime lastHeartbeatAt, OffsetDateTime decommissionedAt) {}

    private record EdgeDeploymentRecord(String deploymentId, String edgeServerId, String modelId, String versionId, String artifactSha256, String status, String approvalStatus, String tenantId, String organizationId) {}

    private record ModelVersionRecord(String modelId, String versionId, String versionNo, String status, String fileObjectId, String checksum, String trustedSha256, String fileAssetType, String fileStatus, String modelName, String ownerOrgId, String tenantId) {}
}
