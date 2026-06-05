package com.yf.smp.app.platform;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ModelRegistryService {
    private static final int DOWNLOAD_EXPIRES_SECONDS = 600;
    private static final long MAX_MODEL_FILE_SIZE = 2147483648L;
    private static final List<String> MODEL_FILE_EXTENSIONS = List.of(".pt", ".pth", ".onnx", ".zip");
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() { };
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };
    private static final TypeReference<List<ActiveReferenceResponse>> ACTIVE_REF_TYPE = new TypeReference<>() { };
    private static final Map<String, List<String>> STATUS_TRANSITIONS = Map.of(
        "DEVELOPMENT", List.of("TESTING"),
        "TESTING", List.of("PRODUCTION", "DEPRECATED"),
        "PRODUCTION", List.of("DEPRECATED"),
        "DEPRECATED", List.of()
    );

    private final JdbcTemplate jdbc;
    private final PlatformIdentityService identityService;
    private final ObjectStorageService objectStorageService;
    private final ModelEvaluationService modelEvaluationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ModelRegistryService(
        JdbcTemplate jdbc,
        PlatformIdentityService identityService,
        ObjectStorageService objectStorageService,
        ModelEvaluationService modelEvaluationService
    ) {
        this.jdbc = jdbc;
        this.identityService = identityService;
        this.objectStorageService = objectStorageService;
        this.modelEvaluationService = modelEvaluationService;
    }

    @Transactional(readOnly = true)
    public ModelRegistryListResponse listModels(
        PlatformPrincipal principal,
        String keyword,
        String tag,
        String framework,
        String taskType,
        String scope,
        String status,
        String ownerOrgId,
        int page,
        int pageSize
    ) {
        identityService.requirePermission(principal, "model:model:read");
        int normalizedPage = Math.max(page, 1);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 100));
        ModelListSql listSql = modelListSql(principal, keyword, tag, framework, taskType, scope, status, ownerOrgId);
        Integer total = jdbc.queryForObject("SELECT COUNT(*) FROM model_registry_model m LEFT JOIN model_registry_version cv ON cv.version_id=m.current_version_id WHERE " + listSql.whereClause(), Integer.class, listSql.params().toArray());
        List<Object> pageParams = new ArrayList<>(listSql.params());
        pageParams.add(normalizedPageSize);
        pageParams.add((normalizedPage - 1) * normalizedPageSize);
        List<ModelSummaryResponse> visible = jdbc.query("""
                SELECT m.*
                FROM model_registry_model m
                LEFT JOIN model_registry_version cv ON cv.version_id=m.current_version_id
                WHERE %s
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?
                """.formatted(listSql.whereClause()), (rs, rowNum) -> modelRow(rs), pageParams.toArray())
            .stream()
            .map(model -> toSummary(principal, model))
            .toList();
        return new ModelRegistryListResponse(visible, total == null ? 0 : total, normalizedPage, normalizedPageSize);
    }

    @Transactional
    public ModelSummaryResponse createModel(PlatformPrincipal principal, ModelCreateRequest request) {
        identityService.requirePermission(principal, "model:model:write");
        validateCreateModelRequest(request);
        OffsetDateTime now = now();
        String modelId = "MODEL-" + randomIdPart(16);
        jdbc.update("""
            INSERT INTO model_registry_model (
                model_id, name, description, framework, task_type, input_format, output_format,
                runtime_requirements, tags_json, scope, pending_scope, pending_scope_reason, source,
                owner_user_id, owner_org_id, tenant_id, current_version_id, visibility_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, NULL, 'ACTIVE', ?, ?)
            """,
            modelId,
            request.name().trim(),
            blankToNull(request.description()),
            normalizedFramework(request.framework()),
            normalizedTaskType(request.taskType()),
            request.inputFormat().trim(),
            request.outputFormat().trim(),
            blankToNull(request.runtimeRequirements()),
            toJson(normalizeTags(request.tags())),
            normalizedScope(request.scope()),
            normalizedSource(request.source()),
            principal.user().id(),
            principal.user().tenantId(),
            principal.user().tenantId(),
            now,
            now
        );
        ModelRecord created = modelById(modelId);
        recordAudit(principal, created.tenantId(), created.ownerOrgId(), "MODEL_CREATED", "Model", modelId, "SUCCESS", null, created.name(), "scope=" + created.scope());
        return toSummary(principal, created);
    }

    @Transactional
    public ModelDetailResponse modelDetail(PlatformPrincipal principal, String modelId) {
        identityService.requirePermission(principal, "model:model:read");
        ModelRecord model = modelById(modelId);
        if (!canView(principal, model) && !hasAnyGrant(model.modelId(), principal.user().id(), principal.user().tenantId())) {
            throw crossBuAccessException();
        }
        recordViewAudit(principal, model);
        return toDetail(principal, model);
    }

    @Transactional
    public ModelSummaryResponse updateModel(PlatformPrincipal principal, String modelId, ModelUpdateRequest request) {
        ModelRecord current = requireModelPermission(principal, modelId, "model:model:manage");
        String nextName = blankToDefault(request.name(), current.name());
        String nextDescription = blankToDefault(request.description(), current.description());
        String nextInputFormat = blankToDefault(request.inputFormat(), current.inputFormat());
        String nextOutputFormat = blankToDefault(request.outputFormat(), current.outputFormat());
        String nextRuntimeRequirements = blankToDefault(request.runtimeRequirements(), current.runtimeRequirements());
        List<String> nextTags = request.tags() == null ? current.tags() : normalizeTags(request.tags());
        String requestedScope = isBlank(request.scope()) ? current.scope() : normalizedScope(request.scope());
        OffsetDateTime now = now();
        if (!Objects.equals(current.scope(), requestedScope) && requiresScopeApproval(current.scope(), requestedScope)) {
            jdbc.update("""
                UPDATE model_registry_model
                SET name=?, description=?, input_format=?, output_format=?, runtime_requirements=?, tags_json=?,
                    pending_scope=?, pending_scope_reason=?, updated_at=?
                WHERE model_id=?
                """,
                nextName,
                blankToNull(nextDescription),
                nextInputFormat,
                nextOutputFormat,
                blankToNull(nextRuntimeRequirements),
                toJson(nextTags),
                requestedScope,
                blankToNull(request.scopeChangeReason()),
                now,
                modelId
            );
            recordAudit(principal, current.tenantId(), current.ownerOrgId(), "MODEL_SCOPE_CHANGE_REQUESTED", "Model", modelId, "PENDING", current.scope(), requestedScope, blankToDefault(request.scopeChangeReason(), "scope-change"));
            throw new PlatformException(42241, 422, "跨 BU 共享需审批通过后生效");
        }
        jdbc.update("""
            UPDATE model_registry_model
            SET name=?, description=?, input_format=?, output_format=?, runtime_requirements=?, tags_json=?, scope=?, updated_at=?
            WHERE model_id=?
            """,
            nextName,
            blankToNull(nextDescription),
            nextInputFormat,
            nextOutputFormat,
            blankToNull(nextRuntimeRequirements),
            toJson(nextTags),
            requestedScope,
            now,
            modelId
        );
        ModelRecord updated = modelById(modelId);
        recordAudit(principal, updated.tenantId(), updated.ownerOrgId(), "MODEL_UPDATED", "Model", modelId, "SUCCESS", current.name(), updated.name(), "scope=" + updated.scope());
        return toSummary(principal, updated);
    }

    @Transactional(readOnly = true)
    public List<ModelVersionResponse> versions(PlatformPrincipal principal, String modelId) {
        identityService.requirePermission(principal, "model:model:read");
        ModelRecord model = requireViewableModel(principal, modelId);
        return versionsByModelId(principal, model);
    }

    @Transactional
    public ModelVersionResponse createVersion(PlatformPrincipal principal, String modelId, ModelVersionCreateRequest request) {
        ModelRecord model = requireModelPermission(principal, modelId, "model:version:write");
        validateVersionCreateRequest(principal, request);
        FileObjectRecord file = accessibleModelFile(model.tenantId(), request.fileObjectId());
        String extension = extension(file.objectKey());
        if (!MODEL_FILE_EXTENSIONS.contains(extension)) {
            throw new PlatformException(42234, 422, "仅支持 .pt/.pth/.onnx/.zip 模型文件");
        }
        if (file.sizeBytes() > MAX_MODEL_FILE_SIZE) {
            throw new PlatformException(41331, 413, "模型文件大小不能超过 2GB");
        }
        OffsetDateTime now = now();
        String versionId = "MVER-" + randomIdPart(16);
        try {
            jdbc.update("""
                INSERT INTO model_registry_version (
                    version_id, model_id, version_no, file_object_id, file_name, file_extension, file_size_bytes,
                    checksum, storage_bucket, storage_key, runtime_requirements, metrics_summary_json, security_scan_status,
                    evaluation_status, evaluation_record_id, evaluation_proof, status, active_deployment_count, active_reference_json,
                    created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, 'DEVELOPMENT', 0, ?, ?, ?)
                """,
                versionId,
                modelId,
                request.versionNo().trim(),
                file.fileId(),
                file.fileName(),
                extension,
                file.sizeBytes(),
                file.sha256(),
                file.bucket(),
                file.objectKey(),
                blankToNull(request.runtimeRequirements()),
                toJson(defaultIfNull(request.metricsSummary(), Map.of())),
                normalizedEvaluationStatus(request.evaluationStatus()),
                "IMPORTED_PROOF".equalsIgnoreCase(blankToDefault(request.evaluationStatus(), "NONE")) ? "EXT-" + randomIdPart(8) : null,
                blankToNull(request.evaluationProof()),
                "[]",
                principal.user().id(),
                now
            );
        } catch (DuplicateKeyException exception) {
            throw new PlatformException(40931, 409, "模型版本号已存在");
        }
        if (Boolean.TRUE.equals(request.setAsCurrent())) {
            jdbc.update("UPDATE model_registry_model SET current_version_id=?, updated_at=? WHERE model_id=?", versionId, now, modelId);
        }
        recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_VERSION_CREATED", "ModelVersion", versionId, "SUCCESS", null, request.versionNo(), "modelId=" + modelId);
        recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_VERSION_FILE_BOUND", "ModelVersion", versionId, "SUCCESS", null, file.fileId(), "bucket=" + file.bucket());
        return versionById(principal, model, versionId);
    }

    @Transactional(readOnly = true)
    public ModelVersionResponse versionDetail(PlatformPrincipal principal, String modelId, String versionId) {
        identityService.requirePermission(principal, "model:model:read");
        ModelRecord model = modelById(modelId);
        ModelVersionResponse version = versionById(principal, model, versionId);
        if (!Objects.equals(version.modelId(), modelId)) {
            throw new PlatformException(40400, 404, "资源不存在");
        }
        if (!canView(principal, model, versionId)) {
            throw crossBuAccessException();
        }
        return version;
    }

    @Transactional
    public ModelVersionResponse transitionVersion(PlatformPrincipal principal, String modelId, String versionId, ModelVersionTransitionRequest request) {
        ModelRecord model = requireModelPermission(principal, modelId, "model:version:manage");
        ModelVersionResponse current = versionById(principal, model, versionId);
        ensureVersionBelongsToModel(current, modelId);
        String target = normalizedEnum(request.targetStatus());
        List<String> allowed = STATUS_TRANSITIONS.getOrDefault(current.status(), List.of());
        if (!allowed.contains(target)) {
            throw new PlatformException(42231, 422, "不支持从当前状态直接转换为目标状态");
        }
        if ("PRODUCTION".equals(target) && !modelEvaluationService.hasPassedEvaluation(modelId, versionId)) {
            recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_VERSION_PUBLISH_BLOCKED_EVALUATION_REQUIRED", "ModelVersion", versionId, "BLOCKED", current.status(), target, "TASK-model-evaluation-readiness;AC-05;" + blankToDefault(request.reason(), "evaluation-required"));
            throw new PlatformException(ModelEvaluationService.CODE_EVALUATION_REQUIRED, 422, "该模型版本尚未通过模型评估，请先在模型评估中导入 PASSED 评估结果");
        }
        jdbc.update("UPDATE model_registry_version SET status=? WHERE version_id=?", target, versionId);
        if ("PRODUCTION".equals(target)) {
            jdbc.update("UPDATE model_registry_model SET current_version_id=?, updated_at=? WHERE model_id=?", versionId, now(), modelId);
            recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_VERSION_PUBLISH_GATE_PASSED", "ModelVersion", versionId, "SUCCESS", current.status(), target, "TASK-model-evaluation-readiness;AC-06");
        }
        recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_VERSION_TRANSITIONED", "ModelVersion", versionId, "SUCCESS", current.status(), target, blankToDefault(request.reason(), "transition"));
        return versionById(principal, model, versionId);
    }

    @Transactional
    public ModelVersionDeleteResponse deleteVersion(PlatformPrincipal principal, String modelId, String versionId) {
        ModelRecord model = requireModelPermission(principal, modelId, "model:version:delete");
        ModelVersionResponse current = versionById(principal, model, versionId);
        ensureVersionBelongsToModel(current, modelId);
        if (current.activeDeploymentCount() > 0) {
            recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_VERSION_DELETE_BLOCKED", "ModelVersion", versionId, "BLOCKED", null, null, "activeDeploymentCount=" + current.activeDeploymentCount());
            throw new PlatformException(40932, 409, "该模型版本当前被推理服务引用，请先下线相关服务");
        }
        jdbc.update("UPDATE model_registry_model SET current_version_id=NULL, updated_at=? WHERE model_id=? AND current_version_id=?", now(), modelId, versionId);
        jdbc.update("DELETE FROM model_registry_version WHERE version_id=?", versionId);
        recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_VERSION_DELETED", "ModelVersion", versionId, "SUCCESS", current.status(), "DELETED", "modelId=" + modelId);
        return new ModelVersionDeleteResponse(versionId, true, false, List.of());
    }

    @Transactional
    public ResponseEntity<com.yf.smp.common.api.ApiResponse<ModelVersionDeleteResponse>> deleteVersionResponse(PlatformPrincipal principal, String modelId, String versionId) {
        ModelRecord model = requireModelPermission(principal, modelId, "model:version:delete");
        ModelVersionResponse current = versionById(principal, model, versionId);
        ensureVersionBelongsToModel(current, modelId);
        if (current.activeDeploymentCount() > 0) {
            recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_VERSION_DELETE_BLOCKED", "ModelVersion", versionId, "BLOCKED", null, null, "activeDeploymentCount=" + current.activeDeploymentCount());
            ModelVersionDeleteResponse response = new ModelVersionDeleteResponse(versionId, false, true, current.activeReferences());
            return PlatformResponses.respond(409, 40932, "该模型版本当前被推理服务引用，请先下线相关服务", response);
        }
        jdbc.update("UPDATE model_registry_model SET current_version_id=NULL, updated_at=? WHERE model_id=? AND current_version_id=?", now(), modelId, versionId);
        jdbc.update("DELETE FROM model_registry_version WHERE version_id=?", versionId);
        recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_VERSION_DELETED", "ModelVersion", versionId, "SUCCESS", current.status(), "DELETED", "modelId=" + modelId);
        return PlatformResponses.ok(new ModelVersionDeleteResponse(versionId, true, false, List.of()));
    }


    @Transactional(readOnly = true)
    public List<ModelAccessRequestResponse> accessRequests(PlatformPrincipal principal, String modelId, String status) {
        ModelRecord model = modelById(modelId);
        ensureApprover(principal, model);
        String normalizedStatus = isBlank(status) ? null : normalizeAccessRequestStatus(status);
        String sql = """
            SELECT * FROM model_access_request
            WHERE model_id=? AND (? IS NULL OR status=?)
            ORDER BY created_at DESC
            """;
        return jdbc.query(sql, (rs, rowNum) -> accessRequestRow(rs), modelId, normalizedStatus, normalizedStatus);
    }

    @Transactional
    public ModelAccessRequestResponse requestAccess(PlatformPrincipal principal, String modelId, ModelAccessRequestCreateRequest request) {
        ModelRecord model = modelById(modelId);
        ensureCrossBuRequester(principal, model);
        String requestedVersionId = blankToNull(request.versionId());
        ensureAccessVersionBelongsToModel(modelId, requestedVersionId);
        OffsetDateTime now = now();
        String requestId = "MACC-" + randomIdPart(16);
        jdbc.update("""
            INSERT INTO model_access_request (
                request_id, model_id, version_id, requester_user_id, requester_org_id, owner_org_id, permission,
                reason, status, review_comment, reviewed_by, reviewed_at, expires_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL, NULL, NULL, ?, ?, ?)
            """,
            requestId,
            modelId,
            requestedVersionId,
            principal.user().id(),
            principal.user().tenantId(),
            model.ownerOrgId(),
            normalizedPermission(request.permission()),
            blankToNull(request.reason()),
            request.expiresAt(),
            now,
            now
        );
        recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_ACCESS_REQUESTED", "ModelAccessRequest", requestId, "PENDING", null, normalizedPermission(request.permission()), blankToDefault(request.reason(), "request-access"));
        return accessRequestById(requestId);
    }

    @Transactional
    public ModelAccessRequestResponse approveRequest(PlatformPrincipal principal, String requestId, ModelAccessReviewRequest request) {
        AccessRequestRecord accessRequest = accessRequestRecord(requestId);
        ModelRecord model = modelById(accessRequest.modelId());
        ensureApprover(principal, model);
        ensureCrossBuAccessRequest(accessRequest);
        ensurePendingAccessRequest(accessRequest);
        ensureAccessVersionBelongsToModel(accessRequest.modelId(), accessRequest.versionId());
        OffsetDateTime reviewedAt = now();
        jdbc.update("""
            UPDATE model_access_request
            SET status='APPROVED', review_comment=?, reviewed_by=?, reviewed_at=?, expires_at=?, updated_at=?
            WHERE request_id=?
            """,
            blankToNull(request.reviewComment()),
            principal.user().id(),
            reviewedAt,
            request.expiresAt(),
            reviewedAt,
            requestId
        );
        String grantId = "MGRANT-" + randomIdPart(16);
        jdbc.update("""
            INSERT INTO model_access_grant (
                grant_id, model_id, version_id, requester_user_id, requester_org_id, owner_org_id,
                permission, status, source_request_id, approved_by, expires_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)
            """,
            grantId,
            accessRequest.modelId(),
            accessRequest.versionId(),
            accessRequest.requesterUserId(),
            accessRequest.requesterOrgId(),
            accessRequest.ownerOrgId(),
            accessRequest.permission(),
            requestId,
            principal.user().id(),
            request.expiresAt(),
            reviewedAt,
            reviewedAt
        );
        recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_ACCESS_APPROVED", "ModelAccessRequest", requestId, "SUCCESS", "PENDING", "APPROVED", blankToDefault(request.reviewComment(), "approved"));
        return accessRequestById(requestId);
    }

    @Transactional
    public ModelAccessRequestResponse rejectRequest(PlatformPrincipal principal, String requestId, ModelAccessReviewRequest request) {
        AccessRequestRecord accessRequest = accessRequestRecord(requestId);
        ModelRecord model = modelById(accessRequest.modelId());
        ensureApprover(principal, model);
        ensurePendingAccessRequest(accessRequest);
        OffsetDateTime reviewedAt = now();
        jdbc.update("""
            UPDATE model_access_request
            SET status='REJECTED', review_comment=?, reviewed_by=?, reviewed_at=?, updated_at=?
            WHERE request_id=?
            """,
            blankToNull(request.reviewComment()),
            principal.user().id(),
            reviewedAt,
            reviewedAt,
            requestId
        );
        recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_ACCESS_REJECTED", "ModelAccessRequest", requestId, "SUCCESS", "PENDING", "REJECTED", blankToDefault(request.reviewComment(), "rejected"));
        return accessRequestById(requestId);
    }

    @Transactional
    public ModelDownloadResponse downloadUrl(PlatformPrincipal principal, String modelId, String versionId) {
        ModelRecord model = modelById(modelId);
        ModelVersionResponse version = versionById(principal, model, versionId);
        ensureVersionBelongsToModel(version, modelId);
        if (!canDownload(principal, model, versionId)) {
            throw crossBuAccessException();
        }
        String downloadUrl = objectStorageService.presignedDownloadUrl(version.storageBucket(), version.storageKey(), version.fileName(), DOWNLOAD_EXPIRES_SECONDS);
        String diagnostic = downloadUrl == null ? objectStorageService.downloadDiagnostic() : "PRESIGNED_URL_READY";
        if (downloadUrl == null || downloadUrl.isBlank()) {
            downloadUrl = "/api/v1/platform/files/" + version.fileObjectId() + "/content";
            diagnostic = diagnostic.startsWith("TODO_CONFIRM") ? diagnostic + ";AUTHENTICATED_CONTENT_ENDPOINT_READY" : "AUTHENTICATED_CONTENT_ENDPOINT_READY";
        }
        String actionResult = "SUCCESS";
        recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_DOWNLOADED", "ModelVersion", versionId, actionResult, null, null, diagnostic);
        return new ModelDownloadResponse(modelId, versionId, version.fileObjectId(), downloadUrl, DOWNLOAD_EXPIRES_SECONDS, diagnostic);
    }

    private void validateCreateModelRequest(ModelCreateRequest request) {
        if (request == null || isBlank(request.name()) || isBlank(request.framework()) || isBlank(request.taskType()) || isBlank(request.inputFormat()) || isBlank(request.outputFormat()) || isBlank(request.scope()) || isBlank(request.source())) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        normalizedFramework(request.framework());
        normalizedTaskType(request.taskType());
        normalizedScope(request.scope());
        normalizedSource(request.source());
    }

    private void validateVersionCreateRequest(PlatformPrincipal principal, ModelVersionCreateRequest request) {
        if (request == null || isBlank(request.versionNo()) || isBlank(request.fileObjectId())) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        String evaluationStatus = normalizedEvaluationStatus(request.evaluationStatus());
        if ("IMPORTED_PROOF".equals(evaluationStatus) && !(principal.isSuperAdmin() || principal.isBuAdmin())) {
            throw new PlatformException(40303, 403, "无模型访问权限");
        }
    }

    private ModelRecord requireModelPermission(PlatformPrincipal principal, String modelId, String permission) {
        ModelRecord model = modelById(modelId);
        if (!canManage(principal, model) && !hasScopedModelPermission(principal, model, permission)) {
            throw new PlatformException(40303, 403, "无模型访问权限");
        }
        return model;
    }

    private ModelRecord requireViewableModel(PlatformPrincipal principal, String modelId) {
        ModelRecord model = modelById(modelId);
        if (!canView(principal, model) && !hasAnyGrant(model.modelId(), principal.user().id(), principal.user().tenantId())) {
            throw crossBuAccessException();
        }
        return model;
    }

    private PlatformException crossBuAccessException() {
        return new PlatformException(40304, 403, "该模型属于其他 BU，请申请跨 BU 授权");
    }

    private boolean canView(PlatformPrincipal principal, ModelRecord model) {
        return canView(principal, model, null);
    }

    private boolean canView(PlatformPrincipal principal, ModelRecord model, String versionId) {
        if (principal.isSuperAdmin()) {
            return true;
        }
        if (Objects.equals(principal.user().id(), model.ownerUserId())) {
            return true;
        }
        if ("PLATFORM".equals(model.scope()) && principal.hasPermission("model:model:read")) {
            return true;
        }
        if ("BU".equals(model.scope()) && Objects.equals(principal.user().tenantId(), model.ownerOrgId()) && principal.hasPermission("model:model:read")) {
            return true;
        }
        return hasGrant(model.modelId(), versionId, principal.user().id(), principal.user().tenantId(), "VIEW")
            || hasGrant(model.modelId(), versionId, principal.user().id(), principal.user().tenantId(), "DOWNLOAD")
            || hasGrant(model.modelId(), versionId, principal.user().id(), principal.user().tenantId(), "USE_FOR_TRAINING")
            || hasGrant(model.modelId(), versionId, principal.user().id(), principal.user().tenantId(), "DEPLOY");
    }

    private boolean canDownload(PlatformPrincipal principal, ModelRecord model, String versionId) {
        if (principal.isSuperAdmin() || Objects.equals(principal.user().id(), model.ownerUserId())) {
            return true;
        }
        return (canView(principal, model, versionId) && hasScopedModelPermission(principal, model, "model:model:download"))
            || hasGrant(model.modelId(), versionId, principal.user().id(), principal.user().tenantId(), "DOWNLOAD");
    }

    private boolean canUseForTraining(PlatformPrincipal principal, ModelRecord model, String versionId) {
        return principal.isSuperAdmin()
            || Objects.equals(principal.user().id(), model.ownerUserId())
            || (canView(principal, model, versionId) && hasScopedModelPermission(principal, model, "model:model:use"))
            || hasGrant(model.modelId(), versionId, principal.user().id(), principal.user().tenantId(), "USE_FOR_TRAINING");
    }

    private boolean canDeploy(PlatformPrincipal principal, ModelRecord model, String versionId) {
        return principal.isSuperAdmin()
            || Objects.equals(principal.user().id(), model.ownerUserId())
            || (canView(principal, model, versionId) && hasScopedModelPermission(principal, model, "model:model:deploy"))
            || hasGrant(model.modelId(), versionId, principal.user().id(), principal.user().tenantId(), "DEPLOY");
    }

    private boolean hasScopedModelPermission(PlatformPrincipal principal, ModelRecord model, String permission) {
        if (!principal.hasPermission(permission)) {
            return false;
        }
        if ("PLATFORM".equals(model.scope())) {
            return true;
        }
        if ("BU".equals(model.scope()) && Objects.equals(principal.user().tenantId(), model.ownerOrgId())) {
            return true;
        }
        return false;
    }

    private boolean canManage(PlatformPrincipal principal, ModelRecord model) {
        if (principal.isSuperAdmin() || Objects.equals(principal.user().id(), model.ownerUserId())) {
            return true;
        }
        return !"PRIVATE".equals(model.scope())
            && Objects.equals(principal.user().tenantId(), model.ownerOrgId())
            && principal.isBuAdmin();
    }

    private boolean canManageAnyModelAction(PlatformPrincipal principal, ModelRecord model) {
        return canManage(principal, model)
            || hasScopedModelPermission(principal, model, "model:model:manage")
            || hasScopedModelPermission(principal, model, "model:version:write")
            || hasScopedModelPermission(principal, model, "model:version:manage")
            || hasScopedModelPermission(principal, model, "model:version:delete");
    }

    private boolean canEditModel(PlatformPrincipal principal, ModelRecord model) {
        return canManage(principal, model)
            || hasScopedModelPermission(principal, model, "model:model:manage");
    }

    private boolean canCreateVersion(PlatformPrincipal principal, ModelRecord model) {
        return canManage(principal, model)
            || hasScopedModelPermission(principal, model, "model:version:write");
    }

    private boolean canDeleteVersion(PlatformPrincipal principal, ModelRecord model) {
        return canManage(principal, model)
            || hasScopedModelPermission(principal, model, "model:version:delete");
    }

    private boolean canApproveAccess(PlatformPrincipal principal, ModelRecord model) {
        if (principal.isSuperAdmin() || Objects.equals(principal.user().id(), model.ownerUserId())) {
            return true;
        }
        return Objects.equals(principal.user().tenantId(), model.ownerOrgId())
            && principal.isBuAdmin();
    }

    private boolean canTransitionVersion(PlatformPrincipal principal, ModelRecord model) {
        return canManage(principal, model)
            || hasScopedModelPermission(principal, model, "model:version:manage");
    }

    private void ensureApprover(PlatformPrincipal principal, ModelRecord model) {
        if (canApproveAccess(principal, model)) {
            return;
        }
        throw new PlatformException(40303, 403, "无模型访问权限");
    }

    private void ensureCrossBuRequester(PlatformPrincipal principal, ModelRecord model) {
        if (Objects.equals(principal.user().tenantId(), model.ownerOrgId())) {
            throw new PlatformException(42242, 422, "同 BU 用户不需要跨 BU 授权申请");
        }
    }

    private void ensureCrossBuAccessRequest(AccessRequestRecord accessRequest) {
        if (Objects.equals(accessRequest.requesterOrgId(), accessRequest.ownerOrgId())) {
            throw new PlatformException(42242, 422, "同 BU 用户不需要跨 BU 授权申请");
        }
    }

    private void ensurePendingAccessRequest(AccessRequestRecord accessRequest) {
        if (!"PENDING".equals(accessRequest.status())) {
            throw new PlatformException(PlatformError.CONFLICT, "非待审批申请不可重复处理");
        }
    }

    private boolean hasGrant(String modelId, String versionId, String userId, String requesterOrgId, String permission) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM model_access_grant
            WHERE model_id=? AND requester_user_id=? AND requester_org_id=? AND permission=? AND status='ACTIVE'
              AND ((? IS NULL AND version_id IS NULL) OR (? IS NOT NULL AND (version_id IS NULL OR version_id=?)))
              AND (expires_at IS NULL OR expires_at > ?)
            """, Integer.class, modelId, userId, requesterOrgId, permission, versionId, versionId, versionId, now());
        return count != null && count > 0;
    }

    private boolean hasAnyGrant(String modelId, String userId, String requesterOrgId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM model_access_grant
            WHERE model_id=? AND requester_user_id=? AND requester_org_id=? AND status='ACTIVE'
              AND (expires_at IS NULL OR expires_at > ?)
            """, Integer.class, modelId, userId, requesterOrgId, now());
        return count != null && count > 0;
    }

    private boolean requiresScopeApproval(String currentScope, String requestedScope) {
        return "PLATFORM".equals(requestedScope) && !"PLATFORM".equals(currentScope);
    }

    private boolean statusMatches(String currentVersionId, String expectedStatus) {
        if (isBlank(expectedStatus)) {
            return true;
        }
        if (isBlank(currentVersionId)) {
            return false;
        }
        return expectedStatus.equalsIgnoreCase(requiredCurrentVersion(currentVersionId).status());
    }

    private ModelListSql modelListSql(
        PlatformPrincipal principal,
        String keyword,
        String tag,
        String framework,
        String taskType,
        String scope,
        String status,
        String ownerOrgId
    ) {
        List<String> conditions = new ArrayList<>();
        List<Object> params = new ArrayList<>();
        conditions.add("m.visibility_status='ACTIVE'");
        if (!principal.isSuperAdmin()) {
            conditions.add("""
                (
                    m.owner_user_id=?
                    OR (m.scope='PLATFORM')
                    OR (m.scope='BU' AND m.owner_org_id=?)
                    OR EXISTS (
                        SELECT 1 FROM model_access_grant g
                        WHERE g.model_id=m.model_id
                          AND g.requester_user_id=?
                          AND g.requester_org_id=?
                          AND g.status='ACTIVE'
                          AND (g.expires_at IS NULL OR g.expires_at > ?)
                    )
                )
                """);
            params.add(principal.user().id());
            params.add(principal.user().tenantId());
            params.add(principal.user().id());
            params.add(principal.user().tenantId());
            params.add(now());
        }
        if (!isBlank(keyword)) {
            conditions.add("(LOWER(m.model_id) LIKE ? OR LOWER(m.name) LIKE ? OR LOWER(m.description) LIKE ? OR LOWER(m.tags_json) LIKE ?)");
            String like = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            params.add(like);
            params.add(like);
            params.add(like);
            params.add(like);
        }
        for (String expectedTag : requestedTags(tag)) {
            conditions.add("LOWER(m.tags_json) LIKE ?");
            params.add("%" + expectedTag.toLowerCase(Locale.ROOT) + "%");
        }
        if (!isBlank(framework)) {
            conditions.add("LOWER(m.framework)=?");
            params.add(framework.toLowerCase(Locale.ROOT));
        }
        if (!isBlank(taskType)) {
            conditions.add("LOWER(m.task_type)=?");
            params.add(taskType.toLowerCase(Locale.ROOT));
        }
        if (!isBlank(scope)) {
            conditions.add("LOWER(m.scope)=?");
            params.add(scope.toLowerCase(Locale.ROOT));
        }
        if (!isBlank(ownerOrgId)) {
            conditions.add("m.owner_org_id=?");
            params.add(ownerOrgId);
        }
        if (!isBlank(status)) {
            conditions.add("LOWER(cv.status)=?");
            params.add(status.toLowerCase(Locale.ROOT));
        }
        return new ModelListSql(String.join(" AND ", conditions), params);
    }

    private List<String> requestedTags(String requested) {
        if (isBlank(requested)) {
            return List.of();
        }
        return Arrays.stream(requested.split(","))
            .map(String::trim)
            .filter(item -> !item.isBlank())
            .toList();
    }

    private String placeholders(int count) {
        return String.join(",", java.util.Collections.nCopies(count, "?"));
    }

    private List<String> concat(List<String> first, List<String> second) {
        List<String> values = new ArrayList<>(first);
        values.addAll(second);
        return values;
    }

    private boolean matchesText(String value, String keyword) {
        if (isBlank(keyword)) {
            return true;
        }
        return value != null && value.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT));
    }

    private boolean matchesCsvTag(List<String> tags, String requested) {
        if (isBlank(requested)) {
            return true;
        }
        List<String> expectedTags = Arrays.stream(requested.split(","))
            .map(String::trim)
            .filter(item -> !item.isBlank())
            .toList();
        return tags.containsAll(expectedTags);
    }

    private ModelSummaryResponse toSummary(PlatformPrincipal principal, ModelRecord model) {
        ModelVersionResponse currentVersion = currentVersionOrNull(model);
        return new ModelSummaryResponse(
            model.modelId(),
            model.name(),
            model.description(),
            model.framework(),
            model.taskType(),
            model.inputFormat(),
            model.outputFormat(),
            model.tags(),
            model.scope(),
            model.source(),
            model.ownerUserId(),
            model.ownerOrgId(),
            model.tenantId(),
            model.currentVersionId(),
            currentVersion == null ? null : currentVersion.versionNo(),
            currentVersion == null ? null : currentVersion.status(),
            currentVersion == null ? null : currentVersion.evaluationStatus(),
            permissionSummary(principal, model, model.currentVersionId()),
            model.createdAt(),
            model.updatedAt()
        );
    }

    private ModelDetailResponse toDetail(PlatformPrincipal principal, ModelRecord model) {
        ModelVersionResponse currentVersion = currentVersionOrNull(model);
        List<ModelVersionResponse> visibleVersions = versionsByModelId(principal, model);
        return new ModelDetailResponse(
            model.modelId(),
            model.name(),
            model.description(),
            model.framework(),
            model.taskType(),
            model.inputFormat(),
            model.outputFormat(),
            model.runtimeRequirements(),
            model.tags(),
            model.scope(),
            model.source(),
            model.ownerUserId(),
            model.ownerOrgId(),
            model.tenantId(),
            model.currentVersionId(),
            permissionSummary(principal, model, currentVersion == null ? null : currentVersion.versionId()),
            visibleVersions,
            recentAuditEvents(model.modelId(), visibleVersions.stream().map(ModelVersionResponse::versionId).toList()),
            model.createdAt(),
            model.updatedAt()
        );
    }

    private List<ModelVersionResponse> versionsByModelId(String modelId) {
        return jdbc.query("SELECT * FROM model_registry_version WHERE model_id=? ORDER BY created_at DESC", (rs, rowNum) -> versionRow(rs), modelId);
    }

    private List<ModelVersionResponse> versionsByModelId(PlatformPrincipal principal, ModelRecord model) {
        return jdbc.query("SELECT * FROM model_registry_version WHERE model_id=? ORDER BY created_at DESC", (rs, rowNum) -> versionRow(rs), model.modelId())
            .stream()
            .filter(version -> canView(principal, model, version.versionId()))
            .map(version -> enrichVersion(principal, model, version))
            .toList();
    }

    private List<ModelAuditEventResponse> recentAuditEvents(String modelId, List<String> versionIds) {
        List<String> resourceIds = new ArrayList<>();
        resourceIds.add(modelId);
        resourceIds.addAll(versionIds);
        if (!versionIds.isEmpty()) {
            resourceIds.addAll(jdbc.queryForList("""
                SELECT request_id
                FROM model_access_request
                WHERE model_id=? AND (version_id IS NULL OR version_id IN (%s))
                """.formatted(placeholders(versionIds.size())), String.class, concat(List.of(modelId), versionIds).toArray()));
        } else {
            resourceIds.addAll(jdbc.queryForList("""
                SELECT request_id
                FROM model_access_request
                WHERE model_id=?
                """, String.class, modelId));
        }
        return jdbc.query("""
            SELECT event_id, action, operator_name, occurred_at, result
            FROM platform_audit_log
            WHERE resource_id IN (%s)
            ORDER BY occurred_at DESC
            """.formatted(placeholders(resourceIds.size())), (rs, rowNum) -> new ModelAuditEventResponse(
            rs.getString("event_id"),
            rs.getString("action"),
            rs.getString("operator_name"),
            rs.getObject("occurred_at", OffsetDateTime.class),
            rs.getString("result")
        ), resourceIds.toArray());
    }

    private ModelPermissionSummary permissionSummary(PlatformPrincipal principal, ModelRecord model, String versionId) {
        return new ModelPermissionSummary(
            canView(principal, model, versionId),
            canDownload(principal, model, versionId),
            canUseForTraining(principal, model, versionId),
            canDeploy(principal, model, versionId),
            canManageAnyModelAction(principal, model),
            canEditModel(principal, model),
            canCreateVersion(principal, model),
            canDeleteVersion(principal, model),
            canApproveAccess(principal, model)
        );
    }

    private ModelVersionResponse enrichVersion(PlatformPrincipal principal, ModelRecord model, ModelVersionResponse version) {
        ModelPermissionSummary permissionSummary = permissionSummary(principal, model, version.versionId());
        return new ModelVersionResponse(
            version.versionId(),
            version.modelId(),
            version.versionNo(),
            version.fileObjectId(),
            version.fileName(),
            version.fileExtension(),
            version.fileSizeBytes(),
            version.checksum(),
            version.storageBucket(),
            version.storageKey(),
            version.runtimeRequirements(),
            version.metricsSummary(),
            version.securityScanStatus(),
            version.evaluationStatus(),
            version.evaluationRecordId(),
            version.evaluationProof(),
            version.status(),
            version.activeDeploymentCount(),
            version.activeReferences(),
            permissionSummary,
            canDownload(principal, model, version.versionId()),
            canTransitionVersion(principal, model) ? STATUS_TRANSITIONS.getOrDefault(version.status(), List.of()) : List.of(),
            version.createdBy(),
            version.createdAt()
        );
    }

    private void recordViewAudit(PlatformPrincipal principal, ModelRecord model) {
        recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_VIEWED", "Model", model.modelId(), "SUCCESS", null, null, "view");
    }

    private void recordAudit(PlatformPrincipal principal, String tenantId, String ownerOrgId, String action, String resourceType, String resourceId, String result, String before, String after, String detail) {
        OffsetDateTime occurredAt = now();
        String eventId = "EVT-" + randomIdPart(16);
        String traceId = blankToDefault(PlatformResponses.traceId(), "trace-" + randomIdPart(8));
        String operatorRole = String.join(",", principal.roleNames());
        String id = UUID.randomUUID().toString();
        String detailJson = "ownerOrgId=" + ownerOrgId + ";" + blankToDefault(detail, "");
        String signature = sha256(String.join(
            "|",
            id,
            eventId,
            blankToDefault(tenantId, ""),
            principal.user().id(),
            principal.user().displayName(),
            operatorRole,
            action,
            resourceType,
            resourceId,
            result,
            "INFO",
            blankToDefault(before, ""),
            blankToDefault(after, ""),
            detailJson,
            traceId,
            canonicalTime(occurredAt)
        ));
        jdbc.update("""
            INSERT INTO platform_audit_log (
                id, event_id, tenant_id, operator_id, operator_name, operator_role,
                action, resource_type, resource_id, result, risk_level, before_json,
                after_json, detail_json, trace_id, signature, occurred_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INFO', ?, ?, ?, ?, ?, ?)
            """,
            id,
            eventId,
            tenantId,
            principal.user().id(),
            principal.user().displayName(),
            operatorRole,
            action,
            resourceType,
            resourceId,
            result,
            before,
            after,
            detailJson,
            traceId,
            signature,
            occurredAt
        );
    }

    private ModelRecord modelById(String modelId) {
        try {
            return jdbc.queryForObject("SELECT * FROM model_registry_model WHERE model_id=?", (rs, rowNum) -> modelRow(rs), modelId);
        } catch (EmptyResultDataAccessException exception) {
            throw resourceNotFound();
        }
    }

    private ModelVersionResponse versionById(String versionId) {
        try {
            return jdbc.queryForObject("SELECT * FROM model_registry_version WHERE version_id=?", (rs, rowNum) -> versionRow(rs), versionId);
        } catch (EmptyResultDataAccessException exception) {
            throw resourceNotFound();
        }
    }

    private ModelVersionResponse versionById(PlatformPrincipal principal, ModelRecord model, String versionId) {
        return enrichVersion(principal, model, versionById(versionId));
    }

    private AccessRequestRecord accessRequestRecord(String requestId) {
        try {
            return jdbc.queryForObject("""
            SELECT request_id, model_id, version_id, requester_user_id, requester_org_id, owner_org_id, permission, status
            FROM model_access_request WHERE request_id=?
            """, (rs, rowNum) -> new AccessRequestRecord(
            rs.getString("request_id"),
            rs.getString("model_id"),
            rs.getString("version_id"),
            rs.getString("requester_user_id"),
            rs.getString("requester_org_id"),
            rs.getString("owner_org_id"),
            rs.getString("permission"),
            rs.getString("status")
        ), requestId);
        } catch (EmptyResultDataAccessException exception) {
            throw resourceNotFound();
        }
    }

    private ModelAccessRequestResponse accessRequestById(String requestId) {
        try {
            return jdbc.queryForObject("""
            SELECT * FROM model_access_request WHERE request_id=?
            """, (rs, rowNum) -> accessRequestRow(rs), requestId);
        } catch (EmptyResultDataAccessException exception) {
            throw resourceNotFound();
        }
    }


    private ModelAccessRequestResponse accessRequestRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ModelAccessRequestResponse(
            rs.getString("request_id"),
            rs.getString("model_id"),
            rs.getString("version_id"),
            rs.getString("requester_user_id"),
            rs.getString("requester_org_id"),
            rs.getString("owner_org_id"),
            rs.getString("permission"),
            rs.getString("reason"),
            rs.getString("status"),
            rs.getString("review_comment"),
            rs.getString("reviewed_by"),
            rs.getObject("reviewed_at", OffsetDateTime.class),
            rs.getObject("expires_at", OffsetDateTime.class)
        );
    }

    private FileObjectRecord accessibleModelFile(String tenantId, String fileObjectId) {
        FileObjectRecord file;
        try {
            file = jdbc.queryForObject("""
                SELECT * FROM platform_file_object WHERE file_id=? AND asset_type='MODEL' AND status='AVAILABLE'
                """, (rs, rowNum) -> new FileObjectRecord(
                rs.getString("file_id"),
                rs.getString("tenant_id"),
                rs.getString("bucket"),
                rs.getString("object_key"),
                rs.getString("sha256"),
                nullableLong(rs, "size_bytes"),
                rs.getString("content_type")
            ), fileObjectId);
        } catch (EmptyResultDataAccessException exception) {
            throw new PlatformException(42233, 422, "模型文件不存在或无法访问");
        }
        if (!Objects.equals(file.tenantId(), tenantId)) {
            throw new PlatformException(42233, 422, "模型文件不存在或无法访问");
        }
        return file.withFileName(file.objectKey().substring(file.objectKey().lastIndexOf('/') + 1));
    }

    private ModelVersionResponse currentVersionOrNull(ModelRecord model) {
        if (isBlank(model.currentVersionId())) {
            return null;
        }
        return versionByIdOrNull(model.currentVersionId());
    }

    private ModelVersionResponse requiredCurrentVersion(String versionId) {
        ModelVersionResponse version = versionByIdOrNull(versionId);
        if (version == null) {
            throw resourceNotFound();
        }
        return version;
    }

    private ModelVersionResponse versionByIdOrNull(String versionId) {
        try {
            return jdbc.queryForObject("SELECT * FROM model_registry_version WHERE version_id=?", (rs, rowNum) -> versionRow(rs), versionId);
        } catch (EmptyResultDataAccessException exception) {
            return null;
        }
    }

    private PlatformException resourceNotFound() {
        return new PlatformException(40400, 404, "资源不存在");
    }

    private ModelRecord modelRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ModelRecord(
            rs.getString("model_id"),
            rs.getString("name"),
            rs.getString("description"),
            rs.getString("framework"),
            rs.getString("task_type"),
            rs.getString("input_format"),
            rs.getString("output_format"),
            rs.getString("runtime_requirements"),
            fromJsonList(rs.getString("tags_json")),
            rs.getString("scope"),
            rs.getString("source"),
            rs.getString("owner_user_id"),
            rs.getString("owner_org_id"),
            rs.getString("tenant_id"),
            rs.getString("current_version_id"),
            rs.getString("visibility_status"),
            rs.getObject("created_at", OffsetDateTime.class),
            rs.getObject("updated_at", OffsetDateTime.class)
        );
    }

    private ModelVersionResponse versionRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ModelVersionResponse(
            rs.getString("version_id"),
            rs.getString("model_id"),
            rs.getString("version_no"),
            rs.getString("file_object_id"),
            rs.getString("file_name"),
            rs.getString("file_extension"),
            rs.getLong("file_size_bytes"),
            rs.getString("checksum"),
            rs.getString("storage_bucket"),
            rs.getString("storage_key"),
            rs.getString("runtime_requirements"),
            fromJsonMap(rs.getString("metrics_summary_json")),
            rs.getString("security_scan_status"),
            rs.getString("evaluation_status"),
            rs.getString("evaluation_record_id"),
            rs.getString("evaluation_proof"),
            rs.getString("status"),
            rs.getInt("active_deployment_count"),
            fromJsonActiveReferences(rs.getString("active_reference_json")),
            null,
            false,
            List.of(),
            rs.getString("created_by"),
            rs.getObject("created_at", OffsetDateTime.class)
        );
    }


    private void ensureAccessVersionBelongsToModel(String modelId, String versionId) {
        if (isBlank(versionId)) {
            return;
        }
        ModelVersionResponse version = versionById(versionId);
        ensureVersionBelongsToModel(version, modelId);
    }

    private void ensureVersionBelongsToModel(ModelVersionResponse version, String modelId) {
        if (!Objects.equals(version.modelId(), modelId)) {
            throw new PlatformException(40400, 404, "资源不存在");
        }
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return List.of();
        }
        return tags.stream()
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(item -> !item.isBlank())
            .distinct()
            .toList();
    }

    private String normalizedScope(String value) {
        String scope = normalizedEnum(value);
        if (!List.of("PLATFORM", "BU", "PRIVATE").contains(scope)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return scope;
    }

    private String normalizedFramework(String value) {
        String framework = normalizedEnum(value);
        if (!List.of("PYTORCH", "TENSORFLOW", "PADDLE", "ONNX").contains(framework)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return framework;
    }

    private String normalizedTaskType(String value) {
        String taskType = normalizedEnum(value);
        if (!List.of("IMAGE_CLASSIFICATION", "OBJECT_DETECTION", "SEMANTIC_SEGMENTATION", "NLP_TEXT_CLASSIFICATION", "TIME_SERIES_FORECAST", "ANOMALY_DETECTION").contains(taskType)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return taskType;
    }

    private String normalizedSource(String value) {
        String source = normalizedEnum(value);
        if (!List.of("PLATFORM_BUILT_IN", "LOCAL_UPLOAD", "TRAINING_OUTPUT", "EXTERNAL_IMPORT").contains(source)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return source;
    }


    private String normalizeAccessRequestStatus(String value) {
        String status = normalizedEnum(value);
        if (!List.of("PENDING", "APPROVED", "REJECTED").contains(status)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return status;
    }

    private String normalizedPermission(String value) {        String permission = normalizedEnum(value);
        if (!List.of("VIEW", "DOWNLOAD", "USE_FOR_TRAINING", "DEPLOY").contains(permission)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return permission;
    }

    private String normalizedEvaluationStatus(String value) {
        String status = normalizedEnum(blankToDefault(value, "NONE"));
        if (!List.of("NONE", "PASSED", "FAILED", "IMPORTED_PROOF").contains(status)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return status;
    }

    private String normalizedEnum(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private List<String> fromJsonList(String value) {
        if (isBlank(value)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(value, STRING_LIST_TYPE);
        } catch (Exception exception) {
            return List.of();
        }
    }

    private Map<String, Object> fromJsonMap(String value) {
        if (isBlank(value)) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(value, MAP_TYPE);
        } catch (Exception exception) {
            return Map.of();
        }
    }

    private List<ActiveReferenceResponse> fromJsonActiveReferences(String value) {
        if (isBlank(value)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(value, ACTIVE_REF_TYPE);
        } catch (Exception exception) {
            return List.of();
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private String extension(String objectKey) {
        int index = objectKey.lastIndexOf('.');
        return index < 0 ? "" : objectKey.substring(index).toLowerCase(Locale.ROOT);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private String randomIdPart(int length) {
        return UUID.randomUUID().toString().replace("-", "").substring(0, length).toUpperCase(Locale.ROOT);
    }

    private String canonicalTime(OffsetDateTime value) {
        return value == null ? "" : value.toInstant().truncatedTo(ChronoUnit.MICROS).atOffset(ZoneOffset.UTC).toString();
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String blankToDefault(String value, String defaultValue) {
        return isBlank(value) ? defaultValue : value;
    }

    private String blankToNull(String value) {
        return isBlank(value) ? null : value;
    }

    private <T> T defaultIfNull(T value, T defaultValue) {
        return value == null ? defaultValue : value;
    }

    private long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? 0L : value;
    }

    private record ModelRecord(
        String modelId,
        String name,
        String description,
        String framework,
        String taskType,
        String inputFormat,
        String outputFormat,
        String runtimeRequirements,
        List<String> tags,
        String scope,
        String source,
        String ownerUserId,
        String ownerOrgId,
        String tenantId,
        String currentVersionId,
        String visibilityStatus,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {
    }

    private record ModelListSql(String whereClause, List<Object> params) {
    }

    private record AccessRequestRecord(
        String requestId,
        String modelId,
        String versionId,
        String requesterUserId,
        String requesterOrgId,
        String ownerOrgId,
        String permission,
        String status
    ) {
    }

    private record FileObjectRecord(
        String fileId,
        String tenantId,
        String bucket,
        String objectKey,
        String sha256,
        long sizeBytes,
        String contentType,
        String fileName
    ) {
        private FileObjectRecord(String fileId, String tenantId, String bucket, String objectKey, String sha256, long sizeBytes, String contentType) {
            this(fileId, tenantId, bucket, objectKey, sha256, sizeBytes, contentType, null);
        }

        private FileObjectRecord withFileName(String nextFileName) {
            return new FileObjectRecord(fileId, tenantId, bucket, objectKey, sha256, sizeBytes, contentType, nextFileName);
        }
    }
}
