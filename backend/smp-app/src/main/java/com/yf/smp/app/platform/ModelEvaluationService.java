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
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ModelEvaluationService {
    static final int CODE_EVALUATION_REQUIRED = 42254;
    private static final int DOWNLOAD_EXPIRES_SECONDS = 600;
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };
    private static final TypeReference<List<Object>> OBJECT_LIST_TYPE = new TypeReference<>() { };

    private final JdbcTemplate jdbc;
    private final PlatformIdentityService identityService;
    private final ObjectStorageService objectStorageService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ModelEvaluationService(JdbcTemplate jdbc, PlatformIdentityService identityService, ObjectStorageService objectStorageService) {
        this.jdbc = jdbc;
        this.identityService = identityService;
        this.objectStorageService = objectStorageService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ModelEvaluationRunResponse> listEvaluations(PlatformPrincipal principal, String keyword, String modelId, String versionId, String status, int page, int pageSize) {
        identityService.requirePermission(principal, "model:evaluation:read");
        int normalizedPage = Math.max(1, page);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 100));
        EvaluationListSql listSql = evaluationListSql(principal, keyword, modelId, versionId, status);
        Integer total = jdbc.queryForObject("SELECT COUNT(*) FROM model_evaluation_run r JOIN model_registry_model m ON m.model_id=r.model_id JOIN model_registry_version v ON v.version_id=r.version_id JOIN dataset d ON d.dataset_id=r.dataset_id WHERE " + listSql.whereClause(), Integer.class, listSql.params().toArray());
        List<Object> params = new ArrayList<>(listSql.params());
        params.add(normalizedPageSize);
        params.add((normalizedPage - 1) * normalizedPageSize);
        List<ModelEvaluationRunResponse> items = jdbc.query("""
                SELECT r.*, m.name AS model_name, v.version_no, d.name AS dataset_name, dv.version_name AS dataset_version_name
                FROM model_evaluation_run r
                JOIN model_registry_model m ON m.model_id=r.model_id
                JOIN model_registry_version v ON v.version_id=r.version_id
                JOIN dataset d ON d.dataset_id=r.dataset_id
                JOIN dataset_version dv ON dv.version_id=r.dataset_version_id
                WHERE %s
                ORDER BY r.created_at DESC
                LIMIT ? OFFSET ?
                """.formatted(listSql.whereClause()), (rs, rowNum) -> runRow(rs), params.toArray());
        return new PageResponse<>(items, total == null ? 0 : total, normalizedPage, normalizedPageSize);
    }

    @Transactional
    public ModelEvaluationRunResponse createEvaluation(PlatformPrincipal principal, ModelEvaluationCreateRequest request) {
        identityService.requirePermission(principal, "model:evaluation:write");
        validateCreateRequest(request);
        ModelRecord model = requireModelAction(principal, request.modelId(), request.versionId(), "model:evaluation:write");
        VersionRecord version = versionById(request.versionId());
        if (!Objects.equals(version.modelId(), request.modelId())) {
            throw resourceNotFound();
        }
        DatasetVersionRecord datasetVersion = datasetVersionById(request.datasetVersionId());
        ensureDatasetAccessible(principal, datasetVersion);
        OffsetDateTime now = now();
        String runId = "EVAL-" + randomIdPart(16);
        jdbc.update("""
            INSERT INTO model_evaluation_run (
                evaluation_run_id, model_id, version_id, dataset_id, dataset_version_id, task_type, status,
                metric_config_json, threshold_config_json, result_summary_json, report_summary, curve_data_json,
                confusion_matrix_json, error_cases_json, executor_type, external_run_id, notes,
                owner_user_id, owner_org_id, tenant_id, created_at, updated_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'READY', ?, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, NULL)
            """,
            runId,
            request.modelId(),
            request.versionId(),
            datasetVersion.datasetId(),
            datasetVersion.versionId(),
            normalizedTaskType(blankToDefault(request.taskType(), version.taskType())),
            toJson(defaultIfNull(request.metricConfig(), Map.of())),
            toJson(normalizeThresholds(request.thresholdConfig())),
            normalizedExecutorType(request.executorType()),
            blankToNull(request.notes()),
            principal.user().id(),
            model.ownerOrgId(),
            model.tenantId(),
            now,
            now
        );
        recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_EVALUATION_CREATED", "EvaluationRun", runId, "SUCCESS", null, request.versionId(), "TASK-model-evaluation-readiness;AC-01;datasetVersionId=" + datasetVersion.versionId());
        return runById(runId);
    }

    @Transactional
    public ModelEvaluationDetailResponse detail(PlatformPrincipal principal, String evaluationRunId) {
        identityService.requirePermission(principal, "model:evaluation:read");
        ModelEvaluationRunResponse run = runById(evaluationRunId);
        requireViewableModel(principal, run.modelId(), run.versionId());
        recordAudit(principal, run.tenantId(), run.ownerOrgId(), "MODEL_EVALUATION_REPORT_VIEWED", "EvaluationRun", evaluationRunId, "SUCCESS", null, null, "TASK-model-evaluation-readiness;AC-07");
        return detailResponse(run);
    }

    @Transactional
    public ModelEvaluationDetailResponse importResults(PlatformPrincipal principal, String evaluationRunId, ModelEvaluationResultImportRequest request) {
        identityService.requirePermission(principal, "model:evaluation:import");
        ModelEvaluationRunResponse run = runById(evaluationRunId);
        requireModelAction(principal, run.modelId(), run.versionId(), "model:evaluation:import");
        if (List.of("PASSED", "FAILED", "CANCELLED").contains(run.status())) {
            throw new PlatformException(40952, 409, "终态评估不可重复导入结果");
        }
        Map<String, Object> metrics = request == null ? Map.of() : defaultIfNull(request.metricResults(), Map.of());
        Map<String, Object> thresholds = run.thresholdConfig();
        if (thresholds.isEmpty()) {
            throw new PlatformException(42253, 422, "评估阈值不能为空");
        }
        for (String metricName : thresholds.keySet()) {
            if (!metrics.containsKey(metricName)) {
                throw new PlatformException(42253, 422, "导入结果缺少必需指标: " + metricName);
            }
        }
        OffsetDateTime now = now();
        String status = evaluateStatus(thresholds, metrics);
        jdbc.update("DELETE FROM model_evaluation_metric WHERE evaluation_run_id=?", evaluationRunId);
        for (Map.Entry<String, Object> entry : metrics.entrySet()) {
            Double metricValue = numericOrNull(entry.getValue());
            if (metricValue == null) {
                continue;
            }
            Double threshold = numericOrNull(thresholds.get(entry.getKey()));
            boolean passed = threshold == null || metricValue >= threshold;
            jdbc.update("""
                INSERT INTO model_evaluation_metric (metric_id, evaluation_run_id, metric_name, metric_value, threshold_value, passed, category, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'PRIMARY', ?)
                """, "EMET-" + randomIdPart(16), evaluationRunId, entry.getKey(), metricValue, threshold, passed, now);
        }
        List<ModelEvaluationArtifactInput> artifacts = request == null || request.artifacts() == null ? List.of() : request.artifacts();
        jdbc.update("DELETE FROM model_evaluation_report_artifact WHERE evaluation_run_id=?", evaluationRunId);
        for (ModelEvaluationArtifactInput artifact : artifacts) {
            validateArtifact(principal, run, artifact);
            jdbc.update("""
                INSERT INTO model_evaluation_report_artifact (artifact_id, evaluation_run_id, artifact_type, file_object_id, name, download_policy, created_at)
                VALUES (?, ?, ?, ?, ?, 'AUTHENTICATED', ?)
                """, "EART-" + randomIdPart(16), evaluationRunId, normalizedArtifactType(artifact.artifactType()), blankToNull(artifact.fileObjectId()), blankToDefault(artifact.name(), normalizedArtifactType(artifact.artifactType())), now);
        }
        jdbc.update("""
            UPDATE model_evaluation_run
            SET status=?, result_summary_json=?, report_summary=?, curve_data_json=?, confusion_matrix_json=?, error_cases_json=?, external_run_id=?, updated_at=?, completed_at=?
            WHERE evaluation_run_id=?
            """,
            status,
            toJson(metrics),
            blankToNull(request == null ? null : request.reportSummary()),
            toJson(request == null ? Map.of() : defaultIfNull(request.curveData(), Map.of())),
            toJson(request == null ? Map.of() : defaultIfNull(request.confusionMatrix(), Map.of())),
            toJson(request == null ? List.of() : defaultIfNull(request.errorCases(), List.of())),
            blankToNull(request == null ? null : request.externalRunId()),
            now,
            now,
            evaluationRunId
        );
        jdbc.update("UPDATE model_registry_version SET evaluation_status=?, evaluation_record_id=?, metrics_summary_json=? WHERE version_id=?", status, evaluationRunId, toJson(metrics), run.versionId());
        recordAudit(principal, run.tenantId(), run.ownerOrgId(), "MODEL_EVALUATION_RESULT_IMPORTED", "EvaluationRun", evaluationRunId, "SUCCESS", run.status(), status, "TASK-model-evaluation-readiness;AC-03");
        recordAudit(principal, run.tenantId(), run.ownerOrgId(), "PASSED".equals(status) ? "MODEL_EVALUATION_PASSED" : "MODEL_EVALUATION_FAILED", "EvaluationRun", evaluationRunId, status, null, toJson(metrics), "TASK-model-evaluation-readiness;AC-11");
        return detailResponse(runById(evaluationRunId));
    }

    @Transactional(readOnly = true)
    public List<ModelEvaluationRunResponse> versionEvaluations(PlatformPrincipal principal, String modelId, String versionId) {
        identityService.requirePermission(principal, "model:evaluation:read");
        requireViewableModel(principal, modelId, versionId);
        return jdbc.query("""
            SELECT r.*, m.name AS model_name, v.version_no, d.name AS dataset_name, dv.version_name AS dataset_version_name
            FROM model_evaluation_run r
            JOIN model_registry_model m ON m.model_id=r.model_id
            JOIN model_registry_version v ON v.version_id=r.version_id
            JOIN dataset d ON d.dataset_id=r.dataset_id
            JOIN dataset_version dv ON dv.version_id=r.dataset_version_id
            WHERE r.model_id=? AND r.version_id=?
            ORDER BY r.created_at DESC
            """, (rs, rowNum) -> runRow(rs), modelId, versionId);
    }

    @Transactional
    public ModelEvaluationCompareResponse compare(PlatformPrincipal principal, String modelId, String versionIdsCsv) {
        identityService.requirePermission(principal, "model:evaluation:read");
        List<String> versionIds = parseVersionIds(versionIdsCsv);
        if (versionIds.size() < 2) {
            throw new PlatformException(40000, 400, "至少选择两个版本进行对比");
        }
        for (String versionId : versionIds) {
            requireViewableModel(principal, modelId, versionId);
        }
        List<ModelEvaluationRunResponse> runs = latestRunsForCompare(modelId, versionIds);
        Map<String, List<ModelEvaluationCompareMetricValue>> byMetric = new LinkedHashMap<>();
        for (ModelEvaluationRunResponse run : runs) {
            for (ModelEvaluationMetricResponse metric : metrics(run.evaluationRunId())) {
                byMetric.computeIfAbsent(metric.metricName(), ignored -> new ArrayList<>()).add(new ModelEvaluationCompareMetricValue(
                    run.versionId(),
                    run.versionNo(),
                    run.evaluationRunId(),
                    run.status(),
                    metric.metricValue(),
                    false
                ));
            }
        }
        List<ModelEvaluationCompareMetricRow> rows = byMetric.entrySet().stream()
            .map(entry -> new ModelEvaluationCompareMetricRow(entry.getKey(), markBest(entry.getValue())))
            .toList();
        ModelEvaluationCompareResponse response = new ModelEvaluationCompareResponse(modelId, versionIds, rows);
        ModelRecord model = modelById(modelId);
        recordAudit(principal, model.tenantId(), model.ownerOrgId(), "MODEL_EVALUATION_COMPARE_VIEWED", "Model", modelId, "SUCCESS", null, versionIds.toString(), "TASK-model-evaluation-readiness;AC-08");
        return response;
    }

    @Transactional
    public ModelEvaluationArtifactDownloadResponse artifactDownloadUrl(PlatformPrincipal principal, String evaluationRunId, String artifactId) {
        identityService.requirePermission(principal, "model:evaluation:download");
        ModelEvaluationRunResponse run = runById(evaluationRunId);
        requireViewableModel(principal, run.modelId(), run.versionId());
        ModelEvaluationArtifactResponse artifact = artifactById(evaluationRunId, artifactId);
        String downloadUrl = null;
        String diagnostic = "ARTIFACT_WITHOUT_FILE_OBJECT";
        if (!isBlank(artifact.fileObjectId())) {
            FileObjectRecord file = requireArtifactFileAccessible(principal, run, artifact.artifactType(), artifact.fileObjectId());
            downloadUrl = objectStorageService.presignedDownloadUrl(file.bucket(), file.objectKey(), artifact.name(), DOWNLOAD_EXPIRES_SECONDS);
            diagnostic = downloadUrl == null ? objectStorageService.downloadDiagnostic() : "PRESIGNED_URL_READY";
            if (downloadUrl == null || downloadUrl.isBlank()) {
                downloadUrl = "/api/v1/platform/files/" + artifact.fileObjectId() + "/content";
                diagnostic = diagnostic.startsWith("TODO_CONFIRM") ? diagnostic + ";AUTHENTICATED_CONTENT_ENDPOINT_READY" : "AUTHENTICATED_CONTENT_ENDPOINT_READY";
            }
        }
        recordAudit(principal, run.tenantId(), run.ownerOrgId(), "MODEL_EVALUATION_ARTIFACT_DOWNLOADED", "EvaluationArtifact", artifactId, "SUCCESS", null, null, "TASK-model-evaluation-readiness;AC-09;" + diagnostic);
        return new ModelEvaluationArtifactDownloadResponse(artifactId, downloadUrl, DOWNLOAD_EXPIRES_SECONDS, diagnostic);
    }

    @Transactional(readOnly = true)
    public boolean hasPassedEvaluation(String modelId, String versionId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM model_evaluation_run WHERE model_id=? AND version_id=? AND status='PASSED'", Integer.class, modelId, versionId);
        return count != null && count > 0;
    }

    private ModelEvaluationDetailResponse detailResponse(ModelEvaluationRunResponse run) {
        return new ModelEvaluationDetailResponse(
            run,
            metrics(run.evaluationRunId()),
            artifacts(run.evaluationRunId()),
            fromJsonMap(jsonColumn("SELECT curve_data_json FROM model_evaluation_run WHERE evaluation_run_id=?", run.evaluationRunId())),
            fromJsonMap(jsonColumn("SELECT confusion_matrix_json FROM model_evaluation_run WHERE evaluation_run_id=?", run.evaluationRunId())),
            fromJsonList(jsonColumn("SELECT error_cases_json FROM model_evaluation_run WHERE evaluation_run_id=?", run.evaluationRunId()))
        );
    }

    private String evaluateStatus(Map<String, Object> thresholds, Map<String, Object> metrics) {
        for (Map.Entry<String, Object> entry : thresholds.entrySet()) {
            Double threshold = numericOrNull(entry.getValue());
            Double metric = numericOrNull(metrics.get(entry.getKey()));
            if (threshold == null || metric == null || metric < threshold) {
                return "FAILED";
            }
        }
        return "PASSED";
    }

    private List<ModelEvaluationCompareMetricValue> markBest(List<ModelEvaluationCompareMetricValue> values) {
        Double bestValue = values.stream().map(ModelEvaluationCompareMetricValue::value).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
        return values.stream()
            .map(value -> new ModelEvaluationCompareMetricValue(value.versionId(), value.versionNo(), value.evaluationRunId(), value.status(), value.value(), bestValue != null && Objects.equals(value.value(), bestValue)))
            .toList();
    }

    private List<ModelEvaluationRunResponse> latestRunsForCompare(String modelId, List<String> versionIds) {
        return jdbc.query("""
            SELECT r.*, m.name AS model_name, v.version_no, d.name AS dataset_name, dv.version_name AS dataset_version_name
            FROM model_evaluation_run r
            JOIN model_registry_model m ON m.model_id=r.model_id
            JOIN model_registry_version v ON v.version_id=r.version_id
            JOIN dataset d ON d.dataset_id=r.dataset_id
            JOIN dataset_version dv ON dv.version_id=r.dataset_version_id
            WHERE r.model_id=? AND r.version_id IN (%s)
              AND r.created_at=(SELECT MAX(r2.created_at) FROM model_evaluation_run r2 WHERE r2.model_id=r.model_id AND r2.version_id=r.version_id)
            ORDER BY v.version_no
            """.formatted(placeholders(versionIds.size())), (rs, rowNum) -> runRow(rs), queryArgs(modelId, versionIds));
    }

    private EvaluationListSql evaluationListSql(PlatformPrincipal principal, String keyword, String modelId, String versionId, String status) {
        List<String> conditions = new ArrayList<>();
        List<Object> params = new ArrayList<>();
        if (!principal.isSuperAdmin()) {
            conditions.add("(m.owner_user_id=? OR (m.scope='PLATFORM' AND ?=TRUE) OR (m.scope='BU' AND m.owner_org_id=? AND ?=TRUE) OR EXISTS (SELECT 1 FROM model_access_grant g WHERE g.model_id=m.model_id AND g.requester_user_id=? AND g.requester_org_id=? AND g.status='ACTIVE' AND (g.version_id IS NULL OR g.version_id=r.version_id) AND (g.expires_at IS NULL OR g.expires_at > CURRENT_TIMESTAMP)))");
            boolean canRead = principal.hasPermission("model:model:read");
            params.add(principal.user().id());
            params.add(canRead);
            params.add(principal.user().tenantId());
            params.add(canRead);
            params.add(principal.user().id());
            params.add(principal.user().tenantId());
        } else {
            conditions.add("1=1");
        }
        if (!isBlank(keyword)) {
            conditions.add("(LOWER(m.name) LIKE ? OR LOWER(r.evaluation_run_id) LIKE ? OR LOWER(d.name) LIKE ?)");
            String like = "%" + keyword.toLowerCase(Locale.ROOT).trim() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
        }
        if (!isBlank(modelId)) {
            conditions.add("r.model_id=?");
            params.add(modelId.trim());
        }
        if (!isBlank(versionId)) {
            conditions.add("r.version_id=?");
            params.add(versionId.trim());
        }
        if (!isBlank(status)) {
            conditions.add("r.status=?");
            params.add(normalizedStatus(status));
        }
        return new EvaluationListSql(String.join(" AND ", conditions), params);
    }

    private ModelEvaluationRunResponse runById(String evaluationRunId) {
        try {
            return jdbc.queryForObject("""
                SELECT r.*, m.name AS model_name, v.version_no, d.name AS dataset_name, dv.version_name AS dataset_version_name
                FROM model_evaluation_run r
                JOIN model_registry_model m ON m.model_id=r.model_id
                JOIN model_registry_version v ON v.version_id=r.version_id
                JOIN dataset d ON d.dataset_id=r.dataset_id
                JOIN dataset_version dv ON dv.version_id=r.dataset_version_id
                WHERE r.evaluation_run_id=?
                """, (rs, rowNum) -> runRow(rs), evaluationRunId);
        } catch (EmptyResultDataAccessException exception) {
            throw resourceNotFound();
        }
    }

    private ModelEvaluationRunResponse runRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ModelEvaluationRunResponse(
            rs.getString("evaluation_run_id"),
            rs.getString("model_id"),
            rs.getString("model_name"),
            rs.getString("version_id"),
            rs.getString("version_no"),
            rs.getString("dataset_id"),
            rs.getString("dataset_name"),
            rs.getString("dataset_version_id"),
            rs.getString("dataset_version_name"),
            rs.getString("task_type"),
            rs.getString("status"),
            fromJsonMap(rs.getString("metric_config_json")),
            fromJsonMap(rs.getString("threshold_config_json")),
            fromJsonMap(rs.getString("result_summary_json")),
            rs.getString("report_summary"),
            rs.getString("executor_type"),
            rs.getString("external_run_id"),
            rs.getString("owner_user_id"),
            rs.getString("owner_org_id"),
            rs.getString("tenant_id"),
            rs.getObject("created_at", OffsetDateTime.class),
            rs.getObject("updated_at", OffsetDateTime.class),
            rs.getObject("completed_at", OffsetDateTime.class)
        );
    }

    private List<ModelEvaluationMetricResponse> metrics(String evaluationRunId) {
        return jdbc.query("SELECT * FROM model_evaluation_metric WHERE evaluation_run_id=? ORDER BY metric_name", (rs, rowNum) -> new ModelEvaluationMetricResponse(
            rs.getString("metric_id"),
            rs.getString("evaluation_run_id"),
            rs.getString("metric_name"),
            rs.getDouble("metric_value"),
            nullableDouble(rs, "threshold_value"),
            rs.getBoolean("passed"),
            rs.getString("category"),
            rs.getObject("created_at", OffsetDateTime.class)
        ), evaluationRunId);
    }

    private List<ModelEvaluationArtifactResponse> artifacts(String evaluationRunId) {
        return jdbc.query("SELECT * FROM model_evaluation_report_artifact WHERE evaluation_run_id=? ORDER BY created_at", (rs, rowNum) -> artifactRow(rs), evaluationRunId);
    }

    private ModelEvaluationArtifactResponse artifactById(String evaluationRunId, String artifactId) {
        try {
            return jdbc.queryForObject("SELECT * FROM model_evaluation_report_artifact WHERE evaluation_run_id=? AND artifact_id=?", (rs, rowNum) -> artifactRow(rs), evaluationRunId, artifactId);
        } catch (EmptyResultDataAccessException exception) {
            throw resourceNotFound();
        }
    }

    private ModelEvaluationArtifactResponse artifactRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ModelEvaluationArtifactResponse(
            rs.getString("artifact_id"),
            rs.getString("evaluation_run_id"),
            rs.getString("artifact_type"),
            rs.getString("file_object_id"),
            rs.getString("name"),
            rs.getString("download_policy"),
            rs.getObject("created_at", OffsetDateTime.class)
        );
    }

    private ModelRecord requireViewableModel(PlatformPrincipal principal, String modelId, String versionId) {
        ModelRecord model = modelById(modelId);
        if (!canView(principal, model, versionId)) {
            throw crossBuAccessException();
        }
        return model;
    }

    private ModelRecord requireModelAction(PlatformPrincipal principal, String modelId, String versionId, String permission) {
        ModelRecord model = requireViewableModel(principal, modelId, versionId);
        if (principal.isSuperAdmin() || Objects.equals(principal.user().id(), model.ownerUserId()) || hasScopedModelPermission(principal, model, permission)) {
            return model;
        }
        throw new PlatformException(40303, 403, "无模型评估操作权限");
    }

    private boolean canView(PlatformPrincipal principal, ModelRecord model, String versionId) {
        if (principal.isSuperAdmin() || Objects.equals(principal.user().id(), model.ownerUserId())) {
            return true;
        }
        if ("PLATFORM".equals(model.scope()) && principal.hasPermission("model:model:read")) {
            return true;
        }
        if ("BU".equals(model.scope()) && Objects.equals(principal.user().tenantId(), model.ownerOrgId()) && principal.hasPermission("model:model:read")) {
            return true;
        }
        return hasGrant(model.modelId(), versionId, principal.user().id(), principal.user().tenantId());
    }

    private boolean hasScopedModelPermission(PlatformPrincipal principal, ModelRecord model, String permission) {
        if (!principal.hasPermission(permission)) {
            return false;
        }
        if ("PLATFORM".equals(model.scope())) {
            return true;
        }
        return !"PRIVATE".equals(model.scope()) && Objects.equals(principal.user().tenantId(), model.ownerOrgId());
    }

    private boolean hasGrant(String modelId, String versionId, String userId, String requesterOrgId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM model_access_grant
            WHERE model_id=? AND requester_user_id=? AND requester_org_id=? AND status='ACTIVE'
              AND ((? IS NULL AND version_id IS NULL) OR (? IS NOT NULL AND (version_id IS NULL OR version_id=?)))
              AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            """, Integer.class, modelId, userId, requesterOrgId, versionId, versionId, versionId);
        return count != null && count > 0;
    }

    private void ensureDatasetAccessible(PlatformPrincipal principal, DatasetVersionRecord datasetVersion) {
        if (!"PUBLISHED".equals(datasetVersion.status())) {
            throw new PlatformException(42252, 422, "评估数据集版本必须已发布");
        }
        if (principal.isSuperAdmin() || Objects.equals(principal.user().tenantId(), datasetVersion.tenantId()) || "PUBLIC".equals(datasetVersion.accessLevel())) {
            return;
        }
        Integer grantCount = jdbc.queryForObject("""
            SELECT COUNT(*) FROM dataset_access_grant
            WHERE dataset_id=? AND user_id=? AND status='ACTIVE' AND (version_id IS NULL OR version_id=?) AND expires_at > CURRENT_TIMESTAMP
            """, Integer.class, datasetVersion.datasetId(), principal.user().id(), datasetVersion.versionId());
        if (grantCount == null || grantCount == 0) {
            throw new PlatformException(42252, 422, "评估数据集版本不可访问");
        }
    }

    private DatasetVersionRecord datasetVersionById(String versionId) {
        try {
            return jdbc.queryForObject("""
                SELECT dv.version_id, dv.dataset_id, dv.version_name, dv.status, d.tenant_id, d.access_level
                FROM dataset_version dv JOIN dataset d ON d.dataset_id=dv.dataset_id
                WHERE dv.version_id=?
                """, (rs, rowNum) -> new DatasetVersionRecord(rs.getString("version_id"), rs.getString("dataset_id"), rs.getString("version_name"), rs.getString("status"), rs.getString("tenant_id"), rs.getString("access_level")), versionId);
        } catch (EmptyResultDataAccessException exception) {
            throw new PlatformException(42252, 422, "评估数据集版本不存在");
        }
    }

    private ModelRecord modelById(String modelId) {
        try {
            return jdbc.queryForObject("SELECT * FROM model_registry_model WHERE model_id=?", (rs, rowNum) -> new ModelRecord(
                rs.getString("model_id"), rs.getString("name"), rs.getString("scope"), rs.getString("owner_user_id"), rs.getString("owner_org_id"), rs.getString("tenant_id")
            ), modelId);
        } catch (EmptyResultDataAccessException exception) {
            throw resourceNotFound();
        }
    }

    private VersionRecord versionById(String versionId) {
        try {
            return jdbc.queryForObject("""
                SELECT v.version_id, v.model_id, v.version_no, m.task_type
                FROM model_registry_version v JOIN model_registry_model m ON m.model_id=v.model_id
                WHERE v.version_id=?
                """, (rs, rowNum) -> new VersionRecord(rs.getString("version_id"), rs.getString("model_id"), rs.getString("version_no"), rs.getString("task_type")), versionId);
        } catch (EmptyResultDataAccessException exception) {
            throw resourceNotFound();
        }
    }

    private FileObjectRecord fileObjectById(String fileObjectId) {
        try {
            return jdbc.queryForObject("""
                SELECT file_id, asset_type, tenant_id, owner_id, bucket, object_key
                FROM platform_file_object
                WHERE file_id=? AND status='AVAILABLE'
                """, (rs, rowNum) -> new FileObjectRecord(
                    rs.getString("file_id"),
                    rs.getString("asset_type"),
                    rs.getString("tenant_id"),
                    rs.getString("owner_id"),
                    rs.getString("bucket"),
                    rs.getString("object_key")
                ), fileObjectId);
        } catch (EmptyResultDataAccessException exception) {
            throw new PlatformException(42255, 422, "评估报告 artifact 文件不可用");
        }
    }

    private void validateCreateRequest(ModelEvaluationCreateRequest request) {
        if (request == null || isBlank(request.modelId()) || isBlank(request.versionId()) || isBlank(request.datasetVersionId())) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        normalizeThresholds(request.thresholdConfig());
    }

    private Map<String, Object> normalizeThresholds(Map<String, Object> thresholds) {
        if (thresholds == null || thresholds.isEmpty()) {
            throw new PlatformException(40000, 400, "评估阈值不能为空");
        }
        Map<String, Object> normalized = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : thresholds.entrySet()) {
            if (isBlank(entry.getKey()) || numericOrNull(entry.getValue()) == null) {
                throw new PlatformException(40000, 400, "评估阈值必须为数值");
            }
            normalized.put(entry.getKey().trim(), numericOrNull(entry.getValue()));
        }
        return normalized;
    }

    private void validateArtifact(PlatformPrincipal principal, ModelEvaluationRunResponse run, ModelEvaluationArtifactInput artifact) {
        if (artifact == null || isBlank(artifact.artifactType())) {
            throw new PlatformException(40000, 400, "artifact 参数格式错误");
        }
        if (!isBlank(artifact.fileObjectId())) {
            requireArtifactFileAccessible(principal, run, artifact.artifactType(), artifact.fileObjectId());
        }
    }

    private FileObjectRecord requireArtifactFileAccessible(PlatformPrincipal principal, ModelEvaluationRunResponse run, String artifactType, String fileObjectId) {
        if (isBlank(fileObjectId)) {
            throw new PlatformException(40000, 400, "artifact 文件参数格式错误");
        }
        FileObjectRecord file = fileObjectById(fileObjectId);
        if (!Objects.equals(file.tenantId(), run.tenantId())) {
            recordAudit(principal, run.tenantId(), run.ownerOrgId(), "MODEL_EVALUATION_ARTIFACT_ACCESS_BLOCKED", "EvaluationArtifact", fileObjectId, "BLOCKED", file.tenantId(), run.tenantId(), "TASK-model-evaluation-readiness;AC-09;AC-10;tenant-mismatch;artifactType=" + blankToDefault(artifactType, "UNKNOWN"));
            throw new PlatformException(40304, 403, "评估报告 artifact 文件不可访问");
        }
        if ("DATASET".equalsIgnoreCase(file.assetType())) {
            identityService.requirePermission(principal, "data:dataset:download");
            requireDatasetDownloadAccess(principal, run);
            Integer bindingCount = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM dataset_file
                WHERE dataset_id=? AND version_id=? AND file_id=? AND status='BOUND'
            """, Integer.class, run.datasetId(), run.datasetVersionId(), file.fileId());
            if (bindingCount == null || bindingCount == 0) {
                recordAudit(principal, run.tenantId(), run.ownerOrgId(), "MODEL_EVALUATION_ARTIFACT_ACCESS_BLOCKED", "EvaluationArtifact", fileObjectId, "BLOCKED", null, "DATASET_FILE_NOT_BOUND", "TASK-model-evaluation-readiness;AC-09;AC-10;artifactType=" + blankToDefault(artifactType, "UNKNOWN"));
                throw new PlatformException(40304, 403, "评估报告 artifact 文件不可访问");
            }
        } else if (!Objects.equals(file.ownerId(), principal.user().id()) && !Objects.equals(file.ownerId(), run.ownerUserId())) {
            recordAudit(principal, run.tenantId(), run.ownerOrgId(), "MODEL_EVALUATION_ARTIFACT_ACCESS_BLOCKED", "EvaluationArtifact", fileObjectId, "BLOCKED", file.ownerId(), principal.user().id(), "TASK-model-evaluation-readiness;AC-09;AC-10;owner-mismatch;artifactType=" + blankToDefault(artifactType, "UNKNOWN"));
            throw new PlatformException(40304, 403, "评估报告 artifact 文件不可访问");
        }
        return file;
    }

    private void requireDatasetDownloadAccess(PlatformPrincipal principal, ModelEvaluationRunResponse run) {
        DatasetVersionRecord datasetVersion = datasetVersionById(run.datasetVersionId());
        if (principal.isSuperAdmin() || Objects.equals(principal.user().tenantId(), datasetVersion.tenantId()) || "PUBLIC".equals(datasetVersion.accessLevel())) {
            return;
        }
        Integer grantCount = jdbc.queryForObject("""
            SELECT COUNT(*) FROM dataset_access_grant
            WHERE dataset_id=? AND user_id=? AND status='ACTIVE' AND (version_id IS NULL OR version_id=?) AND expires_at > CURRENT_TIMESTAMP
            """, Integer.class, datasetVersion.datasetId(), principal.user().id(), datasetVersion.versionId());
        if (grantCount == null || grantCount == 0) {
            recordAudit(principal, run.tenantId(), run.ownerOrgId(), "MODEL_EVALUATION_ARTIFACT_ACCESS_BLOCKED", "EvaluationArtifact", run.evaluationRunId(), "BLOCKED", principal.user().tenantId(), datasetVersion.tenantId(), "TASK-model-evaluation-readiness;AC-09;AC-10;dataset-grant-required");
            throw new PlatformException(40304, 403, "评估数据集 artifact 需要数据集下载授权");
        }
    }

    private String normalizedStatus(String value) {
        String status = normalizedEnum(value);
        if (!List.of("READY", "RUNNING", "PASSED", "FAILED", "CANCELLED").contains(status)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return status;
    }

    private String normalizedTaskType(String value) {
        String taskType = normalizedEnum(value);
        if (!List.of("IMAGE_CLASSIFICATION", "OBJECT_DETECTION", "SEMANTIC_SEGMENTATION", "NLP_TEXT_CLASSIFICATION", "TIME_SERIES_FORECAST", "ANOMALY_DETECTION").contains(taskType)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return taskType;
    }

    private String normalizedExecutorType(String value) {
        String executorType = normalizedEnum(blankToDefault(value, "IMPORTED"));
        if (!List.of("IMPORTED", "AI_ADAPTER", "MLFLOW", "ARGO", "KSERVE").contains(executorType)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return executorType;
    }

    private String normalizedArtifactType(String value) {
        String artifactType = normalizedEnum(blankToDefault(value, "REPORT"));
        if (!List.of("REPORT", "DATASET_SAMPLE", "ERROR_CASES", "CURVE", "CONFUSION_MATRIX").contains(artifactType)) {
            throw new PlatformException(40000, 400, "参数格式错误");
        }
        return artifactType;
    }

    private List<String> parseVersionIds(String value) {
        if (isBlank(value)) {
            return List.of();
        }
        return java.util.Arrays.stream(value.split(","))
            .map(String::trim)
            .filter(item -> !item.isBlank())
            .distinct()
            .toList();
    }

    private Double numericOrNull(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String stringValue) {
            try {
                return Double.parseDouble(stringValue);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private Double nullableDouble(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        double value = rs.getDouble(column);
        return rs.wasNull() ? null : value;
    }

    private String jsonColumn(String sql, String id) {
        return jdbc.queryForObject(sql, String.class, id);
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

    private List<Object> fromJsonList(String value) {
        if (isBlank(value)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(value, OBJECT_LIST_TYPE);
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

    private Object[] queryArgs(String first, List<String> rest) {
        List<Object> args = new ArrayList<>();
        args.add(first);
        args.addAll(rest);
        return args.toArray();
    }

    private String placeholders(int count) {
        return java.util.stream.IntStream.range(0, count).mapToObj(index -> "?").collect(java.util.stream.Collectors.joining(","));
    }

    private PlatformException resourceNotFound() {
        return new PlatformException(40400, 404, "资源不存在");
    }

    private PlatformException crossBuAccessException() {
        return new PlatformException(40304, 403, "该模型属于其他 BU，请申请跨 BU 授权");
    }

    private void recordAudit(PlatformPrincipal principal, String tenantId, String ownerOrgId, String action, String resourceType, String resourceId, String result, String before, String after, String detail) {
        OffsetDateTime occurredAt = now();
        String eventId = "EVT-" + randomIdPart(16);
        String traceId = blankToDefault(PlatformResponses.traceId(), "trace-" + randomIdPart(8));
        String operatorRole = String.join(",", principal.roleNames());
        String id = UUID.randomUUID().toString();
        String detailJson = "ownerOrgId=" + ownerOrgId + ";" + blankToDefault(detail, "");
        String signature = sha256(String.join("|", id, eventId, blankToDefault(tenantId, ""), principal.user().id(), principal.user().displayName(), operatorRole, action, resourceType, resourceId, result, "INFO", blankToDefault(before, ""), blankToDefault(after, ""), detailJson, traceId, canonicalTime(occurredAt)));
        jdbc.update("""
            INSERT INTO platform_audit_log (
                id, event_id, tenant_id, operator_id, operator_name, operator_role,
                action, resource_type, resource_id, result, risk_level, before_json,
                after_json, detail_json, trace_id, signature, occurred_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INFO', ?, ?, ?, ?, ?, ?)
            """, id, eventId, tenantId, principal.user().id(), principal.user().displayName(), operatorRole, action, resourceType, resourceId, result, before, after, detailJson, traceId, signature, occurredAt);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private String canonicalTime(OffsetDateTime value) {
        return value == null ? "" : value.toInstant().truncatedTo(ChronoUnit.MICROS).atOffset(ZoneOffset.UTC).toString();
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);
    }

    private String randomIdPart(int length) {
        return UUID.randomUUID().toString().replace("-", "").substring(0, length).toUpperCase(Locale.ROOT);
    }

    private String normalizedEnum(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
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

    private record EvaluationListSql(String whereClause, List<Object> params) {
    }

    private record ModelRecord(String modelId, String name, String scope, String ownerUserId, String ownerOrgId, String tenantId) {
    }

    private record VersionRecord(String versionId, String modelId, String versionNo, String taskType) {
    }

    private record DatasetVersionRecord(String versionId, String datasetId, String versionName, String status, String tenantId, String accessLevel) {
    }

    private record FileObjectRecord(String fileId, String assetType, String tenantId, String ownerId, String bucket, String objectKey) {
    }
}
