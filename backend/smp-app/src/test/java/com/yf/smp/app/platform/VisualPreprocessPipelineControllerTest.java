package com.yf.smp.app.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yf.smp.app.web.TraceIdFilter;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
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
            {"pipelineId":"PIPE-VIDEO-PREP","sourceDatasetId":"DATASET-WELD-VIDEO-001","outputDatasetName":"车间一号线抽帧结果"}
            """, buAdmin);
        assertThat(created.at("/code").asInt()).isZero();
        String runId = created.at("/data/run/runId").asText();
        assertThat(created.at("/data/run/pipelineId").asText()).isEqualTo("PIPE-VIDEO-PREP");
        assertThat(created.at("/data/preview/sourceDatasetId").asText()).isEqualTo("DATASET-WELD-VIDEO-001");
        JsonNode outputDetail = getJson("/api/v1/datasets/" + created.at("/data/run/outputDatasetId").asText(), "trace-f017-processing-task-output", buAdmin);
        assertThat(outputDetail.at("/data/dataset/name").asText()).isEqualTo("车间一号线抽帧结果");

        JsonNode list = getJson("/api/v1/pipeline-processing-tasks?keyword=焊缝视频", "trace-f017-processing-task-list", buAdmin);
        assertThat(list.at("/code").asInt()).isZero();
        assertThat(list.at("/data/items").toString()).contains(runId);
        assertThat(list.at("/data/items").toString()).contains("焊缝视频抽帧预处理");
        assertThat(list.at("/data/items").toString()).contains("焊缝视频巡检数据集");
    }

    @Test
    void realVideoFrameAnnotationYoloExportDownloadsZipPackage() throws Exception {
        // 用户验收链路：视频数据集 -> 抽帧 -> 自定义输出数据集名称 -> 标注 -> YOLO 训练集 -> 真实文件下载。
        String buAdmin = login("buadmin", "CABIN");
        String customDatasetName = "单测真实抽帧YOLO数据集";

        JsonNode run = postJson("/api/v1/pipelines/PIPE-VIDEO-PREP/runs", "trace-real-yolo-run", """
            {"triggerMode":"MANUAL","sampleDatasetId":"DATASET-WELD-VIDEO-001","outputDatasetName":"%s"}
            """.formatted(customDatasetName), buAdmin);
        assertThat(run.at("/code").asInt()).isZero();
        String outputDatasetId = run.at("/data/run/outputDatasetId").asText();

        JsonNode outputDetail = getJson("/api/v1/datasets/" + outputDatasetId, "trace-real-yolo-output-detail", buAdmin);
        assertThat(outputDetail.at("/data/dataset/name").asText()).isEqualTo(customDatasetName);
        assertThat(outputDetail.at("/data/dataset/dataType").asText()).isEqualTo("IMAGE");
        assertThat(outputDetail.at("/data/files").size()).isGreaterThanOrEqualTo(6);
        assertThat(outputDetail.at("/data/files").findValuesAsText("contentType")).allMatch(contentType -> contentType.startsWith("image/"));
        Set<String> extractedFrameHashes = new java.util.HashSet<>();
        for (JsonNode file : outputDetail.at("/data/files")) {
            byte[] frame = getBytes("/api/v1/platform/files/" + file.at("/fileId").asText() + "/content", "trace-real-yolo-frame-download-" + file.at("/fileId").asText(), buAdmin);
            assertThat(frame).startsWith(new byte[] {(byte) 0xFF, (byte) 0xD8});
            extractedFrameHashes.add(sha256(frame));
        }
        assertThat(extractedFrameHashes).contains(sha256(firstJpegFrameFromSeedVideo()));

        postJson("/api/v1/preprocessed-datasets/" + outputDatasetId + "/confirm", "trace-real-yolo-confirm", """
            {"decision":"CONFIRM","comment":"真实抽帧图片已确认"}
            """, buAdmin);
        String outputVersionId = outputDetail.at("/data/dataset/currentVersionId").asText();
        JsonNode activate = postJson("/api/v1/preprocessed-datasets/" + outputDatasetId + "/activate", "trace-real-yolo-activate", """
            {"targetVersionId":"%s","activationNote":"进入标注链路"}
            """.formatted(outputVersionId), buAdmin);
        assertThat(activate.at("/data/status").asText()).isEqualTo("ACTIVE");

        JsonNode task = postJson("/api/v1/annotation/tasks", "trace-real-yolo-task", """
            {
              "sourceDatasetId":"%s",
              "sourceVersionId":"%s",
              "name":"真实抽帧YOLO标注任务",
              "scene":"IMAGE_TAGGING",
              "reviewEnabled":false,
              "prelabelEnabled":false,
              "labelStudioEnabled":false,
              "inlineLabels":["缺陷"]
            }
            """.formatted(outputDatasetId, outputVersionId), buAdmin);
        assertThat(task.at("/code").asInt()).isZero();
        String taskId = task.at("/data/task/taskId").asText();

        JsonNode workItems = getJson("/api/v1/annotation/tasks/" + taskId + "/work-items?pageSize=50", "trace-real-yolo-work-items", buAdmin);
        assertThat(workItems.at("/data/items").size()).isGreaterThanOrEqualTo(6);
        String threeBoxAnnotationJson = """
            {"boxes":[{"label":"缺陷","x":120,"y":118,"w":78,"h":58},{"label":"缺陷","x":258,"y":142,"w":86,"h":66},{"label":"缺陷","x":392,"y":128,"w":74,"h":62}]}
            """.strip();
        for (JsonNode item : workItems.at("/data/items")) {
            JsonNode submitted = postJson(
                "/api/v1/annotation/work-items/" + item.at("/workItemId").asText() + "/submit",
                "trace-real-yolo-submit-" + item.at("/workItemId").asText(),
                objectMapper.createObjectNode().put("annotationJson", threeBoxAnnotationJson).toString(),
                buAdmin
            );
            assertThat(submitted.at("/data/status").asText()).isEqualTo("APPROVED");
        }

        JsonNode quality = postJson("/api/v1/annotation/tasks/" + taskId + "/quality-check", "trace-real-yolo-quality", "{}", buAdmin);
        assertThat(quality.at("/data/qualityStatus").asText()).isEqualTo("PASSED");
        JsonNode publication = postJson("/api/v1/annotation/tasks/" + taskId + "/publish-dataset", "trace-real-yolo-publish", "{}", buAdmin);
        assertThat(publication.at("/data/annotationArtifactFileId").asText()).startsWith("FILE-ANN-");

        JsonNode export = postJson("/api/v1/annotation/tasks/" + taskId + "/exports", "trace-real-yolo-export", """
            {"format":"YOLO_DETECTION","optionsJson":"{\\"split\\":\\"train\\"}"}
            """, buAdmin);
        assertThat(export.at("/code").asInt()).as(export.toString()).isZero();
        assertThat(export.at("/data/format").asText()).isEqualTo("YOLO_DETECTION");
        assertThat(export.at("/data/fileId").asText()).startsWith("FILE-AEXP-");

        JsonNode download = getJson("/api/v1/annotation/exports/" + export.at("/data/exportId").asText() + "/download-url", "trace-real-yolo-download-url", buAdmin);
        String fileId = download.at("/data/fileId").asText();
        byte[] yoloZip = getBytes("/api/v1/platform/files/" + fileId + "/content", "trace-real-yolo-zip-download", buAdmin);
        assertThat(yoloZip).startsWith(new byte[] {'P', 'K'});
        Map<String, byte[]> entries = zipContents(yoloZip);
        assertThat(entries.keySet()).contains("data.yaml", "images/train/frame-0001.jpg", "labels/train/frame-0001.txt");
        assertThat(extractedFrameHashes).contains(sha256(entries.get("images/train/frame-0001.jpg")));
        String firstLabel = new String(entries.get("labels/train/frame-0001.txt"), java.nio.charset.StandardCharsets.UTF_8);
        assertThat(firstLabel.lines().filter(line -> !line.isBlank()).count()).isEqualTo(3);
    }

    @Test
    void segmentationMaskExportIncludesOriginalImagesFromPreprocessedDataset() throws Exception {
        String buAdmin = login("buadmin", "CABIN");
        JsonNode run = postJson("/api/v1/pipelines/PIPE-VIDEO-PREP/runs", "trace-real-seg-run", """
            {"triggerMode":"MANUAL","sampleDatasetId":"DATASET-WELD-VIDEO-001","outputDatasetName":"真实分割训练抽帧数据集"}
            """, buAdmin);
        String outputDatasetId = run.at("/data/run/outputDatasetId").asText();
        JsonNode outputDetail = getJson("/api/v1/datasets/" + outputDatasetId, "trace-real-seg-output-detail", buAdmin);
        Set<String> extractedFrameHashes = new java.util.HashSet<>();
        for (JsonNode file : outputDetail.at("/data/files")) {
            byte[] frame = getBytes("/api/v1/platform/files/" + file.at("/fileId").asText() + "/content", "trace-real-seg-frame-download-" + file.at("/fileId").asText(), buAdmin);
            extractedFrameHashes.add(sha256(frame));
        }
        postJson("/api/v1/preprocessed-datasets/" + outputDatasetId + "/confirm", "trace-real-seg-confirm", """
            {"decision":"CONFIRM","comment":"真实抽帧图片已确认"}
            """, buAdmin);
        String outputVersionId = outputDetail.at("/data/dataset/currentVersionId").asText();
        postJson("/api/v1/preprocessed-datasets/" + outputDatasetId + "/activate", "trace-real-seg-activate", """
            {"targetVersionId":"%s","activationNote":"进入分割标注链路"}
            """.formatted(outputVersionId), buAdmin);

        JsonNode task = postJson("/api/v1/annotation/tasks", "trace-real-seg-task", """
            {
              "sourceDatasetId":"%s",
              "sourceVersionId":"%s",
              "name":"真实抽帧分割标注任务",
              "scene":"IMAGE_SEGMENTATION",
              "reviewEnabled":false,
              "prelabelEnabled":false,
              "labelStudioEnabled":false,
              "inlineLabels":["裂纹区域","气孔区域"]
            }
            """.formatted(outputDatasetId, outputVersionId), buAdmin);
        assertThat(task.at("/code").asInt()).as(task.toString()).isZero();
        String taskId = task.at("/data/task/taskId").asText();

        JsonNode workItems = getJson("/api/v1/annotation/tasks/" + taskId + "/work-items?pageSize=50", "trace-real-seg-work-items", buAdmin);
        assertThat(workItems.at("/data/items").size()).isGreaterThanOrEqualTo(6);
        String polygonAnnotationJson = """
            {"polygons":[{"label":"裂纹区域","points":[{"x":120,"y":118},{"x":198,"y":118},{"x":198,"y":176},{"x":120,"y":176}]}]}
            """.strip();
        for (JsonNode item : workItems.at("/data/items")) {
            JsonNode submitted = postJson(
                "/api/v1/annotation/work-items/" + item.at("/workItemId").asText() + "/submit",
                "trace-real-seg-submit-" + item.at("/workItemId").asText(),
                objectMapper.createObjectNode().put("annotationJson", polygonAnnotationJson).toString(),
                buAdmin
            );
            assertThat(submitted.at("/data/status").asText()).isEqualTo("APPROVED");
        }

        JsonNode publication = postJson("/api/v1/annotation/tasks/" + taskId + "/publish-dataset", "trace-real-seg-publish", "{}", buAdmin);
        assertThat(publication.at("/data/annotationArtifactFileId").asText()).startsWith("FILE-ANN-");
        JsonNode export = postJson("/api/v1/annotation/tasks/" + taskId + "/exports", "trace-real-seg-export", """
            {"format":"SEGMENTATION_MASK_MANIFEST"}
            """, buAdmin);
        assertThat(export.at("/code").asInt()).as(export.toString()).isZero();
        assertThat(export.at("/data/packageIncludesImages").asBoolean()).isTrue();

        JsonNode download = getJson("/api/v1/annotation/exports/" + export.at("/data/exportId").asText() + "/download-url", "trace-real-seg-download-url", buAdmin);
        String fileId = download.at("/data/fileId").asText();
        byte[] segmentationZip = getBytes("/api/v1/platform/files/" + fileId + "/content", "trace-real-seg-zip-download", buAdmin);
        assertThat(segmentationZip).startsWith(new byte[] {'P', 'K'});
        Map<String, byte[]> entries = zipContents(segmentationZip);
        assertThat(entries.keySet()).contains("manifest.json", "annotations/labels.jsonl", "images/frame-0001.jpg");
        assertThat(extractedFrameHashes).contains(sha256(entries.get("images/frame-0001.jpg")));
    }



    @Test
    void debugRunShowsNodeProgressAndCreatesUsableImageFilesInsteadOfZip() throws Exception {
        // BUG-20260528-pipeline-debug-preprocessed-output: 调试模式需暴露中间步骤，抽帧产物必须是可用图片文件而不是 zip 包。
        String buAdmin = login("buadmin", "CABIN");

        JsonNode run = postJson("/api/v1/pipelines/PIPE-VIDEO-PREP/runs", "trace-bug-debug-output-run", """
            {"triggerMode":"DEBUG","sampleDatasetId":"DATASET-WELD-VIDEO-001"}
            """, buAdmin);
        assertThat(run.at("/code").asInt()).isZero();
        assertThat(run.at("/data/run/triggerMode").asText()).isEqualTo("DEBUG");
        assertThat(run.at("/data/debugMode").asBoolean()).isTrue();
        assertThat(run.at("/data/preview/datasetDataType").asText()).isEqualTo("IMAGE");
        assertThat(run.at("/data/nodeRuns").size()).isGreaterThanOrEqualTo(2);
        assertThat(run.at("/data/nodeRuns").toString()).contains("步骤 1/", "输入", "输出", "调试采样");
        String outputDatasetId = run.at("/data/run/outputDatasetId").asText();

        JsonNode outputDetail = getJson("/api/v1/datasets/" + outputDatasetId, "trace-bug-debug-output-detail", buAdmin);
        assertThat(outputDetail.at("/code").asInt()).isZero();
        assertThat(outputDetail.at("/data/previewStatus").asText()).isEqualTo("PREVIEWABLE");
        assertThat(outputDetail.at("/data/files").findValuesAsText("contentType"))
            .allMatch(contentType -> contentType.startsWith("image/"));
        assertThat(outputDetail.at("/data/files").findValuesAsText("objectKey"))
            .allMatch(objectKey -> !objectKey.endsWith(".zip"));
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

    @Autowired
    private ObjectStorageService objectStorageService;

    @org.junit.jupiter.api.BeforeEach
    void seedRealVideoObject() throws Exception {
        byte[] video = java.nio.file.Files.readAllBytes(java.nio.file.Path.of(
            VisualPreprocessPipelineControllerTest.class.getResource("/media/weld-source.avi").toURI()
        ));
        objectStorageService.uploadObjectIfConfigured("smp-datasets", "TENANT-CABIN/dataset/video/weld-source.avi", video, "video/x-msvideo");
        jdbc.update("UPDATE platform_file_object SET expected_sha256=?, sha256=?, expected_size_bytes=?, size_bytes=?, content_type='video/x-msvideo', object_key='TENANT-CABIN/dataset/video/weld-source.avi' WHERE file_id='FILE-DATASET-WELD-VIDEO-001'",
            sha256(video), sha256(video), video.length, video.length);
        jdbc.update("UPDATE dataset SET record_count=1, size_bytes=? WHERE dataset_id='DATASET-WELD-VIDEO-001'", video.length);
        jdbc.update("UPDATE dataset_version SET record_count=1, size_bytes=? WHERE version_id='DVER-WELD-VIDEO-001'", video.length);
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

    private byte[] getBytes(String path, String traceId, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .GET();
        if (token != null) builder.header("Authorization", "Bearer " + token);
        HttpResponse<byte[]> response = client.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
        assertThat(response.statusCode()).isEqualTo(200);
        return response.body();
    }

    private String sha256(byte[] content) throws Exception {
        return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(content));
    }

    private Map<String, byte[]> zipContents(byte[] content) throws Exception {
        Map<String, byte[]> entries = new HashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(content), java.nio.charset.StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                entries.put(entry.getName(), zip.readAllBytes());
            }
        }
        return entries;
    }

    private byte[] firstJpegFrameFromSeedVideo() throws Exception {
        byte[] video = java.nio.file.Files.readAllBytes(java.nio.file.Path.of(
            VisualPreprocessPipelineControllerTest.class.getResource("/media/weld-source.avi").toURI()
        ));
        int start = indexOf(video, new byte[] {(byte) 0xFF, (byte) 0xD8}, 0);
        int end = indexOf(video, new byte[] {(byte) 0xFF, (byte) 0xD9}, start + 2);
        assertThat(start).isGreaterThanOrEqualTo(0);
        assertThat(end).isGreaterThan(start);
        return java.util.Arrays.copyOfRange(video, start, end + 2);
    }

    private int indexOf(byte[] bytes, byte[] pattern, int from) {
        for (int index = Math.max(0, from); index <= bytes.length - pattern.length; index++) {
            boolean matched = true;
            for (int p = 0; p < pattern.length; p++) {
                if (bytes[index + p] != pattern[p]) {
                    matched = false;
                    break;
                }
            }
            if (matched) {
                return index;
            }
        }
        return -1;
    }
}
