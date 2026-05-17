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
class PlatformOrganizationConfigControllerTest {
    @LocalServerPort
    private int port;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void organizationTreeCreateDeleteAndMemberScopeRespectBuBoundary() throws Exception {
        // TASK-platform-organization-config AC-01 AC-02 AC-09
        String admin = login("admin", "YF");
        JsonNode tree = getJson("/api/v1/platform/organizations/tree", "trace-f007-org-tree", admin);
        assertThat(tree.at("/code").asInt()).isZero();
        assertThat(tree.at("/data/nodes/0/tenantType").asText()).isEqualTo("CORP");
        assertThat(tree.at("/data/nodes/0/children").findValuesAsText("code")).contains("CABIN", "QE");

        JsonNode created = postJson("/api/v1/platform/organizations", "trace-f007-org-create", """
            {"name":"制造视觉项目","code":"MFG-VISION","tenantType":"PROJECT","parentId":"TENANT-CABIN","quotaGpu":4,"quotaStorageTb":2,"apiRateLimitPerDay":5000}
            """, admin);
        assertThat(created.at("/code").asInt()).isZero();
        assertThat(created.at("/data/tenantType").asText()).isEqualTo("PROJECT");
        assertThat(created.at("/data/path").asText()).contains("TENANT-CABIN");

        JsonNode assigned = postJson("/api/v1/platform/organizations/TENANT-CABIN/members", "trace-f007-member-assign", """
            {"userId":"USR-ANNOTATOR","roleCode":"DATA_ANNOTATOR","scopeType":"BU","scopeId":"TENANT-CABIN"}
            """, admin);
        assertThat(assigned.at("/code").asInt()).isZero();
        assertThat(assigned.at("/data/scopeId").asText()).isEqualTo("TENANT-CABIN");

        JsonNode deleteBlocked = deleteJson("/api/v1/platform/organizations/TENANT-CABIN", "trace-f007-org-delete-blocked", admin);
        assertThat(deleteBlocked.at("/code").asInt()).isEqualTo(40900);
        JsonNode deleteAudit = getJson("/api/v1/platform/audit-logs?action=ORG_NODE_DELETE_BLOCKED", "trace-f007-org-delete-audit", admin);
        assertThat(deleteAudit.at("/data/items/0/action").asText()).isEqualTo("ORG_NODE_DELETE_BLOCKED");

        String buAdmin = login("buadmin", "CABIN");
        JsonNode crossBu = postJson("/api/v1/platform/organizations/TENANT-QE/members", "trace-f007-member-cross-bu", """
            {"userId":"USR-QE","roleCode":"DATA_REVIEWER","scopeType":"BU","scopeId":"TENANT-QE"}
            """, buAdmin);
        assertThat(crossBu.at("/code").asInt()).isEqualTo(40300);
    }

    @Test
    void configsInheritAndRejectBuLimitEscalationWithAudit() throws Exception {
        // TASK-platform-organization-config AC-03 AC-04 AC-09 AC-10
        String admin = login("admin", "YF");
        JsonNode project = postJson("/api/v1/platform/organizations", "trace-f007-config-project", """
            {"name":"配置继承项目","code":"CFG-PROJ","tenantType":"PROJECT","parentId":"TENANT-CABIN","quotaGpu":2,"quotaStorageTb":1,"apiRateLimitPerDay":1000}
            """, admin);
        assertThat(project.at("/code").asInt()).isZero();
        String projectId = project.at("/data/id").asText();

        JsonNode effective = getJson("/api/v1/platform/configs/effective/upload.maxFileSizeMb?scopeType=PROJECT&scopeId=" + projectId, "trace-f007-config-effective", admin);
        assertThat(effective.at("/code").asInt()).isZero();
        assertThat(effective.at("/data/value").asText()).isEqualTo("120");
        assertThat(effective.at("/data/inheritedFrom").asText()).isEqualTo("BU:TENANT-CABIN");

        JsonNode updated = putJson("/api/v1/platform/configs/upload.maxFileSizeMb", "trace-f007-config-update", """
            {"scopeType":"BU","scopeId":"TENANT-CABIN","value":"100","reason":"BU 下调上传上限"}
            """, admin);
        assertThat(updated.at("/code").asInt()).isZero();
        assertThat(updated.at("/data/effectiveValue").asText()).isEqualTo("100");

        JsonNode rejected = putJson("/api/v1/platform/configs/upload.maxFileSizeMb", "trace-f007-config-reject", """
            {"scopeType":"BU","scopeId":"TENANT-CABIN","value":"999","reason":"尝试突破集团上限"}
            """, admin);
        assertThat(rejected.at("/code").asInt()).isEqualTo(42200);
        JsonNode audit = getJson("/api/v1/platform/audit-logs?action=CONFIG_LIMIT_REJECTED", "trace-f007-config-audit", admin);
        assertThat(audit.at("/data/items/0/riskLevel").asText()).isEqualTo("CRITICAL");

        JsonNode sensitive = getJson("/api/v1/platform/configs?scopeType=GLOBAL&scopeId=TENANT-YF", "trace-f007-config-sensitive", admin);
        assertThat(sensitive.toString()).contains("TODO_CONFIRM_MINIO_ENDPOINT");
    }

