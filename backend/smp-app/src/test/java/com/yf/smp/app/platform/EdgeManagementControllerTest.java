package com.yf.smp.app.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yf.smp.app.web.TraceIdFilter;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class EdgeManagementControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void taskEdgeManagementDeliveryShouldRegisterApproveVerifyAndAudit() throws Exception {
        // TASK-edge-management-delivery AC-01 AC-02 AC-03 AC-04 AC-05 AC-06 AC-07 AC-08 AC-09 AC-10
        String suffix = randomIdPart(8);
        String cabinBuAdmin = login("buadmin", "CABIN");
        String admin = login("admin", "YF");
        grantRolePermission("DATA_REVIEWER", "edge:server:read");
        grantRolePermission("DATA_REVIEWER", "edge:deployment:read");
        grantRolePermission("DATA_ANNOTATOR", "edge:deployment:approve");
        String annotator = login("annotator", "CABIN");
        String qeUser = login("qeuser", "QE");
        JsonNode nullCreateServer = postJson("/api/v1/edge-servers", "trace-f021-null-server", "null", cabinBuAdmin);
        assertThat(nullCreateServer.at("/code").asInt()).isEqualTo(40000);
        JsonNode invalidServerPage = getJson("/api/v1/edge-servers?page=abc", "trace-f021-invalid-server-page", cabinBuAdmin);
        assertThat(invalidServerPage.at("/code").asInt()).isEqualTo(40000);
        JsonNode invalidDeploymentPageSize = getJson("/api/v1/edge-deployments?pageSize=abc", "trace-f021-invalid-deployment-pagesize", cabinBuAdmin);
        assertThat(invalidDeploymentPageSize.at("/code").asInt()).isEqualTo(40000);
        String fileId = "FILE-EDGE-" + suffix;
        String expectedSha = "abc123edgehash" + suffix.toLowerCase(Locale.ROOT);
        seedModelFile(fileId, expectedSha, "edge-model-" + suffix + ".onnx");
        String modelId = "MODEL-EDGE-" + suffix;
        String versionId = "MVER-EDGE-" + suffix;
        seedProductionModel(modelId, versionId, fileId, expectedSha, suffix);

        JsonNode createdServer = postJson("/api/v1/edge-servers", "trace-f021-create-server", """
            {
              "serverName":"TASK-edge-management-delivery 上海工厂边端 %s",
              "location":"上海工厂A车间",
              "organizationId":"TENANT-CABIN",
              "ownerUserId":"USR-BU-CABIN",
              "hostAddress":"10.21.0.8",
              "agentVersion":"1.0.0",
              "hardwareSummary":{"gpu":"NVIDIA T4 x1"}
            }
            """.formatted(suffix), cabinBuAdmin);
        assertThat(createdServer.at("/code").asInt()).isZero();
        String edgeServerId = createdServer.at("/data/edgeServerId").asText();
        assertThat(createdServer.at("/data/status").asText()).isEqualTo("REGISTERED");

        JsonNode heartbeat = postJson("/api/v1/edge-servers/" + edgeServerId + "/heartbeat", "trace-f021-heartbeat", """
            {"status":"ONLINE","agentVersion":"1.0.1","resourceSummary":{"cpuUsage":0.35},"diagnostic":"agent healthy"}
            """, cabinBuAdmin);
        assertThat(heartbeat.at("/code").asInt()).isZero();
        assertThat(heartbeat.at("/data/status").asText()).isEqualTo("ONLINE");
        assertThat(heartbeat.at("/data/resourceSummary/cpuUsage").asDouble()).isEqualTo(0.35);

        JsonNode nonProductionDeployment = postJson("/api/v1/edge-deployments", "trace-f021-non-production", """
            {"edgeServerId":"%s","modelId":"%s","versionId":"%s","strategy":"IMMEDIATE"}
            """.formatted(edgeServerId, modelId, seedDevelopmentVersion(modelId, fileId, suffix)), cabinBuAdmin);
        assertThat(nonProductionDeployment.at("/code").asInt()).isEqualTo(42261);

        JsonNode mismatchedArtifactDeployment = postJson("/api/v1/edge-deployments", "trace-f021-artifact-mismatch", """
            {"edgeServerId":"%s","modelId":"%s","versionId":"%s","strategy":"IMMEDIATE"}
            """.formatted(edgeServerId, modelId, seedMismatchedProductionVersion(modelId, fileId, expectedSha, suffix)), cabinBuAdmin);
        assertThat(mismatchedArtifactDeployment.at("/code").asInt()).isEqualTo(42262);

        JsonNode requested = postJson("/api/v1/edge-deployments", "trace-f021-request-deployment", """
            {"edgeServerId":"%s","modelId":"%s","versionId":"%s","strategy":"IMMEDIATE","notes":"F021 下发申请"}
            """.formatted(edgeServerId, modelId, versionId), cabinBuAdmin);
        assertThat(requested.at("/code").asInt()).isZero();
        String deploymentId = requested.at("/data/deploymentId").asText();
        assertThat(requested.at("/data/status").asText()).isEqualTo("REQUESTED");
        assertThat(requested.at("/data/approvalStatus").asText()).isEqualTo("PENDING");

        JsonNode executeBeforeApproval = postJson("/api/v1/edge-deployments/" + deploymentId + "/actions:execute", "trace-f021-execute-before-approval", "{}", cabinBuAdmin);
        assertThat(executeBeforeApproval.at("/code").asInt()).isEqualTo(40962);

        JsonNode approved = postJson("/api/v1/edge-deployments/" + deploymentId + "/approvals:approve", "trace-f021-approve", "{" +
            "\"comment\":\"同意下发\"}", cabinBuAdmin);
        assertThat(approved.at("/code").asInt()).isZero();
        assertThat(approved.at("/data/approvalStatus").asText()).isEqualTo("APPROVED");
        JsonNode rejectApproved = postJson("/api/v1/edge-deployments/" + deploymentId + "/approvals:reject", "trace-f021-reject-approved", "{}", cabinBuAdmin);
        assertThat(rejectApproved.at("/code").asInt()).isEqualTo(40963);

        JsonNode executed = postJson("/api/v1/edge-deployments/" + deploymentId + "/actions:execute", "trace-f021-execute", "{}", cabinBuAdmin);
        assertThat(executed.at("/code").asInt()).isZero();
        assertThat(executed.at("/data/status").asText()).isEqualTo("VERIFYING");
        assertThat(executed.at("/data/diagnostic").asText()).contains("TODO_CONFIRM_EDGE_AGENT_PROTOCOL");

        JsonNode mismatch = postJson("/api/v1/edge-deployments/" + deploymentId + "/actions:verify-integrity", "trace-f021-integrity-failed", """
            {"receivedSha256":"mismatch","diagnostic":"edge side checksum"}
            """, cabinBuAdmin);
        assertThat(mismatch.at("/code").asInt()).isEqualTo(42263);

        JsonNode failedDetail = getJson("/api/v1/edge-deployments/" + deploymentId, "trace-f021-failed-detail", cabinBuAdmin);
        assertThat(failedDetail.at("/data/deployment/status").asText()).isEqualTo("FAILED");
        assertThat(failedDetail.at("/data/deployment/failureReason").asText()).contains("完整性校验失败");

        String secondDeploymentId = createApprovedExecutedDeployment(edgeServerId, modelId, versionId, cabinBuAdmin);
        JsonNode verified = postJson("/api/v1/edge-deployments/" + secondDeploymentId + "/actions:verify-integrity", "trace-f021-integrity-passed", """
            {"receivedSha256":"%s","diagnostic":"edge side checksum"}
            """.formatted(expectedSha), cabinBuAdmin);
        assertThat(verified.at("/code").asInt()).isZero();
        assertThat(verified.at("/data/deployment/status").asText()).isEqualTo("DEPLOYED");

        JsonNode rollback = postJson("/api/v1/edge-deployments/" + secondDeploymentId + "/actions:rollback", "trace-f021-rollback", """
            {"targetDeploymentId":"%s","reason":"验证回滚 seam"}
            """.formatted(deploymentId), cabinBuAdmin);
        assertThat(rollback.at("/code").asInt()).isZero();
        assertThat(rollback.at("/data/status").asText()).isEqualTo("ROLLED_BACK");

        JsonNode requestedForIllegalRollback = postJson("/api/v1/edge-deployments", "trace-f021-request-illegal-rollback", """
            {"edgeServerId":"%s","modelId":"%s","versionId":"%s","strategy":"IMMEDIATE"}
            """.formatted(edgeServerId, modelId, versionId), cabinBuAdmin);
        assertThat(requestedForIllegalRollback.at("/code").asInt()).isZero();
        JsonNode illegalRollback = postJson("/api/v1/edge-deployments/" + requestedForIllegalRollback.at("/data/deploymentId").asText() + "/actions:rollback", "trace-f021-illegal-rollback", "{}", cabinBuAdmin);
        assertThat(illegalRollback.at("/code").asInt()).isEqualTo(40963);

        JsonNode history = getJson("/api/v1/edge-deployments?edgeServerId=" + edgeServerId, "trace-f021-history", cabinBuAdmin);
        assertThat(history.at("/code").asInt()).isZero();
        assertThat(history.at("/data/items").toString()).contains(deploymentId).contains(secondDeploymentId);

        JsonNode crossBuList = getJson("/api/v1/edge-servers?keyword=" + suffix, "trace-f021-cross-bu-list", qeUser);
        assertThat(crossBuList.at("/code").asInt()).isZero();
        assertThat(crossBuList.at("/data/items").toString()).doesNotContain(edgeServerId);
        JsonNode crossBuDetail = getJson("/api/v1/edge-servers/" + edgeServerId, "trace-f021-cross-bu-detail", qeUser);
        assertThat(crossBuDetail.at("/code").asInt()).isEqualTo(40304);

        JsonNode approvedBeforeStop = postJson("/api/v1/edge-deployments", "trace-f021-request-before-stop", """
            {"edgeServerId":"%s","modelId":"%s","versionId":"%s","strategy":"IMMEDIATE"}
            """.formatted(edgeServerId, modelId, versionId), cabinBuAdmin);
        assertThat(approvedBeforeStop.at("/code").asInt()).isZero();
        String approvedBeforeStopId = approvedBeforeStop.at("/data/deploymentId").asText();
        assertThat(postJson("/api/v1/edge-deployments/" + approvedBeforeStopId + "/approvals:approve", "trace-f021-approve-before-stop", "{}", cabinBuAdmin).at("/code").asInt()).isZero();

        JsonNode decommissioned = postJson("/api/v1/edge-servers/" + edgeServerId + "/actions:decommission", "trace-f021-decommission", "{}", cabinBuAdmin);
        assertThat(decommissioned.at("/data/status").asText()).isEqualTo("DECOMMISSIONED");
        JsonNode executeStopped = postJson("/api/v1/edge-deployments/" + approvedBeforeStopId + "/actions:execute", "trace-f021-execute-stopped", "{}", cabinBuAdmin);
        assertThat(executeStopped.at("/code").asInt()).isEqualTo(40961);
        JsonNode deploymentToStopped = postJson("/api/v1/edge-deployments", "trace-f021-deployment-to-stopped", """
            {"edgeServerId":"%s","modelId":"%s","versionId":"%s","strategy":"IMMEDIATE"}
            """.formatted(edgeServerId, modelId, versionId), cabinBuAdmin);
        assertThat(deploymentToStopped.at("/code").asInt()).isEqualTo(40961);

        JsonNode audit = getJson("/api/v1/platform/audit-logs?action=EDGE_DEPLOYMENT_DEPLOYED", "trace-f021-audit", admin);
        assertThat(audit.at("/code").asInt()).isZero();
        assertThat(audit.toString()).contains(secondDeploymentId).contains("TASK-edge-management-delivery");
    }

    private String createApprovedExecutedDeployment(String edgeServerId, String modelId, String versionId, String token) throws Exception {
        JsonNode requested = postJson("/api/v1/edge-deployments", "trace-f021-request-second", """
            {"edgeServerId":"%s","modelId":"%s","versionId":"%s","strategy":"IMMEDIATE","notes":"F021 successful deployment"}
            """.formatted(edgeServerId, modelId, versionId), token);
        assertThat(requested.at("/code").asInt()).isZero();
        String deploymentId = requested.at("/data/deploymentId").asText();
        assertThat(postJson("/api/v1/edge-deployments/" + deploymentId + "/approvals:approve", "trace-f021-approve-second", "{}", token).at("/code").asInt()).isZero();
        assertThat(postJson("/api/v1/edge-deployments/" + deploymentId + "/actions:execute", "trace-f021-execute-second", "{}", token).at("/code").asInt()).isZero();
        return deploymentId;
    }

    private void seedProductionModel(String modelId, String versionId, String fileId, String sha256, String suffix) {
        jdbc.update("""
            INSERT INTO model_registry_model (
                model_id, name, description, framework, task_type, input_format, output_format,
                runtime_requirements, tags_json, scope, source, owner_user_id, owner_org_id, tenant_id,
                current_version_id, visibility_status, created_at, updated_at
            ) VALUES (?, ?, 'F021 edge model', 'ONNX', 'OBJECT_DETECTION', 'image:640x640 RGB', 'bbox[class,score]', '{}', '[\"F021\"]', 'BU', 'LOCAL_UPLOAD', 'USR-BU-CABIN', 'TENANT-CABIN', 'TENANT-CABIN', NULL, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, modelId, "TASK-edge-management-delivery 模型 " + suffix);
        jdbc.update("""
            INSERT INTO model_registry_version (
                version_id, model_id, version_no, file_object_id, file_name, file_extension, file_size_bytes,
                checksum, storage_bucket, storage_key, runtime_requirements, metrics_summary_json,
                security_scan_status, evaluation_status, evaluation_record_id, evaluation_proof,
                status, active_deployment_count, active_reference_json, created_by, created_at
            ) SELECT ?, ?, 'v1.0', file_id, 'edge-model.onnx', '.onnx', size_bytes, ?, bucket, object_key, '{}', '{}', 'PASSED', 'PASSED', 'EVAL-F021', 'passed', 'PRODUCTION', 0, '[]', 'USR-BU-CABIN', CURRENT_TIMESTAMP
              FROM platform_file_object WHERE file_id=?
            """, versionId, modelId, sha256, fileId);
        jdbc.update("UPDATE model_registry_model SET current_version_id=? WHERE model_id=?", versionId, modelId);
    }

    private String seedMismatchedProductionVersion(String modelId, String fileId, String sha256, String suffix) {
        String versionId = "MVER-EDGE-BADHASH-" + suffix;
        jdbc.update("""
            INSERT INTO model_registry_version (
                version_id, model_id, version_no, file_object_id, file_name, file_extension, file_size_bytes,
                checksum, storage_bucket, storage_key, runtime_requirements, metrics_summary_json,
                security_scan_status, evaluation_status, evaluation_record_id, evaluation_proof,
                status, active_deployment_count, active_reference_json, created_by, created_at
            ) SELECT ?, ?, 'v-badhash', file_id, 'edge-model-badhash.onnx', '.onnx', size_bytes, ?, bucket, object_key, '{}', '{}', 'PASSED', 'PASSED', 'EVAL-F021-BADHASH', 'passed', 'PRODUCTION', 0, '[]', 'USR-BU-CABIN', CURRENT_TIMESTAMP
              FROM platform_file_object WHERE file_id=?
            """, versionId, modelId, sha256 + "-drift", fileId);
        return versionId;
    }

    private String seedDevelopmentVersion(String modelId, String fileId, String suffix) {
        String versionId = "MVER-EDGE-DEV-" + suffix;
        jdbc.update("""
            INSERT INTO model_registry_version (
                version_id, model_id, version_no, file_object_id, file_name, file_extension, file_size_bytes,
                checksum, storage_bucket, storage_key, runtime_requirements, metrics_summary_json,
                security_scan_status, evaluation_status, evaluation_record_id, evaluation_proof,
                status, active_deployment_count, active_reference_json, created_by, created_at
            ) SELECT ?, ?, 'v-dev', file_id, 'edge-model-dev.onnx', '.onnx', size_bytes, sha256, bucket, object_key, '{}', '{}', 'PENDING', 'NONE', NULL, NULL, 'DEVELOPMENT', 0, '[]', 'USR-BU-CABIN', CURRENT_TIMESTAMP
              FROM platform_file_object WHERE file_id=?
            """, versionId, modelId, fileId);
        return versionId;
    }

    private void seedModelFile(String fileId, String sha256, String fileName) {
        String bucket = "smp-datasets";
        String objectKey = "TENANT-CABIN/model/" + fileId + "/" + fileName;
        jdbc.update("""
            INSERT INTO platform_file_object (
                file_id, asset_type, tenant_id, project_id, bucket, object_key,
                expected_sha256, sha256, expected_size_bytes, size_bytes, content_type,
                storage_tier, status, owner_id, created_at, updated_at
            ) VALUES (?, 'MODEL', 'TENANT-CABIN', NULL, ?, ?, NULL, ?, 1048576, 1048576, 'application/octet-stream', 'STANDARD', 'AVAILABLE', 'USR-BU-CABIN', ?, ?)
            """, fileId, bucket, objectKey, sha256, OffsetDateTime.now(), OffsetDateTime.now());
    }

    private String login(String username, String tenantCode) throws Exception {
        return postJson("/api/v1/auth/login", "trace-login-" + username + "-" + tenantCode, """
            {"username":"%s","password":"Smp@123456","tenantCode":"%s"}
            """.formatted(username, tenantCode), null).at("/data/accessToken").asText();
    }

    private void grantRolePermission(String roleCode, String permissionCode) {
        String id = roleCode + "::" + permissionCode;
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM platform_role_permission WHERE id=?", Integer.class, id);
        if (count == null || count == 0) {
            jdbc.update(
                "INSERT INTO platform_role_permission (id, role_code, permission_code) VALUES (?, ?, ?)",
                id,
                roleCode,
                permissionCode
            );
        }
    }

    private JsonNode getJson(String path, String traceId, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .GET();
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return send(builder.build());
    }

    private JsonNode postJson(String path, String traceId, String body, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return send(builder.build());
    }

    private JsonNode send(HttpRequest request) throws Exception {
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 400) {
            assertThat(response.headers().firstValue(TraceIdFilter.TRACE_HEADER)).isPresent();
        }
        return objectMapper.readTree(response.body());
    }

    private String randomIdPart(int length) {
        return UUID.randomUUID().toString().replace("-", "").substring(0, length).toUpperCase(Locale.ROOT);
    }
}


