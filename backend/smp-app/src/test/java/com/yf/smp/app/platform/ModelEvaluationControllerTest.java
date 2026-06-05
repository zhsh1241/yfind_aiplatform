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
class ModelEvaluationControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void taskModelEvaluationReadinessShouldCreateImportCompareGateAndAudit() throws Exception {
        // TASK-model-evaluation-readiness AC-01 AC-02 AC-03 AC-04 AC-05 AC-06 AC-07 AC-08 AC-09 AC-10 AC-11
        String cabinBuAdmin = login("buadmin", "CABIN");
        String qeUser = login("qeuser", "QE");
        String admin = login("admin", "YF");
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        seedModelFile("FILE-EVAL-" + suffix, "TENANT-CABIN", "USR-BU-CABIN", "eval-model-" + suffix + ".onnx", 1048576L, "application/octet-stream");
        String fileId = jdbc.queryForObject("SELECT file_id FROM platform_file_object WHERE object_key LIKE ?", String.class, "%eval-model-" + suffix + ".onnx");

        JsonNode model = postJson("/api/v1/models", "trace-f020-create-model", """
            {
              "name":"TASK-model-evaluation-readiness 焊缝模型 %s",
              "description":"F020 模型评估主链路",
              "framework":"ONNX",
              "taskType":"OBJECT_DETECTION",
              "inputFormat":"image:640x640 RGB",
              "outputFormat":"bbox[class,score,x1,y1,x2,y2]",
              "runtimeRequirements":"{}",
              "tags":["F020"],
              "scope":"PRIVATE",
              "source":"LOCAL_UPLOAD"
            }
            """.formatted(suffix), cabinBuAdmin);
        assertThat(model.at("/code").asInt()).isZero();
        String modelId = model.at("/data/modelId").asText();

        JsonNode version = postJson("/api/v1/models/" + modelId + "/versions", "trace-f020-create-version", """
            {
              "versionNo":"v1.0",
              "fileObjectId":"%s",
              "runtimeRequirements":"{}",
              "evaluationStatus":"NONE",
              "setAsCurrent":true
            }
            """.formatted(fileId), cabinBuAdmin);
        assertThat(version.at("/code").asInt()).isZero();
        String versionId = version.at("/data/versionId").asText();

        JsonNode invalidThreshold = postJson("/api/v1/model-evaluations", "trace-f020-invalid-threshold", """
            {"modelId":"%s","versionId":"%s","datasetVersionId":"DVER-WELD-001","thresholdConfig":{"mAP50":"bad"}}
            """.formatted(modelId, versionId), cabinBuAdmin);
        assertThat(invalidThreshold.at("/code").asInt()).isEqualTo(40000);

        JsonNode created = postJson("/api/v1/model-evaluations", "trace-f020-create-evaluation", """
            {
              "modelId":"%s",
              "versionId":"%s",
              "datasetVersionId":"DVER-WELD-001",
              "taskType":"OBJECT_DETECTION",
              "metricConfig":{"primaryMetric":"mAP50"},
              "thresholdConfig":{"mAP50":0.85},
              "executorType":"IMPORTED",
              "notes":"外部评估导入"
            }
            """.formatted(modelId, versionId), cabinBuAdmin);
        assertThat(created.at("/code").asInt()).isZero();
        assertThat(created.at("/data/status").asText()).isEqualTo("READY");
        String evaluationRunId = created.at("/data/evaluationRunId").asText();

        JsonNode blockedPublishBefore = publishFromTesting(cabinBuAdmin, modelId, versionId, "trace-f020-publish-before-passed");
        assertThat(blockedPublishBefore.at("/code").asInt()).isEqualTo(42254);

        JsonNode missingMetric = postJson("/api/v1/model-evaluations/" + evaluationRunId + "/results:import", "trace-f020-import-missing", """
            {"metricResults":{"latencyMs":20}}
            """, cabinBuAdmin);
        assertThat(missingMetric.at("/code").asInt()).isEqualTo(42253);

