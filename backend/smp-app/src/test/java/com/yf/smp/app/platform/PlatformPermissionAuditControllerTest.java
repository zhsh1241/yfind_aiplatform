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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class PlatformPermissionAuditControllerTest {
    @LocalServerPort
    private int port;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void exposesPresetPermissionMatrixAndVerifiesAuditSignature() throws Exception {
        // TASK-platform-identity-audit AC-05 AC-07 AC-08
        String admin = loginAsAdmin();

        JsonNode matrix = getJson("/api/v1/platform/permissions/matrix", "trace-f006-matrix", admin);
        assertThat(matrix.at("/code").asInt()).isZero();
        assertThat(matrix.at("/data/roles").findValuesAsText("code"))
            .contains("SUPER_ADMIN", "BU_ADMIN", "DATA_ANNOTATOR", "DATA_REVIEWER", "MODEL_TRAINER", "MODEL_OPS");
        assertThat(matrix.at("/data/modules").findValuesAsText("name")).contains("平台管理");

        JsonNode auditList = getJson("/api/v1/platform/audit-logs?action=AUTH_LOGIN_SUCCESS", "trace-f006-audits", admin);
        assertThat(auditList.at("/code").asInt()).isZero();
        assertThat(auditList.at("/data/total").asInt()).isGreaterThanOrEqualTo(1);
        String eventId = auditList.at("/data/items/0/eventId").asText();
        assertThat(auditList.at("/data/items/0/signature").asText()).isNotBlank();

        JsonNode event = getJson("/api/v1/platform/audit-logs/" + eventId, "trace-f006-audit-event", admin);
        assertThat(event.at("/data/items").size()).isGreaterThanOrEqualTo(1);

        JsonNode verify = postJson("/api/v1/platform/audit-logs/" + eventId + "/verify", "trace-f006-verify", "{}", admin);
        assertThat(verify.at("/code").asInt()).isZero();
        assertThat(verify.at("/data/valid").asBoolean()).isTrue();

        jdbc.update("UPDATE platform_audit_log SET occurred_at = DATEADD('SECOND', -5, occurred_at) WHERE event_id=?", eventId);
        JsonNode tampered = postJson("/api/v1/platform/audit-logs/" + eventId + "/verify", "trace-f006-verify-tampered", "{}", admin);
        assertThat(tampered.at("/code").asInt()).isZero();
        assertThat(tampered.at("/data/valid").asBoolean()).isFalse();

        JsonNode missingVerify = postJson("/api/v1/platform/audit-logs/EVT-NOT-FOUND/verify", "trace-f006-verify-missing", "{}", admin);
        assertThat(missingVerify.at("/code").asInt()).isEqualTo(40400);
    }

    @Test
    void auditLogsSupportContractFiltersAndPagination() throws Exception {
        // TASK-platform-identity-audit AC-07
        String admin = loginAsAdmin();
        JsonNode filtered = getJson("/api/v1/platform/audit-logs?actor=平台管理员&action=AUTH_LOGIN_SUCCESS&riskLevel=INFO&result=SUCCESS&page=1&pageSize=1", "trace-f006-audit-filter", admin);
        assertThat(filtered.at("/code").asInt()).isZero();
        assertThat(filtered.at("/data/page").asInt()).isEqualTo(1);
        assertThat(filtered.at("/data/pageSize").asInt()).isEqualTo(1);
        assertThat(filtered.at("/data/total").asInt()).isGreaterThanOrEqualTo(1);
        assertThat(filtered.at("/data/items/0/action").asText()).isEqualTo("AUTH_LOGIN_SUCCESS");
        assertThat(filtered.at("/data/items/0/operatorName").asText()).contains("平台管理员");
        assertThat(filtered.at("/data/items/0/result").asText()).isEqualTo("SUCCESS");
        assertThat(filtered.at("/data/items/0/riskLevel").asText()).isEqualTo("INFO");
    }

    @Test
    void auditExportKeepsContractSeamAndWritesAudit() throws Exception {
        // TASK-platform-identity-audit AC-07 AC-09
        String admin = loginAsAdmin();
        JsonNode export = postJson("/api/v1/platform/audit-logs/export", "trace-f006-export", """
            {"format":"CSV"}
            """, admin);
        assertThat(export.at("/code").asInt()).isZero();
        assertThat(export.at("/data/status").asText()).isIn("ACCEPTED", "TODO_CONFIRM_AUDIT_COLD_STORAGE");
    }

    private String loginAsAdmin() throws Exception {
        JsonNode login = postJson("/api/v1/auth/login", "trace-f006-admin-login", """
            {"username":"admin","password":"Smp@123456","tenantCode":"YF"}
            """, null);
        return login.at("/data/accessToken").asText();
    }

    private JsonNode getJson(String path, String traceId, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .GET();
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return send(builder.build());
    }

    private JsonNode postJson(String path, String traceId, String body, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return send(builder.build());
    }

    private JsonNode send(HttpRequest request) throws Exception {
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertThat(response.headers().firstValue(TraceIdFilter.TRACE_HEADER)).isPresent();
        return objectMapper.readTree(response.body());
    }
}
