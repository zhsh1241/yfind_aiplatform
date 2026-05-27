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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class VisualPreprocessPipelineControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void visualOperatorsExposeFrozenDefaultsAndVideoFrameImageOutput() throws Exception {
        // TASK-visual-preprocess-operators-pipeline AC-01 AC-07 AC-08 AC-09
        String admin = login("admin", "YF");

        JsonNode operators = getJson("/api/v1/operators?categoryGroup=VISUAL_PREPROCESS&supportsPreview=true", "trace-f017-operators", admin);
        assertThat(operators.at("/code").asInt()).isZero();
        assertThat(operators.at("/data/items").findValuesAsText("operatorId"))
            .contains("OP-IMG-WATERMARK", "OP-IMG-ENHANCE", "OP-VIDEO-FRAME-EXTRACT", "OP-VIDEO-FPS-EXTRACT")
            .doesNotContain("OP-READ-DATASET");
        assertThat(operators.toString()).contains("TRADITIONAL_ONLY");
        assertThat(operators.toString()).contains("\"defaultOutputDatasetDataType\":\"IMAGE\"");

        JsonNode commonOperators = getJson("/api/v1/operators?categoryGroup=COMMON&supportsPreview=true", "trace-f017-common-operators", admin);
        assertThat(commonOperators.at("/code").asInt()).isZero();
        JsonNode readDataset = null;
        for (JsonNode item : commonOperators.at("/data/items")) {
            if ("OP-READ-DATASET".equals(item.at("/operatorId").asText())) {
                readDataset = item;
                break;
            }
        }
        assertThat(readDataset).isNotNull();
        assertThat(readDataset.at("/categoryGroup").asText()).isEqualTo("COMMON");
        assertThat(readDataset.at("/category").asText()).isEqualTo("DATA_INPUT");
        assertThat(readDataset.at("/subCategory").asText()).isEqualTo("SOURCE");
        assertThat(readDataset.at("/dataType").asText()).isEqualTo("ANY");
        assertThat(readDataset.at("/supportsPreview").asBoolean()).isTrue();

        JsonNode operatorDetail = getJson("/api/v1/operators/OP-IMG-WATERMARK", "trace-f017-operator-detail", admin);
        assertThat(operatorDetail.at("/code").asInt()).isZero();
        assertThat(operatorDetail.at("/data/frozenDefaults/previewWatermarkEnabled").asBoolean()).isTrue();
        assertThat(operatorDetail.at("/data/frozenDefaults/artifactWatermarkEnabled").asBoolean()).isFalse();
        assertThat(operatorDetail.at("/data/annotationRiskNotice").asText()).contains("不可进入标注链路");
    }

    @Test
    void videoPipelineRunCreatesPendingResultThenManualActivateForAnnotation() throws Exception {
        // TASK-visual-preprocess-operators-pipeline AC-02 AC-03 AC-04 AC-05 AC-06 AC-09 DAT-007 DAT-009
        String buAdmin = login("buadmin", "CABIN");

        JsonNode validation = postJson("/api/v1/pipelines/PIPE-VIDEO-PREP/validate", "trace-f017-validate", "{}", buAdmin);
        assertThat(validation.at("/code").asInt()).isZero();
        assertThat(validation.at("/data/valid").asBoolean()).isTrue();
        assertThat(validation.at("/data/warnings").toString()).contains("图片型 PREPROCESSED");

        JsonNode run = postJson("/api/v1/pipelines/PIPE-VIDEO-PREP/runs", "trace-f017-run", """
            {"triggerMode":"MANUAL","sampleDatasetId":"DATASET-WELD-VIDEO-001"}
            """, buAdmin);
        assertThat(run.at("/code").asInt()).isZero();
        String outputDatasetId = run.at("/data/run/outputDatasetId").asText();
        assertThat(outputDatasetId).startsWith("DATASET-PIPE-");
        assertThat(run.at("/data/preview/datasetDataType").asText()).isEqualTo("IMAGE");
        assertThat(run.at("/data/preview/status").asText()).isEqualTo("PENDING_CONFIRMATION");
        assertThat(run.at("/data/preview/sourceDatasetId").asText()).isEqualTo("DATASET-WELD-VIDEO-001");
        assertThat(run.at("/data/preview/operatorChainJson").asText()).contains("OP-VIDEO-FRAME-EXTRACT");

        JsonNode annotationBefore = getJson("/api/v1/annotation/source-datasets?sourceType=PREPROCESSED", "trace-f017-source-before", buAdmin);
        assertThat(annotationBefore.at("/code").asInt()).isZero();
        assertThat(annotationBefore.toString()).doesNotContain(outputDatasetId);

        JsonNode preview = getJson("/api/v1/preprocessed-datasets/" + outputDatasetId + "/preview", "trace-f017-preview", buAdmin);
        assertThat(preview.at("/code").asInt()).isZero();
        assertThat(preview.at("/data/previewWatermarkApplied").asBoolean()).isTrue();
        assertThat(preview.at("/data/artifactWatermarkApplied").asBoolean()).isFalse();

        JsonNode confirm = postJson("/api/v1/preprocessed-datasets/" + outputDatasetId + "/confirm", "trace-f017-confirm", """
            {"decision":"CONFIRM","comment":"抽帧结果满足打标要求"}
            """, buAdmin);
        assertThat(confirm.at("/code").asInt()).isZero();
        assertThat(confirm.at("/data/status").asText()).isEqualTo("CONFIRMED");

        JsonNode activate = postJson("/api/v1/preprocessed-datasets/" + outputDatasetId + "/activate", "trace-f017-activate", """
            {"targetVersionId":"%s","activationNote":"允许进入标注来源"}
            """.formatted(jdbc.queryForObject("SELECT current_version_id FROM dataset WHERE dataset_id=?", String.class, outputDatasetId)), buAdmin);
        assertThat(activate.at("/code").asInt()).isZero();
        assertThat(activate.at("/data/status").asText()).isEqualTo("ACTIVE");
        assertThat(activate.at("/data/annotationEligible").asBoolean()).isTrue();

        JsonNode annotationAfter = getJson("/api/v1/annotation/source-datasets?sourceType=PREPROCESSED", "trace-f017-source-after", buAdmin);
        assertThat(annotationAfter.at("/code").asInt()).isZero();
        assertThat(annotationAfter.toString()).contains(outputDatasetId);

        JsonNode createTask = postJson("/api/v1/annotation/tasks", "trace-f017-annotation-task", """
            {
              "sourceDatasetId":"%s",
              "sourceVersionId":"%s",
              "name":"F017 预处理结果标注任务",
              "scene":"IMAGE_TAGGING",
              "reviewEnabled":true,
              "prelabelEnabled":false,
              "labelStudioEnabled":false,
              "inlineLabels":["焊接气孔","裂纹"]
            }
            """.formatted(outputDatasetId, jdbc.queryForObject("SELECT current_version_id FROM dataset WHERE dataset_id=?", String.class, outputDatasetId)), buAdmin);
        assertThat(createTask.at("/code").asInt()).isZero();
        assertThat(createTask.at("/data/task/sourceDatasetId").asText()).isEqualTo(outputDatasetId);
    }

    @Test
    void processingTaskListCreatesFromDatasetAndReturnsEditorEntryRows() throws Exception {
        // TASK-visual-preprocess-operators-pipeline AC-02 AC-10: 加工任务列表 -> 选择数据集创建 -> 进入 Pipeline 编辑器
        String buAdmin = login("buadmin", "CABIN");

        JsonNode created = postJson("/api/v1/pipeline-processing-tasks", "trace-f017-processing-task-create", """
            {"pipelineId":"PIPE-VIDEO-PREP","sourceDatasetId":"DATASET-WELD-VIDEO-001"}
            """, buAdmin);
        assertThat(created.at("/code").asInt()).isZero();
        String runId = created.at("/data/run/runId").asText();
        assertThat(created.at("/data/run/pipelineId").asText()).isEqualTo("PIPE-VIDEO-PREP");
        assertThat(created.at("/data/preview/sourceDatasetId").asText()).isEqualTo("DATASET-WELD-VIDEO-001");

        JsonNode list = getJson("/api/v1/pipeline-processing-tasks?keyword=焊缝视频", "trace-f017-processing-task-list", buAdmin);
        assertThat(list.at("/code").asInt()).isZero();
        assertThat(list.at("/data/items").toString()).contains(runId);
        assertThat(list.at("/data/items").toString()).contains("焊缝视频抽帧预处理");
        assertThat(list.at("/data/items").toString()).contains("焊缝视频巡检数据集");
    }

    @Test
    void videoPipelineRunFallsBackToReadableOutputDatasetNameWhenPipelineNameIsMojibake() throws Exception {
        // BUG-20260527-video-frame-dataset-name-mojibake
        String buAdmin = login("buadmin", "CABIN");

        JsonNode created = postJson("/api/v1/pipelines", "trace-bug-frame-name-create", """
            {
              "name":"乱码视频抽帧Pipeline",
              "tenantId":"TENANT-CABIN",
              "description":"模拟历史编码异常的抽帧 Pipeline 名称",
              "templateCode":"VIDEO_FRAME_TO_IMAGE_PREPROCESS",
              "sourceDatasetId":"DATASET-WELD-VIDEO-001",
              "sourceVersionId":"DVER-WELD-VIDEO-001",
              "resultDatasetConfig":{"datasetName":"乱码视频抽帧Pipeline 输出","datasetType":"PREPROCESSED","datasetDataType":"IMAGE","autoActivate":false},
              "nodes":[
                {"nodeId":"read-video","operatorId":"OP-READ-DATASET","label":"读取焊缝视频数据集","positionX":80,"positionY":150,"configJson":"{\\\"datasetId\\\":\\\"DATASET-WELD-VIDEO-001\\\"}"},
                {"nodeId":"extract","operatorId":"OP-VIDEO-FRAME-EXTRACT","label":"固定间隔抽帧","positionX":320,"positionY":150,"configJson":"{\\\"mode\\\":\\\"FIXED_INTERVAL\\\",\\\"intervalSeconds\\\":2,\\\"outputImageFormat\\\":\\\"JPG\\\"}"}
              ],
              "edges":[
                {"edgeId":"EDGE-bug-frame-name","sourceNodeId":"read-video","targetNodeId":"extract","edgeType":"DATA"}
              ],
              "variables":[]
            }
            """, buAdmin);
        assertThat(created.at("/code").asInt()).as(created.at("/message").asText()).isZero();
        String pipelineId = created.at("/data/pipeline/pipelineId").asText();

        JsonNode run = postJson("/api/v1/pipelines/" + pipelineId + "/runs", "trace-bug-frame-name-run", """
            {"triggerMode":"MANUAL","sampleDatasetId":"DATASET-WELD-VIDEO-001"}
            """, buAdmin);
        assertThat(run.at("/code").asInt()).isZero();
        String outputDatasetId = run.at("/data/run/outputDatasetId").asText();

        JsonNode outputDetail = getJson("/api/v1/datasets/" + outputDatasetId, "trace-bug-frame-name-output", buAdmin);
        assertThat(outputDetail.at("/data/dataset/name").asText()).isEqualTo("焊缝视频巡检数据集 抽帧结果");
        assertThat(outputDetail.at("/data/dataset/name").asText()).doesNotContain("乱码");
        assertThat(outputDetail.at("/data/dataset/dataType").asText()).isEqualTo("IMAGE");
    }

    @Test
    void artifactWatermarkPreprocessedDatasetIsBlockedFromAnnotation() throws Exception {
        // TASK-visual-preprocess-operators-pipeline AC-04 AC-05 AC-08 DAT-005 DAT-012
        String buAdmin = login("buadmin", "CABIN");
        seedArtifactBlockedPreprocessedDataset();

        JsonNode sourceDatasets = getJson("/api/v1/annotation/source-datasets?sourceType=PREPROCESSED", "trace-f017-blocked-sources", buAdmin);
        assertThat(sourceDatasets.at("/code").asInt()).isZero();
        assertThat(sourceDatasets.toString()).doesNotContain("DATASET-PREP-BLOCKED-001");

        JsonNode createTask = postJson("/api/v1/annotation/tasks", "trace-f017-blocked-task", """
            {
              "sourceDatasetId":"DATASET-PREP-BLOCKED-001",
              "sourceVersionId":"DVER-PREP-BLOCKED-001",
              "name":"不可打标的产物水印数据集",
              "scene":"IMAGE_TAGGING",
              "reviewEnabled":true,
              "prelabelEnabled":false,
              "labelStudioEnabled":false,
              "inlineLabels":["焊接气孔","裂纹"]
            }
            """, buAdmin);
        assertThat(createTask.at("/code").asInt()).isEqualTo(42200);
        assertThat(createTask.at("/message").asText()).contains("产物水印");
    }

    private void seedArtifactBlockedPreprocessedDataset() {
        OffsetDateTime now = OffsetDateTime.parse("2026-05-26T10:00:00+08:00");
        jdbc.update("""
            INSERT INTO dataset (dataset_id,name,dataset_type,data_type,tenant_id,project_id,current_version_id,status,access_level,tags,record_count,size_bytes,owner_id,description,created_at,updated_at)
            SELECT ?, '带产物水印的预处理数据集', 'PREPROCESSED', 'IMAGE', 'TENANT-CABIN', NULL, NULL, 'ACTIVE', 'TEAM', 'f017,preprocessed,blocked', 8, 1024, 'USR-ADMIN', ?, ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM dataset WHERE dataset_id = ?)
            """,
            "DATASET-PREP-BLOCKED-001",
            "sourceDatasetId=DATASET-WELD-DEFECT;sourceVersionId=DVER-WELD-001;processParams={\"artifactWatermarkEnabled\":true};previewManifest={};annotationEligibility=ANNOTATION_BLOCKED:ARTIFACT_WATERMARK",
            now,
            now,
            "DATASET-PREP-BLOCKED-001"
        );
        jdbc.update("""
            INSERT INTO dataset_version (version_id,dataset_id,version_name,status,record_count,size_bytes,content_safety_status,diagnostic_code,diagnostic_message,created_by,created_at,published_at)
            SELECT ?, ?, 'v1.0.0', 'PUBLISHED', 8, 1024, 'PASSED', 'OK', 'VISUAL_PREPROCESS_ACTIVATED', 'USR-ADMIN', ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM dataset_version WHERE version_id = ?)
            """,
            "DVER-PREP-BLOCKED-001",
            "DATASET-PREP-BLOCKED-001",
            now,
            now,
            "DVER-PREP-BLOCKED-001"
        );
        jdbc.update("""
            UPDATE dataset SET current_version_id=? WHERE dataset_id=?
            """,
            "DVER-PREP-BLOCKED-001",
            "DATASET-PREP-BLOCKED-001"
        );
    }

    private String login(String username, String tenantCode) throws Exception {
        JsonNode login = postJson("/api/v1/auth/login", "trace-f017-login-" + username, """
            {"username":"%s","password":"Smp@123456","tenantCode":"%s"}
            """.formatted(username, tenantCode), null);
        assertThat(login.at("/code").asInt()).isZero();
        return login.at("/data/accessToken").asText();
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
            .POST(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return send(builder.build());
    }

    private JsonNode send(HttpRequest request) throws Exception {
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readTree(response.body());
    }
}