        JsonNode imported = postJson("/api/v1/model-evaluations/" + evaluationRunId + "/results:import", "trace-f020-import-passed", """
            {
              "metricResults":{"mAP50":0.91,"latencyMs":18},
              "reportSummary":"验证集 31200 条样本，mAP50 达标",
              "curveData":{"pr":[[0.0,1.0],[1.0,0.88]]},
              "confusionMatrix":{"labels":["OK","NG"],"matrix":[[98,2],[4,96]]},
              "errorCases":[{"sampleId":"IMG-001","reason":"反光误检"}],
              "artifacts":[{"artifactType":"REPORT","fileObjectId":"FILE-DATASET-WELD-001","name":"f020-report.json"}],
              "externalRunId":"EXT-F020-001"
            }
            """, cabinBuAdmin);
        assertThat(imported.at("/code").asInt()).isZero();
        assertThat(imported.at("/data/run/status").asText()).isEqualTo("PASSED");
        assertThat(imported.toString()).contains("curveData").contains("confusionMatrix").contains("IMG-001");
        String artifactId = imported.at("/data/artifacts/0/artifactId").asText();

        JsonNode duplicateImport = postJson("/api/v1/model-evaluations/" + evaluationRunId + "/results:import", "trace-f020-import-duplicate", """
            {"metricResults":{"mAP50":0.92}}
            """, cabinBuAdmin);
        assertThat(duplicateImport.at("/code").asInt()).isEqualTo(40952);

        JsonNode detail = getJson("/api/v1/model-evaluations/" + evaluationRunId, "trace-f020-detail", cabinBuAdmin);
        assertThat(detail.at("/code").asInt()).isZero();
        assertThat(detail.at("/data/metrics/0/metricName").asText()).isEqualTo("latencyMs");
        assertThat(detail.toString()).contains("f020-report.json");

        JsonNode download = getJson("/api/v1/model-evaluations/" + evaluationRunId + "/artifacts/" + artifactId + "/download-url", "trace-f020-artifact-download", cabinBuAdmin);
        assertThat(download.at("/code").asInt()).isZero();
        assertThat(download.at("/data/downloadUrl").asText()).isNotBlank();

        JsonNode production = postJson("/api/v1/models/" + modelId + "/versions/" + versionId + "/transition", "trace-f020-publish-after-passed", """
            {"targetStatus":"PRODUCTION","reason":"F020 PASSED 门禁"}
            """, cabinBuAdmin);
        assertThat(production.at("/code").asInt()).isZero();
        assertThat(production.at("/data/status").asText()).isEqualTo("PRODUCTION");

        String secondVersionId = createSecondVersionWithFailedEvaluation(cabinBuAdmin, modelId, fileId, suffix);
        JsonNode compare = getJson("/api/v1/models/" + modelId + "/versions:compare-evaluations?versionIds=" + versionId + "," + secondVersionId, "trace-f020-compare", cabinBuAdmin);
        assertThat(compare.at("/code").asInt()).isZero();
        assertThat(compare.toString()).contains("mAP50").contains("\"best\":true");

        JsonNode crossBuDenied = getJson("/api/v1/model-evaluations/" + evaluationRunId, "trace-f020-cross-bu-denied", qeUser);
        assertThat(crossBuDenied.at("/code").asInt()).isEqualTo(40304);