    @Test
    void fileMetadataNotificationAndApiKeyUseProductionSeams() throws Exception {
        // TASK-platform-organization-config AC-05 AC-06 AC-07 AC-09 AC-10
        String admin = login("admin", "YF");
        JsonNode initiated = postJson("/api/v1/platform/files/init", "trace-f007-file-init", """
            {"assetType":"DATASET","tenantId":"TENANT-CABIN","filename":"sample.csv","expectedSha256":"abc123","expectedSizeBytes":42,"contentType":"text/csv"}
            """, admin);
        assertThat(initiated.at("/code").asInt()).isZero();
        String fileId = initiated.at("/data/fileId").asText();
        assertThat(initiated.at("/data/objectKey").asText()).contains("TENANT-CABIN/dataset");

        JsonNode completed = postJson("/api/v1/platform/files/" + fileId + "/complete", "trace-f007-file-complete", """
            {"sha256":"abc123","sizeBytes":42}
            """, admin);
        assertThat(completed.at("/data/status").asText()).isEqualTo("AVAILABLE");

        JsonNode failedFile = postJson("/api/v1/platform/files/init", "trace-f007-file-init-fail", """
            {"assetType":"MODEL","tenantId":"TENANT-CABIN","filename":"model.bin","expectedSha256":"good","expectedSizeBytes":8}
            """, admin);
        JsonNode mismatch = postJson("/api/v1/platform/files/" + failedFile.at("/data/fileId").asText() + "/complete", "trace-f007-file-mismatch", """
            {"sha256":"bad","sizeBytes":8}
            """, admin);
        assertThat(mismatch.at("/code").asInt()).isEqualTo(42200);

        postJson("/api/v1/platform/files/" + fileId + "/delete", "trace-f007-file-delete", "{}", admin);
        JsonNode restored = postJson("/api/v1/platform/files/" + fileId + "/restore", "trace-f007-file-restore", "{}", admin);
        assertThat(restored.at("/data/status").asText()).isEqualTo("AVAILABLE");
        JsonNode download = getJson("/api/v1/platform/files/" + fileId + "/download-url", "trace-f007-file-download", admin);
        assertThat(download.at("/data/status").asText()).isEqualTo("UNCONFIGURED");
        assertThat(download.at("/data/diagnostic").asText()).contains("TODO_CONFIRM_MINIO_ENDPOINT");

        JsonNode notification = postJson("/api/v1/platform/notification-channels/NC-GLOBAL-EMAIL/test", "trace-f007-notification-test", "{}", admin);
        assertThat(notification.at("/data/result").asText()).isEqualTo("UNCONFIGURED");
        assertThat(notification.at("/data/diagnostic").asText()).contains("TODO_CONFIRM_SMTP_HOST");

        JsonNode apiKey = postJson("/api/v1/platform/api-keys", "trace-f007-apikey-create", """
            {"name":"batch-inference-prod","scopeType":"BU","scopeId":"TENANT-CABIN","expiresInDays":90,"permissions":["INFERENCE_READ"]}
            """, admin);
        assertThat(apiKey.at("/code").asInt()).isZero();
        assertThat(apiKey.at("/data/plainTextKey").asText()).startsWith("smp_live_");
        String keyId = apiKey.at("/data/id").asText();
        JsonNode keys = getJson("/api/v1/platform/api-keys", "trace-f007-apikey-list", admin);
        assertThat(keys.toString()).doesNotContain(apiKey.at("/data/plainTextKey").asText());
        assertThat(keys.at("/data/0/maskedKey").asText()).contains("************");
        JsonNode revoked = postJson("/api/v1/platform/api-keys/" + keyId + "/revoke", "trace-f007-apikey-revoke", "{}", admin);
        assertThat(revoked.at("/data/status").asText()).isEqualTo("REVOKED");
    }

    private String login(String username, String tenantCode) throws Exception {
        JsonNode login = postJson("/api/v1/auth/login", "trace-login-" + username, """
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

    private JsonNode deleteJson(String path, String traceId, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).header(TraceIdFilter.TRACE_HEADER, traceId).DELETE();
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return send(builder.build());
    }

    private JsonNode send(HttpRequest request) throws Exception {
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 400) {
            assertThat(response.headers().firstValue(TraceIdFilter.TRACE_HEADER)).isPresent();
        }
        return objectMapper.readTree(response.body());
    }
}
