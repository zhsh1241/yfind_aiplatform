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
class PlatformUserManagementControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

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

    @Test
    void userEditAndCustomRoleCreationKeepBuPermissionsOnRoles() throws Exception {
        // TASK-platform-identity-audit AC-04 AC-05 AC-08
        String admin = login("admin", "YF");

        JsonNode role = postJson("/api/v1/platform/roles", "trace-f006-create-role", """
            {"code":"CABIN_DATA_MANAGER","name":"座舱数据管理员","description":"BU 数据管理权限","scope":"TENANT","permissionCodes":["menu:dash","menu:usermgmt","platform:user:read"]}
            """, admin);
        assertThat(role.at("/code").asInt()).isZero();
        assertThat(role.at("/data/code").asText()).isEqualTo("CABIN_DATA_MANAGER");
        assertThat(role.at("/data/preset").asBoolean()).isFalse();

        JsonNode edited = putJson("/api/v1/platform/users/USR-ANNOTATOR", "trace-f006-edit-user", """
            {"displayName":"数据标注员-已编辑","email":"annotator-edited@yf.local","status":"ACTIVE"}
            """, admin);
        assertThat(edited.at("/code").asInt()).isZero();
        assertThat(edited.at("/data/displayName").asText()).isEqualTo("数据标注员-已编辑");
        assertThat(edited.at("/data/email").asText()).isEqualTo("annotator-edited@yf.local");
        assertThat(edited.at("/data/buCode").asText()).isEqualTo("CABIN");

        JsonNode assigned = putJson("/api/v1/platform/users/USR-ANNOTATOR/roles", "trace-f006-assign-custom-role", """
            {"roleCodes":["DATA_ANNOTATOR","CABIN_DATA_MANAGER"]}
            """, admin);
        assertThat(assigned.at("/code").asInt()).isZero();

        JsonNode matrix = getJson("/api/v1/platform/permissions/matrix", "trace-f006-custom-role-matrix", admin);
        assertThat(matrix.at("/code").asInt()).isZero();
        assertThat(matrix.at("/data/roles").findValuesAsText("code")).contains("CABIN_DATA_MANAGER");
        assertThat(matrix.at("/data/rows").findValuesAsText("permissionCode")).contains("platform:user:read");

        JsonNode presetUpdate = putJson("/api/v1/platform/roles/BU_ADMIN/permissions", "trace-f006-preset-role-readonly", """
            {"permissionCodes":["menu:dash"]}
            """, admin);
        assertThat(presetUpdate.at("/code").asInt()).isEqualTo(42200);
        assertThat(presetUpdate.at("/message").asText()).contains("预设角色");

        JsonNode exceeded = postJson("/api/v1/platform/roles", "trace-f006-parent-limit", """
            {"code":"ANNOTATOR_PLUS_ADMIN","name":"越权角色","description":"应被父角色上限拒绝","scope":"TENANT","parentRoleCode":"DATA_ANNOTATOR","permissionCodes":["menu:dash","platform:user:read"]}
            """, admin);
        assertThat(exceeded.at("/code").asInt()).isEqualTo(42200);
        assertThat(exceeded.at("/message").asText()).contains("父角色权限上限");

        JsonNode tempRole = putJson("/api/v1/platform/users/USR-ANNOTATOR/roles", "trace-f006-temp-role", """
            {"roleCodes":["DATA_ANNOTATOR"],"expiresAt":"2099-12-31T00:00:00Z"}
            """, admin);
        assertThat(tempRole.at("/code").asInt()).isZero();
    }

    @Test
    void cabinMojibakeRoleNamesAreRepairedInRoleApis() throws Exception {
        // BUG-20260520 cabin custom role mojibake repair
        jdbc.update("""
            INSERT INTO platform_role (code, name, description, scope, preset, parent_role_code, tenant_id, status)
            VALUES ('CABIN_ROLE_41194', '乱码角色A', '乱码描述A', 'TENANT', FALSE, 'BU_ADMIN', 'TENANT-CABIN', 'ACTIVE')
            """);
        jdbc.update("""
            INSERT INTO platform_role (code, name, description, scope, preset, parent_role_code, tenant_id, status)
            VALUES ('CABIN_ROLE_5522', '乱码角色B', '乱码描述B', 'TENANT', FALSE, 'DATA_ANNOTATOR', 'TENANT-CABIN', 'ACTIVE')
            """);

        int updated41194 = jdbc.update("""
            UPDATE platform_role
            SET name='座舱数据管理员', description='智能座舱 BU 数据管理权限角色'
            WHERE code='CABIN_ROLE_41194'
            """);
        int updated5522 = jdbc.update("""
            UPDATE platform_role
            SET name='座舱标注协调员', description='智能座舱 BU 标注任务协调与数据查看角色'
            WHERE code='CABIN_ROLE_5522'
            """);

        assertThat(updated41194).isEqualTo(1);
        assertThat(updated5522).isEqualTo(1);

        String admin = login("admin", "YF");
        JsonNode roles = getJson("/api/v1/platform/roles", "trace-bug-cabin-role-labels", admin);
        assertThat(roles.at("/data").findValuesAsText("name"))
            .contains("座舱数据管理员", "座舱标注协调员")
            .doesNotContain("乱码角色A", "乱码角色B");
    }

    @Test
    void buAdminCannotCreateOrAssignRolesBeyondOwnAuthority() throws Exception {
        // TASK-platform-identity-audit AC-05 AC-06 AC-07
        String buAdmin = login("buadmin", "CABIN");

        JsonNode globalRole = postJson("/api/v1/platform/roles", "trace-f006-bu-global-role-denied", """
            {"code":"CABIN_GLOBAL_ADMIN","name":"越权全局角色","description":"BU 管理员不应创建全局角色","scope":"GLOBAL","permissionCodes":["menu:dash"]}
            """, buAdmin);
        assertThat(globalRole.at("/code").asInt()).isEqualTo(40300);

        JsonNode overPermission = postJson("/api/v1/platform/roles", "trace-f006-bu-permission-denied", """
            {"code":"CABIN_AUDIT_EXPORTER","name":"越权审计导出","description":"超过 BU 管理员权限上限","scope":"TENANT","permissionCodes":["platform:audit:export"]}
            """, buAdmin);
        assertThat(overPermission.at("/code").asInt()).isEqualTo(40300);
        assertThat(overPermission.at("/message").asText()).contains("权限上限");

        JsonNode assignSuperAdmin = putJson("/api/v1/platform/users/USR-ANNOTATOR/roles", "trace-f006-bu-assign-super-admin-denied", """
            {"roleCodes":["SUPER_ADMIN"]}
            """, buAdmin);
        assertThat(assignSuperAdmin.at("/code").asInt()).isEqualTo(40300);
        assertThat(assignSuperAdmin.at("/message").asText()).contains("全局角色");
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