        grantRole("USR-QE", "MODEL_TRAINER", "TENANT-QE");
        grantRolePermission("DATA_REVIEWER", "model:model:read");
        String scopedRequestId = "MACC-F020-" + randomIdPart(12);
        String scopedGrantId = "MAGR-F020-" + randomIdPart(12);
        jdbc.update("""
            INSERT INTO model_access_request (
                request_id, model_id, version_id, requester_user_id, requester_org_id, owner_org_id,
                permission, reason, status, review_comment, reviewed_by, reviewed_at, expires_at, created_at, updated_at
            ) VALUES (?, ?, ?, 'USR-QE', 'TENANT-QE', 'TENANT-CABIN', 'VIEW', 'F020 version scoped grant', 'APPROVED', 'approved by test', 'USR-BU-CABIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1' DAY, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, scopedRequestId, modelId, versionId);
        jdbc.update("""
            INSERT INTO model_access_grant (
                grant_id, model_id, version_id, requester_user_id, requester_org_id, owner_org_id,
                permission, status, source_request_id, approved_by, expires_at, created_at, updated_at
            ) VALUES (?, ?, ?, 'USR-QE', 'TENANT-QE', 'TENANT-CABIN', 'VIEW', 'ACTIVE', ?, 'USR-BU-CABIN', CURRENT_TIMESTAMP + INTERVAL '1' DAY, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, scopedGrantId, modelId, versionId, scopedRequestId);
        JsonNode scopedList = getJson("/api/v1/model-evaluations?modelId=" + modelId, "trace-f020-scoped-list", qeUser);
        assertThat(scopedList.at("/code").asInt()).isZero();
        assertThat(scopedList.at("/data/items").toString()).contains(versionId).doesNotContain(secondVersionId);
        JsonNode scopedCreateDenied = postJson("/api/v1/model-evaluations", "trace-f020-cross-bu-create-denied", """
            {"modelId":"%s","versionId":"%s","datasetVersionId":"DVER-WELD-001","taskType":"OBJECT_DETECTION","thresholdConfig":{"mAP50":0.85},"executorType":"IMPORTED"}
            """.formatted(modelId, versionId), qeUser);
        assertThat(scopedCreateDenied.at("/code").asInt()).isEqualTo(40303);
        JsonNode datasetArtifactDenied = getJson("/api/v1/model-evaluations/" + evaluationRunId + "/artifacts/" + artifactId + "/download-url", "trace-f020-cross-bu-dataset-artifact-denied", qeUser);
        assertThat(datasetArtifactDenied.at("/code").asInt()).isEqualTo(40304);
        jdbc.update("""
            INSERT INTO dataset_access_grant (grant_id, dataset_id, version_id, user_id, granted_by, expires_at, status, created_at)
            VALUES (?, 'DATASET-WELD-DEFECT', 'DVER-WELD-001', 'USR-QE', 'USR-BU-CABIN', CURRENT_TIMESTAMP + INTERVAL '1' DAY, 'ACTIVE', CURRENT_TIMESTAMP)
            """, "DAG-F020-" + randomIdPart(12));
        JsonNode datasetArtifactGranted = getJson("/api/v1/model-evaluations/" + evaluationRunId + "/artifacts/" + artifactId + "/download-url", "trace-f020-cross-bu-dataset-artifact-granted", qeUser);
        assertThat(datasetArtifactGranted.at("/code").asInt()).isZero();
        assertThat(datasetArtifactGranted.at("/data/downloadUrl").asText()).isNotBlank();

        JsonNode audit = getJson("/api/v1/platform/audit-logs?action=MODEL_VERSION_PUBLISH_GATE_PASSED", "trace-f020-audit", admin);
        assertThat(audit.at("/code").asInt()).isZero();
        assertThat(audit.toString()).contains("TASK-model-evaluation-readiness");
    }

    private JsonNode publishFromTesting(String token, String modelId, String versionId, String trace) throws Exception {
        JsonNode testing = postJson("/api/v1/models/" + modelId + "/versions/" + versionId + "/transition", trace + "-to-testing", """
            {"targetStatus":"TESTING","reason":"F020 发布前置"}
            """, token);
        assertThat(testing.at("/code").asInt()).isZero();
        return postJson("/api/v1/models/" + modelId + "/versions/" + versionId + "/transition", trace + "-to-production", """
            {"targetStatus":"PRODUCTION","reason":"F020 无评估发布"}
            """, token);
    }

