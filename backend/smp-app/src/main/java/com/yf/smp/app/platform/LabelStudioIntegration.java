package com.yf.smp.app.platform;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Primary
@Component
class HttpLabelStudioAnnotationAdapter implements LabelStudioAnnotationAdapter {
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient http;
    private final boolean enabled;
    private final String baseUrl;
    private final String tokenSecretRef;
    private final String tokenValue;
    private final String workspaceId;
    private final String storagePolicy;
    private final String exportFormat;
    private final int timeoutMs;

    HttpLabelStudioAnnotationAdapter(
        JdbcTemplate jdbc,
        @Value("${smp.label-studio.enabled:false}") boolean enabled,
        @Value("${smp.label-studio.base-url:TODO_CONFIRM_LABEL_STUDIO_BASE_URL}") String baseUrl,
        @Value("${smp.label-studio.token-secret-ref:TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET}") String tokenSecretRef,
        @Value("${smp.label-studio.token-value:}") String tokenValue,
        @Value("${smp.label-studio.workspace-id:TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY}") String workspaceId,
        @Value("${smp.label-studio.storage-policy:TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY}") String storagePolicy,
        @Value("${smp.label-studio.export-format:JSON}") String exportFormat,
        @Value("${smp.label-studio.timeout-ms:3000}") int timeoutMs
    ) {
        this.jdbc = jdbc;
        this.enabled = enabled;
        this.baseUrl = trimTrailingSlash(baseUrl);
        this.tokenSecretRef = tokenSecretRef;
        this.tokenValue = tokenValue;
        this.workspaceId = workspaceId;
        this.storagePolicy = storagePolicy;
        this.exportFormat = exportFormat;
        this.timeoutMs = Math.max(500, timeoutMs);
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofMillis(this.timeoutMs)).build();
    }

    @Override
    public AnnotationExternalBindingResponse status(AnnotationTaskRecord task, AnnotationExternalBindingRecord binding) {
        if (!configured()) return unconfigured(binding);
        return response(binding, null, null, "CONFIGURED", binding.lastSyncStatus(), "LABEL_STUDIO_CONFIGURED", "Label Studio 已配置，等待同步", binding.launchUrl(), false, binding.lastSyncAt());
    }

    @Override
    public AnnotationExternalBindingResponse syncProject(AnnotationTaskRecord task, AnnotationExternalBindingRecord binding) {
        if (!configured()) return unconfigured(binding);
        if (!blank(binding.externalProjectId())) {
            String launch = projectUrl(binding.externalProjectId());
            return response(binding, binding.externalProjectId(), null, "CONFIGURED", "PROJECT_SYNCED", "LABEL_STUDIO_PROJECT_SYNCED", "Label Studio project 已复用", launch, false, now());
        }
        AnnotationLabelTemplateRecord template = template(task.templateId());
        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("title", task.name());
            payload.put("label_config", template.labelStudioConfigXml());
            payload.put("description", "SMP annotation task " + task.taskId() + "; workspace=" + workspaceId);
            HttpResult result = post("/api/projects", payload);
            if (result.status() == 401 || result.status() == 403) return failure(binding, "LABEL_STUDIO_AUTH_FAILED", "Label Studio token 无效或权限不足", false);
            if (result.status() >= 400) return failure(binding, "LABEL_STUDIO_SCHEMA_REJECTED", "Label Studio project schema 被拒绝: HTTP " + result.status(), false);
            String id = firstText(result.body(), "/id", "/data/id", "/project/id");
            if (blank(id)) return failure(binding, "LABEL_STUDIO_SCHEMA_REJECTED", "Label Studio project 响应缺少 id", false);
            String launch = projectUrl(id);
            return response(binding, id, null, "CONFIGURED", "PROJECT_SYNCED", "LABEL_STUDIO_PROJECT_SYNCED", "Label Studio project 已同步", launch, false, now());
        } catch (Exception exception) {
            return failure(binding, "LABEL_STUDIO_UNREACHABLE", "Label Studio 不可达或超时", true);
        }
    }

    @Override
    public AnnotationExternalBindingResponse syncTask(AnnotationWorkItemRecord item, AnnotationTaskRecord task, AnnotationExternalBindingRecord binding) {
        if (!configured()) return unconfigured(binding);
        AnnotationExternalTaskBindingRecord existing = taskBinding(item.workItemId());
        if (existing != null && !blank(existing.externalTaskId())) {
            return response(binding, blank(binding.externalProjectId(), existing.externalProjectId()), existing.externalTaskId(), "CONFIGURED", "TASK_SYNCED", "LABEL_STUDIO_TASK_SYNCED", "Label Studio task 已复用", existing.externalTaskUrl(), false, now());
        }
        String projectId = binding.externalProjectId();
        if (blank(projectId)) {
            AnnotationExternalBindingResponse project = syncProject(task, binding);
            if (blank(project.externalProjectId())) return project;
            projectId = project.externalProjectId();
        }
        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.set("data", taskData(task, item));
            payload.put("meta", "SMP work item " + item.workItemId());
            HttpResult result = post("/api/projects/" + projectId + "/tasks", payload);
            if (result.status() == 401 || result.status() == 403) return failure(binding, "LABEL_STUDIO_AUTH_FAILED", "Label Studio token 无效或权限不足", false);
            if (result.status() >= 400) return failure(binding, "LABEL_STUDIO_SCHEMA_REJECTED", "Label Studio task payload 被拒绝: HTTP " + result.status(), false);
            String externalTaskId = firstText(result.body(), "/id", "/task/id", "/data/id");
            if (blank(externalTaskId)) return failure(binding, "LABEL_STUDIO_SCHEMA_REJECTED", "Label Studio task 响应缺少 id", false);
            String url = taskUrl(projectId, externalTaskId);
            upsertTaskBinding(item.workItemId(), task.taskId(), projectId, externalTaskId, url, "TASK_SYNCED", "PENDING", "LABEL_STUDIO_TASK_SYNCED", "Label Studio task 已同步", now(), null);
            return response(binding, projectId, externalTaskId, "CONFIGURED", "TASK_SYNCED", "LABEL_STUDIO_TASK_SYNCED", "Label Studio task 已同步", url, false, now());
        } catch (Exception exception) {
            return failure(binding, "LABEL_STUDIO_UNREACHABLE", "Label Studio 不可达或超时", true);
        }
    }

    @Override
    public AnnotationExternalBindingResponse importResults(AnnotationTaskRecord task, AnnotationExternalBindingRecord binding) {
        if (!configured()) return unconfigured(binding);
        List<AnnotationExternalTaskBindingRecord> rows = jdbc.query("SELECT * FROM annotation_external_task_binding WHERE task_id=? AND provider='LABEL_STUDIO' ORDER BY last_sync_at", (rs, n) -> taskBinding(rs), task.taskId());
        if (rows.isEmpty()) return failure(binding, "LABEL_STUDIO_RESULT_NOT_READY", "尚未同步 Label Studio task，无法导入结果", true);
        int imported = 0;
        OffsetDateTime at = now();
        for (AnnotationExternalTaskBindingRecord row : rows) {
            if (blank(row.externalTaskId())) continue;
            try {
                HttpResult result = get("/api/tasks/" + row.externalTaskId());
                if (result.status() == 401 || result.status() == 403) return failure(binding, "LABEL_STUDIO_AUTH_FAILED", "Label Studio token 无效或权限不足", false);
                if (result.status() >= 400) return failure(binding, "LABEL_STUDIO_RESULT_NOT_READY", "Label Studio result 尚不可导入: HTTP " + result.status(), true);
                String annotation = extractAnnotationJson(result.body());
                if (blank(annotation)) continue;
                jdbc.update("UPDATE annotation_work_item SET annotation_json=?, status='DRAFT', updated_at=? WHERE work_item_id=? AND status IN ('PENDING','DRAFT','REJECTED')", annotation, at, row.workItemId());
                upsertTaskBinding(row.workItemId(), row.taskId(), row.externalProjectId(), row.externalTaskId(), row.externalTaskUrl(), row.syncStatus(), "RESULT_IMPORTED", "LABEL_STUDIO_RESULTS_IMPORTED", "Label Studio annotation 已导入", row.lastSyncAt(), at);
                imported++;
            } catch (Exception exception) {
                return failure(binding, "LABEL_STUDIO_UNREACHABLE", "Label Studio 不可达或超时", true);
            }
        }
        if (imported == 0) return failure(binding, "LABEL_STUDIO_RESULT_NOT_READY", "Label Studio 暂无已完成 annotation；exportFormat=" + exportFormat + ";TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS", true);
        return response(binding, binding.externalProjectId(), null, "CONFIGURED", "RESULT_IMPORTED", "LABEL_STUDIO_RESULTS_IMPORTED", "已导入 " + imported + " 条 Label Studio 标注结果", binding.launchUrl(), false, at);
    }

    private boolean configured() {
        return enabled && !blank(baseUrl) && !baseUrl.contains("TODO_CONFIRM") && !blank(resolveToken());
    }

    private String resolveToken() {
        if (!blank(tokenValue)) return tokenValue;
        if (!blank(tokenSecretRef) && tokenSecretRef.startsWith("env:")) return System.getenv(tokenSecretRef.substring(4));
        return null;
    }

    private HttpResult post(String path, JsonNode body) throws Exception {
        HttpRequest request = request(path).POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body))).build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        return new HttpResult(response.statusCode(), parse(response.body()));
    }

    private HttpResult get(String path) throws Exception {
        HttpResponse<String> response = http.send(request(path).GET().build(), HttpResponse.BodyHandlers.ofString());
        return new HttpResult(response.statusCode(), parse(response.body()));
    }

    private HttpRequest.Builder request(String path) {
        String normalized = path.startsWith("/") ? path : "/" + path;
        return HttpRequest.newBuilder(URI.create(baseUrl + normalized))
            .timeout(Duration.ofMillis(timeoutMs))
            .header("Content-Type", "application/json")
            .header("Authorization", "Token " + resolveToken());
    }

    private JsonNode parse(String body) throws Exception {
        if (blank(body)) return objectMapper.createObjectNode();
        return objectMapper.readTree(body);
    }

    private ObjectNode taskData(AnnotationTaskRecord task, AnnotationWorkItemRecord item) {
        ObjectNode data = objectMapper.createObjectNode();
        String value = sampleValue(item);
        switch (upper(task.scene(), "")) {
            case "TEXT_LABELING" -> data.put("text", value);
            case "AUDIO_LABELING" -> data.put("audio", value);
            default -> data.put("image", value);
        }
        data.put("smpTaskId", task.taskId());
        data.put("smpWorkItemId", item.workItemId());
        data.put("storagePolicy", storagePolicy);
        return data;
    }

    private String sampleValue(AnnotationWorkItemRecord item) {
        if (!blank(item.sampleKey()) && (item.sampleKey().startsWith("http://") || item.sampleKey().startsWith("https://"))) return item.sampleKey();
        return baseUrl + "/data/local-files/?d=" + item.sampleKey();
    }

    private String extractAnnotationJson(JsonNode body) throws Exception {
        JsonNode annotations = body.path("annotations");
        if (!annotations.isArray() || annotations.isEmpty()) return null;
        JsonNode result = annotations.get(0).path("result");
        if (result.isMissingNode() || result.isNull() || (result.isArray() && result.isEmpty())) return null;
        ObjectNode imported = objectMapper.createObjectNode();
        imported.put("source", "LABEL_STUDIO");
        imported.set("result", result);
        return objectMapper.writeValueAsString(imported);
    }

    private String firstText(JsonNode node, String... paths) {
        for (String path : paths) {
            JsonNode value = node.at(path);
            if (!value.isMissingNode() && !value.isNull() && !blank(value.asText())) return value.asText();
        }
        return null;
    }

    private AnnotationLabelTemplateRecord template(String id) {
        return jdbc.queryForObject("SELECT * FROM annotation_label_template WHERE template_id=?", (rs, n) -> new AnnotationLabelTemplateRecord(rs.getString("template_id"), rs.getString("tenant_id"), rs.getString("name"), rs.getString("scene"), rs.getString("label_type"), rs.getString("label_schema_json"), rs.getString("label_studio_config_xml"), rs.getString("status"), rs.getString("created_by"), rs.getObject("updated_at", OffsetDateTime.class)), id);
    }

    private AnnotationExternalTaskBindingRecord taskBinding(String workItemId) {
        List<AnnotationExternalTaskBindingRecord> rows = jdbc.query("SELECT * FROM annotation_external_task_binding WHERE work_item_id=? AND provider='LABEL_STUDIO'", (rs, n) -> taskBinding(rs), workItemId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private AnnotationExternalTaskBindingRecord taskBinding(ResultSet rs) throws SQLException {
        return new AnnotationExternalTaskBindingRecord(rs.getString("binding_id"), rs.getString("task_id"), rs.getString("work_item_id"), rs.getString("provider"), rs.getString("external_project_id"), rs.getString("external_task_id"), rs.getString("external_task_url"), rs.getString("sync_status"), rs.getString("import_status"), rs.getString("diagnostic_code"), rs.getString("diagnostic_message"), rs.getObject("last_sync_at", OffsetDateTime.class), rs.getObject("last_import_at", OffsetDateTime.class));
    }

    private void upsertTaskBinding(String workItemId, String taskId, String projectId, String externalTaskId, String url, String syncStatus, String importStatus, String code, String message, OffsetDateTime syncAt, OffsetDateTime importAt) {
        AnnotationExternalTaskBindingRecord existing = taskBinding(workItemId);
        if (existing == null) {
            jdbc.update("INSERT INTO annotation_external_task_binding (binding_id,task_id,work_item_id,provider,external_project_id,external_task_id,external_task_url,sync_status,import_status,diagnostic_code,diagnostic_message,last_sync_at,last_import_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", "ANN-EXT-TASK-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT), taskId, workItemId, "LABEL_STUDIO", projectId, externalTaskId, url, syncStatus, importStatus, code, message, syncAt, importAt);
        } else {
            jdbc.update("UPDATE annotation_external_task_binding SET external_project_id=?, external_task_id=?, external_task_url=?, sync_status=?, import_status=?, diagnostic_code=?, diagnostic_message=?, last_sync_at=?, last_import_at=? WHERE binding_id=?", projectId, externalTaskId, url, syncStatus, importStatus, code, message, syncAt, importAt, existing.bindingId());
        }
    }

    private AnnotationExternalBindingResponse unconfigured(AnnotationExternalBindingRecord binding) {
        return new AnnotationExternalBindingResponse(binding.bindingId(), binding.taskId(), "LABEL_STUDIO", null, "TODO_CONFIRM_LABEL_STUDIO_BASE_URL", null, null, "UNCONFIGURED", "UNCONFIGURED", "LABEL_STUDIO_UNCONFIGURED", "TODO_CONFIRM_LABEL_STUDIO_BASE_URL;TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET;TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY;TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY", null, false, null);
    }

    private AnnotationExternalBindingResponse failure(AnnotationExternalBindingRecord binding, String code, String message, boolean retryable) {
        return response(binding, binding.externalProjectId(), null, configured() ? "CONFIGURED" : "UNCONFIGURED", code.endsWith("UNCONFIGURED") ? "UNCONFIGURED" : "SYNC_FAILED", code, message, binding.launchUrl(), retryable, now());
    }

    private AnnotationExternalBindingResponse response(AnnotationExternalBindingRecord binding, String projectId, String taskId, String configStatus, String syncStatus, String code, String message, String launchUrl, boolean retryable, OffsetDateTime at) {
        String project = blank(projectId, binding.externalProjectId());
        String externalUrl = blank(project) ? baseUrl : projectUrl(project);
        String taskUrl = blank(taskId) || blank(project) ? null : taskUrl(project, taskId);
        return new AnnotationExternalBindingResponse(binding.bindingId(), binding.taskId(), "LABEL_STUDIO", project, externalUrl, taskId, taskUrl, configStatus, syncStatus, code, message, blank(launchUrl, blank(taskUrl, externalUrl)), retryable, at);
    }

    private String projectUrl(String projectId) { return baseUrl + "/projects/" + projectId; }
    private String taskUrl(String projectId, String taskId) { return baseUrl + "/projects/" + projectId + "/data?task=" + taskId; }
    private OffsetDateTime now() { return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS); }
    private static String trimTrailingSlash(String value) { return value == null ? "" : value.replaceFirst("/+$", ""); }
    private static String upper(String value, String fallback) { return blank(value) ? fallback : value.trim().toUpperCase(Locale.ROOT); }
    private static String blank(String value, String fallback) { return blank(value) ? fallback : value.trim(); }
    private static boolean blank(String value) { return value == null || value.isBlank(); }
    record HttpResult(int status, JsonNode body) {}
}
