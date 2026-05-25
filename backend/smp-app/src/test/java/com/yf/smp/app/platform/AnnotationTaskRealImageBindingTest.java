package com.yf.smp.app.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yf.smp.app.web.TraceIdFilter;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AnnotationTaskRealImageBindingTest {
    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void taskDetailReturnsDistinctRealSampleFileIdsWhenSourceVersionHasMultipleFiles() throws Exception {
        seedAdditionalDatasetFiles();
        String adminToken = login("admin", "YF");

        JsonNode create = postJson("/api/v1/annotation/tasks", "trace-ann-real-image-task-create", """
            {
              "sourceDatasetId":"DATASET-WELD-DEFECT",
              "sourceVersionId":"DVER-WELD-001",
              "templateId":"LT-WELD-BBOX",
              "name":"真实图片样本绑定验证任务",
              "scene":"IMAGE_TAGGING",
              "reviewEnabled":true,
              "prelabelEnabled":false,
              "labelStudioEnabled":false
            }
            """, adminToken);

        assertThat(create.at("/code").asInt()).isZero();
        String taskId = create.at("/data/task/taskId").asText();
        JsonNode workItems = getJson("/api/v1/annotation/tasks/" + taskId + "/work-items?page=1&pageSize=50", "trace-ann-real-image-task-items", adminToken).at("/data/items");
        assertThat(workItems.isArray()).isTrue();
        assertThat(workItems.size()).isEqualTo(5);
        assertThat(workItems.findValuesAsText("sampleFileId"))
            .doesNotContainNull()
            .doesNotContain("")
            .doesNotHaveDuplicates();
        assertThat(workItems.findValuesAsText("sampleFileId"))
            .allSatisfy(fileId -> assertThat(jdbc.queryForObject("SELECT content_type FROM platform_file_object WHERE file_id=?", String.class, fileId))
                .startsWith("image/"));
    }

    @Test
    void taskDetailGeneratesWorkItemsForEveryDatasetFileInSourceVersion() throws Exception {
        BulkDatasetSeed seed = seedBulkDatasetFiles(183);
        String adminToken = login("admin", "YF");

        JsonNode create = postJson("/api/v1/annotation/tasks", "trace-ann-bulk-task-create", """
            {
              "sourceDatasetId":"%s",
              "sourceVersionId":"%s",
              "templateId":"LT-WELD-BBOX",
              "name":"183张数据集全量标注任务",
              "scene":"IMAGE_TAGGING",
              "reviewEnabled":true,
              "prelabelEnabled":false,
              "labelStudioEnabled":false
            }
            """.formatted(seed.datasetId(), seed.versionId()), adminToken);

        assertThat(create.at("/code").asInt()).isZero();
        String taskId = create.at("/data/task/taskId").asText();
        JsonNode workItems = getJson("/api/v1/annotation/tasks/" + taskId + "/work-items?page=1&pageSize=200", "trace-ann-bulk-task-items", adminToken).at("/data/items");
        assertThat(workItems.isArray()).isTrue();
        assertThat(workItems.size()).isEqualTo(183);
        assertThat(create.at("/data/task/totalCount").asInt()).isEqualTo(183);
        assertThat(workItems.findValuesAsText("sampleFileId"))
            .doesNotContainNull()
            .doesNotContain("")
            .doesNotHaveDuplicates();
    }

    @Test
    void workItemsEndpointSupportsPaginationForLargeTask() throws Exception {
        BulkDatasetSeed seed = seedBulkDatasetFiles(183);
        String adminToken = login("admin", "YF");

        JsonNode create = postJson("/api/v1/annotation/tasks", "trace-ann-bulk-task-page-create", """
            {
              "sourceDatasetId":"%s",
              "sourceVersionId":"%s",
              "templateId":"LT-WELD-BBOX",
              "name":"183张数据集分页标注任务",
              "scene":"IMAGE_TAGGING",
              "reviewEnabled":true,
              "prelabelEnabled":false,
              "labelStudioEnabled":false
            }
            """.formatted(seed.datasetId(), seed.versionId()), adminToken);

        String taskId = create.at("/data/task/taskId").asText();
        JsonNode page2 = getJson("/api/v1/annotation/tasks/" + taskId + "/work-items?page=2&pageSize=50", "trace-ann-bulk-task-page2", adminToken);
        assertThat(page2.at("/code").asInt()).isZero();
        assertThat(page2.at("/data/total").asInt()).isEqualTo(183);
        assertThat(page2.at("/data/page").asInt()).isEqualTo(2);
        assertThat(page2.at("/data/pageSize").asInt()).isEqualTo(50);
        assertThat(page2.at("/data/items").isArray()).isTrue();
        assertThat(page2.at("/data/items").size()).isEqualTo(50);
    }

    @Test
    void createTaskAcceptsInlineLabelsWithoutExistingTemplateId() throws Exception {
        seedAdditionalDatasetFiles();
        String adminToken = login("admin", "YF");

        JsonNode create = postJson("/api/v1/annotation/tasks", "trace-ann-inline-labels-create", """
            {
              "sourceDatasetId":"DATASET-WELD-DEFECT",
              "sourceVersionId":"DVER-WELD-001",
              "name":"直接输入标签创建任务",
              "scene":"IMAGE_TAGGING",
              "inlineLabels":["裂纹","气孔","夹渣"],
              "inlineTemplateName":"焊缝缺陷检测临时模板",
              "reviewEnabled":true,
              "prelabelEnabled":false,
              "labelStudioEnabled":false
            }
            """, adminToken);

        assertThat(create.at("/code").asInt()).isZero();
        String taskId = create.at("/data/task/taskId").asText();
        String templateId = create.at("/data/task/templateId").asText();
        assertThat(taskId).startsWith("ANN-");
        assertThat(templateId).startsWith("LT-");

        String templateStatus = jdbc.queryForObject("SELECT status FROM annotation_label_template WHERE template_id=?", String.class, templateId);
        String labelSchema = jdbc.queryForObject("SELECT label_schema_json FROM annotation_label_template WHERE template_id=?", String.class, templateId);
        assertThat(templateStatus).isEqualTo("PUBLISHED");
        assertThat(labelSchema).contains("裂纹").contains("气孔").contains("夹渣");
    }

    @Test
    void segmentationTaskUsesImageFilesAndCanSubmitWithTenantReviewerFallback() throws Exception {
        seedAdditionalDatasetFiles();
        String adminToken = login("admin", "YF");

        JsonNode create = postJson("/api/v1/annotation/tasks", "trace-ann-seg-image-reviewer-fallback", """
            {
              "sourceDatasetId":"DATASET-WELD-DEFECT",
              "sourceVersionId":"DVER-WELD-001",
              "templateId":"LT-WELD-POLYGON",
              "name":"图片分割图片文件与审核回退验证",
              "scene":"IMAGE_SEGMENTATION",
              "reviewEnabled":true,
              "prelabelEnabled":false,
              "labelStudioEnabled":false
            }
            """, adminToken);

        assertThat(create.at("/code").asInt()).isZero();
        String taskId = create.at("/data/task/taskId").asText();
        JsonNode workItems = getJson("/api/v1/annotation/tasks/" + taskId + "/work-items?page=1&pageSize=50", "trace-ann-seg-image-reviewer-fallback-items", adminToken).at("/data/items");
        assertThat(workItems.isArray()).isTrue();
        assertThat(workItems.size()).isGreaterThanOrEqualTo(1);
        assertThat(workItems.findValuesAsText("sampleFileId"))
            .allMatch(value -> value != null && !value.isBlank());

        String firstWorkItemId = workItems.get(0).at("/workItemId").asText();
        JsonNode submitted = postJson("/api/v1/annotation/work-items/" + firstWorkItemId + "/submit", "trace-ann-seg-image-reviewer-fallback-submit", """
            {"annotationJson":"{\\"polygons\\":[{\\"label\\":\\"螺丝\\",\\"cls\\":0,\\"points\\":[{\\"x\\":101,\\"y\\":80},{\\"x\\":150,\\"y\\":82},{\\"x\\":148,\\"y\\":130}]}]}"}
            """, adminToken);
        assertThat(submitted.at("/code").asInt()).isZero();
        assertThat(submitted.at("/data/status").asText()).isEqualTo("REVIEW_PENDING");

        String reviewerId = jdbc.queryForObject("SELECT reviewer_id FROM annotation_review_item WHERE work_item_id=?", String.class, firstWorkItemId);
        assertThat(reviewerId).isEqualTo("USR-BU-CABIN");
    }

    @Test
    void submitRollbackKeepsWorkItemEditableWhenReviewerCreationFails() throws Exception {
        seedAdditionalDatasetFiles();
        String adminToken = login("admin", "YF");

        JsonNode create = postJson("/api/v1/annotation/tasks", "trace-ann-submit-rollback-create", """
            {
              "sourceDatasetId":"DATASET-WELD-DEFECT",
              "sourceVersionId":"DVER-WELD-001",
              "templateId":"LT-WELD-POLYGON",
              "name":"提交失败应回滚工作项状态",
              "scene":"IMAGE_SEGMENTATION",
              "reviewEnabled":true,
              "prelabelEnabled":false,
              "labelStudioEnabled":false
            }
            """, adminToken);

        assertThat(create.at("/code").asInt()).isZero();
        String taskId = create.at("/data/task/taskId").asText();
        jdbc.update("UPDATE annotation_task SET tenant_id='TENANT-YF', updated_at=CURRENT_TIMESTAMP WHERE task_id=?", taskId);

        JsonNode workItems = getJson("/api/v1/annotation/tasks/" + taskId + "/work-items?page=1&pageSize=20", "trace-ann-submit-rollback-items", adminToken).at("/data/items");
        String firstWorkItemId = workItems.get(0).at("/workItemId").asText();

        JsonNode submitted = postJson("/api/v1/annotation/work-items/" + firstWorkItemId + "/submit", "trace-ann-submit-rollback-submit", """
            {"annotationJson":"{\\"polygons\\":[{\\"label\\":\\"螺丝\\",\\"cls\\":0,\\"points\\":[{\\"x\\":120,\\"y\\":90},{\\"x\\":160,\\"y\\":92},{\\"x\\":158,\\"y\\":140}]}]}"}
            """, adminToken);
        assertThat(submitted.at("/code").asInt()).isEqualTo(42200);

        assertThat(jdbc.queryForObject("SELECT status FROM annotation_work_item WHERE work_item_id=?", String.class, firstWorkItemId))
            .isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT submitted_at FROM annotation_work_item WHERE work_item_id=?", Object.class, firstWorkItemId))
            .isNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM annotation_review_item WHERE work_item_id=?", Integer.class, firstWorkItemId))
            .isZero();
    }

    private void seedAdditionalDatasetFiles() {
        for (int index = 2; index <= 6; index++) {
            String fileId = "FILE-DATASET-WELD-00" + index;
            String datasetFileId = "DF-WELD-00" + index;
            seedDatasetFile(fileId, datasetFileId, OffsetDateTime.parse("2026-05-2" + index + "T08:00:00+08:00"));
        }
    }

    private BulkDatasetSeed seedBulkDatasetFiles(int totalFiles) {
        String datasetId = "DATASET-WELD-BULK-183";
        String versionId = "DVER-WELD-BULK-183";
        OffsetDateTime baseTime = OffsetDateTime.parse("2026-05-20T08:00:00+08:00");
        jdbc.update("""
            INSERT INTO dataset (dataset_id,name,dataset_type,data_type,tenant_id,project_id,current_version_id,status,access_level,tags,record_count,size_bytes,owner_id,description,created_at,updated_at)
            SELECT ?, '183张批量标注测试数据集', 'RAW', 'IMAGE', 'TENANT-CABIN', NULL, NULL, 'ACTIVE', 'TEAM', 'test,bulk', ?, ?, 'USR-ADMIN', 'annotation bulk task seed', ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM dataset WHERE dataset_id = ?)
            """,
            datasetId, totalFiles, totalFiles * 1024L, baseTime, baseTime, datasetId
        );
        jdbc.update("""
            INSERT INTO dataset_version (version_id,dataset_id,version_name,status,record_count,size_bytes,content_safety_status,diagnostic_code,diagnostic_message,created_by,created_at,published_at)
            SELECT ?, ?, 'v1.0.0', 'READY', ?, ?, 'PASSED', 'OK', 'bulk seed ready', 'USR-ADMIN', ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM dataset_version WHERE version_id = ?)
            """,
            versionId, datasetId, totalFiles, totalFiles * 1024L, baseTime, baseTime, versionId
        );
        jdbc.update("UPDATE dataset SET current_version_id=?, record_count=?, size_bytes=?, updated_at=? WHERE dataset_id=?",
            versionId, totalFiles, totalFiles * 1024L, baseTime, datasetId);
        for (int index = 1; index <= totalFiles; index++) {
            String suffix = "%03d".formatted(index);
            String fileId = "FILE-BULK-WELD-" + suffix;
            String datasetFileId = "DF-BULK-WELD-" + suffix;
            OffsetDateTime timestamp = baseTime.plusMinutes(index);
            seedDatasetFile(fileId, datasetFileId, datasetId, versionId, timestamp);
        }
        return new BulkDatasetSeed(datasetId, versionId);
    }

    private void seedDatasetFile(String fileId, String datasetFileId, OffsetDateTime timestamp) {
        seedDatasetFile(fileId, datasetFileId, "DATASET-WELD-DEFECT", "DVER-WELD-001", timestamp);
    }

    private void seedDatasetFile(String fileId, String datasetFileId, String datasetId, String versionId, OffsetDateTime timestamp) {
        jdbc.update("""
            INSERT INTO platform_file_object (
                file_id, asset_type, tenant_id, project_id, bucket, object_key, expected_sha256, sha256,
                expected_size_bytes, size_bytes, content_type, storage_tier, status, owner_id, created_at, updated_at
            )
            SELECT ?, 'DATASET', 'TENANT-CABIN', NULL, 'smp-datasets', ?, ?, ?,
                   1024, 1024, 'image/jpeg', 'STANDARD', 'AVAILABLE', 'USR-ADMIN', ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM platform_file_object WHERE file_id = ?)
            """,
            fileId,
            "TENANT-CABIN/dataset/test/" + fileId + ".jpg",
            "sha256-" + fileId.toLowerCase(),
            "sha256-" + fileId.toLowerCase(),
            timestamp,
            timestamp,
            fileId
        );
        jdbc.update("""
            INSERT INTO dataset_file (id, dataset_id, version_id, file_id, file_role, status, created_at)
            SELECT ?, ?, ?, ?, 'RAW', 'BOUND', ?
            WHERE NOT EXISTS (SELECT 1 FROM dataset_file WHERE id = ?)
            """,
            datasetFileId,
            datasetId,
            versionId,
            fileId,
            timestamp,
            datasetFileId
        );
    }

    private String login(String username, String tenantCode) throws Exception {
        JsonNode login = postJson("/api/v1/auth/login", "trace-login-" + username, """
            {"username":"%s","password":"Smp@123456","tenantCode":"%s"}
            """.formatted(username, tenantCode), null);
        return login.at("/data/accessToken").asText();
    }

    private JsonNode postJson(String path, String traceId, String body, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return send(builder.build());
    }

    private JsonNode getJson(String path, String traceId, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .header("Content-Type", "application/json")
            .GET();
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return send(builder.build());
    }

    private JsonNode send(HttpRequest request) throws Exception {
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readTree(response.body());
    }

    private record BulkDatasetSeed(String datasetId, String versionId) {}
}
