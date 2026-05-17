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
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class PlatformIdentityAuthControllerTest {
    @LocalServerPort
    private int port;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();
    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void assertSeedPasswordsAreHashed() {
        Integer noopCount = jdbc.queryForObject("SELECT COUNT(*) FROM platform_user WHERE password_hash LIKE '{noop}%'", Integer.class);
        assertThat(noopCount).isZero();
    }

    @Test
    void authApisReturnEnvelopeTraceIdAndInvalidateOldSessionAfterRoleChange() throws Exception {
        // TASK-platform-identity-audit AC-01 AC-06
        JsonNode login = postJson("/api/v1/auth/login", "trace-f006-auth", """
            {"username":"admin","password":"Smp@123456","tenantCode":"YF"}
            """, null);

        assertThat(login.at("/code").asInt()).isZero();
        assertThat(login.at("/traceId").asText()).isEqualTo("trace-f006-auth");
        String token = login.at("/data/accessToken").asText();
        assertThat(token).isNotBlank();
        assertThat(login.at("/data/user/roles/0").asText()).isEqualTo("SUPER_ADMIN");
        assertThat(menuPermissions(login.at("/data/user/menuPermissions")))
            .contains("dash", "usermgmt", "perm");

        JsonNode me = getJson("/api/v1/auth/me", "trace-f006-me", token);
        assertThat(me.at("/code").asInt()).isZero();
        assertThat(me.at("/data/username").asText()).isEqualTo("admin");

        JsonNode annotatorLogin = postJson("/api/v1/auth/login", "trace-f006-annotator-login", """
            {"username":"annotator","password":"Smp@123456","tenantCode":"CABIN"}
            """, null);
        String annotatorToken = annotatorLogin.at("/data/accessToken").asText();

        putJson("/api/v1/platform/users/USR-ANNOTATOR/roles", "trace-f006-roles", """
            {"roleCodes":["MODEL_TRAINER"]}
            """, token);

        JsonNode oldSession = getJson("/api/v1/auth/me", "trace-f006-old-session", annotatorToken);
        assertThat(oldSession.at("/code").asInt()).isEqualTo(40100);
    }

    @Test
    void browserCorsPreflightAllowsLocalFrontendLogin() throws Exception {
        // F007 regression: browser-based local testing may call backend directly from Vite origin.
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/auth/login"))
            .header("Origin", "http://localhost:5173")
            .header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Headers", "content-type,x-trace-id,x-requested-with")
            .header(TraceIdFilter.TRACE_HEADER, "trace-f006-cors")
            .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("Access-Control-Allow-Origin"))
            .contains("http://localhost:5173");
        assertThat(response.headers().firstValue("Access-Control-Allow-Methods"))
            .hasValueSatisfying(methods -> assertThat(methods).contains("POST"));
        assertThat(response.headers().firstValue("Access-Control-Allow-Headers"))
            .hasValueSatisfying(headers -> assertThat(headers.toLowerCase()).contains("content-type", "x-trace-id", "x-requested-with"));
    }

    @Test
    void accountLocksAfterFiveFailedLoginsAndWritesAudit() throws Exception {
        // TASK-platform-identity-audit AC-02 AC-07
        for (int i = 1; i <= 5; i += 1) {
            JsonNode failed = postJson("/api/v1/auth/login", "trace-f006-lock-" + i, """
                {"username":"qeuser","password":"bad-password","tenantCode":"QE"}
                """, null);
            assertThat(failed.at("/code").asInt()).isNotZero();
        }

        JsonNode locked = postJson("/api/v1/auth/login", "trace-f006-locked", """
            {"username":"qeuser","password":"Smp@123456","tenantCode":"QE"}
            """, null);
        assertThat(locked.at("/code").asInt()).isEqualTo(42200);
        assertThat(locked.at("/message").asText()).contains("锁定");

        JsonNode audits = getJson("/api/v1/platform/audit-logs?action=AUTH_ACCOUNT_LOCKED", "trace-f006-audit-lock", loginAsAdmin());
        assertThat(audits.at("/data/items/0/action").asText()).isEqualTo("AUTH_ACCOUNT_LOCKED");
        assertThat(audits.at("/data/items/0/riskLevel").asText()).isIn("WARNING", "CRITICAL");
    }

    @Test
    void refreshAndLogoutRevokeBearerSessionToken() throws Exception {
        // TASK-platform-identity-audit AC-01 AC-06 AC-07
        JsonNode login = postJson("/api/v1/auth/login", "trace-f006-refresh-login", """
            {"username":"admin","password":"Smp@123456","tenantCode":"YF"}
            """, null);
        String oldToken = login.at("/data/accessToken").asText();

        JsonNode refresh = postJson("/api/v1/auth/refresh", "trace-f006-refresh", "{}", oldToken);
        assertThat(refresh.at("/code").asInt()).isZero();
        String refreshedToken = refresh.at("/data/accessToken").asText();
        assertThat(refreshedToken).isNotBlank().isNotEqualTo(oldToken);

        JsonNode oldSession = getJson("/api/v1/auth/me", "trace-f006-refresh-old", oldToken);
        assertThat(oldSession.at("/code").asInt()).isEqualTo(40100);
        JsonNode newSession = getJson("/api/v1/auth/me", "trace-f006-refresh-new", refreshedToken);
        assertThat(newSession.at("/code").asInt()).isZero();

        JsonNode logout = postJson("/api/v1/auth/logout", "trace-f006-logout", "{}", refreshedToken);
        assertThat(logout.at("/code").asInt()).isZero();
        JsonNode afterLogout = getJson("/api/v1/auth/me", "trace-f006-after-logout", refreshedToken);
        assertThat(afterLogout.at("/code").asInt()).isEqualTo(40100);
    }

    private String loginAsAdmin() throws Exception {
        JsonNode login = postJson("/api/v1/auth/login", "trace-f006-admin", """
            {"username":"admin","password":"Smp@123456","tenantCode":"YF"}
            """, null);
        return login.at("/data/accessToken").asText();
    }

    private java.util.List<String> menuPermissions(JsonNode node) {
        java.util.List<String> values = new java.util.ArrayList<>();
        node.forEach(item -> values.add(item.asText()));
        return values;
    }

    private JsonNode getJson(String path, String traceId, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .GET();
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return send(builder.build()).body;
    }

    private JsonNode postJson(String path, String traceId, String body, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return send(builder.build()).body;
    }

    private JsonNode putJson(String path, String traceId, String body, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .header("Content-Type", "application/json")
            .PUT(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return send(builder.build()).body;
    }

    private Response send(HttpRequest request) throws Exception {
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode body = objectMapper.readTree(response.body());
        if (response.statusCode() < 400) {
            assertThat(response.headers().firstValue(TraceIdFilter.TRACE_HEADER)).isPresent();
        }
        return new Response(response.statusCode(), body);
    }

    private record Response(int status, JsonNode body) {
    }
}