    private String createSecondVersionWithFailedEvaluation(String token, String modelId, String fileId, String suffix) throws Exception {
        JsonNode version = postJson("/api/v1/models/" + modelId + "/versions", "trace-f020-create-version-two", """
            {"versionNo":"v2.0-%s","fileObjectId":"%s","runtimeRequirements":"{}","evaluationStatus":"NONE","setAsCurrent":false}
            """.formatted(suffix, fileId), token);
        assertThat(version.at("/code").asInt()).isZero();
        String versionId = version.at("/data/versionId").asText();
        JsonNode evaluation = postJson("/api/v1/model-evaluations", "trace-f020-create-failed-eval", """
            {"modelId":"%s","versionId":"%s","datasetVersionId":"DVER-WELD-001","taskType":"OBJECT_DETECTION","thresholdConfig":{"mAP50":0.95},"executorType":"IMPORTED"}
            """.formatted(modelId, versionId), token);
        assertThat(evaluation.at("/code").asInt()).isZero();
        JsonNode imported = postJson("/api/v1/model-evaluations/" + evaluation.at("/data/evaluationRunId").asText() + "/results:import", "trace-f020-import-failed", """
            {"metricResults":{"mAP50":0.88,"latencyMs":22},"reportSummary":"未达标"}
            """, token);
        assertThat(imported.at("/data/run/status").asText()).isEqualTo("FAILED");
        return versionId;
    }

    private String randomIdPart(int length) {
        return UUID.randomUUID().toString().replace("-", "").substring(0, length).toUpperCase(Locale.ROOT);
    }

    private void grantRole(String userId, String roleCode, String tenantId) {
        String id = userId + "::" + roleCode + "::" + tenantId;
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM platform_user_role WHERE id=?", Integer.class, id);
        if (count == null || count == 0) {
            jdbc.update("""
                INSERT INTO platform_user_role (id, user_id, role_code, tenant_id, active, expires_at, created_at)
                VALUES (?, ?, ?, ?, TRUE, NULL, CURRENT_TIMESTAMP)
                """, id, userId, roleCode, tenantId);
        }
    }

    private void grantRolePermission(String roleCode, String permissionCode) {
        String id = roleCode + "::" + permissionCode;
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM platform_role_permission WHERE id=?", Integer.class, id);
        if (count == null || count == 0) {
            jdbc.update("""
                INSERT INTO platform_role_permission (id, role_code, permission_code)
                VALUES (?, ?, ?)
                """, id, roleCode, permissionCode);
        }
    }

    private void seedModelFile(String fileId, String tenantId, String ownerId, String fileName, long sizeBytes, String contentType) {
        String bucket = "smp-datasets";
        String objectKey = tenantId + "/model/" + fileId + "/" + fileName;
        jdbc.update("""
            INSERT INTO platform_file_object (
                file_id, asset_type, tenant_id, project_id, bucket, object_key,
                expected_sha256, sha256, expected_size_bytes, size_bytes, content_type,
                storage_tier, status, owner_id, created_at, updated_at
            ) VALUES (?, 'MODEL', ?, NULL, ?, ?, NULL, ?, ?, ?, ?, 'STANDARD', 'AVAILABLE', ?, ?, ?)
            """,
            fileId,
            tenantId,
            bucket,
            objectKey,
            UUID.randomUUID().toString().replace("-", ""),
            sizeBytes,
            sizeBytes,
            contentType,
            ownerId,
            OffsetDateTime.now(),
            OffsetDateTime.now()
        );
    }

    private String login(String username, String tenantCode) throws Exception {
        return postJson("/api/v1/auth/login", "trace-login-" + username + "-" + tenantCode, """
            {"username":"%s","password":"Smp@123456","tenantCode":"%s"}
            """.formatted(username, tenantCode), null).at("/data/accessToken").asText();
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
}
