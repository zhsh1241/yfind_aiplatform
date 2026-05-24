package com.yf.smp.app.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.yf.smp.app.web.TraceIdFilter;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "springdoc.api-docs.enabled=false",
        "springdoc.swagger-ui.enabled=false",
        "management.endpoints.enabled-by-default=false",
        "management.simple.metrics.export.enabled=false"
    }
)
@ActiveProfiles("test")
class AnnotationFlowJsonlExportRunnerTest {
    @LocalServerPort
    private int port;
    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void runSegmentationAnnotationFlowAndExportLocalJsonlPackage() throws Exception {
        String admin = login("admin", "YF");
        String annotator = login("annotator", "CABIN");
        String reviewer = login("buadmin", "CABIN");

        JsonNode candidate = getJson("/api/v1/datasets/DATASET-WELD-DEFECT/annotation-candidates", "trace-user-flow-candidate", admin);
        assertThat(candidate.at("/data/eligible").asBoolean()).isTrue();
        assertThat(candidate.at("/data/templates").findValuesAsText("templateId")).contains("LT-WELD-POLYGON");
        assertThat(candidate.at("/data/supportedFormats").toString()).contains("SMP_JSONL");

        JsonNode createdTask = postJson("/api/v1/datasets/DATASET-WELD-DEFECT/annotation-tasks", "trace-user-flow-task", """
            {"name":"会话演示-图片分割标注任务","sourceVersionId":"DVER-WELD-001","templateId":"LT-WELD-POLYGON","scene":"IMAGE_SEGMENTATION","reviewEnabled":true,"assigneeIds":["USR-ANNOTATOR"],"reviewerIds":["USR-BU-CABIN"]}
            """, admin);
        assertThat(createdTask.at("/code").asInt()).isZero();
        String taskId = createdTask.at("/data/task/taskId").asText();

        JsonNode detail = getJson("/api/v1/annotation/tasks/" + taskId, "trace-user-flow-detail", admin);
        List<JsonNode> workItems = sortedWorkItems(detail.at("/data/workItems"));
        assertThat(workItems).hasSize(6);

        int index = 0;
        for (JsonNode workItem : workItems) {
            index += 1;
            String workItemId = workItem.at("/workItemId").asText();
            String annotationJson = segmentationAnnotation(index);
            JsonNode submitted = postJson("/api/v1/annotation/work-items/" + workItemId + "/submit", "trace-user-flow-submit-" + index, """
                {"annotationJson":%s}
                """.formatted(jsonString(annotationJson)), annotator);
            assertThat(submitted.at("/code").asInt()).as(submitted.toString()).isZero();
            assertThat(submitted.at("/data/status").asText()).isEqualTo("REVIEW_PENDING");

            JsonNode pendingReviews = getJson("/api/v1/annotation/review-items?taskId=" + taskId + "&status=PENDING", "trace-user-flow-review-list-" + index, reviewer);
            String reviewId = pendingReviewId(pendingReviews.at("/data"), workItemId);
            JsonNode approved = postJson("/api/v1/annotation/review-items/" + reviewId + "/approve", "trace-user-flow-approve-" + index, "{}", reviewer);
            assertThat(approved.at("/code").asInt()).isZero();
            assertThat(approved.at("/data/status").asText()).isEqualTo("APPROVED");
        }

        JsonNode approvedDetail = getJson("/api/v1/annotation/tasks/" + taskId, "trace-user-flow-approved-detail", reviewer);
        assertThat(approvedDetail.at("/data/task/reviewedCount").asLong()).isEqualTo(approvedDetail.at("/data/task/totalCount").asLong());
        assertThat(approvedDetail.at("/data/workItems").findValuesAsText("status")).containsOnly("APPROVED");

        JsonNode quality = postJson("/api/v1/annotation/tasks/" + taskId + "/quality-check", "trace-user-flow-quality", "{}", reviewer);
        assertThat(quality.at("/code").asInt()).isZero();
        assertThat(quality.at("/data/qualityStatus").asText()).isEqualTo("PASSED");

        JsonNode publication = postJson("/api/v1/annotation/tasks/" + taskId + "/publish-dataset", "trace-user-flow-publish", "{}", reviewer);
        assertThat(publication.at("/code").asInt()).isZero();
        assertThat(publication.at("/data/outputDatasetId").asText()).startsWith("DATASET-ANN-");
        assertThat(publication.at("/data/annotationArtifactFileId").asText()).startsWith("FILE-ANN-");

        JsonNode export = postJson("/api/v1/annotation/tasks/" + taskId + "/exports", "trace-user-flow-export", """
            {"format":"SMP_JSONL"}
            """, reviewer);
        assertThat(export.at("/code").asInt()).isZero();
        assertThat(export.at("/data/status").asText()).isEqualTo("AVAILABLE");
        assertThat(export.at("/data/packageIncludesImages").asBoolean()).isTrue();
        String exportId = export.at("/data/exportId").asText();

        JsonNode download = getJson("/api/v1/annotation/exports/" + exportId + "/download-url", "trace-user-flow-download", reviewer);
        assertThat(download.at("/code").asInt()).isZero();
        assertThat(download.at("/data/diagnosticCode").asText()).isEqualTo("SIGNED_URL_READY");
        assertThat(download.at("/data/downloadUrl").asText()).contains("localhost");

        JsonNode finalDetail = getJson("/api/v1/annotation/tasks/" + taskId, "trace-user-flow-final-detail", reviewer);
        Path artifactDir = writeArtifacts(taskId, finalDetail, publication.at("/data"), export.at("/data"), download.at("/data"));
        System.out.println("ANNOTATION_FLOW_TASK=" + taskId);
        System.out.println("ANNOTATION_FLOW_JSONL=" + artifactDir.resolve("annotations").resolve("smp.jsonl").toAbsolutePath());
        System.out.println("ANNOTATION_FLOW_PACKAGE=" + artifactDir.resolve(taskId + "-smp-jsonl-package.zip").toAbsolutePath());
    }

