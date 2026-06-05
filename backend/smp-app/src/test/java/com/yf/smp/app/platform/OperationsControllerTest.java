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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class OperationsControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void taskDashboardAlertReportShouldExposeOperationsLoopWithTenantIsolationAndAudit() throws Exception {
        // TASK-dashboard-alert-report AC-01 AC-02 AC-03 AC-04 AC-05 AC-06 AC-07 AC-08 AC-09 AC-10
        String admin = login("admin", "YF");
        String cabin = login("buadmin", "CABIN");
        String qe = login("qeuser", "QE");
        grantRolePermission("DATA_REVIEWER", "operations:dashboard:read");
        grantRolePermission("DATA_REVIEWER", "operations:scheduler:read");
        grantRolePermission("DATA_REVIEWER", "operations:alert:read");
        grantRolePermission("DATA_REVIEWER", "operations:report:read");

        JsonNode overview = getJson("/api/v1/operations/dashboard/overview", "trace-f022-dashboard", cabin);
        assertThat(overview.at("/code").asInt()).isZero();
        assertThat(overview.toString()).contains("数据集").contains("模型资产").contains("TODO_CONFIRM_OBSERVABILITY_PROVIDER");
        assertThat(overview.at("/data/metrics").size()).isGreaterThanOrEqualTo(4);

        JsonNode todos = getJson("/api/v1/operations/dashboard/todos", "trace-f022-todos", cabin);
        assertThat(todos.at("/code").asInt()).isZero();
        assertThat(todos.toString()).contains("OPR-ALERT-EDGE-001").contains("/alert");

        JsonNode activities = getJson("/api/v1/operations/dashboard/activities", "trace-f022-activities", admin);
        assertThat(activities.at("/code").asInt()).isZero();

        JsonNode scheduler = getJson("/api/v1/operations/scheduler/overview", "trace-f022-scheduler-overview", cabin);
        assertThat(scheduler.at("/code").asInt()).isZero();
        assertThat(scheduler.toString()).contains("TODO_CONFIRM_SCHEDULER_AI_ASSISTANT");
        JsonNode schedulerTasks = getJson("/api/v1/operations/scheduler/tasks?taskType=PIPELINE", "trace-f022-scheduler-tasks", cabin);
        assertThat(schedulerTasks.at("/code").asInt()).isZero();
        assertThat(schedulerTasks.toString()).contains("PIPELINE");
        JsonNode assistant = postJson("/api/v1/operations/scheduler/assistant:diagnose", "trace-f022-assistant", "{\"question\":\"如何处理失败队列\"}", cabin);
        assertThat(assistant.at("/data/status").asText()).isEqualTo("SEAM");
        assertThat(assistant.toString()).contains("TODO_CONFIRM_SCHEDULER_AI_ASSISTANT");

        JsonNode alerts = getJson("/api/v1/operations/alerts?status=OPEN", "trace-f022-alerts", cabin);
        assertThat(alerts.at("/code").asInt()).isZero();
        assertThat(alerts.toString()).contains("OPR-ALERT-EDGE-001");
        String alertId = alerts.at("/data/items/0/alertId").asText();
        JsonNode detail = getJson("/api/v1/operations/alerts/" + alertId, "trace-f022-alert-detail", cabin);
        assertThat(detail.at("/code").asInt()).isZero();
        assertThat(detail.toString()).contains("TODO_CONFIRM_NOTIFICATION_CHANNEL");
        JsonNode acknowledged = postJson("/api/v1/operations/alerts/" + alertId + "/acknowledge", "trace-f022-ack", "{\"comment\":\"收到，安排处理\"}", cabin);
        assertThat(acknowledged.at("/data/status").asText()).isEqualTo("ACKNOWLEDGED");
        JsonNode resolved = postJson("/api/v1/operations/alerts/" + alertId + "/resolve", "trace-f022-resolve", "{\"comment\":\"现场已恢复\"}", cabin);
        assertThat(resolved.at("/data/status").asText()).isEqualTo("RESOLVED");
        JsonNode repeated = postJson("/api/v1/operations/alerts/" + alertId + "/acknowledge", "trace-f022-repeat", "{}", cabin);
        assertThat(repeated.at("/code").asInt()).isEqualTo(40971);

        JsonNode rules = getJson("/api/v1/operations/alerts/rules", "trace-f022-rules", cabin);
        assertThat(rules.toString()).contains("TODO_CONFIRM_OBSERVABILITY_PROVIDER").contains("TODO_CONFIRM_NOTIFICATION_CHANNEL");

        JsonNode reportOverview = getJson("/api/v1/operations/reports/overview", "trace-f022-report-overview", cabin);
        assertThat(reportOverview.at("/code").asInt()).isZero();
        assertThat(reportOverview.toString()).contains("DATA_ASSET").contains("EDGE_RUNTIME");
        JsonNode report = getJson("/api/v1/operations/reports/EDGE_RUNTIME", "trace-f022-report-detail", cabin);
        assertThat(report.at("/code").asInt()).isZero();
        assertThat(report.toString()).contains("边端运行报表").contains("TODO_CONFIRM_REPORT_DRILLDOWN");
        JsonNode invalidReport = getJson("/api/v1/operations/reports/UNKNOWN", "trace-f022-report-invalid", cabin);
        assertThat(invalidReport.at("/code").asInt()).isEqualTo(42271);
        JsonNode export = postJson("/api/v1/operations/reports/EDGE_RUNTIME/exports", "trace-f022-export", "{\"format\":\"CSV\",\"filters\":{\"tenantId\":\"TENANT-CABIN\"}}", cabin);
        assertThat(export.at("/code").asInt()).isZero();
        assertThat(export.at("/data/status").asText()).isEqualTo("PENDING");
        assertThat(export.toString()).contains("TODO_CONFIRM_REPORT_EXPORT_STORAGE");
        JsonNode exports = getJson("/api/v1/operations/reports/exports", "trace-f022-exports", cabin);
        assertThat(exports.toString()).contains(export.at("/data/exportId").asText());

        JsonNode crossBu = getJson("/api/v1/operations/alerts?tenantId=TENANT-CABIN", "trace-f022-cross-bu", qe);
        assertThat(crossBu.at("/code").asInt()).isEqualTo(40304);
        JsonNode adminGlobal = getJson("/api/v1/operations/dashboard/overview", "trace-f022-admin-global", admin);
        assertThat(adminGlobal.at("/code").asInt()).isZero();
        assertThat(adminGlobal.at("/data/metrics/3/value").asLong()).isGreaterThanOrEqualTo(1);

        JsonNode audit = getJson("/api/v1/platform/audit-logs?action=OPERATION_REPORT_EXPORT_REQUESTED", "trace-f022-audit", admin);
        assertThat(audit.at("/code").asInt()).isZero();
        assertThat(audit.toString()).contains("TASK-dashboard-alert-report").contains(export.at("/data/exportId").asText());
    }

    private String login(String username, String tenantCode) throws Exception {
        return postJson("/api/v1/auth/login", "trace-login-f022-" + username + "-" + tenantCode, """
            {"username":"%s","password":"Smp@123456","tenantCode":"%s"}
            """.formatted(username, tenantCode), null).at("/data/accessToken").asText();
    }

    private void grantRolePermission(String roleCode, String permissionCode) {
        String id = roleCode + "::" + permissionCode;
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM platform_role_permission WHERE id=?", Integer.class, id);
        if (count == null || count == 0) {
            jdbc.update("INSERT INTO platform_role_permission (id, role_code, permission_code) VALUES (?, ?, ?)", id, roleCode, permissionCode);
        }
    }

    private JsonNode getJson(String path, String traceId, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .GET();
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return send(builder.build());
    }

    private JsonNode postJson(String path, String traceId, String body, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        if (token != null) builder.header("Authorization", "Bearer " + token);
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
