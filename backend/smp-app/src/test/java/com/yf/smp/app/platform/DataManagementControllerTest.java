package com.yf.smp.app.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yf.smp.app.web.TraceIdFilter;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class DataManagementControllerTest {
    @LocalServerPort
    private int port;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void connectorProbeAcceptsHttpEndpointForTcpOnlyIndustrialProtocol() throws Exception {
        // TASK-data-source-dataset-management AC-11
        try (ServerSocket server = new ServerSocket(0)) {
            Thread acceptOnce = new Thread(() -> {
                try (var ignored = server.accept()) {
                    // TCP 握手成功即可，工业协议仿真网关由后续 connector 读取。
                } catch (Exception ignored) {}
            });
            acceptOnce.setDaemon(true);
            acceptOnce.start();

            DataSourceRecord source = new DataSourceRecord(
                "DSRC-UNIT-OPCUA",
                "单元测试 OPC-UA",
                "INDUSTRIAL_PROTOCOL",
                "TENANT-CABIN",
                null,
                "http://127.0.0.1:" + server.getLocalPort(),
                server.getLocalPort(),
                "OPC_UA_SIM",
                "SECRET_REF",
                "secret://unit/opcua",
                "BU",
                "industrial protocol probe unit",
                "INACTIVE",
                null,
                "NOT_TESTED",
                "待连接测试",
                null,
                "USR-ADMIN",
                OffsetDateTime.now(),
                OffsetDateTime.now()
            );

            DataSourceTestResult result = new DefaultDataSourceConnectionTester().test(source);
            assertThat(result.result()).isEqualTo("SUCCESS");
            assertThat(result.diagnosticMessage()).contains("INDUSTRIAL_PROTOCOL");
        }
    }

    @Test
    void dataSourceTestGateMasksSecretsAndAuditDiagnostics() throws Exception {
        // TASK-data-source-dataset-management AC-01 AC-02 AC-09
        String admin = login("admin", "YF");
        JsonNode created = postJson("/api/v1/data-sources", "trace-f009-dsrc-create", """
            {"name":"测试对象存储","sourceType":"OBJECT_STORAGE","tenantId":"TENANT-CABIN","endpoint":"TODO_CONFIRM_OSS_ENDPOINT","port":9000,"databaseName":"bucket-a","credentialMode":"SECRET_REF","secretRef":"secret://TODO_CONFIRM_OSS_SECRET","sharedScope":"BU"}
            """, admin);
        assertThat(created.at("/code").asInt()).isZero();
        String sourceId = created.at("/data/sourceId").asText();
        assertThat(created.at("/data/status").asText()).isEqualTo("UNCONFIGURED");
        assertThat(created.toString()).doesNotContain("accessKeySecret");

        JsonNode activateRejected = postJson("/api/v1/data-sources/" + sourceId + "/activate", "trace-f009-dsrc-activate-reject", "{}", admin);
        assertThat(activateRejected.at("/code").asInt()).isEqualTo(40900);
        assertThat(activateRejected.at("/message").asText()).contains("DATA_SOURCE_TEST_FAILED");

        JsonNode tested = postJson("/api/v1/data-sources/" + sourceId + "/test", "trace-f009-dsrc-test", "{}", admin);
        assertThat(tested.at("/data/result").asText()).isEqualTo("FAILED");
        assertThat(tested.at("/data/diagnosticCode").asText()).isEqualTo("DATA_SOURCE_UNCONFIGURED");

        JsonNode syncRejected = postJson("/api/v1/data-source-sync-tasks", "trace-f009-dsrc-sync-reject", """
            {"sourceId":"%s","name":"未激活数据源同步","scheduleMode":"MANUAL"}
            """.formatted(sourceId), admin);
        assertThat(syncRejected.at("/code").asInt()).isEqualTo(40900);
        assertThat(syncRejected.at("/message").asText()).contains("DATA_SOURCE_NOT_ACTIVE");

        JsonNode importRejected = postJson("/api/v1/datasets", "trace-f009-dsrc-import-reject", """
            {"name":"非法导入数据集","datasetType":"RAW","dataType":"IMAGE","tenantId":"TENANT-CABIN","accessLevel":"TEAM","sourceId":"%s"}
            """.formatted(sourceId), admin);
        assertThat(importRejected.at("/code").asInt()).isEqualTo(40900);
        assertThat(importRejected.at("/message").asText()).contains("DATA_SOURCE_NOT_ACTIVE");

        JsonNode sandbox = postJson("/api/v1/data-sources", "trace-f009-dsrc-sandbox", """
            {"name":"Sandbox MinIO","sourceType":"OBJECT_STORAGE","tenantId":"TENANT-CABIN","endpoint":"minio.sandbox.internal","port":9000,"databaseName":"bucket-a","credentialMode":"SECRET_REF","secretRef":"secret://sandbox/minio","sharedScope":"BU"}
            """, admin);
        String sandboxId = sandbox.at("/data/sourceId").asText();
        JsonNode sandboxTest = postJson("/api/v1/data-sources/" + sandboxId + "/test", "trace-f009-dsrc-sandbox-test", "{}", admin);
        assertThat(sandboxTest.at("/data/diagnosticCode").asText()).isEqualTo("OK");
        JsonNode activated = postJson("/api/v1/data-sources/" + sandboxId + "/activate", "trace-f009-dsrc-activate", "{}", admin);
        assertThat(activated.at("/data/status").asText()).isEqualTo("ACTIVE");

        JsonNode syncCreated = postJson("/api/v1/data-source-sync-tasks", "trace-f009-dsrc-sync-create", """
            {"sourceId":"%s","name":"Sandbox 同步任务","scheduleMode":"MANUAL"}
            """.formatted(sandboxId), admin);
        assertThat(syncCreated.at("/data/status").asText()).isEqualTo("PAUSED");

        JsonNode audit = getJson("/api/v1/platform/audit-logs?action=DATA_SOURCE_ACTIVATED", "trace-f009-dsrc-audit", admin);
        assertThat(audit.at("/data/items/0/action").asText()).isEqualTo("DATA_SOURCE_ACTIVATED");
    }


    @Test
    void sandboxConnectorsImportDatasetsForAllReservedSourceTypes() throws Exception {
        // TASK-data-source-dataset-management AC-11
        String admin = login("admin", "YF");
        String[] types = {"RELATIONAL_DB", "API", "STREAM", "TIME_SERIES", "INDUSTRIAL_PROTOCOL"};
        for (String type : types) {
            JsonNode created = postJson("/api/v1/data-sources", "trace-f009-connector-" + type, """
                {"name":"Sandbox %s","sourceType":"%s","tenantId":"TENANT-CABIN","endpoint":"%s.sandbox.internal","port":8080,"databaseName":"%s_scope","credentialMode":"SECRET_REF","secretRef":"secret://sandbox/%s","sharedScope":"BU"}
                """.formatted(type, type, type.toLowerCase().replace('_', '-'), type.toLowerCase(), type.toLowerCase()), admin);
            String sourceId = created.at("/data/sourceId").asText();
            JsonNode tested = postJson("/api/v1/data-sources/" + sourceId + "/test", "trace-f009-connector-test-" + type, "{}", admin);
            assertThat(tested.at("/data/diagnosticCode").asText()).isEqualTo("OK");
            assertThat(tested.at("/data/diagnosticMessage").asText()).contains(type);
            JsonNode activated = postJson("/api/v1/data-sources/" + sourceId + "/activate", "trace-f009-connector-activate-" + type, "{}", admin);
            assertThat(activated.at("/data/status").asText()).isEqualTo("ACTIVE");

            JsonNode task = postJson("/api/v1/data-source-sync-tasks", "trace-f009-connector-task-" + type, """
                {"sourceId":"%s","name":"%s sandbox ??","scheduleMode":"MANUAL","syncScope":"%s_scope"}
                """.formatted(sourceId, type, type.toLowerCase()), admin);
            String taskId = task.at("/data/taskId").asText();
            JsonNode run = postJson("/api/v1/data-source-sync-tasks/" + taskId + "/run", "trace-f009-connector-run-" + type, "{}", admin);
            assertThat(run.at("/data/status").asText()).isEqualTo("SUCCEEDED");
            assertThat(run.at("/data/lastResult").asText()).isEqualTo("SUCCESS");
            assertThat(run.at("/data/diagnosticMessage").asText()).contains("SANDBOX_" + type + "_IMPORT_READY");
            String datasetId = run.at("/data/targetDatasetId").asText();
            assertThat(datasetId).startsWith("DATASET-");

            JsonNode detail = getJson("/api/v1/datasets/" + datasetId, "trace-f009-connector-detail-" + type, admin);
            assertThat(detail.at("/data/files").size()).isGreaterThanOrEqualTo(1);
            assertThat(detail.at("/data/lineage").size()).isGreaterThanOrEqualTo(1);
            assertThat(detail.at("/data/files/0/status").asText()).isEqualTo("BOUND");
            assertThat(detail.at("/data/dataset/status").asText()).isEqualTo("ACTIVE");
        }
    }

    @Test
    void dataStandardizationProfilesAndRunsOnDatasetsFromDifferentSources() throws Exception {
        // TASK-data-standardization-pipeline AC-01 AC-02 AC-03 AC-04 AC-05
        String admin = login("admin", "YF");
        JsonNode overview = getJson("/api/v1/data-standards/overview", "trace-f010-standard-overview", admin);
        assertThat(overview.at("/code").asInt()).isZero();
        assertThat(overview.at("/data/stats/datasetCount").asLong()).isGreaterThanOrEqualTo(2);
        assertThat(overview.at("/data/profiles").findValuesAsText("dataType")).contains("IMAGE", "TEXT");

        JsonNode profile = getJson("/api/v1/datasets/DATASET-WORKORDER-TEXT/standard-profile", "trace-f010-standard-profile", admin);
        assertThat(profile.at("/data/profileStatus").asText()).isEqualTo("PROFILED");
        assertThat(profile.at("/data/fields").findValuesAsText("standardField")).contains("work_order_no", "fault_description");

        JsonNode created = postJson("/api/v1/data-standard-tasks", "trace-f010-standard-task-create", """
            {"datasetId":"DATASET-WORKORDER-TEXT","name":"工单文本自动标准化","standardProfile":"WORKORDER_TEXT_STANDARD"}
            """, admin);
        assertThat(created.at("/data/status").asText()).isEqualTo("READY");
        String taskId = created.at("/data/taskId").asText();

        JsonNode run = postJson("/api/v1/data-standard-tasks/" + taskId + "/run", "trace-f010-standard-task-run", "{}", admin);
        assertThat(run.at("/data/status").asText()).isEqualTo("SUCCEEDED");
        assertThat(run.at("/data/outputDatasetId").asText()).startsWith("DATASET-");
        assertThat(run.at("/data/qualityScoreAfter").asInt()).isGreaterThanOrEqualTo(90);

        JsonNode detail = getJson("/api/v1/datasets/" + run.at("/data/outputDatasetId").asText(), "trace-f010-standard-output", admin);
        assertThat(detail.at("/data/dataset/datasetType").asText()).isEqualTo("PREPROCESSED");
        assertThat(detail.at("/data/files/0/fileRole").asText()).isEqualTo("STANDARDIZED");
        assertThat(detail.at("/data/lineage/0/transformType").asText()).isEqualTo("STANDARDIZATION");
    }

    @Test
    void pipelineEditorPersistsDagVersionsRunsAndOperatorReview() throws Exception {
        // TASK-pipeline-editor-operator-marketplace AC-01 AC-02 AC-03 AC-04 AC-05 AC-06 AC-07
        String admin = login("admin", "YF");

        JsonNode operators = getJson("/api/v1/operators?keyword=归一化", "trace-f011-operators", admin);
        assertThat(operators.at("/code").asInt()).isZero();
        assertThat(operators.at("/data/items").findValuesAsText("name")).contains("归一化");
        assertThat(operators.at("/data/stats/total").asLong()).isGreaterThanOrEqualTo(1);

        JsonNode list = getJson("/api/v1/pipelines", "trace-f011-pipelines", admin);
        assertThat(list.at("/data/items").findValuesAsText("name")).contains("图像预处理 Pipeline");

        JsonNode detail = getJson("/api/v1/pipelines/PIPE-IMG-PREP", "trace-f011-pipeline-detail", admin);
        assertThat(detail.at("/data/nodes").size()).isGreaterThanOrEqualTo(4);
        assertThat(detail.at("/data/variables").findValuesAsText("name")).contains("batch_size");
        assertThat(detail.at("/data/validation/valid").asBoolean()).isTrue();

        JsonNode updated = putJson("/api/v1/pipelines/PIPE-IMG-PREP", "trace-f011-pipeline-save", """
            {
              "name":"图像预处理 Pipeline",
              "tenantId":"TENANT-CABIN",
              "description":"E2E 保存后的 Pipeline",
              "nodes":[
                {"nodeId":"read","operatorId":"OP-READ-DATASET","label":"读取焊缝数据集","positionX":90,"positionY":150,"configJson":"{\\"datasetId\\":\\"DATASET-WELD-DEFECT\\"}"},
                {"nodeId":"resize","operatorId":"OP-IMAGE-RESIZE","label":"图像缩放","positionX":320,"positionY":155,"configJson":"{\\"width\\":1024,\\"height\\":1024}"},
                {"nodeId":"normalize","operatorId":"OP-NORMALIZE","label":"归一化","positionX":560,"positionY":155,"configJson":"{\\"profile\\":\\"${profile}\\"}"}
              ],
              "edges":[
                {"edgeId":"EDGE-read-resize","sourceNodeId":"read","targetNodeId":"resize","edgeType":"DATA"},
                {"edgeId":"EDGE-resize-normalize","sourceNodeId":"resize","targetNodeId":"normalize","edgeType":"DATA"}
              ],
              "variables":[
                {"name":"profile","valueType":"STRING","valueKind":"LITERAL","valueJson":"INDUSTRIAL_VISUAL_STANDARD","required":true},
                {"name":"operator_secret","valueType":"STRING","valueKind":"SECRET_REF","valueJson":"secret://TODO_CONFIRM_PIPELINE_OPERATOR_SECRET","required":false}
              ]
            }
            """, admin);
        assertThat(updated.at("/data/pipeline/status").asText()).isEqualTo("VALIDATED");
        assertThat(updated.at("/data/nodes/0/positionX").asInt()).isEqualTo(90);

        JsonNode version = postJson("/api/v1/pipelines/PIPE-IMG-PREP/versions", "trace-f011-pipeline-version", """
            {"versionName":"v1.1","note":"E2E 保存节点位置与变量"}
            """, admin);
        assertThat(version.at("/data/versionName").asText()).isEqualTo("v1.1");

        JsonNode run = postJson("/api/v1/pipelines/PIPE-IMG-PREP/runs", "trace-f011-pipeline-run", """
            {"triggerMode":"MANUAL","sampleDatasetId":"DATASET-WELD-DEFECT"}
            """, admin);
        assertThat(run.at("/data/run/status").asText()).isEqualTo("SUCCEEDED");
        assertThat(run.at("/data/run/outputDatasetId").asText()).startsWith("DATASET-PIPE-");
        assertThat(run.at("/data/nodeRuns").size()).isGreaterThanOrEqualTo(3);

        JsonNode outputDetail = getJson("/api/v1/datasets/" + run.at("/data/run/outputDatasetId").asText(), "trace-f011-pipeline-output", admin);
        assertThat(outputDetail.at("/data/dataset/datasetType").asText()).isEqualTo("PREPROCESSED");
        assertThat(outputDetail.at("/data/files/0/fileRole").asText()).isEqualTo("PIPELINE_OUTPUT");
        assertThat(outputDetail.at("/data/lineage").findValuesAsText("transformType")).contains("PIPELINE");

        JsonNode custom = postJson("/api/v1/operators/custom", "trace-f011-operator-create", """
            {"name":"E2E HTTP 算子","category":"自定义算子","stage":"扩展","description":"E2E 自定义 HTTP 算子","parameterSchemaJson":"{\\"type\\":\\"object\\"}","endpoint":"TODO_CONFIRM_OPERATOR_HTTP_ENDPOINT","credentialRef":"secret://TODO_CONFIRM_OPERATOR_SECRET","timeoutSeconds":30,"concurrencyLimit":2}
            """, admin);
        String operatorId = custom.at("/data/operator/operatorId").asText();
        assertThat(custom.at("/data/operator/status").asText()).isEqualTo("DRAFT");

        JsonNode submitted = postJson("/api/v1/operators/" + operatorId + "/submit-review", "trace-f011-operator-submit", "{}", admin);
        assertThat(submitted.at("/data/operator/status").asText()).isEqualTo("SUBMITTED");

        JsonNode approved = postJson("/api/v1/operators/" + operatorId + "/approve", "trace-f011-operator-approve", """
            {"reason":"E2E 安全策略已核对"}
            """, admin);
        assertThat(approved.at("/data/operator/status").asText()).isEqualTo("PUBLISHED");
        assertThat(approved.at("/data/reviews/0/status").asText()).isEqualTo("APPROVED");

        JsonNode audit = getJson("/api/v1/platform/audit-logs?action=PIPELINE_RUN_SUCCEEDED", "trace-f011-audit", admin);
        assertThat(audit.at("/data/items/0/action").asText()).isEqualTo("PIPELINE_RUN_SUCCEEDED");
    }

    @Test
    void pipelineEditorRejectsInvalidDagSecretsAndCrossBuAccess() throws Exception {
        // TASK-pipeline-editor-operator-marketplace AC-08
        String admin = login("admin", "YF");
        JsonNode invalid = putJson("/api/v1/pipelines/PIPE-IMG-PREP", "trace-f011-invalid-cycle", """
            {
              "name":"非法环路 Pipeline",
              "tenantId":"TENANT-CABIN",
              "nodes":[
                {"nodeId":"a","operatorId":"OP-DATA-DEDUP","label":"A","positionX":1,"positionY":1,"configJson":"{\\"keyStrategy\\":\\"sha256\\"}"},
                {"nodeId":"b","operatorId":"OP-NORMALIZE","label":"B","positionX":2,"positionY":2,"configJson":"{\\"profile\\":\\"INDUSTRIAL_VISUAL_STANDARD\\"}"}
              ],
              "edges":[
                {"edgeId":"e1","sourceNodeId":"a","targetNodeId":"b","edgeType":"DATA"},
                {"edgeId":"e2","sourceNodeId":"b","targetNodeId":"a","edgeType":"DATA"}
              ],
              "variables":[]
            }
            """, admin);
        assertThat(invalid.at("/code").asInt()).isEqualTo(42200);
        assertThat(invalid.at("/message").asText()).contains("Pipeline");

        JsonNode secretRejected = postJson("/api/v1/operators/custom", "trace-f011-secret-reject", """
            {"name":"Bad Secret Operator","category":"自定义算子","stage":"扩展","parameterSchemaJson":"{\\"type\\":\\"object\\"}","endpoint":"https://example.test?token=plain","credentialRef":"password=plain"}
            """, admin);
        assertThat(secretRejected.at("/code").asInt()).isEqualTo(42200);
        assertThat(secretRejected.at("/message").asText()).contains("SECRET");

        String qe = login("qeuser", "QE");
        JsonNode crossBu = getJson("/api/v1/pipelines/PIPE-IMG-PREP", "trace-f011-cross-bu", qe);
        assertThat(crossBu.at("/code").asInt()).isEqualTo(40400);
    }

    @Test
    void annotationIntegrationManagesTemplatesTasksWorkReviewAndPublication() throws Exception {
        // TASK-annotation-integration AC-01 AC-02 AC-03 AC-04 AC-05 AC-06 AC-07
        String admin = login("admin", "YF");
        JsonNode overview = getJson("/api/v1/annotation/overview", "trace-f012-overview", admin);
        assertThat(overview.at("/code").asInt()).isZero();
        assertThat(overview.at("/data/tasks").findValuesAsText("name")).contains("Q2焊缝检测图像标注");
        assertThat(overview.at("/data/templates").findValuesAsText("status")).contains("PUBLISHED");

        JsonNode createdTemplate = postJson("/api/v1/annotation/label-templates", "trace-f012-template-create", """
            {"name":"单测视觉模板","tenantId":"TENANT-CABIN","scene":"OBJECT_DETECTION","labelType":"BOUNDING_BOX","labelSchemaJson":"{\\"labels\\":[\\"裂纹\\"]}"}
            """, admin);
        assertThat(createdTemplate.at("/data/status").asText()).isEqualTo("DRAFT");
        String templateId = createdTemplate.at("/data/templateId").asText();

        JsonNode publishedTemplate = postJson("/api/v1/annotation/label-templates/" + templateId + "/publish", "trace-f012-template-publish", "{}", admin);
        assertThat(publishedTemplate.at("/data/status").asText()).isEqualTo("PUBLISHED");

        JsonNode config = getJson("/api/v1/annotation/label-templates/" + templateId + "/label-studio-config", "trace-f012-template-config", admin);
        assertThat(config.at("/data/configXml").asText()).contains("<View>");

        JsonNode createdTask = postJson("/api/v1/annotation/tasks", "trace-f012-task-create", """
            {"name":"F012 单测标注任务","sourceDatasetId":"DATASET-WELD-DEFECT","sourceVersionId":"DVER-WELD-001","templateId":"%s","scene":"OBJECT_DETECTION","reviewEnabled":true,"prelabelEnabled":true,"labelStudioEnabled":true,"assigneeIds":["USR-ANNOTATOR"],"reviewerIds":["USR-BU-CABIN"],"prelabelModelSource":"TODO_CONFIRM_PRELABEL_MODEL_SOURCE"}
            """.formatted(templateId), admin);
        assertThat(createdTask.at("/data/task/status").asText()).isEqualTo("IN_PROGRESS");
        String taskId = createdTask.at("/data/task/taskId").asText();

        JsonNode labelStudio = postJson("/api/v1/annotation/tasks/" + taskId + "/label-studio/sync-project", "trace-f012-labelstudio-sync", "{}", admin);
        assertThat(labelStudio.at("/data/configStatus").asText()).isEqualTo("UNCONFIGURED");
        assertThat(labelStudio.at("/data/diagnosticMessage").asText()).contains("TODO_CONFIRM_LABEL_STUDIO_BASE_URL");

        JsonNode workItems = getJson("/api/v1/annotation/tasks/" + taskId + "/work-items", "trace-f012-work-items", admin);
        String firstWorkItemId = workItems.at("/data/0/workItemId").asText();
        JsonNode draft = postJson("/api/v1/annotation/work-items/" + firstWorkItemId + "/draft", "trace-f012-work-draft", """
            {"annotationJson":"{\\"boxes\\":[{\\"label\\":\\"裂纹\\"}]}"}
            """, admin);
        assertThat(draft.at("/data/status").asText()).isEqualTo("DRAFT");
        JsonNode submitted = postJson("/api/v1/annotation/work-items/" + firstWorkItemId + "/submit", "trace-f012-work-submit", """
            {"annotationJson":"{\\"boxes\\":[{\\"label\\":\\"裂纹\\"}]}"}
            """, admin);
        assertThat(submitted.at("/data/status").asText()).isEqualTo("REVIEW_PENDING");

        JsonNode reviews = getJson("/api/v1/annotation/review-items?taskId=" + taskId, "trace-f012-review-list", admin);
        String reviewId = reviews.at("/data/0/reviewItemId").asText();
        JsonNode approved = postJson("/api/v1/annotation/review-items/" + reviewId + "/approve", "trace-f012-review-approve", "{}", admin);
        assertThat(approved.at("/data/status").asText()).isEqualTo("APPROVED");

        JsonNode detailAfterFirstApprove = getJson("/api/v1/annotation/tasks/" + taskId, "trace-f012-task-detail-after-approve", admin);
        for (JsonNode item : detailAfterFirstApprove.at("/data/workItems")) {
            if (!"APPROVED".equals(item.at("/status").asText())) {
                String itemId = item.at("/workItemId").asText();
                postJson("/api/v1/annotation/work-items/" + itemId + "/submit", "trace-f012-submit-" + itemId, """
                    {"annotationJson":"{\\"boxes\\":[{\\"label\\":\\"裂纹\\"}]}"}
                    """, admin);
                JsonNode pending = getJson("/api/v1/annotation/review-items?taskId=" + taskId + "&status=PENDING", "trace-f012-pending-" + itemId, admin);
                String pendingReviewId = pending.at("/data/0/reviewItemId").asText();
                postJson("/api/v1/annotation/review-items/" + pendingReviewId + "/approve", "trace-f012-approve-" + itemId, "{}", admin);
            }
        }

        JsonNode quality = postJson("/api/v1/annotation/tasks/" + taskId + "/quality-check", "trace-f012-quality", "{}", admin);
        assertThat(quality.at("/data/qualityStatus").asText()).isEqualTo("PASSED");
        JsonNode published = postJson("/api/v1/annotation/tasks/" + taskId + "/publish-dataset", "trace-f012-publish", "{}", admin);
        assertThat(published.at("/data/outputDatasetId").asText()).startsWith("DATASET-ANN-");
        JsonNode output = getJson("/api/v1/datasets/" + published.at("/data/outputDatasetId").asText(), "trace-f012-output-dataset", admin);
        assertThat(output.at("/data/dataset/datasetType").asText()).isEqualTo("ANNOTATED");
        assertThat(output.at("/data/lineage").findValuesAsText("transformType")).contains("ANNOTATION");
    }

    @Test
    void annotationIntegrationRejectsInactiveDatasetDraftTemplateSelfReviewAndCrossBu() throws Exception {
        // TASK-annotation-integration AC-02 AC-05 AC-08
        String admin = login("admin", "YF");
        JsonNode inactiveDataset = postJson("/api/v1/datasets", "trace-f012-inactive-dataset", """
            {"name":"F012 非活动数据集","datasetType":"RAW","dataType":"IMAGE","tenantId":"TENANT-CABIN","accessLevel":"TEAM","tags":["F012"],"recordCount":5,"sourceId":"DSRC-CABIN-MINIO"}
            """, admin);
        JsonNode inactiveRejected = postJson("/api/v1/annotation/tasks", "trace-f012-inactive-reject", """
            {"name":"非活动数据集任务","sourceDatasetId":"%s","templateId":"LT-WELD-BBOX","scene":"OBJECT_DETECTION","assigneeIds":["USR-ANNOTATOR"],"reviewerIds":["USR-BU-CABIN"]}
            """.formatted(inactiveDataset.at("/data/dataset/datasetId").asText()), admin);
        assertThat(inactiveRejected.at("/code").asInt()).isEqualTo(42200);
        assertThat(inactiveRejected.at("/message").asText()).contains("DAT-009");

        JsonNode draftTemplateRejected = postJson("/api/v1/annotation/tasks", "trace-f012-draft-template-reject", """
            {"name":"草稿模板任务","sourceDatasetId":"DATASET-WORKORDER-TEXT","sourceVersionId":"DVER-TEXT-001","templateId":"LT-TEXT-INTENT-DRAFT","scene":"TEXT_LABELING","assigneeIds":["USR-ANNOTATOR"],"reviewerIds":["USR-BU-CABIN"]}
            """, admin);
        assertThat(draftTemplateRejected.at("/code").asInt()).isEqualTo(42200);
        assertThat(draftTemplateRejected.at("/message").asText()).contains("DAT-003");

        JsonNode selfReviewRejected = postJson("/api/v1/annotation/tasks", "trace-f012-self-review-reject", """
            {"name":"自审任务","sourceDatasetId":"DATASET-WELD-DEFECT","sourceVersionId":"DVER-WELD-001","templateId":"LT-WELD-BBOX","scene":"OBJECT_DETECTION","reviewEnabled":true,"assigneeIds":["USR-ANNOTATOR"],"reviewerIds":["USR-ANNOTATOR"]}
            """, admin);
        assertThat(selfReviewRejected.at("/code").asInt()).isEqualTo(42200);
        assertThat(selfReviewRejected.at("/message").asText()).contains("DAT-004");

        String qe = login("qeuser", "QE");
        JsonNode crossBu = getJson("/api/v1/annotation/tasks/ANN-WELD-Q2", "trace-f012-cross-bu", qe);
        assertThat(crossBu.at("/code").asInt()).isEqualTo(40400);
    }

    @Test
    void datasetLifecycleBlocksUnconfiguredSafetyAndImmutablePublishedVersion() throws Exception {
        // TASK-data-source-dataset-management AC-03 AC-04 AC-05 AC-06 AC-09
        String admin = login("admin", "YF");
        JsonNode list = getJson("/api/v1/datasets", "trace-f009-datasets", admin);
        assertThat(list.at("/code").asInt()).isZero();
        assertThat(list.at("/data/stats/total").asLong()).isGreaterThanOrEqualTo(2);
        assertThat(list.at("/data/items").findValuesAsText("name")).contains("焊缝缺陷检测数据集");

        JsonNode created = postJson("/api/v1/datasets", "trace-f009-dataset-create", """
            {"name":"单元测试数据集","datasetType":"RAW","dataType":"IMAGE","tenantId":"TENANT-CABIN","accessLevel":"TEAM","tags":["单测","图像"],"description":"F009 test","recordCount":10,"sourceId":"DSRC-CABIN-MINIO"}
            """, admin);
        assertThat(created.at("/data/dataset/status").asText()).isEqualTo("DRAFT");
        String datasetId = created.at("/data/dataset/datasetId").asText();
        String versionId = created.at("/data/versions/0/versionId").asText();

        JsonNode attached = postJson("/api/v1/datasets/" + datasetId + "/versions/" + versionId + "/files", "trace-f009-file-attach", """
            {"fileId":"FILE-DATASET-WELD-001","fileRole":"RAW"}
            """, admin);
        assertThat(attached.at("/data/status").asText()).isEqualTo("BOUND");

        JsonNode publishBlocked = postJson("/api/v1/datasets/" + datasetId + "/versions/" + versionId + "/publish", "trace-f009-publish-block", "{}", admin);
        assertThat(publishBlocked.at("/code").asInt()).isEqualTo(42200);
        assertThat(publishBlocked.at("/message").asText()).contains("DATASET_SECURITY_PENDING");

        JsonNode immutable = putJson("/api/v1/datasets/DATASET-WELD-DEFECT", "trace-f009-immutable", """
            {"name":"非法修改已发布数据集","accessLevel":"TEAM","tags":["bad"]}
            """, admin);
        assertThat(immutable.at("/code").asInt()).isEqualTo(40900);
        assertThat(immutable.at("/message").asText()).contains("DATASET_VERSION_IMMUTABLE");

        JsonNode detail = getJson("/api/v1/datasets/DATASET-WELD-DEFECT", "trace-f009-detail", admin);
        assertThat(detail.at("/data/lineage/0/sourceType").asText()).isEqualTo("DATA_SOURCE");
        assertThat(detail.at("/data/previewStatus").asText()).isEqualTo("UNSUPPORTED");
    }

    @Test
    void restrictedDatasetRequiresGrantAndReferenceUsesBuIsolation() throws Exception {
        // TASK-data-source-dataset-management AC-07 AC-08 AC-10
        String annotator = login("annotator", "CABIN");
        JsonNode restricted = getJson("/api/v1/datasets/DATASET-WELD-DEFECT", "trace-f009-restricted", annotator);
        assertThat(restricted.at("/code").asInt()).isEqualTo(40300);
        assertThat(restricted.at("/message").asText()).contains("DATASET_ACCESS_REQUIRED");

        JsonNode request = postJson("/api/v1/datasets/DATASET-WELD-DEFECT/access-requests", "trace-f009-access-request", """
            {"purpose":"训练焊缝缺陷模型"}
            """, annotator);
        assertThat(request.at("/data/status").asText()).isEqualTo("PENDING");
        String requestId = request.at("/data/requestId").asText();

        String admin = login("admin", "YF");
        JsonNode grant = putJson("/api/v1/dataset-access-requests/" + requestId + "/approve", "trace-f009-access-approve", "{}", admin);
        assertThat(grant.at("/data/status").asText()).isEqualTo("ACTIVE");

        JsonNode reference = getJson("/api/v1/dataset-references?datasetId=DATASET-WELD-DEFECT", "trace-f009-reference", annotator);
        assertThat(reference.at("/code").asInt()).isZero();
        assertThat(reference.at("/data/usable").asBoolean()).isTrue();

        String qe = login("qeuser", "QE");
        JsonNode crossBu = getJson("/api/v1/datasets/DATASET-WELD-DEFECT", "trace-f009-cross-bu", qe);
        assertThat(crossBu.at("/code").asInt()).isEqualTo(40400);
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
        if (response.statusCode() < 400) assertThat(response.headers().firstValue(TraceIdFilter.TRACE_HEADER)).isPresent();
        return objectMapper.readTree(response.body());
    }
}