    @Test
    void runSegmentationAnnotationFlowWithTwoRealImagesAndExportLocalJsonlPackage() throws Exception {
        String admin = login("admin", "YF");
        String annotator = login("annotator", "CABIN");
        String reviewer = login("buadmin", "CABIN");

        List<RealImageAsset> assets = downloadRealImages();

        JsonNode createdDataset = postJson("/api/v1/datasets", "trace-real-flow-dataset-create", """
            {"name":"真实图片分割测试数据集","datasetType":"RAW","dataType":"IMAGE","tenantId":"TENANT-CABIN","accessLevel":"TEAM","tags":["真实图片","分割","回归"],"description":"真实图片端到端标注导出回归","recordCount":2,"sourceId":"DSRC-CABIN-MINIO"}
            """, admin);
        assertThat(createdDataset.at("/code").asInt()).isZero();
        String datasetId = createdDataset.at("/data/dataset/datasetId").asText();
        String versionId = createdDataset.at("/data/versions/0/versionId").asText();

        for (int i = 0; i < assets.size(); i++) {
            RealImageAsset asset = assets.get(i);
            JsonNode initiated = postJson("/api/v1/platform/files/init", "trace-real-flow-file-init-" + asset.traceKey(), """
                {"assetType":"DATASET","tenantId":"TENANT-CABIN","filename":"%s","expectedSha256":"%s","expectedSizeBytes":%d,"contentType":"%s"}
                """.formatted(asset.fileName(), asset.sha256(), asset.sizeBytes(), asset.contentType()), admin);
            assertThat(initiated.at("/code").asInt()).isZero();
            String fileId = initiated.at("/data/fileId").asText();

            JsonNode uploaded = postMultipart("/api/v1/platform/files/" + fileId + "/content", "trace-real-flow-file-upload-" + asset.traceKey(), "file", asset.fileName(), asset.contentType(), Files.readAllBytes(asset.downloadedPath()), admin);
            assertThat(uploaded.at("/code").asInt()).isZero();
            assertThat(uploaded.at("/data/status").asText()).isEqualTo("UPLOADED");

            JsonNode completed = postJson("/api/v1/platform/files/" + fileId + "/complete", "trace-real-flow-file-complete-" + asset.traceKey(), """
                {"sha256":"%s","sizeBytes":%d}
                """.formatted(asset.sha256(), asset.sizeBytes()), admin);
            assertThat(completed.at("/code").asInt()).isZero();
            assertThat(completed.at("/data/status").asText()).isEqualTo("AVAILABLE");

            JsonNode attached = postJson("/api/v1/datasets/" + datasetId + "/versions/" + versionId + "/files", "trace-real-flow-file-attach-" + asset.traceKey(), """
                {"fileId":"%s","fileRole":"RAW"}
                """.formatted(fileId), admin);
            assertThat(attached.at("/code").asInt()).isZero();
            assets.set(i, asset.bindFileId(fileId));
        }

        jdbc.update("UPDATE dataset_version SET content_safety_status='PASSED', diagnostic_code='OK', diagnostic_message='SANDBOX_CONTENT_SAFETY_PASSED' WHERE version_id=?", versionId);
        JsonNode published = postJson("/api/v1/datasets/" + datasetId + "/versions/" + versionId + "/publish", "trace-real-flow-dataset-publish", "{}", admin);
        assertThat(published.at("/code").asInt()).isZero();
        assertThat(published.at("/data/status").asText()).isEqualTo("PUBLISHED");

        JsonNode candidate = getJson("/api/v1/datasets/" + datasetId + "/annotation-candidates", "trace-real-flow-candidate", admin);
        assertThat(candidate.at("/code").asInt()).isZero();
        assertThat(candidate.at("/data/eligible").asBoolean()).isTrue();
        assertThat(candidate.at("/data/templates").findValuesAsText("templateId")).contains("LT-WELD-POLYGON");

        JsonNode createdTask = postJson("/api/v1/datasets/" + datasetId + "/annotation-tasks", "trace-real-flow-task", """
            {"name":"真实图片-图片分割标注任务","sourceVersionId":"%s","templateId":"LT-WELD-POLYGON","scene":"IMAGE_SEGMENTATION","reviewEnabled":true,"assigneeIds":["USR-ANNOTATOR"],"reviewerIds":["USR-BU-CABIN"]}
            """.formatted(versionId), admin);
        assertThat(createdTask.at("/code").asInt()).isZero();
        String taskId = createdTask.at("/data/task/taskId").asText();

        JsonNode detail = getJson("/api/v1/annotation/tasks/" + taskId, "trace-real-flow-detail", admin);
        List<JsonNode> workItems = sortedWorkItems(detail.at("/data/workItems"));
        assertThat(workItems).hasSize(2);

        for (int i = 0; i < assets.size(); i++) {
            jdbc.update("UPDATE annotation_work_item SET sample_file_id=?, sample_key=?, updated_at=? WHERE work_item_id=?",
                assets.get(i).fileId(),
                assets.get(i).sourceUrl(),
                OffsetDateTime.now(),
                workItems.get(i).at("/workItemId").asText());
        }

        JsonNode patchedDetail = getJson("/api/v1/annotation/tasks/" + taskId, "trace-real-flow-patched-detail", admin);
        List<JsonNode> patchedItems = sortedWorkItems(patchedDetail.at("/data/workItems"));
        assertThat(patchedItems).hasSize(2);
        assertThat(patchedItems.get(0).at("/sampleKey").asText()).contains("industrial-samples");
        assertThat(patchedItems.get(1).at("/sampleKey").asText()).contains("industrial-samples");

        for (int index = 0; index < patchedItems.size(); index++) {
            JsonNode workItem = patchedItems.get(index);
            RealImageAsset asset = assets.get(index);
            String workItemId = workItem.at("/workItemId").asText();
            String annotationJson = segmentationAnnotationForAsset(index + 1, asset);
            JsonNode submitted = postJson("/api/v1/annotation/work-items/" + workItemId + "/submit", "trace-real-flow-submit-" + (index + 1), """
                {"annotationJson":%s}
                """.formatted(jsonString(annotationJson)), annotator);
            assertThat(submitted.at("/code").asInt()).as(submitted.toString()).isZero();
            assertThat(submitted.at("/data/status").asText()).isEqualTo("REVIEW_PENDING");

            JsonNode pendingReviews = getJson("/api/v1/annotation/review-items?taskId=" + taskId + "&status=PENDING", "trace-real-flow-review-list-" + (index + 1), reviewer);
            String reviewId = pendingReviewId(pendingReviews.at("/data"), workItemId);
            JsonNode approved = postJson("/api/v1/annotation/review-items/" + reviewId + "/approve", "trace-real-flow-approve-" + (index + 1), "{}", reviewer);
            assertThat(approved.at("/code").asInt()).isZero();
            assertThat(approved.at("/data/status").asText()).isEqualTo("APPROVED");
        }

        JsonNode approvedDetail = getJson("/api/v1/annotation/tasks/" + taskId, "trace-real-flow-approved-detail", reviewer);
        assertThat(approvedDetail.at("/data/task/reviewedCount").asLong()).isEqualTo(2);
        assertThat(approvedDetail.at("/data/task/totalCount").asLong()).isEqualTo(2);

        JsonNode quality = postJson("/api/v1/annotation/tasks/" + taskId + "/quality-check", "trace-real-flow-quality", "{}", reviewer);
        assertThat(quality.at("/code").asInt()).isZero();
        assertThat(quality.at("/data/qualityStatus").asText()).isEqualTo("PASSED");

        JsonNode publication = postJson("/api/v1/annotation/tasks/" + taskId + "/publish-dataset", "trace-real-flow-publish", "{}", reviewer);
        assertThat(publication.at("/code").asInt()).isZero();

        JsonNode export = postJson("/api/v1/annotation/tasks/" + taskId + "/exports", "trace-real-flow-export", """
            {"format":"SMP_JSONL"}
            """, reviewer);
        assertThat(export.at("/code").asInt()).isZero();
        String exportId = export.at("/data/exportId").asText();

        JsonNode download = getJson("/api/v1/annotation/exports/" + exportId + "/download-url", "trace-real-flow-download", reviewer);
        assertThat(download.at("/code").asInt()).isZero();
        assertThat(download.at("/data/diagnosticCode").asText()).isEqualTo("SIGNED_URL_READY");
        assertThat(download.at("/data/downloadUrl").asText()).contains("localhost");

        Path artifactDir = writeArtifactsWithRealImages(taskId, approvedDetail, publication.at("/data"), export.at("/data"), download.at("/data"), assets);
        System.out.println("REAL_IMAGE_ANNOTATION_FLOW_TASK=" + taskId);
        System.out.println("REAL_IMAGE_ANNOTATION_FLOW_DATASET=" + datasetId);
        System.out.println("REAL_IMAGE_ANNOTATION_FLOW_EXPORT=" + exportId);
        System.out.println("REAL_IMAGE_ANNOTATION_FLOW_JSONL=" + artifactDir.resolve("annotations").resolve("smp.jsonl").toAbsolutePath());
        System.out.println("REAL_IMAGE_ANNOTATION_FLOW_PACKAGE=" + artifactDir.resolve(taskId + "-real-images-smp-jsonl-package.zip").toAbsolutePath());
    }

