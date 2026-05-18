package com.yf.smp.app.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yf.smp.app.web.TraceIdFilter;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class DataManagementControllerTest {
    @LocalServerPort
    private int port;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void dataSourceTestGateMasksSecretsAndAuditDiagnostics() throws Exception {
        // TASK-data-source-dataset-management AC-01 AC-02 AC-09
        String admin = login("admin", "YF");
        JsonNode created = postJson("/api/v1/data-sources", "trace-f009-dsrc-create", """
            {"name":"测试对象存储","sourceType":"OBJECT_STORAGE","tenantId":"TENANT-CABIN","endpoint":"TODO_CONFIRM_OSS_ENDPOINT","port":9000,"databaseName":"bucket-a","credentialMode":"SECRET_REF","secretRef":"secret://TODO_CONFIRM_OSS_SECRET","sharedScope":"BU"}
            """, admin);
        assertThat(created.at("/code").asInt()).isZero();
        String sourceId = created.at("/data/sourceId").asText();
        assertThat(created.at("/data/status").asText()).isEqualTo("UNCONFIGURED");
        assertThat(created.toString()).doesNotContain("accessKeySecret");

        JsonNode activateRejected = postJson("/api/v1/data-sources/" + sourceId + "/activate", "trace-f009-dsrc-activate-reject", "{}", admin);
        assertThat(activateRejected.at("/code").asInt()).isEqualTo(40900);
        assertThat(activateRejected.at("/message").asText()).contains("DATA_SOURCE_TEST_FAILED");

        JsonNode tested = postJson("/api/v1/data-sources/" + sourceId + "/test", "trace-f009-dsrc-test", "{}", admin);
        assertThat(tested.at("/data/result").asText()).isEqualTo("FAILED");
        assertThat(tested.at("/data/diagnosticCode").asText()).isEqualTo("DATA_SOURCE_UNCONFIGURED");

        JsonNode syncRejected = postJson("/api/v1/data-source-sync-tasks", "trace-f009-dsrc-sync-reject", """
            {"sourceId":"%s","name":"未激活数据源同步","scheduleMode":"MANUAL"}
            """.formatted(sourceId), admin);
        assertThat(syncRejected.at("/code").asInt()).isEqualTo(40900);
        assertThat(syncRejected.at("/message").asText()).contains("DATA_SOURCE_NOT_ACTIVE");

        JsonNode importRejected = postJson("/api/v1/datasets", "trace-f009-dsrc-import-reject", """
            {"name":"非法导入数据集","datasetType":"RAW","dataType":"IMAGE","tenantId":"TENANT-CABIN","accessLevel":"TEAM","sourceId":"%s"}
            """.formatted(sourceId), admin);
        assertThat(importRejected.at("/code").asInt()).isEqualTo(40900);
        assertThat(importRejected.at("/message").asText()).contains("DATA_SOURCE_NOT_ACTIVE");

        JsonNode sandbox = postJson("/api/v1/data-sources", "trace-f009-dsrc-sandbox", """
            {"name":"Sandbox MinIO","sourceType":"OBJECT_STORAGE","tenantId":"TENANT-CABIN","endpoint":"minio.sandbox.internal","port":9000,"databaseName":"bucket-a","credentialMode":"SECRET_REF","secretRef":"secret://sandbox/minio","sharedScope":"BU"}
            """, admin);
        String sandboxId = sandbox.at("/data/sourceId").asText();
        JsonNode sandboxTest = postJson("/api/v1/data-sources/" + sandboxId + "/test", "trace-f009-dsrc-sandbox-test", "{}", admin);
        assertThat(sandboxTest.at("/data/diagnosticCode").asText()).isEqualTo("OK");
        JsonNode activated = postJson("/api/v1/data-sources/" + sandboxId + "/activate", "trace-f009-dsrc-activate", "{}", admin);
        assertThat(activated.at("/data/status").asText()).isEqualTo("ACTIVE");

        JsonNode syncCreated = postJson("/api/v1/data-source-sync-tasks", "trace-f009-dsrc-sync-create", """
            {"sourceId":"%s","name":"Sandbox 同步任务","scheduleMode":"MANUAL"}
            """.formatted(sandboxId), admin);
        assertThat(syncCreated.at("/data/status").asText()).isEqualTo("PAUSED");

        JsonNode audit = getJson("/api/v1/platform/audit-logs?action=DATA_SOURCE_ACTIVATED", "trace-f009-dsrc-audit", admin);
        assertThat(audit.at("/data/items/0/action").asText()).isEqualTo("DATA_SOURCE_ACTIVATED");
    }

    @Test
    void datasetLifecycleBlocksUnconfiguredSafetyAndImmutablePublishedVersion() throws Exception {
        // TASK-data-source-dataset-management AC-03 AC-04 AC-05 AC-06 AC-09
        String admin = login("admin", "YF");
        JsonNode list = getJson("/api/v1/datasets", "trace-f009-datasets", admin);
        assertThat(list.at("/code").asInt()).isZero();
        assertThat(list.at("/data/stats/total").asLong()).isGreaterThanOrEqualTo(2);
        assertThat(list.at("/data/items").findValuesAsText("name")).contains("焊缝缺陷检测数据集");

        JsonNode created = postJson("/api/v1/datasets", "trace-f009-dataset-create", """
            {"name":"单元测试数据集","datasetType":"RAW","dataType":"IMAGE","tenantId":"TENANT-CABIN","accessLevel":"TEAM","tags":["单测","图像"],"description":"F009 test","recordCount":10,"sourceId":"DSRC-CABIN-MINIO"}
            """, admin);
        assertThat(created.at("/data/dataset/status").asText()).isEqualTo("DRAFT");
        String datasetId = created.at("/data/dataset/datasetId").asText();
        String versionId = created.at("/data/versions/0/versionId").asText();

        JsonNode attached = postJson("/api/v1/datasets/" + datasetId + "/versions/" + versionId + "/files", "trace-f009-file-attach", """
            {"fileId":"FILE-DATASET-WELD-001","fileRole":"RAW"}
            """, admin);
        assertThat(attached.at("/data/status").asText()).isEqualTo("BOUND");

        JsonNode publishBlocked = postJson("/api/v1/datasets/" + datasetId + "/versions/" + versionId + "/publish", "trace-f009-publish-block", "{}", admin);
        assertThat(publishBlocked.at("/code").asInt()).isEqualTo(42200);
        assertThat(publishBlocked.at("/message").asText()).contains("DATASET_SECURITY_PENDING");

        JsonNode immutable = putJson("/api/v1/datasets/DATASET-WELD-DEFECT", "trace-f009-immutable", """
            {"name":"非法修改已发布数据集","accessLevel":"TEAM","tags":["bad"]}
            """, admin);
        assertThat(immutable.at("/code").asInt()).isEqualTo(40900);
        assertThat(immutable.at("/message").asText()).contains("DATASET_VERSION_IMMUTABLE");

        JsonNode detail = getJson("/api/v1/datasets/DATASET-WELD-DEFECT", "trace-f009-detail", admin);
        assertThat(detail.at("/data/lineage/0/sourceType").asText()).isEqualTo("DATA_SOURCE");
        assertThat(detail.at("/data/previewStatus").asText()).isEqualTo("UNSUPPORTED");
    }

    @Test
    void restrictedDatasetRequiresGrantAndReferenceUsesBuIsolation() throws Exception {
        // TASK-data-source-dataset-management AC-07 AC-08 AC-10
        String annotator = login("annotator", "CABIN");
        JsonNode restricted = getJson("/api/v1/datasets/DATASET-WELD-DEFECT", "trace-f009-restricted", annotator);
        assertThat(restricted.at("/code").asInt()).isEqualTo(40300);
        assertThat(restricted.at("/message").asText()).contains("DATASET_ACCESS_REQUIRED");

        JsonNode request = postJson("/api/v1/datasets/DATASET-WELD-DEFECT/access-requests", "trace-f009-access-request", """
            {"purpose":"训练焊缝缺陷模型"}
            """, annotator);
        assertThat(request.at("/data/status").asText()).isEqualTo("PENDING");
        String requestId = request.at("/data/requestId").asText();

        String admin = login("admin", "YF");
        JsonNode grant = putJson("/api/v1/dataset-access-requests/" + requestId + "/approve", "trace-f009-access-approve", "{}", admin);
        assertThat(grant.at("/data/status").asText()).isEqualTo("ACTIVE");

        JsonNode reference = getJson("/api/v1/dataset-references?datasetId=DATASET-WELD-DEFECT", "trace-f009-reference", annotator);
        assertThat(reference.at("/code").asInt()).isZero();
        assertThat(reference.at("/data/usable").asBoolean()).isTrue();

        String qe = login("qeuser", "QE");
        JsonNode crossBu = getJson("/api/v1/datasets/DATASET-WELD-DEFECT", "trace-f009-cross-bu", qe);
        assertThat(crossBu.at("/code").asInt()).isEqualTo(40400);
    }

    private String login(String username, String tenantCode) throws Exception {
        JsonNode login = postJson("/api/v1/auth/login", "trace-login-" + username + "-" + tenantCode, """
            {"username":"%s","password":"Smp@123456","tenantCode":"%s"}
            """.formatted(username, tenantCode), null);
        return login.at("/data/accessToken").asText();
    }

    private JsonNode getJson(String path, String traceId, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).header(TraceIdFilter.TRACE_HEADER, traceId).GET();
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return send(builder.build());
    }

    private JsonNode postJson(String path, String traceId, String body, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).header(TraceIdFilter.TRACE_HEADER, traceId).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return send(builder.build());
    }

    private JsonNode putJson(String path, String traceId, String body, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).header(TraceIdFilter.TRACE_HEADER, traceId).header("Content-Type", "application/json").PUT(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return send(builder.build());
    }

    private JsonNode send(HttpRequest request) throws Exception {
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 400) assertThat(response.headers().firstValue(TraceIdFilter.TRACE_HEADER)).isPresent();
        return objectMapper.readTree(response.body());
    }
}
