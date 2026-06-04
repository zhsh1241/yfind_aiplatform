package com.yf.smp.app.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yf.smp.app.web.TraceIdFilter;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ModelRegistryControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void taskModelRegistryFoundationShouldCreateVersionTransitionAccessAndDownload() throws Exception {
        // TASK-model-registry-foundation AC-01 AC-02 AC-03 AC-05 AC-06 AC-08 AC-09 AC-11 AC-12
        String keywordToken = "TASK-model-registry-foundation-" + UUID.randomUUID().toString().substring(0, 8);
        grantRole("USR-ANNOTATOR", "MODEL_TRAINER", "TENANT-CABIN");
        grantRolePermission("DATA_REVIEWER", "model:model:read");
        String admin = login("admin", "YF");
        String cabinBuAdmin = login("buadmin", "CABIN");
        String qeUser = login("qeuser", "QE");
        String modelTrainer = createSessionToken("USR-ANNOTATOR");

        seedModelFile(
            "FILE-MODEL-TASK-001",
            "TENANT-CABIN",
            "USR-BU-CABIN",
            "weld-model-v1.onnx",
            104857600L,
            "application/octet-stream"
        );

        JsonNode createdModel = postJson("/api/v1/models", "trace-f019-create-model", """
            {
              "name":"%s 焊缝检测模型",
              "description":"用于 F019 后端 TDD",
              "framework":"ONNX",
              "taskType":"OBJECT_DETECTION",
              "inputFormat":"image:640x640 RGB",
              "outputFormat":"bbox[class,score,x1,y1,x2,y2]",
              "runtimeRequirements":"{\\"python\\":\\"3.10\\"}",
              "tags":["焊缝","%s"],
              "scope":"BU",
              "source":"LOCAL_UPLOAD"
            }
            """.formatted(keywordToken, keywordToken), cabinBuAdmin);
        assertThat(createdModel.at("/code").asInt()).isZero();
        String modelId = createdModel.at("/data/modelId").asText();

        JsonNode listed = getJson("/api/v1/models?keyword=" + keywordToken + "&page=1&pageSize=20", "trace-f019-list-model", cabinBuAdmin);
        assertThat(listed.at("/code").asInt()).isZero();
        assertThat(listed.at("/data/total").asInt()).isEqualTo(1);
        assertThat(listed.at("/data/items/0/modelId").asText()).isEqualTo(modelId);
        assertThat(listed.at("/data/items/0/currentVersionId").isNull()).isTrue();

        JsonNode detailBeforeVersion = getJson("/api/v1/models/" + modelId, "trace-f019-detail-before-version", cabinBuAdmin);
        assertThat(detailBeforeVersion.at("/code").asInt()).isZero();
        assertThat(detailBeforeVersion.at("/data/modelId").asText()).isEqualTo(modelId);
        assertThat(detailBeforeVersion.at("/data/versions").isEmpty()).isTrue();
        assertThat(detailBeforeVersion.at("/data/auditEvents").toString()).contains("MODEL_VIEWED");

        JsonNode invalidEnumModel = postJson("/api/v1/models", "trace-f019-create-model-invalid-enum", """
            {
              "name":"TASK-model-registry-foundation 无效枚举模型",
              "description":"验证创建模型枚举白名单",
              "framework":"ONNX",
              "taskType":"CLASSIFICATION",
              "inputFormat":"image:224x224 RGB",
              "outputFormat":"class[score]",
              "runtimeRequirements":"{}",
              "tags":["非法枚举"],
              "scope":"BU",
              "source":"LOCAL_UPLOAD"
            }
            """, cabinBuAdmin);
        assertThat(invalidEnumModel.at("/code").asInt()).isEqualTo(40000);

        JsonNode createdVersion = postJson("/api/v1/models/" + modelId + "/versions", "trace-f019-create-version", """
            {
              "versionNo":"v1.0",
              "fileObjectId":"FILE-MODEL-TASK-001",
              "runtimeRequirements":"{\\"python\\":\\"3.10\\",\\"onnxruntime\\":\\"1.19\\"}",
              "metricsSummary":{"mAP50":0.91,"latencyMs":18},
              "evaluationStatus":"IMPORTED_PROOF",
              "evaluationProof":"EXT-EVAL-001",
              "setAsCurrent":true
            }
            """, cabinBuAdmin);
        assertThat(createdVersion.at("/code").asInt()).isZero();
        String versionId = createdVersion.at("/data/versionId").asText();
        assertThat(createdVersion.at("/data/permissionSummary/canManage").asBoolean()).isTrue();
        assertThat(createdVersion.at("/data/downloadAvailable").asBoolean()).isTrue();
        assertThat(createdVersion.at("/data/transitionActions/0").asText()).isEqualTo("TESTING");

        JsonNode illegalTransition = postJson("/api/v1/models/" + modelId + "/versions/" + versionId + "/transition", "trace-f019-transition-illegal", """
            {"targetStatus":"PRODUCTION","reason":"跳跃发布"}
            """, cabinBuAdmin);
        assertThat(illegalTransition.at("/code").asInt()).isEqualTo(42231);

        JsonNode testingTransition = postJson("/api/v1/models/" + modelId + "/versions/" + versionId + "/transition", "trace-f019-transition-testing", """
            {"targetStatus":"TESTING","reason":"进入测试"}
            """, cabinBuAdmin);
        assertThat(testingTransition.at("/code").asInt()).isZero();
        assertThat(testingTransition.at("/data/status").asText()).isEqualTo("TESTING");

        JsonNode productionTransition = postJson("/api/v1/models/" + modelId + "/versions/" + versionId + "/transition", "trace-f019-transition-production", """
            {"targetStatus":"PRODUCTION","reason":"导入证明后发布"}
            """, cabinBuAdmin);
        assertThat(productionTransition.at("/code").asInt()).isZero();
        assertThat(productionTransition.at("/data/status").asText()).isEqualTo("PRODUCTION");

        JsonNode trainerVisible = getJson("/api/v1/models?keyword=" + keywordToken + "&page=1&pageSize=20", "trace-f019-list-model-trainer", modelTrainer);
        assertThat(trainerVisible.at("/code").asInt()).isZero();
        assertThat(trainerVisible.at("/data/items/0/modelId").asText()).isEqualTo(modelId);
        assertThat(trainerVisible.at("/data/items/0/permissionSummary/canUseForTraining").asBoolean()).isTrue();
        assertThat(trainerVisible.at("/data/items/0/permissionSummary/canDownload").asBoolean()).isTrue();

        JsonNode crossBuBeforeGrant = getJson("/api/v1/models/" + modelId, "trace-f019-detail-cross-bu-before", qeUser);
        assertThat(crossBuBeforeGrant.at("/code").asInt()).isEqualTo(40304);

        JsonNode accessRequested = postJson("/api/v1/models/" + modelId + "/access-requests", "trace-f019-request-access", """
            {
              "versionId":"%s",
              "permission":"DOWNLOAD",
              "reason":"TASK-model-registry-foundation 跨 BU 下载验证",
              "expiresAt":"2026-12-31T23:59:59Z"
            }
            """.formatted(versionId), qeUser);
        assertThat(accessRequested.at("/code").asInt()).isZero();
        String requestId = accessRequested.at("/data/requestId").asText();
        assertThat(accessRequested.at("/data/status").asText()).isEqualTo("PENDING");
        JsonNode pendingAccessRequests = getJson("/api/v1/models/" + modelId + "/access-requests?status=PENDING", "trace-f019-list-pending-access", cabinBuAdmin);
        assertThat(pendingAccessRequests.at("/code").asInt()).isZero();
        assertThat(pendingAccessRequests.at("/data/0/requestId").asText()).isEqualTo(requestId);

        JsonNode downloadDenied = postJson("/api/v1/models/" + modelId + "/versions/" + versionId + "/download-url", "trace-f019-download-before-approve", "{}", qeUser);
        assertThat(downloadDenied.at("/code").asInt()).isEqualTo(40304);

        JsonNode secondVersion = postJson("/api/v1/models/" + modelId + "/versions", "trace-f019-create-version-second", """
            {
              "versionNo":"v1.1",
              "fileObjectId":"FILE-MODEL-TASK-001",
              "runtimeRequirements":"{\\"python\\":\\"3.10\\",\\"onnxruntime\\":\\"1.19\\"}",
              "metricsSummary":{"mAP50":0.88,"latencyMs":20},
              "evaluationStatus":"IMPORTED_PROOF",
              "evaluationProof":"EXT-EVAL-002",
              "setAsCurrent":false
            }
            """, cabinBuAdmin);
        assertThat(secondVersion.at("/code").asInt()).isZero();
        String secondVersionId = secondVersion.at("/data/versionId").asText();

        JsonNode mismatchedVersionAccessRequested = postJson("/api/v1/models/" + modelId + "/access-requests", "trace-f019-request-access-version-mismatch", """
            {
              "versionId":"%s",
              "permission":"DOWNLOAD",
              "reason":"不应允许把其他模型版本挂到当前模型申请",
              "expiresAt":"2026-12-31T23:59:59Z"
            }
            """.formatted(privateSeedVersionId()), qeUser);
        assertThat(mismatchedVersionAccessRequested.at("/code").asInt()).isEqualTo(40400);

        JsonNode approved = putJson("/api/v1/model-access-requests/" + requestId + "/approve", "trace-f019-approve-access", """
            {"reviewComment":"同意下载验证","expiresAt":"2026-12-31T23:59:59Z"}
            """, cabinBuAdmin);
        assertThat(approved.at("/code").asInt()).isZero();
        assertThat(approved.at("/data/status").asText()).isEqualTo("APPROVED");

        JsonNode crossBuAfterGrant = getJson("/api/v1/models/" + modelId, "trace-f019-detail-cross-bu-after", qeUser);
        assertThat(crossBuAfterGrant.at("/code").asInt()).isZero();
        assertThat(crossBuAfterGrant.at("/data/modelId").asText()).isEqualTo(modelId);
        assertThat(crossBuAfterGrant.at("/data/permissionSummary/canDownload").asBoolean()).isTrue();
        assertThat(crossBuAfterGrant.at("/data/versions").size()).isEqualTo(1);
        assertThat(crossBuAfterGrant.at("/data/versions/0/versionId").asText()).isEqualTo(versionId);
        assertThat(crossBuAfterGrant.at("/data/versions").toString()).contains("\"downloadAvailable\":true");
        assertThat(crossBuAfterGrant.at("/data/versions").toString()).doesNotContain(secondVersionId);
        assertThat(crossBuAfterGrant.at("/data/auditEvents").toString())
            .contains("MODEL_VERSION_CREATED")
            .contains("MODEL_VERSION_TRANSITIONED")
            .contains("MODEL_ACCESS_REQUESTED")
            .contains("MODEL_ACCESS_APPROVED");
        JsonNode grantedVersionDetail = getJson("/api/v1/models/" + modelId + "/versions/" + versionId, "trace-f019-version-detail-granted", qeUser);
        assertThat(grantedVersionDetail.at("/data/permissionSummary/canDownload").asBoolean()).isTrue();
        assertThat(grantedVersionDetail.at("/data/downloadAvailable").asBoolean()).isTrue();
        assertThat(grantedVersionDetail.at("/data/transitionActions").isEmpty()).isTrue();

        JsonNode secondVersionDetailDenied = getJson("/api/v1/models/" + modelId + "/versions/" + secondVersionId, "trace-f019-version-detail-second-denied", qeUser);
        assertThat(secondVersionDetailDenied.at("/code").asInt()).isEqualTo(40304);

        JsonNode secondDownloadDenied = postJson("/api/v1/models/" + modelId + "/versions/" + secondVersionId + "/download-url", "trace-f019-download-second-version-denied", "{}", qeUser);
        assertThat(secondDownloadDenied.at("/code").asInt()).isEqualTo(40304);

        JsonNode downloadReady = postJson("/api/v1/models/" + modelId + "/versions/" + versionId + "/download-url", "trace-f019-download-after-approve", "{}", qeUser);
        assertThat(downloadReady.at("/code").asInt()).isZero();
        assertThat(downloadReady.at("/data/expiresInSeconds").asInt()).isEqualTo(600);
        assertThat(downloadReady.at("/data/downloadUrl").asText()).isNotBlank();
        assertThat(downloadReady.toString()).doesNotContain("accessKey").doesNotContain("secretKey");

        JsonNode audit = getJson("/api/v1/platform/audit-logs?action=MODEL_DOWNLOADED", "trace-f019-audit-download", admin);
        assertThat(audit.at("/code").asInt()).isZero();
        assertThat(audit.at("/data/items/0/action").asText()).isEqualTo("MODEL_DOWNLOADED");

        JsonNode sameBuAccessRequested = postJson("/api/v1/models/" + modelId + "/access-requests", "trace-f019-request-access-same-bu", """
            {
              "versionId":"%s",
              "permission":"USE_FOR_TRAINING",
              "reason":"同 BU 用户不应走跨 BU 授权入口",
              "expiresAt":"2026-12-31T23:59:59Z"
            }
            """.formatted(versionId), cabinBuAdmin);
        assertThat(sameBuAccessRequested.at("/code").asInt()).isEqualTo(42242);

        seedModelFile(
            "FILE-MODEL-TASK-PRIVATE-001",
            "TENANT-CABIN",
            "USR-BU-CABIN",
            "private-model.onnx",
            524288L,
            "application/octet-stream"
        );
        JsonNode privateModel = postJson("/api/v1/models", "trace-f019-create-private-model", """
            {
              "name":"TASK-model-registry-foundation 私有模型",
              "description":"验证同 BU 非 owner 不可绕过 PRIVATE 可见性下载",
              "framework":"ONNX",
              "taskType":"IMAGE_CLASSIFICATION",
              "inputFormat":"image:224x224 RGB",
              "outputFormat":"class[score]",
              "runtimeRequirements":"{}",
              "tags":["私有"],
              "scope":"PRIVATE",
              "source":"LOCAL_UPLOAD"
            }
            """, cabinBuAdmin);
        assertThat(privateModel.at("/code").asInt()).isZero();
        String privateModelId = privateModel.at("/data/modelId").asText();
        JsonNode privateVersion = postJson("/api/v1/models/" + privateModelId + "/versions", "trace-f019-create-private-version", """
            {
              "versionNo":"v1.0",
              "fileObjectId":"FILE-MODEL-TASK-PRIVATE-001",
              "runtimeRequirements":"{}",
              "metricsSummary":{"accuracy":0.96},
              "evaluationStatus":"IMPORTED_PROOF",
              "evaluationProof":"EXT-EVAL-PRIVATE-001",
              "setAsCurrent":true
            }
            """, cabinBuAdmin);
        assertThat(privateVersion.at("/code").asInt()).isZero();
        String privateVersionId = privateVersion.at("/data/versionId").asText();
        JsonNode privateDetailDenied = getJson("/api/v1/models/" + privateModelId, "trace-f019-private-detail-denied", modelTrainer);
        assertThat(privateDetailDenied.at("/code").asInt()).isEqualTo(40304);
        JsonNode privateDownloadDenied = postJson("/api/v1/models/" + privateModelId + "/versions/" + privateVersionId + "/download-url", "trace-f019-private-download-denied", "{}", modelTrainer);
        assertThat(privateDownloadDenied.at("/code").asInt()).isEqualTo(40304);

        JsonNode privateAccessRequested = postJson("/api/v1/models/" + privateModelId + "/access-requests", "trace-f019-private-request-access", """
            {
              "versionId":"%s",
              "permission":"DOWNLOAD",
              "reason":"跨 BU 下载私有模型版本验证",
              "expiresAt":"2026-12-31T23:59:59Z"
            }
            """.formatted(privateVersionId), qeUser);
        assertThat(privateAccessRequested.at("/code").asInt()).isZero();
        JsonNode privateApproved = putJson("/api/v1/model-access-requests/" + privateAccessRequested.at("/data/requestId").asText() + "/approve", "trace-f019-private-approve-access", """
            {"reviewComment":"BU 管理员审批 owner 所属 BU 私有模型","expiresAt":"2026-12-31T23:59:59Z"}
            """, cabinBuAdmin);
        assertThat(privateApproved.at("/code").asInt()).isZero();
        assertThat(privateApproved.at("/data/status").asText()).isEqualTo("APPROVED");
        JsonNode privateDownloadReady = postJson("/api/v1/models/" + privateModelId + "/versions/" + privateVersionId + "/download-url", "trace-f019-private-download-ready", "{}", qeUser);
        assertThat(privateDownloadReady.at("/code").asInt()).isZero();
    }

    @Test
    void taskModelRegistryFoundationShouldExposeHubMenuToBuAdmin() throws Exception {
        // TASK-model-registry-foundation AC-02 AC-03：BU 管理员有模型中心业务权限时必须同时具备前端入口菜单权限。
        JsonNode login = loginResponse("buadmin", "CABIN");
        assertThat(login.at("/code").asInt()).isZero();
        assertThat(login.at("/data/user/permissions").toString())
            .contains("menu:hub")
            .contains("model:model:read")
            .contains("model:model:write")
            .contains("model:version:write");
        assertThat(login.at("/data/user/menuPermissions").toString()).contains("hub");
    }

    @Test
    void taskModelRegistryFoundationShouldListVisibleModelsRegardlessOfCurrentVersion() throws Exception {
        // TASK-model-registry-foundation AC-01 AC-10
        String keywordToken = "TASK-model-registry-foundation-list-" + UUID.randomUUID().toString().substring(0, 8);
        String cabinBuAdmin = login("buadmin", "CABIN");

        seedModelFile(
            "FILE-MODEL-LIST-AVAILABLE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
            "TENANT-CABIN",
            "USR-BU-CABIN",
            "available-model.onnx",
            1048576L,
            "application/octet-stream"
        );
        seedModelFile(
            "FILE-MODEL-LIST-DEPRECATED-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
            "TENANT-CABIN",
            "USR-BU-CABIN",
            "deprecated-model.onnx",
            1048576L,
            "application/octet-stream"
        );

        JsonNode draftModel = postJson("/api/v1/models", "trace-f019-list-filter-draft-model", """
            {
              "name":"%s draft",
              "description":"无当前版本模型仍应进入模型中心列表",
              "framework":"ONNX",
              "taskType":"IMAGE_CLASSIFICATION",
              "inputFormat":"image:224x224 RGB",
              "outputFormat":"class[score]",
              "runtimeRequirements":"{}",
              "tags":["%s","draft"],
              "scope":"BU",
              "source":"LOCAL_UPLOAD"
            }
            """.formatted(keywordToken, keywordToken), cabinBuAdmin);
        assertThat(draftModel.at("/code").asInt()).isZero();
        String draftModelId = draftModel.at("/data/modelId").asText();

        JsonNode availableModel = postJson("/api/v1/models", "trace-f019-list-filter-available-model", """
            {
              "name":"%s available",
              "description":"当前版本可用模型应进入列表",
              "framework":"ONNX",
              "taskType":"IMAGE_CLASSIFICATION",
              "inputFormat":"image:224x224 RGB",
              "outputFormat":"class[score]",
              "runtimeRequirements":"{}",
              "tags":["%s","available"],
              "scope":"BU",
              "source":"LOCAL_UPLOAD"
            }
            """.formatted(keywordToken, keywordToken), cabinBuAdmin);
        assertThat(availableModel.at("/code").asInt()).isZero();
        String availableModelId = availableModel.at("/data/modelId").asText();

        JsonNode availableVersion = postJson("/api/v1/models/" + availableModelId + "/versions", "trace-f019-list-filter-available-version", """
            {
              "versionNo":"v1.0",
              "fileObjectId":"%s",
              "runtimeRequirements":"{}",
              "metricsSummary":{"accuracy":0.92},
              "evaluationStatus":"IMPORTED_PROOF",
              "evaluationProof":"EXT-EVAL-LIST-001",
              "setAsCurrent":true
            }
            """.formatted(jdbc.queryForObject("SELECT file_id FROM platform_file_object WHERE object_key LIKE ?", String.class, "%available-model.onnx")), cabinBuAdmin);
        assertThat(availableVersion.at("/code").asInt()).isZero();

        JsonNode deprecatedModel = postJson("/api/v1/models", "trace-f019-list-filter-deprecated-model", """
            {
              "name":"%s deprecated",
              "description":"当前版本已废弃模型仍应进入模型中心列表",
              "framework":"ONNX",
              "taskType":"IMAGE_CLASSIFICATION",
              "inputFormat":"image:224x224 RGB",
              "outputFormat":"class[score]",
              "runtimeRequirements":"{}",
              "tags":["%s","deprecated"],
              "scope":"BU",
              "source":"LOCAL_UPLOAD"
            }
            """.formatted(keywordToken, keywordToken), cabinBuAdmin);
        assertThat(deprecatedModel.at("/code").asInt()).isZero();
        String deprecatedModelId = deprecatedModel.at("/data/modelId").asText();

        JsonNode deprecatedVersion = postJson("/api/v1/models/" + deprecatedModelId + "/versions", "trace-f019-list-filter-deprecated-version", """
            {
              "versionNo":"v1.0",
              "fileObjectId":"%s",
              "runtimeRequirements":"{}",
              "metricsSummary":{"accuracy":0.75},
              "evaluationStatus":"IMPORTED_PROOF",
              "evaluationProof":"EXT-EVAL-LIST-002",
              "setAsCurrent":true
            }
            """.formatted(jdbc.queryForObject("SELECT file_id FROM platform_file_object WHERE object_key LIKE ?", String.class, "%deprecated-model.onnx")), cabinBuAdmin);
        assertThat(deprecatedVersion.at("/code").asInt()).isZero();
        String deprecatedVersionId = deprecatedVersion.at("/data/versionId").asText();

        assertThat(postJson("/api/v1/models/" + deprecatedModelId + "/versions/" + deprecatedVersionId + "/transition", "trace-f019-list-filter-to-testing", """
            {"targetStatus":"TESTING","reason":"列表过滤准备"}
            """, cabinBuAdmin).at("/code").asInt()).isZero();
        assertThat(postJson("/api/v1/models/" + deprecatedModelId + "/versions/" + deprecatedVersionId + "/transition", "trace-f019-list-filter-to-production", """
            {"targetStatus":"PRODUCTION","reason":"列表过滤准备"}
            """, cabinBuAdmin).at("/code").asInt()).isZero();
        assertThat(postJson("/api/v1/models/" + deprecatedModelId + "/versions/" + deprecatedVersionId + "/transition", "trace-f019-list-filter-to-deprecated", """
            {"targetStatus":"DEPRECATED","reason":"列表过滤准备"}
            """, cabinBuAdmin).at("/code").asInt()).isZero();

        JsonNode listed = getJson("/api/v1/models?keyword=" + keywordToken + "&page=1&pageSize=20", "trace-f019-list-filter-query", cabinBuAdmin);
        assertThat(listed.at("/code").asInt()).isZero();
        assertThat(listed.at("/data/total").asInt()).isEqualTo(3);
        assertThat(listed.toString()).contains(availableModelId);
        assertThat(listed.toString()).contains(draftModelId);
        assertThat(listed.toString()).contains(deprecatedModelId);
        assertThat(listed.toString()).contains("\"currentVersionStatus\":\"DEPRECATED\"");
    }

    @Test
    void taskModelRegistryFoundationShouldAllowScopedRolePermissionsForWrites() throws Exception {
        // TASK-model-registry-foundation AC-02 AC-03 AC-06 AC-07
        grantRole("USR-ANNOTATOR", "MODEL_TRAINER", "TENANT-CABIN");
        grantRolePermission("MODEL_TRAINER", "model:model:manage");
        grantRolePermission("MODEL_TRAINER", "model:version:manage");
        grantRolePermission("MODEL_TRAINER", "model:version:delete");
        String cabinBuAdmin = login("buadmin", "CABIN");
        String modelTrainer = createSessionToken("USR-ANNOTATOR");

        seedModelFile(
            "FILE-MODEL-TASK-WRITE-001",
            "TENANT-CABIN",
            "USR-BU-CABIN",
            "role-write-model.onnx",
            1048576L,
            "application/octet-stream"
        );

        JsonNode createdModel = postJson("/api/v1/models", "trace-f019-role-write-create-model", """
            {
              "name":"TASK-model-registry-foundation 角色写权限模型",
              "description":"验证非 owner 角色权限写操作",
              "framework":"ONNX",
              "taskType":"IMAGE_CLASSIFICATION",
              "inputFormat":"image:224x224 RGB",
              "outputFormat":"class[score]",
              "runtimeRequirements":"{}",
              "tags":["角色权限"],
              "scope":"BU",
              "source":"LOCAL_UPLOAD"
            }
            """, cabinBuAdmin);
        assertThat(createdModel.at("/code").asInt()).isZero();
        String modelId = createdModel.at("/data/modelId").asText();

        JsonNode updatedModel = patchJson("/api/v1/models/" + modelId, "trace-f019-role-write-update-model", """
            {"description":"由具备 model:model:manage 的非 owner 更新"}
            """, modelTrainer);
        assertThat(updatedModel.at("/code").asInt()).isZero();
        assertThat(updatedModel.at("/data/permissionSummary/canManage").asBoolean()).isTrue();

        JsonNode createdVersion = postJson("/api/v1/models/" + modelId + "/versions", "trace-f019-role-write-create-version", """
            {
              "versionNo":"v-role-1",
              "fileObjectId":"FILE-MODEL-TASK-WRITE-001",
              "runtimeRequirements":"{}",
              "metricsSummary":{"accuracy":0.86},
              "evaluationStatus":"NONE",
              "setAsCurrent":true
            }
            """, modelTrainer);
        assertThat(createdVersion.at("/code").asInt()).isZero();
        assertThat(createdVersion.at("/data/permissionSummary/canManage").asBoolean()).isTrue();
        assertThat(createdVersion.at("/data/transitionActions/0").asText()).isEqualTo("TESTING");
        String versionId = createdVersion.at("/data/versionId").asText();

        JsonNode movedToTesting = postJson("/api/v1/models/" + modelId + "/versions/" + versionId + "/transition", "trace-f019-role-write-transition", """
            {"targetStatus":"TESTING","reason":"角色权限流转"}
            """, modelTrainer);
        assertThat(movedToTesting.at("/code").asInt()).isZero();
        assertThat(movedToTesting.at("/data/status").asText()).isEqualTo("TESTING");

        JsonNode deleted = deleteJson("/api/v1/models/" + modelId + "/versions/" + versionId, "trace-f019-role-write-delete", modelTrainer);
        assertThat(deleted.at("/code").asInt()).isZero();
        assertThat(deleted.at("/data/deleted").asBoolean()).isTrue();
    }

    @Test
    void taskModelRegistryFoundationShouldRequireReadPermissionForGrantedDetails() throws Exception {
        // TASK-model-registry-foundation AC-04 AC-05
        String cabinBuAdmin = login("buadmin", "CABIN");
        String qeUserWithoutRead = createNoModelReadUserSession();

        seedModelFile(
            "FILE-MODEL-TASK-NOREAD-001",
            "TENANT-CABIN",
            "USR-BU-CABIN",
            "no-read-model.onnx",
            1048576L,
            "application/octet-stream"
        );

        JsonNode createdModel = postJson("/api/v1/models", "trace-f019-no-read-create-model", """
            {
              "name":"TASK-model-registry-foundation 无读权限授权模型",
              "description":"验证 grant 不绕过基础 read 权限",
              "framework":"ONNX",
              "taskType":"IMAGE_CLASSIFICATION",
              "inputFormat":"image:224x224 RGB",
              "outputFormat":"class[score]",
              "runtimeRequirements":"{}",
              "tags":["无读权限"],
              "scope":"BU",
              "source":"LOCAL_UPLOAD"
            }
            """, cabinBuAdmin);
        assertThat(createdModel.at("/code").asInt()).isZero();
        String modelId = createdModel.at("/data/modelId").asText();

        JsonNode createdVersion = postJson("/api/v1/models/" + modelId + "/versions", "trace-f019-no-read-create-version", """
            {
              "versionNo":"v1.0",
              "fileObjectId":"FILE-MODEL-TASK-NOREAD-001",
              "runtimeRequirements":"{}",
              "metricsSummary":{"accuracy":0.80},
              "evaluationStatus":"IMPORTED_PROOF",
              "evaluationProof":"EXT-EVAL-NOREAD-001",
              "setAsCurrent":true
            }
            """, cabinBuAdmin);
        assertThat(createdVersion.at("/code").asInt()).isZero();
        String versionId = createdVersion.at("/data/versionId").asText();

        JsonNode accessRequested = postJson("/api/v1/models/" + modelId + "/access-requests", "trace-f019-no-read-request-access", """
            {
              "versionId":"%s",
              "permission":"VIEW",
              "reason":"授权存在但角色无 model:model:read",
              "expiresAt":"2026-12-31T23:59:59Z"
            }
            """.formatted(versionId), qeUserWithoutRead);
        assertThat(accessRequested.at("/code").asInt()).isZero();
        String requestId = accessRequested.at("/data/requestId").asText();
        JsonNode approved = putJson("/api/v1/model-access-requests/" + requestId + "/approve", "trace-f019-no-read-approve-access", """
            {"reviewComment":"同意验证基础 read 权限","expiresAt":"2026-12-31T23:59:59Z"}
            """, cabinBuAdmin);
        assertThat(approved.at("/code").asInt()).isZero();

        JsonNode detailDenied = getJson("/api/v1/models/" + modelId, "trace-f019-no-read-detail-denied", qeUserWithoutRead);
        assertThat(detailDenied.at("/code").asInt()).isEqualTo(40300);

        JsonNode versionDenied = getJson("/api/v1/models/" + modelId + "/versions/" + versionId, "trace-f019-no-read-version-denied", qeUserWithoutRead);
        assertThat(versionDenied.at("/code").asInt()).isEqualTo(40300);
    }

    @Test
    void taskModelRegistryFoundationShouldBlockDeleteAndPublishWithoutEvaluation() throws Exception {
        // TASK-model-registry-foundation AC-06 AC-07 MDL-003 MDL-006
        String cabinBuAdmin = login("buadmin", "CABIN");

        seedModelFile(
            "FILE-MODEL-TASK-002",
            "TENANT-CABIN",
            "USR-BU-CABIN",
            "weld-model-v2.zip",
            2097152L,
            "application/zip"
        );

        JsonNode createdModel = postJson("/api/v1/models", "trace-f019-create-model-blocked", """
            {
              "name":"TASK-model-registry-foundation 删除阻断模型",
              "description":"用于阻断验证",
              "framework":"PYTORCH",
              "taskType":"OBJECT_DETECTION",
              "inputFormat":"image:640x640 RGB",
              "outputFormat":"bbox[class,score,x1,y1,x2,y2]",
              "runtimeRequirements":"{}",
              "tags":["阻断"],
              "scope":"PRIVATE",
              "source":"LOCAL_UPLOAD"
            }
            """, cabinBuAdmin);
        assertThat(createdModel.at("/code").asInt()).isZero();
        String modelId = createdModel.at("/data/modelId").asText();

        JsonNode createdVersion = postJson("/api/v1/models/" + modelId + "/versions", "trace-f019-create-version-blocked", """
            {
              "versionNo":"v0.1",
              "fileObjectId":"FILE-MODEL-TASK-002",
              "runtimeRequirements":"{}",
              "metricsSummary":{"mAP50":0.80},
              "evaluationStatus":"NONE",
              "setAsCurrent":true
            }
            """, cabinBuAdmin);
        assertThat(createdVersion.at("/code").asInt()).isZero();
        String versionId = createdVersion.at("/data/versionId").asText();

        JsonNode moveToTesting = postJson("/api/v1/models/" + modelId + "/versions/" + versionId + "/transition", "trace-f019-blocked-to-testing", """
            {"targetStatus":"TESTING","reason":"进入测试"}
            """, cabinBuAdmin);
        assertThat(moveToTesting.at("/code").asInt()).isZero();

        JsonNode publishBlocked = postJson("/api/v1/models/" + modelId + "/versions/" + versionId + "/transition", "trace-f019-blocked-publish", """
            {"targetStatus":"PRODUCTION","reason":"无评估发布"}
            """, cabinBuAdmin);
        assertThat(publishBlocked.at("/code").asInt()).isEqualTo(42232);

        JsonNode privateToBuScopeUpdated = patchJson("/api/v1/models/" + modelId, "trace-f019-private-to-bu-scope-update", """
            {"scope":"BU","scopeChangeReason":"开放给同 BU 使用"}
            """, cabinBuAdmin);
        assertThat(privateToBuScopeUpdated.at("/code").asInt()).isZero();
        assertThat(privateToBuScopeUpdated.at("/data/scope").asText()).isEqualTo("BU");

        JsonNode platformScopeApprovalRequired = patchJson("/api/v1/models/" + modelId, "trace-f019-bu-to-platform-scope-approval", """
            {"scope":"PLATFORM","scopeChangeReason":"开放给跨 BU 使用"}
            """, cabinBuAdmin);
        assertThat(platformScopeApprovalRequired.at("/code").asInt()).isEqualTo(42241);

        jdbc.update("""
            UPDATE model_registry_version
            SET active_deployment_count = 1,
                active_reference_json = ?
            WHERE version_id = ?
            """, """
            [{"serviceId":"INF-SVC-001","serviceName":"焊缝在线检测","status":"RUNNING"}]
            """, versionId);

        JsonNode deleteBlocked = deleteJson("/api/v1/models/" + modelId + "/versions/" + versionId, "trace-f019-delete-blocked", cabinBuAdmin);
        assertThat(deleteBlocked.at("/code").asInt()).isEqualTo(40932);
        assertThat(deleteBlocked.at("/data/blocked").asBoolean()).isTrue();
        assertThat(deleteBlocked.at("/data/activeReferences/0/serviceId").asText()).isEqualTo("INF-SVC-001");
    }

    @Test
    void taskModelRegistryFoundationShouldRejectNonModelFileObjectsForVersionCreation() throws Exception {
        String cabinBuAdmin = login("buadmin", "CABIN");
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String datasetZipFileId = "FILE-DATASET-MODEL-GUARD-" + suffix;
        seedFileObject(
            datasetZipFileId,
            "DATASET",
            "TENANT-CABIN",
            "USR-BU-CABIN",
            "dataset-training-package.zip",
            2097152L,
            "application/zip"
        );

        JsonNode createdModel = postJson("/api/v1/models", "trace-f019-create-model-file-type-guard", """
            {
              "name":"TASK-model-registry-foundation 文件类型防线 %s",
              "description":"验证模型版本只能绑定 MODEL 文件对象",
              "framework":"PYTORCH",
              "taskType":"OBJECT_DETECTION",
              "inputFormat":"image:640x640 RGB",
              "outputFormat":"bbox[class,score,x1,y1,x2,y2]",
              "runtimeRequirements":"{}",
              "tags":["文件防线"],
              "scope":"PRIVATE",
              "source":"LOCAL_UPLOAD"
            }
            """.formatted(suffix), cabinBuAdmin);
        assertThat(createdModel.at("/code").asInt()).isZero();
        String modelId = createdModel.at("/data/modelId").asText();

        JsonNode rejectedVersion = postJson("/api/v1/models/" + modelId + "/versions", "trace-f019-create-version-dataset-file-rejected", """
            {
              "versionNo":"v0.1",
              "fileObjectId":"%s",
              "runtimeRequirements":"{}",
              "evaluationStatus":"NONE",
              "setAsCurrent":true
            }
            """.formatted(datasetZipFileId), cabinBuAdmin);
        assertThat(rejectedVersion.at("/code").asInt()).isEqualTo(42233);
    }

    @Test
    void taskModelRegistryFoundationShouldGuardAccessReviewStateAndMapMissingResources() throws Exception {
        // TASK-model-registry-foundation AC-03 AC-04 AC-09 AC-10
        String keywordToken = "TASK-model-registry-foundation-review-" + UUID.randomUUID().toString().substring(0, 8);
        String admin = login("admin", "YF");
        String cabinBuAdmin = login("buadmin", "CABIN");
        String qeUser = login("qeuser", "QE");

        seedModelFile(
            "FILE-MODEL-REVIEW-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
            "TENANT-CABIN",
            "USR-BU-CABIN",
            "review-guard-model.onnx",
            1048576L,
            "application/octet-stream"
        );

        String reviewFileId = jdbc.queryForObject("SELECT file_id FROM platform_file_object WHERE object_key LIKE ?", String.class, "%review-guard-model.onnx");

        JsonNode createdModel = postJson("/api/v1/models", "trace-f019-review-guard-create-model", """
            {
              "name":"%s model",
              "description":"验证审批状态机与缺失资源映射",
              "framework":"ONNX",
              "taskType":"IMAGE_CLASSIFICATION",
              "inputFormat":"image:224x224 RGB",
              "outputFormat":"class[score]",
              "runtimeRequirements":"{}",
              "tags":["%s","review"],
              "scope":"BU",
              "source":"LOCAL_UPLOAD"
            }
            """.formatted(keywordToken, keywordToken), cabinBuAdmin);
        assertThat(createdModel.at("/code").asInt()).isZero();
        String modelId = createdModel.at("/data/modelId").asText();

        JsonNode missingFileObject = postJson("/api/v1/models/" + modelId + "/versions", "trace-f019-review-guard-missing-file", """
            {
              "versionNo":"v-missing-file",
              "fileObjectId":"FILE-NOT-EXIST",
              "runtimeRequirements":"{}",
              "metricsSummary":{"accuracy":0.61},
              "evaluationStatus":"NONE",
              "setAsCurrent":false
            }
            """, cabinBuAdmin);
        assertThat(missingFileObject.at("/code").asInt()).isEqualTo(42233);

        JsonNode createdVersion = postJson("/api/v1/models/" + modelId + "/versions", "trace-f019-review-guard-create-version", """
            {
              "versionNo":"v1.0",
              "fileObjectId":"%s",
              "runtimeRequirements":"{}",
              "metricsSummary":{"accuracy":0.89},
              "evaluationStatus":"IMPORTED_PROOF",
              "evaluationProof":"EXT-EVAL-REVIEW-001",
              "setAsCurrent":true
            }
            """.formatted(reviewFileId), cabinBuAdmin);
        assertThat(createdVersion.at("/code").asInt()).isZero();
        String versionId = createdVersion.at("/data/versionId").asText();

        JsonNode missingModel = getJson("/api/v1/models/MODEL-NOT-EXIST", "trace-f019-review-guard-missing-model", cabinBuAdmin);
        assertThat(missingModel.at("/code").asInt()).isEqualTo(40400);

        JsonNode missingVersion = getJson("/api/v1/models/" + modelId + "/versions/MVER-NOT-EXIST", "trace-f019-review-guard-missing-version", cabinBuAdmin);
        assertThat(missingVersion.at("/code").asInt()).isEqualTo(40400);

        JsonNode rejectRequested = postJson("/api/v1/models/" + modelId + "/access-requests", "trace-f019-review-guard-reject-request-access", """
            {
              "versionId":"%s",
              "permission":"USE_FOR_TRAINING",
              "reason":"验证拒绝后待审批列表刷新",
              "expiresAt":"2026-12-31T23:59:59Z"
            }
            """.formatted(versionId), qeUser);
        assertThat(rejectRequested.at("/code").asInt()).isZero();
        String rejectRequestId = rejectRequested.at("/data/requestId").asText();

        JsonNode pendingBeforeReject = getJson("/api/v1/models/" + modelId + "/access-requests?status=PENDING", "trace-f019-review-guard-pending-before-reject", cabinBuAdmin);
        assertThat(pendingBeforeReject.at("/code").asInt()).isZero();
        assertThat(pendingBeforeReject.at("/data").toString()).contains(rejectRequestId);

        JsonNode rejected = putJson("/api/v1/model-access-requests/" + rejectRequestId + "/reject", "trace-f019-review-guard-reject", """
            {"reviewComment":"拒绝训练复用申请"}
            """, cabinBuAdmin);
        assertThat(rejected.at("/code").asInt()).isZero();
        assertThat(rejected.at("/data/status").asText()).isEqualTo("REJECTED");

        JsonNode pendingAfterReject = getJson("/api/v1/models/" + modelId + "/access-requests?status=PENDING", "trace-f019-review-guard-pending-after-reject", cabinBuAdmin);
        assertThat(pendingAfterReject.at("/code").asInt()).isZero();
        assertThat(pendingAfterReject.at("/data").toString()).doesNotContain(rejectRequestId);

        JsonNode rejectedAudit = getJson("/api/v1/platform/audit-logs?action=MODEL_ACCESS_REJECTED", "trace-f019-review-guard-audit-rejected", admin);
        assertThat(rejectedAudit.at("/code").asInt()).isZero();
        assertThat(rejectedAudit.at("/data/items").toString()).contains(rejectRequestId);

        JsonNode requested = postJson("/api/v1/models/" + modelId + "/access-requests", "trace-f019-review-guard-request-access", """
            {
              "versionId":"%s",
              "permission":"VIEW",
              "reason":"验证审批状态机",
              "expiresAt":"2026-12-31T23:59:59Z"
            }
            """.formatted(versionId), qeUser);
        assertThat(requested.at("/code").asInt()).isZero();
        String requestId = requested.at("/data/requestId").asText();

        JsonNode approved = putJson("/api/v1/model-access-requests/" + requestId + "/approve", "trace-f019-review-guard-approve", """
            {"reviewComment":"首次审批通过","expiresAt":"2026-12-31T23:59:59Z"}
            """, cabinBuAdmin);
        assertThat(approved.at("/code").asInt()).isZero();

        JsonNode approveAgain = putJson("/api/v1/model-access-requests/" + requestId + "/approve", "trace-f019-review-guard-approve-again", """
            {"reviewComment":"重复审批必须被阻断","expiresAt":"2026-12-31T23:59:59Z"}
            """, cabinBuAdmin);
        assertThat(approveAgain.at("/code").asInt()).isEqualTo(40900);

        JsonNode rejectApproved = putJson("/api/v1/model-access-requests/" + requestId + "/reject", "trace-f019-review-guard-reject-approved", """
            {"reviewComment":"已审批申请不可再次拒绝"}
            """, cabinBuAdmin);
        assertThat(rejectApproved.at("/code").asInt()).isEqualTo(40900);

        Integer activeGrantCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM model_access_grant WHERE source_request_id=? AND status='ACTIVE'",
            Integer.class,
            requestId
        );
        assertThat(activeGrantCount).isEqualTo(1);

        JsonNode missingRequestApprove = putJson("/api/v1/model-access-requests/MACC-NOT-EXIST/approve", "trace-f019-review-guard-missing-request-approve", """
            {"reviewComment":"缺失申请应返回 404"}
            """, cabinBuAdmin);
        assertThat(missingRequestApprove.at("/code").asInt()).isEqualTo(40400);
    }


    private String createSessionToken(String userId) {
        Integer sessionVersion = jdbc.queryForObject("SELECT session_version FROM platform_user WHERE id=?", Integer.class, userId);
        String accessToken = "atk_test_" + UUID.randomUUID().toString().replace("-", "");
        String refreshToken = "rtk_test_" + UUID.randomUUID().toString().replace("-", "");
        jdbc.update("""
            INSERT INTO platform_session (access_token, refresh_token, user_id, session_version, expires_at, revoked_at, created_at)
            VALUES (?, ?, ?, ?, ?, NULL, ?)
            """, accessToken, refreshToken, userId, sessionVersion == null ? 1 : sessionVersion, OffsetDateTime.now().plusHours(1), OffsetDateTime.now());
        return accessToken;
    }

    private String createNoModelReadUserSession() {
        String roleCode = "NO_MODEL_READ";
        Integer roleCount = jdbc.queryForObject("SELECT COUNT(*) FROM platform_role WHERE code=?", Integer.class, roleCode);
        if (roleCount == null || roleCount == 0) {
            jdbc.update("""
                INSERT INTO platform_role (code, name, description, scope, preset, tenant_id, status)
                VALUES (?, '无模型读权限测试角色', '用于 F019 权限回归测试', 'TENANT', FALSE, 'TENANT-QE', 'ACTIVE')
                """, roleCode);
        }
        String userId = "USR-NOREAD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        jdbc.update("""
            INSERT INTO platform_user (id, username, password_hash, display_name, email, tenant_id, bu_code, status, auth_type, failed_login_count, locked_until, session_version, last_login_at, created_at, updated_at)
            VALUES (?, ?, '$2a$10$iQHMpURId5.xHemjCnsDtuJm91Utedo7YpWjvcxdtlyYcwblCVSs.', '无模型读权限用户', 'noread@yf.local', 'TENANT-QE', 'QE', 'ACTIVE', 'LOCAL', 0, NULL, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, userId, userId.toLowerCase());
        grantRole(userId, roleCode, "TENANT-QE");
        return createSessionToken(userId);
    }


    private String privateSeedVersionId() {
        String modelId = "MODEL-PRIVATE-SEED-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String versionId = "MVER-PRIVATE-SEED-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String fileId = "FILE-PRIVATE-SEED-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        seedModelFile(fileId, "TENANT-CABIN", "USR-BU-CABIN", "private-seed.onnx", 1048576L, "application/octet-stream");
        jdbc.update("""
            INSERT INTO model_registry_model (
                model_id, name, description, framework, task_type, input_format, output_format,
                runtime_requirements, tags_json, scope, source, owner_user_id, owner_org_id, tenant_id,
                current_version_id, visibility_status, created_at, updated_at
            ) VALUES (?, ?, ?, 'ONNX', 'IMAGE_CLASSIFICATION', 'image:224x224 RGB', 'class[score]', '{}', '[]', 'PRIVATE', 'LOCAL_UPLOAD', 'USR-BU-CABIN', 'TENANT-CABIN', 'TENANT-CABIN', NULL, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, modelId, modelId, "用于版本归属负向测试");
        jdbc.update("""
            INSERT INTO model_registry_version (
                version_id, model_id, version_no, file_object_id, file_name, file_extension, file_size_bytes,
                checksum, storage_bucket, storage_key, runtime_requirements, metrics_summary_json,
                security_scan_status, evaluation_status, evaluation_record_id, evaluation_proof,
                status, active_deployment_count, active_reference_json, created_by, created_at
            ) SELECT ?, ?, 'v1.0', file_id, 'private-seed.onnx', '.onnx', size_bytes, sha256, bucket, object_key, '{}', '{}', 'PENDING', 'IMPORTED_PROOF', NULL, 'seed', 'PRODUCTION', 0, '[]', 'USR-BU-CABIN', CURRENT_TIMESTAMP
              FROM platform_file_object WHERE file_id=?
            """, versionId, modelId, fileId);
        jdbc.update("UPDATE model_registry_model SET current_version_id=? WHERE model_id=?", versionId, modelId);
        return versionId;
    }

    private void grantRole(String userId, String roleCode, String tenantId) {
        String id = userId + "::" + roleCode + "::" + tenantId;
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM platform_user_role WHERE id=?", Integer.class, id);
        if (count == null || count == 0) {
            jdbc.update("""
                INSERT INTO platform_user_role (id, user_id, role_code, tenant_id, active, expires_at, created_at)
                VALUES (?, ?, ?, ?, TRUE, NULL, CURRENT_TIMESTAMP)
                """, id, userId, roleCode, tenantId);
        }
    }

    private void grantRolePermission(String roleCode, String permissionCode) {
        String id = roleCode + "::" + permissionCode;
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM platform_role_permission WHERE id=?", Integer.class, id);
        if (count == null || count == 0) {
            jdbc.update("""
                INSERT INTO platform_role_permission (id, role_code, permission_code)
                VALUES (?, ?, ?)
                """, id, roleCode, permissionCode);
        }
    }

    private void seedModelFile(String fileId, String tenantId, String ownerId, String fileName, long sizeBytes, String contentType) {
        seedFileObject(fileId, "MODEL", tenantId, ownerId, fileName, sizeBytes, contentType);
    }

    private void seedFileObject(String fileId, String assetType, String tenantId, String ownerId, String fileName, long sizeBytes, String contentType) {
        String bucket = "smp-datasets";
        String objectKey = tenantId + "/" + assetType.toLowerCase(Locale.ROOT) + "/" + fileId + "/" + fileName;
        jdbc.update("""
            INSERT INTO platform_file_object (
                file_id, asset_type, tenant_id, project_id, bucket, object_key,
                expected_sha256, sha256, expected_size_bytes, size_bytes, content_type,
                storage_tier, status, owner_id, created_at, updated_at
            ) VALUES (?, ?, ?, NULL, ?, ?, NULL, ?, ?, ?, ?, 'STANDARD', 'AVAILABLE', ?, ?, ?)
            """,
            fileId,
            assetType,
            tenantId,
            bucket,
            objectKey,
            UUID.randomUUID().toString().replace("-", ""),
            sizeBytes,
            sizeBytes,
            contentType,
            ownerId,
            OffsetDateTime.now(),
            OffsetDateTime.now()
        );
    }

    private String login(String username, String tenantCode) throws Exception {
        return loginResponse(username, tenantCode).at("/data/accessToken").asText();
    }

    private JsonNode loginResponse(String username, String tenantCode) throws Exception {
        return postJson("/api/v1/auth/login", "trace-login-" + username + "-" + tenantCode, """
            {"username":"%s","password":"Smp@123456","tenantCode":"%s"}
            """.formatted(username, tenantCode), null);
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
            .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return send(builder.build());
    }

    private JsonNode putJson(String path, String traceId, String body, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .header("Content-Type", "application/json")
            .PUT(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return send(builder.build());
    }

    private JsonNode patchJson(String path, String traceId, String body, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .header("Content-Type", "application/json")
            .method("PATCH", HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return send(builder.build());
    }

    private JsonNode deleteJson(String path, String traceId, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header(TraceIdFilter.TRACE_HEADER, traceId)
            .DELETE();
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
}