    private Path writeArtifacts(String taskId, JsonNode detail, JsonNode publication, JsonNode export, JsonNode download) throws Exception {
        Path root = workspaceRoot();
        Path artifactDir = root.resolve(".tmp").resolve("annotation-flow").resolve(taskId);
        Path annotationsDir = artifactDir.resolve("annotations");
        Path imagesDir = artifactDir.resolve("images");
        Files.createDirectories(annotationsDir);
        Files.createDirectories(imagesDir);

        List<JsonNode> workItems = sortedWorkItems(detail.at("/data/workItems"));
        List<String> jsonlLines = new ArrayList<>();
        ArrayNode imageManifest = objectMapper.createArrayNode();
        for (JsonNode workItem : workItems) {
            ObjectNode line = objectMapper.createObjectNode();
            line.put("taskId", taskId);
            line.put("workItemId", workItem.at("/workItemId").asText());
            line.put("scene", detail.at("/data/task/scene").asText());
            line.put("image", workItem.at("/sampleKey").asText());
            line.put("sampleFileId", workItem.at("/sampleFileId").asText());
            line.put("status", workItem.at("/status").asText());
            line.set("annotation", parseMaybeJson(workItem.at("/annotationJson").asText(null)));
            line.set("prediction", parseMaybeJson(workItem.at("/predictionJson").asText(null)));

            ObjectNode metadata = objectMapper.createObjectNode();
            metadata.put("sourceDatasetId", detail.at("/data/task/sourceDatasetId").asText());
            metadata.put("sourceVersionId", detail.at("/data/task/sourceVersionId").asText());
            metadata.put("templateId", detail.at("/data/task/templateId").asText());
            metadata.put("annotationArtifactFileId", publication.at("/annotationArtifactFileId").asText());
            metadata.put("exportId", export.at("/exportId").asText());
            metadata.put("exportFileId", export.at("/fileId").asText());
            line.set("metadata", metadata);
            jsonlLines.add(objectMapper.writeValueAsString(line));

            ObjectNode imageItem = objectMapper.createObjectNode();
            imageItem.put("sampleKey", workItem.at("/sampleKey").asText());
            imageItem.put("sampleFileId", workItem.at("/sampleFileId").asText());
            imageItem.put("note", "测试 profile 仅内置文件对象元数据，未落地真实图片二进制");
            imageManifest.add(imageItem);
        }

        Path jsonlPath = annotationsDir.resolve("smp.jsonl");
        Files.writeString(jsonlPath, String.join(System.lineSeparator(), jsonlLines) + System.lineSeparator(), StandardCharsets.UTF_8);

        Files.writeString(imagesDir.resolve("manifest.json"), objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(imageManifest), StandardCharsets.UTF_8);

        ObjectNode metadataFile = objectMapper.createObjectNode();
        metadataFile.put("generatedAt", OffsetDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        metadataFile.put("taskId", taskId);
        metadataFile.put("scene", detail.at("/data/task/scene").asText());
        metadataFile.put("sourceDatasetId", detail.at("/data/task/sourceDatasetId").asText());
        metadataFile.put("sourceVersionId", detail.at("/data/task/sourceVersionId").asText());
        metadataFile.put("templateId", detail.at("/data/task/templateId").asText());
        metadataFile.put("outputDatasetId", publication.at("/outputDatasetId").asText());
        metadataFile.put("outputVersionId", publication.at("/outputVersionId").asText());
        metadataFile.put("annotationArtifactFileId", publication.at("/annotationArtifactFileId").asText());
        metadataFile.put("annotationArtifactObjectKey", "TENANT-CABIN/annotation/" + taskId + "/labels.jsonl");
        metadataFile.put("exportId", export.at("/exportId").asText());
        metadataFile.put("exportFileId", export.at("/fileId").asText());
        metadataFile.put("exportObjectKey", "TENANT-CABIN/annotation/" + taskId + "/exports/smp_jsonl/" + export.at("/exportId").asText() + ".jsonl");
        metadataFile.put("downloadDiagnosticCode", download.at("/diagnosticCode").asText());
        metadataFile.put("downloadDiagnosticMessage", download.at("/diagnosticMessage").asText());
        metadataFile.put("downloadUrl", download.at("/downloadUrl").isNull() ? null : download.at("/downloadUrl").asText());
        metadataFile.put("recordCount", workItems.size());
        metadataFile.put("jsonlSha256", sha256(Files.readAllBytes(jsonlPath)));
        metadataFile.put("packageNote", "本地导出包为演示产物；图片二进制未在测试 profile 中落地，仅保留 sampleKey/fileId 映射。");
        Path metadataPath = artifactDir.resolve("metadata.json");
        Files.writeString(metadataPath, objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(metadataFile), StandardCharsets.UTF_8);

        String readme = """
            这是本次会话生成的本地 SMP_JSONL 演示包。

            - annotations/smp.jsonl: 最终训练样本 JSONL
            - metadata.json: 导出/发布元数据
            - images/manifest.json: 原始图片引用清单（测试 profile 未落地真实图片）
            """;
        Path readmePath = artifactDir.resolve("README.txt");
        Files.writeString(readmePath, readme, StandardCharsets.UTF_8);

        Path zipPath = artifactDir.resolve(taskId + "-smp-jsonl-package.zip");
        try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(zipPath), StandardCharsets.UTF_8)) {
            addZipEntry(zip, "annotations/smp.jsonl", Files.readAllBytes(jsonlPath));
            addZipEntry(zip, "metadata.json", Files.readAllBytes(metadataPath));
            addZipEntry(zip, "images/manifest.json", Files.readAllBytes(imagesDir.resolve("manifest.json")));
            addZipEntry(zip, "README.txt", Files.readAllBytes(readmePath));
        }
        return artifactDir;
    }

    private Path writeArtifactsWithRealImages(String taskId, JsonNode detail, JsonNode publication, JsonNode export, JsonNode download, List<RealImageAsset> assets) throws Exception {
        Path root = workspaceRoot();
        Path artifactDir = root.resolve(".tmp").resolve("annotation-flow-real").resolve(taskId);
        Path annotationsDir = artifactDir.resolve("annotations");
        Path imagesDir = artifactDir.resolve("images");
        Files.createDirectories(annotationsDir);
        Files.createDirectories(imagesDir);

        Map<String, RealImageAsset> assetsByFileId = new LinkedHashMap<>();
        for (RealImageAsset asset : assets) {
            assetsByFileId.put(asset.fileId(), asset);
        }

        List<JsonNode> workItems = sortedWorkItems(detail.at("/data/workItems"));
        List<String> jsonlLines = new ArrayList<>();
        ArrayNode imageManifest = objectMapper.createArrayNode();
        for (JsonNode workItem : workItems) {
            RealImageAsset asset = assetsByFileId.get(workItem.at("/sampleFileId").asText());
            assertThat(asset).as("asset for %s", workItem.at("/sampleFileId").asText()).isNotNull();

            Path imageTarget = imagesDir.resolve(asset.fileName());
            Files.copy(asset.downloadedPath(), imageTarget, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            ObjectNode line = objectMapper.createObjectNode();
            line.put("taskId", taskId);
            line.put("workItemId", workItem.at("/workItemId").asText());
            line.put("scene", detail.at("/data/task/scene").asText());
            line.put("image", asset.fileName());
            line.put("imageSourceUrl", asset.sourceUrl());
            line.put("sampleFileId", workItem.at("/sampleFileId").asText());
            line.put("status", workItem.at("/status").asText());
            line.set("annotation", parseMaybeJson(workItem.at("/annotationJson").asText(null)));
            line.set("prediction", parseMaybeJson(workItem.at("/predictionJson").asText(null)));

            ObjectNode metadata = objectMapper.createObjectNode();
            metadata.put("sourceDatasetId", detail.at("/data/task/sourceDatasetId").asText());
            metadata.put("sourceVersionId", detail.at("/data/task/sourceVersionId").asText());
            metadata.put("templateId", detail.at("/data/task/templateId").asText());
            metadata.put("annotationArtifactFileId", publication.at("/annotationArtifactFileId").asText());
            metadata.put("exportId", export.at("/exportId").asText());
            metadata.put("exportFileId", export.at("/fileId").asText());
            metadata.put("sourcePageUrl", asset.sourcePageUrl());
            metadata.put("license", asset.license());
            metadata.put("description", asset.description());
            metadata.put("width", asset.width());
            metadata.put("height", asset.height());
            metadata.put("sha256", asset.sha256());
            line.set("metadata", metadata);
            jsonlLines.add(objectMapper.writeValueAsString(line));

            ObjectNode imageItem = objectMapper.createObjectNode();
            imageItem.put("fileId", asset.fileId());
            imageItem.put("fileName", asset.fileName());
            imageItem.put("sampleKey", workItem.at("/sampleKey").asText());
            imageItem.put("sourceUrl", asset.sourceUrl());
            imageItem.put("sourcePageUrl", asset.sourcePageUrl());
            imageItem.put("license", asset.license());
            imageItem.put("description", asset.description());
            imageItem.put("sha256", asset.sha256());
            imageItem.put("sizeBytes", asset.sizeBytes());
            imageItem.put("width", asset.width());
            imageItem.put("height", asset.height());
            imageManifest.add(imageItem);
        }

        Path jsonlPath = annotationsDir.resolve("smp.jsonl");
        Files.writeString(jsonlPath, String.join(System.lineSeparator(), jsonlLines) + System.lineSeparator(), StandardCharsets.UTF_8);
        Files.writeString(imagesDir.resolve("manifest.json"), objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(imageManifest), StandardCharsets.UTF_8);

        ObjectNode metadataFile = objectMapper.createObjectNode();
        metadataFile.put("generatedAt", OffsetDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        metadataFile.put("taskId", taskId);
        metadataFile.put("scene", detail.at("/data/task/scene").asText());
        metadataFile.put("sourceDatasetId", detail.at("/data/task/sourceDatasetId").asText());
        metadataFile.put("sourceVersionId", detail.at("/data/task/sourceVersionId").asText());
        metadataFile.put("templateId", detail.at("/data/task/templateId").asText());
        metadataFile.put("outputDatasetId", publication.at("/outputDatasetId").asText());
        metadataFile.put("outputVersionId", publication.at("/outputVersionId").asText());
        metadataFile.put("annotationArtifactFileId", publication.at("/annotationArtifactFileId").asText());
        metadataFile.put("exportId", export.at("/exportId").asText());
        metadataFile.put("exportFileId", export.at("/fileId").asText());
        metadataFile.put("downloadDiagnosticCode", download.at("/diagnosticCode").asText());
        metadataFile.put("downloadDiagnosticMessage", download.at("/diagnosticMessage").asText());
        metadataFile.put("downloadUrl", download.at("/downloadUrl").isNull() ? null : download.at("/downloadUrl").asText());
        metadataFile.put("recordCount", workItems.size());
        metadataFile.put("jsonlSha256", sha256(Files.readAllBytes(jsonlPath)));
        ArrayNode sources = metadataFile.putArray("realImageSources");
        for (RealImageAsset asset : assets) {
            ObjectNode source = sources.addObject();
            source.put("fileId", asset.fileId());
            source.put("fileName", asset.fileName());
            source.put("sourcePageUrl", asset.sourcePageUrl());
            source.put("sourceUrl", asset.sourceUrl());
            source.put("license", asset.license());
        }
        Path metadataPath = artifactDir.resolve("metadata.json");
        Files.writeString(metadataPath, objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(metadataFile), StandardCharsets.UTF_8);

        String readme = """
            这是本次真实图片端到端流程生成的本地 SMP_JSONL 包。

            - annotations/smp.jsonl: 标注完成后的训练样本 JSONL
            - metadata.json: 任务 / 发布 / 导出元数据与真实图片来源
            - images/: 打包后的真实图片二进制与 manifest

            说明：
            - 标注、审核、质检、发布、导出全部通过正式接口执行。
            - 导出下载链接已切换为本地 MinIO 预签名 URL；本测试仍额外在本地补齐 ZIP 包，便于直接检查内容。
            """;
        Path readmePath = artifactDir.resolve("README.txt");
        Files.writeString(readmePath, readme, StandardCharsets.UTF_8);

        Path zipPath = artifactDir.resolve(taskId + "-real-images-smp-jsonl-package.zip");
        try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(zipPath), StandardCharsets.UTF_8)) {
            addZipEntry(zip, "annotations/smp.jsonl", Files.readAllBytes(jsonlPath));
            addZipEntry(zip, "metadata.json", Files.readAllBytes(metadataPath));
            addZipEntry(zip, "images/manifest.json", Files.readAllBytes(imagesDir.resolve("manifest.json")));
            for (RealImageAsset asset : assets) {
                addZipEntry(zip, "images/" + asset.fileName(), Files.readAllBytes(imagesDir.resolve(asset.fileName())));
            }
            addZipEntry(zip, "README.txt", Files.readAllBytes(readmePath));
        }
        return artifactDir;
    }

    private void addZipEntry(ZipOutputStream zip, String name, byte[] content) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content);
        zip.closeEntry();
    }

    private List<JsonNode> sortedWorkItems(JsonNode workItemsNode) {
        List<JsonNode> items = new ArrayList<>();
        workItemsNode.forEach(items::add);
        items.sort(Comparator.comparing(item -> item.at("/sampleKey").asText()));
        return items;
    }

    private String pendingReviewId(JsonNode reviews, String workItemId) {
        for (JsonNode review : reviews) {
            if (workItemId.equals(review.at("/workItemId").asText())) {
                return review.at("/reviewItemId").asText();
            }
        }
        throw new IllegalStateException("Pending review not found for workItemId=" + workItemId);
    }

    private JsonNode parseMaybeJson(String raw) throws IOException {
        if (raw == null || raw.isBlank()) {
            return NullNode.instance;
        }
        return objectMapper.readTree(raw);
    }

    private Path workspaceRoot() {
        Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
        if (Files.exists(current.resolve("backend")) && Files.exists(current.resolve("frontend"))) {
            return current;
        }
        if (current.getFileName() != null && "smp-app".equals(current.getFileName().toString())) {
            return current.getParent().getParent();
        }
        return current;
    }

    private List<RealImageAsset> downloadRealImages() throws Exception {
        Path imageDir = workspaceRoot().resolve(".tmp").resolve("real-images");
        Files.createDirectories(imageDir);
        List<RealImageAsset> assets = new ArrayList<>();
        assets.add(downloadRealImage(
            imageDir,
            "foundry-blowhole.jpg",
            "repo://frontend/public/industrial-samples/foundry-blowhole.jpg",
            "file://frontend/public/industrial-samples/foundry-blowhole.jpg",
            "TODO_CONFIRM_SOURCE_LICENSE",
            "工业铸件表面 blowhole 缺陷真实照片"
        ));
        assets.add(downloadRealImage(
            imageDir,
            "tig-welding.jpg",
            "repo://frontend/public/industrial-samples/tig-welding.jpg",
            "file://frontend/public/industrial-samples/tig-welding.jpg",
            "TODO_CONFIRM_SOURCE_LICENSE",
            "工业 TIG 焊接作业真实照片"
        ));
        return assets;
    }

    private RealImageAsset downloadRealImage(Path imageDir, String fileName, String sourcePageUrl, String sourceUrl, String license, String description) throws Exception {
        Path target = imageDir.resolve(fileName);
        Path localSource = resolveLocalRealImage(fileName);
        if (localSource != null) {
            Files.copy(localSource, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        } else if ((sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://")) && (!Files.exists(target) || Files.size(target) == 0L)) {
            HttpRequest request = HttpRequest.newBuilder(URI.create(sourceUrl))
                .header("User-Agent", "OpenAI-Codex-TestRunner/1.0")
                .GET()
                .build();
            HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
            assertThat(response.statusCode()).isEqualTo(200);
            Files.write(target, response.body());
        } else if (!Files.exists(target) || Files.size(target) == 0L) {
            throw new IllegalStateException("Real image not found locally and sourceUrl is not downloadable: " + sourceUrl);
        }
        byte[] bytes = Files.readAllBytes(target);
        BufferedImage image = ImageIO.read(target.toFile());
        assertThat(image).as("read image %s", fileName).isNotNull();
        return new RealImageAsset(
            null,
            fileName,
            fileName.replace(".jpg", "").replace(".jpeg", "").replace(".", "-"),
            sourcePageUrl,
            sourceUrl,
            license,
            description,
            target,
            Files.size(target),
            "image/jpeg",
            sha256(bytes),
            image.getWidth(),
            image.getHeight()
        );
    }

    private Path resolveLocalRealImage(String fileName) {
        Path root = workspaceRoot();
        String cwd = System.getProperty("user.dir");
        List<Path> candidates = List.of(
            Path.of("C:/GIT/yfind_aiplatform/frontend/public/industrial-samples").resolve(fileName),
            Path.of("C:/GIT/yfind_aiplatform/frontend/dist/industrial-samples").resolve(fileName),
            root.resolve("frontend").resolve("public").resolve("industrial-samples").resolve(fileName),
            root.resolve("frontend").resolve("dist").resolve("industrial-samples").resolve(fileName),
            root.resolve(".tmp").resolve("real-images").resolve(fileName)
        );
        for (Path candidate : candidates) {
            if (Files.exists(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Local real image not found. cwd=" + cwd + ", root=" + root + ", file=" + fileName + ", checked=" + candidates);
    }

    private String segmentationAnnotation(int index) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode polygons = root.putArray("polygons");
        ObjectNode polygon = polygons.addObject();
        polygon.put("label", index % 2 == 0 ? "裂纹区域" : "气孔区域");
        ArrayNode points = polygon.putArray("points");
        points.add(point(8 + index, 10 + index));
        points.add(point(36 + index, 12 + index));
        points.add(point(44 + index, 28 + index));
        points.add(point(28 + index, 42 + index));
        points.add(point(10 + index, 34 + index));
        ArrayNode connections = polygon.putArray("connections");
        connections.add(edge(0, 1));
        connections.add(edge(1, 2));
        connections.add(edge(2, 3));
        connections.add(edge(3, 4));
        connections.add(edge(4, 0));
        polygon.put("selected", true);
        polygon.put("editable", true);
        polygon.put("note", "演示：已有线条可选中修改，并支持新增连接线");
        return objectMapper.writeValueAsString(root);
    }

    private String segmentationAnnotationForAsset(int index, RealImageAsset asset) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("imageWidth", asset.width());
        root.put("imageHeight", asset.height());
        root.put("imageSourceUrl", asset.sourceUrl());
        ArrayNode polygons = root.putArray("polygons");
        ObjectNode polygon = polygons.addObject();
        polygon.put("label", index == 1 ? "铸造缺陷区域" : "焊接作业区域");
        ArrayNode points = polygon.putArray("points");
        if (index == 1) {
            points.add(point(280, 250));
            points.add(point(390, 220));
            points.add(point(450, 320));
            points.add(point(380, 430));
            points.add(point(250, 390));
        } else {
            points.add(point(310, 180));
            points.add(point(610, 160));
            points.add(point(760, 390));
            points.add(point(540, 560));
            points.add(point(250, 470));
        }
        ArrayNode connections = polygon.putArray("connections");
        connections.add(edge(0, 1));
        connections.add(edge(1, 2));
        connections.add(edge(2, 3));
        connections.add(edge(3, 4));
        connections.add(edge(4, 0));
        connections.add(edge(1, 3));
        polygon.put("selected", true);
        polygon.put("editable", true);
        polygon.put("note", "真实图片回归：先选中已有线条再调整，并新增一条连接线闭合缺陷/焊接区域");
        return objectMapper.writeValueAsString(root);
    }

    private ObjectNode point(int x, int y) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("x", x);
        node.put("y", y);
        return node;
    }

    private ObjectNode edge(int from, int to) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("from", from);
        node.put("to", to);
        return node;
    }

    private String jsonString(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private String sha256(byte[] content) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
    }

    private String login(String username, String tenantCode) throws Exception {
        JsonNode login = postJson("/api/v1/auth/login", "trace-login-" + username + "-" + tenantCode, """
            {"username":"%s","password":"Smp@123456","tenantCode":"%s"}
            """.formatted(username, tenantCode), null);
        assertThat(login.at("/code").asInt()).isZero();
        return login.at("/data/accessToken").asText();
    }

    private JsonNode getJson(String path, String traceId, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .GET();
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return send(builder.build());
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

    private JsonNode postMultipart(String path, String traceId, String fieldName, String fileName, String contentType, byte[] content, String token) throws Exception {
        String boundary = "----WebKitFormBoundary" + java.util.UUID.randomUUID().toString().replace("-", "");
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        body.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        body.write(("Content-Disposition: form-data; name=\"" + fieldName + "\"; filename=\"" + fileName + "\"\r\n").getBytes(StandardCharsets.UTF_8));
        body.write(("Content-Type: " + contentType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        body.write(content);
        body.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray()));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return send(builder.build());
    }

    private JsonNode send(HttpRequest request) throws Exception {
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 400) {
            assertThat(response.headers().firstValue(TraceIdFilter.TRACE_HEADER)).isPresent();
        }
        return objectMapper.readTree(response.body());
    }

    private record RealImageAsset(
        String fileId,
        String fileName,
        String traceKey,
        String sourcePageUrl,
        String sourceUrl,
        String license,
        String description,
        Path downloadedPath,
        long sizeBytes,
        String contentType,
        String sha256,
        int width,
        int height
    ) {
        private RealImageAsset bindFileId(String fileId) {
            return new RealImageAsset(fileId, fileName, traceKey, sourcePageUrl, sourceUrl, license, description, downloadedPath, sizeBytes, contentType, sha256, width, height);
        }
    }
}
