package com.yf.smp.app.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.yf.smp.app.web.TraceIdFilter;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles({"test", "labelstudio"})
class LabelStudioProductionIntegrationControllerTest {
    private static final ObjectMapper mapper = new ObjectMapper();
    private static HttpServer labelStudio;
    private static final List<String> requests = new ArrayList<>();

    @LocalServerPort
    private int port;

    private final HttpClient client = HttpClient.newHttpClient();

    @BeforeAll
    static void startLabelStudio() throws Exception {
        labelStudio = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        labelStudio.createContext("/api/projects", LabelStudioProductionIntegrationControllerTest::handleProjects);
        labelStudio.createContext("/api/projects/123/tasks", LabelStudioProductionIntegrationControllerTest::handleTasks);
        labelStudio.createContext("/api/tasks/456", LabelStudioProductionIntegrationControllerTest::handleTaskResult);
        labelStudio.start();
    }

    @AfterAll
    static void stopLabelStudio() {
        if (labelStudio != null) labelStudio.stop(0);
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("labelstudio.fake.port", () -> labelStudio.getAddress().getPort());
    }

    @Test
    void labelStudioEndpointsReturnDisabledBindingWhenAssociationIsPaused() throws Exception {
        // User-facing annotation tasks are temporarily decoupled from Label Studio.
        String admin = login("admin", "YF");

        JsonNode createdTask = postJson("/api/v1/annotation/tasks", "trace-f013-create", """
            {"name":"F013 本地标注任务","sourceDatasetId":"DATASET-WELD-DEFECT","sourceVersionId":"DVER-WELD-001","templateId":"LT-WELD-BBOX","scene":"IMAGE_TAGGING","reviewEnabled":true,"prelabelEnabled":false,"labelStudioEnabled":false,"assigneeIds":["USR-ANNOTATOR"],"reviewerIds":["USR-BU-CABIN"]}
            """, admin);
        String taskId = createdTask.at("/data/task/taskId").asText();
        JsonNode createdWorkItems = workItemsPage(taskId, "trace-f013-create-work-items", admin);
        String workItemId = createdWorkItems.at("/data/items/0/workItemId").asText();

        JsonNode project = postJson("/api/v1/annotation/tasks/" + taskId + "/label-studio/sync-project", "trace-f013-project", "{}", admin);
        assertThat(project.at("/data/configStatus").asText()).isEqualTo("DISABLED");
        assertThat(project.at("/data/lastSyncStatus").asText()).isEqualTo("DISABLED");
        assertThat(project.at("/data/diagnosticCode").asText()).isEqualTo("LABEL_STUDIO_DISABLED");
        assertThat(project.at("/data/externalProjectId").isMissingNode() || project.at("/data/externalProjectId").isNull()).isTrue();
        assertThat(project.toString()).doesNotContain("f013-secret-token");

        JsonNode externalTask = postJson("/api/v1/annotation/work-items/" + workItemId + "/label-studio/sync-task", "trace-f013-task", "{}", admin);
        assertThat(externalTask.at("/data/lastSyncStatus").asText()).isEqualTo("DISABLED");
        assertThat(externalTask.at("/data/externalTaskId").isMissingNode() || externalTask.at("/data/externalTaskId").isNull()).isTrue();
        assertThat(externalTask.toString()).doesNotContain("f013-secret-token");

        JsonNode imported = postJson("/api/v1/annotation/tasks/" + taskId + "/label-studio/import-results", "trace-f013-import", "{}", admin);
        assertThat(imported.at("/data/lastSyncStatus").asText()).isEqualTo("DISABLED");
        assertThat(imported.at("/data/diagnosticCode").asText()).isEqualTo("LABEL_STUDIO_DISABLED");
        assertThat(imported.toString()).doesNotContain("f013-secret-token");

        JsonNode detail = getJson("/api/v1/annotation/tasks/" + taskId, "trace-f013-detail", admin);
        JsonNode currentWorkItems = workItemsPage(taskId, "trace-f013-detail-work-items", admin);
        assertThat(currentWorkItems.at("/data/items/0/annotationJson").asText()).doesNotContain("LABEL_STUDIO");
        assertThat(detail.at("/data/externalBinding/lastSyncStatus").asText()).isEqualTo("DISABLED");
        assertThat(detail.toString()).doesNotContain("f013-secret-token");
        assertThat(requests).isEmpty();
    }

    private JsonNode workItemsPage(String taskId, String traceId, String token) throws Exception {
        return getJson("/api/v1/annotation/tasks/" + taskId + "/work-items?page=1&pageSize=50", traceId, token);
    }

    private static void handleProjects(HttpExchange exchange) throws IOException {
        requests.add(exchange.getRequestMethod() + " " + exchange.getRequestURI().getPath());
        assertThat(exchange.getRequestHeaders().getFirst("Authorization")).isEqualTo("Token f013-secret-token");
        respond(exchange, 201, "{\"id\":123,\"title\":\"F013 project\"}");
    }

    private static void handleTasks(HttpExchange exchange) throws IOException {
        requests.add(exchange.getRequestMethod() + " " + exchange.getRequestURI().getPath());
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        assertThat(body).contains("smpWorkItemId").contains("image");
        JsonNode payload = mapper.readTree(body);
        assertThat(payload.path("meta").isObject()).isTrue();
        assertThat(payload.at("/meta/workItemId").asText()).isNotBlank();
        respond(exchange, 201, "{\"id\":456}");
    }

    private static void handleTaskResult(HttpExchange exchange) throws IOException {
        requests.add(exchange.getRequestMethod() + " " + exchange.getRequestURI().getPath());
        respond(exchange, 200, "{\"id\":456,\"annotations\":[{\"result\":[{\"from_name\":\"label\",\"value\":{\"rectanglelabels\":[\"裂纹\"]}}]}]}");
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
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

    private JsonNode send(HttpRequest request) throws Exception {
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 400) assertThat(response.headers().firstValue(TraceIdFilter.TRACE_HEADER)).isPresent();
        return mapper.readTree(response.body());
    }
}
