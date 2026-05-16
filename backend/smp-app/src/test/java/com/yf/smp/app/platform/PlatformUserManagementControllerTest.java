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
class PlatformUserManagementControllerTest {
    @LocalServerPort
    private int port;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void protectsLastSuperAdminAndRejectsLastRoleRevocation() throws Exception {
        // TASK-platform-identity-audit AC-03 AC-04 AC-07
        String admin = login("admin", "YF");

        JsonNode disableAdmin = patchJson("/api/v1/platform/users/USR-ADMIN/status", "trace-f006-disable-admin", """
            {"status":"DISABLED"}
            """, admin);
        assertThat(disableAdmin.at("/code").asInt()).isEqualTo(40900);
        assertThat(disableAdmin.at("/message").asText()).contains("超级管理员");

        JsonNode revokeLastRole = putJson("/api/v1/platform/users/USR-BU-CABIN/roles", "trace-f006-revoke-role", """
            {"roleCodes":[]}
            """, admin);
        assertThat(revokeLastRole.at("/code").asInt()).isEqualTo(40900);
        assertThat(revokeLastRole.at("/message").asText()).contains("角色");
    }

    @Test
    void zeroPermissionUserCanLoginButGetsEmptyConsole() throws Exception {
        // TASK-platform-identity-audit AC-04 AC-08
        String admin = login("admin", "YF");
        JsonNode created = postJson("/api/v1/platform/users", "trace-f006-zero-create", """
            {"username":"zerouser","displayName":"零权限用户","email":"zero@yf.local","tenantId":"TENANT-CABIN","buCode":"CABIN","password":"Smp@123456"}
            """, admin);
        assertThat(created.at("/code").asInt()).isZero();
        assertThat(created.at("/data/roles").size()).isZero();

        JsonNode login = postJson("/api/v1/auth/login", "trace-f006-zero-login", """
            {"username":"zerouser","password":"Smp@123456","tenantCode":"CABIN"}
            """, null);
        assertThat(login.at("/code").asInt()).isZero();
        assertThat(login.at("/data/user/permissions").size()).isZero();
        assertThat(login.at("/data/user/menuPermissions").size()).isZero();
    }

    @Test
    void buAdminCannotManageOtherBuUsersAndDefaultDenyApplies() throws Exception {
        // TASK-platform-identity-audit AC-05 AC-07
        JsonNode unauthenticated = getJson("/api/v1/platform/users", "trace-f006-security-default-deny", null);
        assertThat(unauthenticated.at("/code").asInt()).isEqualTo(40100);

        String buAdmin = login("buadmin", "CABIN");
        JsonNode users = getJson("/api/v1/platform/users", "trace-f006-bu-users", buAdmin);
        assertThat(users.at("/code").asInt()).isZero();
        assertThat(users.at("/data/items").findValuesAsText("id")).contains("USR-BU-CABIN", "USR-ANNOTATOR").doesNotContain("USR-QE");

        JsonNode filtered = getJson("/api/v1/platform/users?keyword=buadmin&roleCode=BU_ADMIN&status=ACTIVE&page=1&pageSize=1", "trace-f006-user-filter", buAdmin);
        assertThat(filtered.at("/code").asInt()).isZero();
        assertThat(filtered.at("/data/total").asInt()).isEqualTo(1);
        assertThat(filtered.at("/data/page").asInt()).isEqualTo(1);
        assertThat(filtered.at("/data/pageSize").asInt()).isEqualTo(1);
        assertThat(filtered.at("/data/items/0/id").asText()).isEqualTo("USR-BU-CABIN");

        JsonNode crossBu = patchJson("/api/v1/platform/users/USR-QE/status", "trace-f006-cross-bu", """
            {"status":"DISABLED"}
            """, buAdmin);
        assertThat(crossBu.at("/code").asInt()).isEqualTo(40300);

        String annotator = login("annotator", "CABIN");
        JsonNode denied = getJson("/api/v1/platform/users", "trace-f006-default-deny", annotator);
        assertThat(denied.at("/code").asInt()).isEqualTo(40300);
    }

    private String login(String username, String tenantCode) throws Exception {
        JsonNode login = postJson("/api/v1/auth/login", "trace-login-" + username, """
            {"username":"%s","password":"Smp@123456","tenantCode":"%s"}
            """.formatted(username, tenantCode), null);
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

    private JsonNode patchJson(String path, String traceId, String body, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .header("Content-Type", "application/json")
            .method("PATCH", HttpRequest.BodyPublishers.ofString(body));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return send(builder.build());
    }

    private JsonNode putJson(String path, String traceId, String body, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .header("Content-Type", "application/json")
            .PUT(HttpRequest.BodyPublishers.ofString(body));
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
