package com.yf.smp.app.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yf.smp.app.web.TraceIdFilter;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class PlatformPaiResourceControllerTest {
    @LocalServerPort
    private int port;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void resetPaiFixtures() {
        jdbc.update("""
            UPDATE platform_pai_connection
            SET region_id='TODO_CONFIRM_PAI_REGION', endpoint='TODO_CONFIRM_PAI_ENDPOINT', workspace_id='TODO_CONFIRM_PAI_WORKSPACE_ID', quota_id='TODO_CONFIRM_PAI_QUOTA_ID', resource_group_id='TODO_CONFIRM_PAI_RESOURCE_GROUP_ID', credential_mode='RAM_ROLE', credential_ref_masked='TODO_CONFIRM_PAI_RAM_ROLE_ARN', enabled=FALSE, status='UNCONFIGURED', diagnostic_code='PAI_UNCONFIGURED', diagnostic_message='TODO_CONFIRM_PAI_REGION;TODO_CONFIRM_PAI_WORKSPACE_ID;TODO_CONFIRM_PAI_QUOTA_ID', updated_at=CURRENT_TIMESTAMP
            WHERE id='PAI-CONN-GLOBAL'
            """);
        jdbc.update("""
            UPDATE platform_pai_resource_binding
            SET organization_id='TENANT-CABIN', scope_type='BU', workspace_id='pai-ws-cabin-sandbox', workspace_name='PAI-CABIN-SANDBOX', quota_id='quota-cabin-sandbox', quota_name='PAI Quota Sandbox', resource_group_id='rg-cabin-general', status='ACTIVE', diagnostic_code='OK', diagnostic_message='SANDBOX_PAI_BINDING_FOR_CONTRACT_TEST_ONLY', updated_by='USR-ADMIN', updated_at=CURRENT_TIMESTAMP
            WHERE binding_id='PAI-BIND-CABIN'
            """);
        jdbc.update("DELETE FROM platform_pai_resource_snapshot WHERE binding_id='PAI-BIND-CABIN' AND snapshot_id <> 'PAI-SNAP-CABIN-SEED'");
        jdbc.update("""
            UPDATE platform_pai_resource_snapshot
            SET status='READY', stale=FALSE, diagnostic_code='OK', diagnostic_message='PAI resource sandbox snapshot synchronized', pai_request_id='SANDBOX-REQUEST-CABIN', trace_id='seed', last_sync_at=CURRENT_TIMESTAMP
            WHERE snapshot_id='PAI-SNAP-CABIN-SEED'
            """);
    }

    @Test
    void statusOverviewAndWorkspaceExposePaiAsExternalSource() throws Exception {
        // TASK-pai-resource-integration AC-01 AC-02 AC-05 AC-09 AC-10
        String admin = login("admin", "YF");

        JsonNode status = getJson("/api/v1/platform/pai-resources/status", "trace-f008-status", admin);
        assertThat(status.at("/code").asInt()).isZero();
        assertThat(status.at("/data/status").asText()).isEqualTo("UNCONFIGURED");
        assertThat(status.at("/data/configured").asBoolean()).isFalse();
        assertThat(status.at("/data/diagnosticMessage").asText()).contains("TODO_CONFIRM_PAI_REGION", "TODO_CONFIRM_PAI_WORKSPACE_ID", "TODO_CONFIRM_PAI_QUOTA_ID");

        JsonNode overview = getJson("/api/v1/platform/pai-resources/overview?organizationId=TENANT-CABIN", "trace-f008-overview", admin);
        assertThat(overview.at("/code").asInt()).isZero();
        assertThat(overview.at("/data/updatedFrom").asText()).isEqualTo("PAI_SNAPSHOT");
        assertThat(overview.at("/data/bindingId").asText()).isEqualTo("PAI-BIND-CABIN");
        assertThat(overview.at("/data/cards").findValuesAsText("label")).contains("GPU 总量", "NPU 算力", "CPU 核心", "PAI/OSS 存储");

        JsonNode workspaces = getJson("/api/v1/platform/pai-resources/workspaces", "trace-f008-workspaces", admin);
        assertThat(workspaces.at("/code").asInt()).isZero();
        assertThat(workspaces.at("/data/items").findValuesAsText("workspaceId")).contains("pai-ws-cabin-sandbox", "pai-ws-qe-sandbox");

        JsonNode nodes = getJson("/api/v1/platform/pai-resources/nodes?bindingId=PAI-BIND-CABIN", "trace-f008-nodes", admin);
        assertThat(nodes.at("/data/items/0/sourceType").asText()).startsWith("PAI_");
        JsonNode pools = getJson("/api/v1/platform/pai-resources/pools?bindingId=PAI-BIND-CABIN", "trace-f008-pools", admin);
        assertThat(pools.at("/data/items/0/sourceType").asText()).isEqualTo("PAI_RESOURCE_QUOTA");
        JsonNode storage = getJson("/api/v1/platform/pai-resources/storage?bindingId=PAI-BIND-CABIN", "trace-f008-storage", admin);
        assertThat(storage.at("/data/items/0/sourceType").asText()).isEqualTo("PAI_WORKSPACE_STORAGE");
    }

    @Test
    void superAdminCanUpdateBindingAndAuditRejectPlainSecret() throws Exception {
        // TASK-pai-resource-integration AC-03 AC-08
        String admin = login("admin", "YF");

        JsonNode connection = putJson("/api/v1/platform/pai-resources/connection", "trace-f008-connection-update", """
            {"regionId":"cn-shanghai","endpoint":"pai-sandbox.local","workspaceId":"pai-ws-cabin-sandbox","quotaId":"quota-cabin-sandbox","resourceGroupId":"rg-cabin-general","credentialMode":"RAM_ROLE","credentialRefMasked":"SANDBOX_RAM_ROLE_REF","enabled":true,"status":"READY","diagnosticMessage":"ready for test"}
            """, admin);
        assertThat(connection.at("/code").asInt()).isZero();
        assertThat(connection.at("/data/status").asText()).isEqualTo("READY");
        assertThat(connection.at("/data/endpoint").asText()).contains("sandbox");
        assertThat(connection.at("/data/credentialRefMasked").asText()).isEqualTo("SANDBOX_RAM_ROLE_REF");

        JsonNode updated = putJson("/api/v1/platform/pai-resources/bindings/PAI-BIND-CABIN", "trace-f008-binding-update", """
            {"organizationId":"TENANT-CABIN","workspaceId":"pai-ws-cabin-updated","workspaceName":"PAI-CABIN-UPDATED","quotaId":"quota-cabin-updated","quotaName":"PAI Quota Updated","resourceGroupId":"rg-cabin-updated","status":"ACTIVE","diagnosticMessage":"updated by integration test"}
            """, admin);
        assertThat(updated.at("/code").asInt()).isZero();
        assertThat(updated.at("/data/workspaceId").asText()).isEqualTo("pai-ws-cabin-updated");
        assertThat(updated.toString()).doesNotContain("CredentialSecret");

        JsonNode audit = getJson("/api/v1/platform/audit-logs?action=PAI_BINDING_UPDATED", "trace-f008-binding-audit", admin);
        assertThat(audit.at("/data/items/0/action").asText()).isEqualTo("PAI_BINDING_UPDATED");
        assertThat(audit.at("/data/items/0/detailJson").asText()).contains("TASK-pai-resource-integration");

        JsonNode connectionAudit = getJson("/api/v1/platform/audit-logs?action=PAI_CONNECTION_UPDATED", "trace-f008-connection-audit", admin);
        assertThat(connectionAudit.at("/data/items/0/action").asText()).isEqualTo("PAI_CONNECTION_UPDATED");

        JsonNode rejected = putJson("/api/v1/platform/pai-resources/bindings/PAI-BIND-CABIN", "trace-f008-secret-reject", """
            {"organizationId":"TENANT-CABIN","workspaceId":"CredentialSecret-plain","workspaceName":"BAD","quotaId":"quota-cabin-updated","quotaName":"PAI Quota Updated","resourceGroupId":"rg-cabin-updated","status":"ACTIVE"}
            """, admin);
        assertThat(rejected.at("/code").asInt()).isEqualTo(42200);
        assertThat(rejected.at("/message").asText()).contains("PAI_SECRET_NOT_ALLOWED");

        JsonNode rejectedConnectionSecret = putJson("/api/v1/platform/pai-resources/connection", "trace-f008-connection-secret-reject", """
            {"regionId":"cn-shanghai","endpoint":"pai-sandbox.local","workspaceId":"pai-ws-cabin-sandbox","quotaId":"quota-cabin-sandbox","resourceGroupId":"rg-cabin-general","credentialMode":"RAM_ROLE","credentialRefMasked":"plain-CredentialSecret-value","enabled":true,"status":"READY"}
            """, admin);
        assertThat(rejectedConnectionSecret.at("/code").asInt()).isEqualTo(42200);
        assertThat(rejectedConnectionSecret.at("/message").asText()).contains("PAI_SECRET_NOT_ALLOWED");
    }

    @Test
    void buAdminCannotCrossBuAndAuditDenial() throws Exception {
        // TASK-pai-resource-integration AC-04 AC-08
        String buAdmin = login("buadmin", "CABIN");

        JsonNode crossRead = getJson("/api/v1/platform/pai-resources/overview?organizationId=TENANT-QE", "trace-f008-cross-read", buAdmin);
        assertThat(crossRead.at("/code").asInt()).isEqualTo(40300);

        JsonNode crossWrite = putJson("/api/v1/platform/pai-resources/bindings/PAI-BIND-QE", "trace-f008-cross-write", """
            {"organizationId":"TENANT-QE","workspaceId":"pai-ws-qe","workspaceName":"PAI-QE","quotaId":"quota-qe","quotaName":"QE","resourceGroupId":"rg-qe","status":"ACTIVE"}
            """, buAdmin);
        assertThat(crossWrite.at("/code").asInt()).isEqualTo(40300);

        String admin = login("admin", "YF");
        JsonNode audit = getJson("/api/v1/platform/audit-logs?action=PAI_CROSS_BU_ACCESS_DENIED", "trace-f008-cross-audit", admin);
        assertThat(audit.at("/data/items/0/action").asText()).isEqualTo("PAI_CROSS_BU_ACCESS_DENIED");
    }

    @Test
    void syncFailureKeepsLatestSnapshotStaleAndLogsDiagnostics() throws Exception {
        // TASK-pai-resource-integration AC-05 AC-06 AC-08
        String admin = login("admin", "YF");

        JsonNode unconfiguredSync = postJson("/api/v1/platform/pai-resources/sync", "trace-f008-sync-unconfigured", """
            {"bindingId":"PAI-BIND-CABIN","force":true}
            """, admin);
        assertThat(unconfiguredSync.at("/code").asInt()).isZero();
        assertThat(unconfiguredSync.at("/data/result").asText()).isEqualTo("FAILED");
        assertThat(unconfiguredSync.at("/data/status").asText()).isEqualTo("UNCONFIGURED");
        assertThat(unconfiguredSync.at("/data/stale").asBoolean()).isTrue();

        JsonNode staleOverview = getJson("/api/v1/platform/pai-resources/overview?organizationId=TENANT-CABIN", "trace-f008-stale-overview", admin);
        assertThat(staleOverview.at("/data/stale").asBoolean()).isTrue();
        assertThat(staleOverview.at("/data/diagnosticCode").asText()).isEqualTo("PAI_UNCONFIGURED");

        putJson("/api/v1/platform/pai-resources/bindings/PAI-BIND-CABIN", "trace-f008-binding-restore", """
            {"organizationId":"TENANT-CABIN","workspaceId":"pai-ws-cabin-sandbox","workspaceName":"PAI-CABIN-SANDBOX","quotaId":"quota-cabin-sandbox","quotaName":"PAI Quota Sandbox","resourceGroupId":"rg-cabin-general","status":"ACTIVE","diagnosticMessage":"restored"}
            """, admin);

        JsonNode audit = getJson("/api/v1/platform/audit-logs?action=PAI_SYNC_FAILED", "trace-f008-sync-audit", admin);
        assertThat(audit.at("/data/items/0/detailJson").asText()).contains("PAI_UNCONFIGURED");
    }

    @Test
    void configuredSandboxSyncCreatesSnapshotAndReferenceBlocksDisabledBinding() throws Exception {
        // TASK-pai-resource-integration AC-05 AC-07 AC-08
        String admin = login("admin", "YF");
        putJson("/api/v1/platform/pai-resources/bindings/PAI-BIND-CABIN", "trace-f008-binding-ready", """
            {"organizationId":"TENANT-CABIN","workspaceId":"pai-ws-cabin-sandbox","workspaceName":"PAI-CABIN-SANDBOX","quotaId":"quota-cabin-sandbox","quotaName":"PAI Quota Sandbox","resourceGroupId":"rg-cabin-general","status":"ACTIVE","diagnosticMessage":"ready"}
            """, admin);
        setConnection("READY", true);

        JsonNode sync = postJson("/api/v1/platform/pai-resources/sync", "trace-f008-sync-ready", """
            {"bindingId":"PAI-BIND-CABIN","force":true}
            """, admin);
        assertThat(sync.at("/code").asInt()).isZero();
        assertThat(sync.at("/data/result").asText()).isEqualTo("SUCCESS");
        assertThat(sync.at("/data/paiRequestId").asText()).contains("SANDBOX-REQUEST-PAI-BIND-CABIN");

        JsonNode reference = getJson("/api/v1/platform/pai-resources/references?organizationId=TENANT-CABIN", "trace-f008-reference", admin);
        assertThat(reference.at("/code").asInt()).isZero();
        assertThat(reference.at("/data/resourceBindingId").asText()).isEqualTo("PAI-BIND-CABIN");
        assertThat(reference.at("/data/paiWorkspaceId").asText()).isEqualTo("pai-ws-cabin-sandbox");
        assertThat(reference.at("/data/usable").asBoolean()).isTrue();

        putJson("/api/v1/platform/pai-resources/bindings/PAI-BIND-CABIN", "trace-f008-binding-disabled", """
            {"organizationId":"TENANT-CABIN","workspaceId":"pai-ws-cabin-sandbox","workspaceName":"PAI-CABIN-SANDBOX","quotaId":"quota-cabin-sandbox","quotaName":"PAI Quota Sandbox","resourceGroupId":"rg-cabin-general","status":"DISABLED","diagnosticMessage":"disabled for test"}
            """, admin);
        JsonNode blocked = getJson("/api/v1/platform/pai-resources/references?organizationId=TENANT-CABIN", "trace-f008-reference-blocked", admin);
        assertThat(blocked.at("/code").asInt()).isEqualTo(40900);
        assertThat(blocked.at("/message").asText()).contains("PAI_BINDING_DISABLED");

        JsonNode audit = getJson("/api/v1/platform/audit-logs?action=PAI_RESOURCE_REFERENCE_BLOCKED", "trace-f008-reference-audit", admin);
        assertThat(audit.at("/data/items/0/action").asText()).isEqualTo("PAI_RESOURCE_REFERENCE_BLOCKED");
    }

    private void setConnection(String status, boolean enabled) {
        // TASK-pai-resource-integration AC-10: Use local PAI client seam; no Alibaba SDK or external call in this feature.
        jdbc.update("""
            UPDATE platform_pai_connection
            SET region_id='cn-shanghai', endpoint='pai-sandbox.local', workspace_id='pai-ws-cabin-sandbox', quota_id='quota-cabin-sandbox', resource_group_id='rg-cabin-general', credential_ref_masked='SANDBOX_RAM_ROLE_REF', enabled=?, status=?, diagnostic_code='OK', diagnostic_message='ready for sandbox sync', updated_at=CURRENT_TIMESTAMP
            WHERE id='PAI-CONN-GLOBAL'
            """, enabled, status);
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
        if (response.statusCode() < 400) {
            assertThat(response.headers().firstValue(TraceIdFilter.TRACE_HEADER)).isPresent();
        }
        return objectMapper.readTree(response.body());
    }
}
