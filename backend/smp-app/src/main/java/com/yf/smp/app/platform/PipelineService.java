package com.yf.smp.app.platform;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PipelineService {
    private static final String TRACE_TAG = "TASK-visual-preprocess-operators-pipeline";
    private static final String PIPELINE_TRACE_TAG = "TASK-pipeline-editor-operator-marketplace";
    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\$\\{([A-Za-z0-9_]+)}");
    private static final Pattern REQUIRED_PATTERN = Pattern.compile("\\\"required\\\"\\s*:\\s*\\[(.*?)]");
    private final JdbcTemplate jdbc;
    private final PlatformIdentityService identityService;
    private final ObjectStorageService objectStorageService;
    private final VideoFrameExtractor videoFrameExtractor;

    public PipelineService(JdbcTemplate jdbc, PlatformIdentityService identityService, ObjectStorageService objectStorageService, VideoFrameExtractor videoFrameExtractor) {
        this.jdbc = jdbc;
        this.identityService = identityService;
        this.objectStorageService = objectStorageService;
        this.videoFrameExtractor = videoFrameExtractor;
    }

    public PipelineListResponse pipelines(PlatformPrincipal principal, String keyword, String status, int page, int pageSize) {
        identityService.requirePermission(principal, "data:pipeline:read");
        List<PipelineSummaryResponse> filtered = allPipelineSummaries().stream()
            .filter(item -> canSeeTenant(principal, item.tenantId()))
            .filter(item -> blank(status) || item.status().equalsIgnoreCase(status))
            .filter(item -> matches(item.name(), keyword) || matches(item.description(), keyword) || matches(item.pipelineId(), keyword))
            .toList();
        int normalizedPage = Math.max(1, page);
        int normalizedPageSize = Math.max(1, Math.min(100, pageSize));
        int from = Math.min((normalizedPage - 1) * normalizedPageSize, filtered.size());
        int to = Math.min(from + normalizedPageSize, filtered.size());
        return new PipelineListResponse(filtered.subList(from, to), filtered.size(), normalizedPage, normalizedPageSize);
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public PipelineDetailResponse createPipeline(PlatformPrincipal principal, PipelineSaveRequest request) {
        identityService.requirePermission(principal, "data:pipeline:write");
        String tenantId = blank(request.tenantId(), principal.user().tenantId());
        ensureCanSeeTenant(principal, tenantId, true);
        validateSecrets(request);
        PipelineValidationResponse validation = validateRequest(request, null);
        if (!validation.valid()) {
            audit(principal, tenantId, "PIPELINE_PREPROCESS_VALIDATION_FAILED", "Pipeline", "NEW", "FAILURE", "WARNING", null, null, validation.diagnosticMessage());
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, validation.diagnosticMessage());
        }
        String id = "PIPE-" + randomHex(10).toUpperCase(Locale.ROOT);
        OffsetDateTime at = now();
        jdbc.update("""
            INSERT INTO pipeline_definition (pipeline_id, name, tenant_id, project_id, status, current_version_id, owner_id, description, diagnostic_code, diagnostic_message, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'VALIDATED', NULL, ?, ?, 'OK', 'DAG 校验通过', ?, ?)
            """, id, require(request.name(), "Pipeline 名称不能为空"), tenantId, nullIfBlank(request.projectId()), principal.user().id(), nullIfBlank(request.description()), at, at);
        replaceGraph(id, request);
        audit(principal, tenantId, "PIPELINE_PREPROCESS_CREATED", "Pipeline", id, "SUCCESS", "INFO", null, "VALIDATED", TRACE_TAG);
        return pipelineDetail(principal, id);
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public PipelineDetailResponse updatePipeline(PlatformPrincipal principal, String pipelineId, PipelineSaveRequest request) {
        identityService.requirePermission(principal, "data:pipeline:write");
        PipelineSummaryResponse current = pipelineSummaryVisible(principal, pipelineId, true);
        validateSecrets(request);
        PipelineValidationResponse validation = validateRequest(request, pipelineId);
        if (!validation.valid()) {
            jdbc.update("UPDATE pipeline_definition SET status='DRAFT', diagnostic_code=?, diagnostic_message=?, updated_at=? WHERE pipeline_id=?", validation.diagnosticCode(), validation.diagnosticMessage(), now(), pipelineId);
            audit(principal, current.tenantId(), "PIPELINE_PREPROCESS_VALIDATION_FAILED", "Pipeline", pipelineId, "FAILURE", "WARNING", current.status(), "DRAFT", validation.diagnosticMessage());
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, validation.diagnosticMessage());
        }
        jdbc.update("UPDATE pipeline_definition SET name=?, project_id=?, description=?, status='VALIDATED', diagnostic_code='OK', diagnostic_message='DAG 校验通过', updated_at=? WHERE pipeline_id=?", blank(request.name(), current.name()), nullIfBlank(request.projectId()), nullIfBlank(request.description()), now(), pipelineId);
        replaceGraph(pipelineId, request);
        audit(principal, current.tenantId(), "PIPELINE_PREPROCESS_UPDATED", "Pipeline", pipelineId, "SUCCESS", "INFO", current.status(), "VALIDATED", TRACE_TAG);
        return pipelineDetail(principal, pipelineId);
    }

    public PipelineDetailResponse pipelineDetail(PlatformPrincipal principal, String pipelineId) {
        identityService.requirePermission(principal, "data:pipeline:read");
        PipelineSummaryResponse summary = pipelineSummaryVisible(principal, pipelineId, false);
        return new PipelineDetailResponse(summary, nodes(pipelineId), edges(pipelineId), variables(pipelineId), versions(pipelineId), runs(principal, pipelineId), validateExisting(pipelineId));
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public PipelineValidationResponse validatePipeline(PlatformPrincipal principal, String pipelineId) {
        identityService.requirePermission(principal, "data:pipeline:write");
        PipelineSummaryResponse summary = pipelineSummaryVisible(principal, pipelineId, true);
        PipelineValidationResponse validation = validateExisting(pipelineId);
        if (!validation.valid()) {
            audit(principal, summary.tenantId(), "PIPELINE_PREPROCESS_VALIDATION_FAILED", "Pipeline", pipelineId, "FAILURE", "WARNING", summary.status(), "DRAFT", validation.diagnosticMessage());
        }
        return validation;
    }

    @Transactional
    public PipelineVersionResponse saveVersion(PlatformPrincipal principal, String pipelineId, PipelineVersionRequest request) {
        identityService.requirePermission(principal, "data:pipeline:write");
        PipelineSummaryResponse summary = pipelineSummaryVisible(principal, pipelineId, true);
        PipelineValidationResponse validation = validateExisting(pipelineId);
        if (!validation.valid()) {
            audit(principal, summary.tenantId(), "PIPELINE_PREPROCESS_VALIDATION_FAILED", "Pipeline", pipelineId, "FAILURE", "WARNING", summary.status(), "DRAFT", validation.diagnosticMessage());
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, validation.diagnosticMessage());
        }
        String versionId = "PVER-" + randomHex(10).toUpperCase(Locale.ROOT);
        String versionName = blank(request.versionName(), nextVersionName(pipelineId));
        OffsetDateTime at = now();
        jdbc.update("INSERT INTO pipeline_version (version_id, pipeline_id, version_name, note, dag_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", versionId, pipelineId, versionName, nullIfBlank(request.note()), snapshotDag(pipelineId), principal.user().id(), at);
        jdbc.update("UPDATE pipeline_definition SET current_version_id=?, status='VALIDATED', updated_at=? WHERE pipeline_id=?", versionId, at, pipelineId);
        audit(principal, summary.tenantId(), "PIPELINE_VERSION_SAVED", "PipelineVersion", versionId, "SUCCESS", "INFO", null, versionName, TRACE_TAG);
        return versions(pipelineId).stream().filter(item -> item.versionId().equals(versionId)).findFirst().orElseThrow();
    }

    public List<PipelineVersionResponse> versions(PlatformPrincipal principal, String pipelineId) {
        identityService.requirePermission(principal, "data:pipeline:read");
        pipelineSummaryVisible(principal, pipelineId, false);
        return versions(pipelineId);
    }

    @Transactional
    public PipelineDetailResponse restoreVersion(PlatformPrincipal principal, String pipelineId, String versionId) {
        identityService.requirePermission(principal, "data:pipeline:write");
        PipelineSummaryResponse summary = pipelineSummaryVisible(principal, pipelineId, true);
        PipelineVersionResponse version = version(pipelineId, versionId);
        jdbc.update("UPDATE pipeline_definition SET current_version_id=?, status='DRAFT', diagnostic_code='RESTORED', diagnostic_message=?, updated_at=? WHERE pipeline_id=?", versionId, "已恢复版本 " + version.versionName() + "，请校验后重新保存", now(), pipelineId);
        audit(principal, summary.tenantId(), "PIPELINE_VERSION_RESTORED", "PipelineVersion", versionId, "SUCCESS", "WARNING", summary.currentVersionId(), versionId, TRACE_TAG);
        return pipelineDetail(principal, pipelineId);
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public PipelineRunDetailResponse runPipeline(PlatformPrincipal principal, String pipelineId, PipelineRunRequest request) {
        identityService.requirePermission(principal, "data:pipeline:run");
        PipelineSummaryResponse summary = pipelineSummaryVisible(principal, pipelineId, false);
        boolean visualPreprocess = isVisualPreprocess(summary);
        PipelineValidationResponse validation = validateExisting(pipelineId);
        if (!validation.valid()) {
            audit(principal, summary.tenantId(), "PIPELINE_RUN_FAILED", "Pipeline", pipelineId, "FAILURE", "WARNING", summary.status(), "FAILED", validation.diagnosticMessage());
            if (visualPreprocess) {
                audit(principal, summary.tenantId(), "PIPELINE_PREPROCESS_RUN_FAILED", "Pipeline", pipelineId, "FAILURE", "WARNING", summary.status(), "FAILED", validation.diagnosticMessage());
            }
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, validation.diagnosticMessage());
        }
        String sampleDatasetId = blank(request.sampleDatasetId(), blank(summary.sourceDatasetId(), datasetIdFromReadNode(pipelineId)));
        DatasetInfo sample = datasetVisible(principal, sampleDatasetId);
        String runId = "PRUN-" + randomHex(10).toUpperCase(Locale.ROOT);
        OffsetDateTime start = now();
        audit(principal, summary.tenantId(), "PIPELINE_RUN_STARTED", "PipelineRun", runId, "SUCCESS", "INFO", null, "RUNNING", PIPELINE_TRACE_TAG);
        if (visualPreprocess) {
            audit(principal, summary.tenantId(), "PIPELINE_PREPROCESS_RUN_STARTED", "PipelineRun", runId, "SUCCESS", "INFO", null, "RUNNING", TRACE_TAG);
        }
        boolean debugMode = "DEBUG".equalsIgnoreCase(blank(request.triggerMode(), "MANUAL"));
        String outputDatasetId = createOutputDataset(principal, summary, sample, runId, start, request.outputDatasetName());
        OffsetDateTime end = start.plusSeconds(Math.max(1, nodes(pipelineId).size()) * 12L);
        long durationMs = java.time.Duration.between(start, end).toMillis();
        String diagnosticMessage = visualPreprocess ? "VISUAL_PREPROCESS_RUN_SUCCEEDED" : "SANDBOX_PIPELINE_RUN_SUCCEEDED";
        jdbc.update("""
            INSERT INTO pipeline_run (run_id, pipeline_id, version_id, status, trigger_mode, sample_dataset_id, output_dataset_id, diagnostic_code, diagnostic_message, duration_ms, triggered_by, started_at, ended_at)
            VALUES (?, ?, ?, 'SUCCEEDED', ?, ?, ?, 'OK', ?, ?, ?, ?, ?)
            """, runId, pipelineId, summary.currentVersionId(), upper(request.triggerMode(), "MANUAL"), sampleDatasetId, outputDatasetId, diagnosticMessage, durationMs, principal.user().id(), start, end);
        int index = 0;
        List<PipelineNodeResponse> runNodes = nodes(pipelineId);
        for (PipelineNodeResponse node : runNodes) {
            long nodeDuration = 800L + index * 350L;
            jdbc.update("INSERT INTO pipeline_run_node (node_run_id, run_id, node_id, operator_name, status, duration_ms, log_summary, error_code, created_at) VALUES (?, ?, ?, ?, 'SUCCEEDED', ?, ?, NULL, ?)", "PNRUN-" + randomHex(10).toUpperCase(Locale.ROOT), runId, node.nodeId(), node.operatorName(), nodeDuration, nodeLogSummary(node, index, runNodes.size(), sample.recordCount(), debugMode), start.plusSeconds(index + 1L));
            index++;
        }
        jdbc.update("UPDATE operator_catalog SET usage_count=usage_count + 1, pipeline_count=GREATEST(pipeline_count, 1), updated_at=? WHERE operator_id IN (SELECT operator_id FROM pipeline_node WHERE pipeline_id=?)", now(), pipelineId);
        audit(principal, summary.tenantId(), "PIPELINE_RUN_SUCCEEDED", "PipelineRun", runId, "SUCCESS", "INFO", null, outputDatasetId, PIPELINE_TRACE_TAG);
        if (visualPreprocess) {
            audit(principal, summary.tenantId(), "PIPELINE_PREPROCESS_RUN_SUCCEEDED", "PipelineRun", runId, "SUCCESS", "INFO", null, outputDatasetId, TRACE_TAG);
        }
        return runDetail(principal, runId);
    }

    public List<PipelineRunSummaryResponse> runs(PlatformPrincipal principal, String pipelineId) {
        identityService.requirePermission(principal, "data:pipeline:read");
        pipelineSummaryVisible(principal, pipelineId, false);
        return jdbc.query("SELECT * FROM pipeline_run WHERE pipeline_id=? ORDER BY started_at DESC", (rs, n) -> runSummary(rs), pipelineId);
    }

    public PipelineProcessingTaskListResponse processingTasks(PlatformPrincipal principal, String keyword, String status, int page, int pageSize) {
        identityService.requirePermission(principal, "data:pipeline:read");
        Map<String, PipelineSummaryResponse> summaries = new HashMap<>();
        for (PipelineSummaryResponse summary : allPipelineSummaries()) {
            summaries.put(summary.pipelineId(), summary);
        }
        List<PipelineProcessingTaskSummaryResponse> filtered = allProcessingTasks().stream()
            .filter(item -> {
                PipelineSummaryResponse summary = summaries.get(item.pipelineId());
                return summary != null && canSeeTenant(principal, summary.tenantId());
            })
            .filter(item -> blank(status) || item.status().equalsIgnoreCase(status) || (item.resultDatasetStatus() != null && item.resultDatasetStatus().equalsIgnoreCase(status)))
            .filter(item -> matches(item.taskId(), keyword) || matches(item.pipelineName(), keyword) || matches(item.sourceDatasetName(), keyword) || matches(item.sourceDatasetId(), keyword) || matches(item.outputDatasetId(), keyword))
            .toList();
        int normalizedPage = Math.max(1, page);
        int normalizedPageSize = Math.max(1, Math.min(100, pageSize));
        int from = Math.min((normalizedPage - 1) * normalizedPageSize, filtered.size());
        int to = Math.min(from + normalizedPageSize, filtered.size());
        return new PipelineProcessingTaskListResponse(filtered.subList(from, to), filtered.size(), normalizedPage, normalizedPageSize);
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public PipelineRunDetailResponse createProcessingTask(PlatformPrincipal principal, PipelineProcessingTaskCreateRequest request) {
        String pipelineId = require(request.pipelineId(), "Pipeline 不能为空");
        String sourceDatasetId = require(request.sourceDatasetId(), "加工任务必须选择数据集");
        return runPipeline(principal, pipelineId, new PipelineRunRequest("MANUAL", sourceDatasetId, request.outputDatasetName()));
    }

    public PipelineRunDetailResponse runDetail(PlatformPrincipal principal, String runId) {
        identityService.requirePermission(principal, "data:pipeline:read");
        PipelineRunSummaryResponse run = runSummaryById(runId);
        pipelineSummaryVisible(principal, run.pipelineId(), false);
        List<PipelineRunNodeResponse> nodeRuns = jdbc.query("SELECT * FROM pipeline_run_node WHERE run_id=? ORDER BY created_at", (rs, n) -> new PipelineRunNodeResponse(rs.getString("node_run_id"), rs.getString("run_id"), rs.getString("node_id"), rs.getString("operator_name"), rs.getString("status"), nullableLong(rs, "duration_ms"), rs.getString("log_summary"), rs.getString("error_code")), runId);
        PreprocessedDatasetPreviewResponse preview = blank(run.outputDatasetId()) ? null : preview(run.outputDatasetId());
        PreprocessedDatasetActivationStateResponse activation = blank(run.outputDatasetId()) ? null : activationState(run.outputDatasetId());
        boolean debugMode = "DEBUG".equalsIgnoreCase(blank(run.triggerMode(), "MANUAL"));
        return new PipelineRunDetailResponse(run, nodeRuns, preview, activation, debugMode);
    }

    public OperatorListResponse operators(PlatformPrincipal principal, String keyword, String category, String categoryGroup, String dataType, String stage, String status, Boolean supportsPreview) {
        identityService.requirePermission(principal, "data:operator:read");
        List<OperatorSummaryResponse> items = jdbc.query("SELECT * FROM operator_catalog ORDER BY category, stage, name", (rs, n) -> operatorSummary(rs)).stream()
            .filter(item -> operatorVisible(principal, item.operatorId()))
            .filter(item -> blank(keyword) || matches(item.name(), keyword) || matches(item.description(), keyword) || matches(item.category(), keyword))
            .filter(item -> blank(category) || item.category().equalsIgnoreCase(category))
            .filter(item -> blank(categoryGroup) || item.categoryGroup().equalsIgnoreCase(categoryGroup))
            .filter(item -> blank(dataType) || item.dataType().equalsIgnoreCase(dataType))
            .filter(item -> blank(stage) || item.stage().equalsIgnoreCase(stage))
            .filter(item -> blank(status) || item.status().equalsIgnoreCase(status))
            .filter(item -> supportsPreview == null || item.supportsPreview() == supportsPreview.booleanValue())
            .toList();
        Map<String, Long> counts = new java.util.LinkedHashMap<>();
        for (OperatorSummaryResponse item : items) counts.put(item.category(), counts.getOrDefault(item.category(), 0L) + 1L);
        List<OperatorCategoryResponse> categories = counts.entrySet().stream().map(e -> new OperatorCategoryResponse(e.getKey(), e.getValue())).toList();
        long builtin = items.stream().filter(i -> "BUILTIN".equals(i.kind())).count();
        long custom = items.stream().filter(i -> !"BUILTIN".equals(i.kind())).count();
        long published = items.stream().filter(i -> "PUBLISHED".equals(i.status())).count();
        long submitted = items.stream().filter(i -> "SUBMITTED".equals(i.status())).count();
        return new OperatorListResponse(items, items.size(), categories, new OperatorStatsResponse(items.size(), builtin, custom, published, submitted));
    }

    public OperatorDetailResponse operatorDetail(PlatformPrincipal principal, String operatorId) {
        identityService.requirePermission(principal, "data:operator:read");
        if (!operatorVisible(principal, operatorId)) throw new PlatformException(PlatformError.NOT_FOUND, "算子不存在");
        return operatorDetail(operatorId);
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public OperatorDetailResponse createCustomOperator(PlatformPrincipal principal, OperatorCustomRequest request) {
        identityService.requirePermission(principal, "data:operator:write");
        validateOperatorSecrets(request);
        String id = "OP-CUSTOM-" + randomHex(8).toUpperCase(Locale.ROOT);
        OffsetDateTime at = now();
        jdbc.update("""
            INSERT INTO operator_catalog (operator_id, name, category, stage, kind, tenant_id, description, parameter_schema_json, input_schema_json, output_schema_json, endpoint, credential_ref, timeout_seconds, concurrency_limit, status, version, before_example, after_example, usage_count, pipeline_count, error_rate, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'HTTP', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', '0.1.0', '外部服务接入前', '审核通过后可在 Pipeline 中使用', 0, 0, 0, ?, ?, ?)
            """, id, require(request.name(), "算子名称不能为空"), blank(request.category(), "自定义算子"), blank(request.stage(), "扩展"), principal.user().tenantId(), nullIfBlank(request.description()), blank(request.parameterSchemaJson(), "{\"type\":\"object\"}"), blank(request.inputSchemaJson(), "{\"records\":\"ANY\"}"), blank(request.outputSchemaJson(), "{\"records\":\"ANY\"}"), nullIfBlank(request.endpoint()), nullIfBlank(request.credentialRef()), defaultInt(request.timeoutSeconds(), 30), defaultInt(request.concurrencyLimit(), 2), principal.user().id(), at, at);
        audit(principal, principal.user().tenantId(), "OPERATOR_CREATED", "Operator", id, "SUCCESS", "INFO", null, "DRAFT", TRACE_TAG);
        return operatorDetail(id);
    }

    @Transactional
    public OperatorDetailResponse submitOperator(PlatformPrincipal principal, String operatorId) {
        identityService.requirePermission(principal, "data:operator:write");
        OperatorRecord operator = operatorRecordVisible(principal, operatorId, true);
        if (!List.of("DRAFT", "REJECTED").contains(operator.status())) throw new PlatformException(PlatformError.CONFLICT, "OPERATOR_STATE_CONFLICT: 仅草稿或驳回状态可提交审核");
        OffsetDateTime at = now();
        jdbc.update("UPDATE operator_catalog SET status='SUBMITTED', updated_at=? WHERE operator_id=?", at, operatorId);
        jdbc.update("INSERT INTO operator_review (review_id, operator_id, submitter_id, reviewer_id, status, reason, submitted_at, reviewed_at) VALUES (?, ?, ?, NULL, 'SUBMITTED', '提交审核', ?, NULL)", "OREV-" + randomHex(10).toUpperCase(Locale.ROOT), operatorId, principal.user().id(), at);
        audit(principal, tenantForAudit(operator.tenantId(), principal), "OPERATOR_SUBMITTED", "Operator", operatorId, "SUCCESS", "WARNING", operator.status(), "SUBMITTED", TRACE_TAG);
        return operatorDetail(operatorId);
    }

    @Transactional
    public OperatorDetailResponse approveOperator(PlatformPrincipal principal, String operatorId, OperatorReviewRequest request) {
        identityService.requirePermission(principal, "data:operator:review");
        OperatorRecord operator = operatorRecordVisible(principal, operatorId, true);
        if (!"SUBMITTED".equals(operator.status())) throw new PlatformException(PlatformError.CONFLICT, "OPERATOR_STATE_CONFLICT: 仅已提交审核的算子可批准");
        OffsetDateTime at = now();
        jdbc.update("UPDATE operator_catalog SET status='PUBLISHED', updated_at=? WHERE operator_id=?", at, operatorId);
        jdbc.update("UPDATE operator_review SET reviewer_id=?, status='APPROVED', reason=?, reviewed_at=? WHERE operator_id=? AND status='SUBMITTED'", principal.user().id(), blank(request.reason(), "审核通过"), at, operatorId);
        audit(principal, tenantForAudit(operator.tenantId(), principal), "OPERATOR_APPROVED", "Operator", operatorId, "SUCCESS", "CRITICAL", operator.status(), "APPROVED", TRACE_TAG);
        audit(principal, tenantForAudit(operator.tenantId(), principal), "OPERATOR_PUBLISHED", "Operator", operatorId, "SUCCESS", "CRITICAL", "APPROVED", "PUBLISHED", TRACE_TAG);
        return operatorDetail(operatorId);
    }

    @Transactional
    public OperatorDetailResponse rejectOperator(PlatformPrincipal principal, String operatorId, OperatorReviewRequest request) {
        identityService.requirePermission(principal, "data:operator:review");
        OperatorRecord operator = operatorRecordVisible(principal, operatorId, true);
        if (!"SUBMITTED".equals(operator.status())) throw new PlatformException(PlatformError.CONFLICT, "OPERATOR_STATE_CONFLICT: 仅已提交审核的算子可驳回");
        OffsetDateTime at = now();
        jdbc.update("UPDATE operator_catalog SET status='REJECTED', updated_at=? WHERE operator_id=?", at, operatorId);
        jdbc.update("UPDATE operator_review SET reviewer_id=?, status='REJECTED', reason=?, reviewed_at=? WHERE operator_id=? AND status='SUBMITTED'", principal.user().id(), require(request.reason(), "驳回原因不能为空"), at, operatorId);
        audit(principal, tenantForAudit(operator.tenantId(), principal), "OPERATOR_REJECTED", "Operator", operatorId, "SUCCESS", "WARNING", operator.status(), "REJECTED", TRACE_TAG);
        return operatorDetail(operatorId);
    }

    public PreprocessedDatasetPreviewResponse previewPreprocessedDataset(PlatformPrincipal principal, String datasetId) {
        identityService.requirePermission(principal, "data:dataset:read");
        DatasetInfo dataset = datasetVisible(principal, datasetId);
        if (!"PREPROCESSED".equals(dataset.datasetType())) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "仅支持查询 PREPROCESSED 数据集预览");
        }
        return preview(datasetId);
    }

    @Transactional
    public PreprocessedDatasetActivationStateResponse confirmPreprocessedDataset(PlatformPrincipal principal, String datasetId, PreprocessedDatasetConfirmRequest request) {
        identityService.requirePermission(principal, "data:dataset:publish");
        DatasetInfo dataset = datasetVisible(principal, datasetId);
        ensurePreprocessed(dataset);
        String decision = upper(request.decision(), "CONFIRM");
        if (!"CONFIRM".equals(decision)) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "仅支持 CONFIRM 决策");
        }
        if ("ACTIVE".equals(dataset.status())) {
            throw new PlatformException(PlatformError.CONFLICT, "已激活数据集无需重复确认");
        }
        OffsetDateTime at = now();
        jdbc.update("UPDATE dataset SET status='CONFIRMED', updated_at=? WHERE dataset_id=?", at, datasetId);
        audit(principal, dataset.tenantId(), "PREPROCESSED_DATASET_CONFIRMED", "Dataset", datasetId, "SUCCESS", "INFO", dataset.status(), "CONFIRMED", TRACE_TAG + ";" + blank(request.comment(), "manual-confirm"));
        return activationState(datasetId);
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public PreprocessedDatasetActivationStateResponse activatePreprocessedDataset(PlatformPrincipal principal, String datasetId, PreprocessedDatasetActivateRequest request) {
        identityService.requirePermission(principal, "data:dataset:publish");
        DatasetInfo dataset = datasetVisible(principal, datasetId);
        ensurePreprocessed(dataset);
        if (!"CONFIRMED".equals(dataset.status())) {
            audit(principal, dataset.tenantId(), "PREPROCESSED_DATASET_ACTIVATION_REJECTED", "Dataset", datasetId, "FAILURE", "WARNING", dataset.status(), "ACTIVE", TRACE_TAG + ";CONFIRM_REQUIRED");
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "必须人工确认后才允许激活");
        }
        PreprocessedDatasetPreviewResponse preview = preview(datasetId);
        if (blank(preview.sourceDatasetId()) || blank(preview.sourceVersionId()) || blank(preview.operatorChainJson()) || blank(preview.processParamsJson())) {
            audit(principal, dataset.tenantId(), "PREPROCESSED_DATASET_ACTIVATION_REJECTED", "Dataset", datasetId, "FAILURE", "WARNING", "LINEAGE_INCOMPLETE", "ACTIVE", TRACE_TAG + ";DAT-007");
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "DAT-007 要求激活前血缘与处理参数快照完整");
        }
        String versionId = blank(request.targetVersionId(), dataset.versionId());
        if (blank(versionId)) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "激活目标版本不能为空");
        }
        OffsetDateTime at = now();
        jdbc.update("UPDATE dataset SET status='ACTIVE', updated_at=? WHERE dataset_id=?", at, datasetId);
        jdbc.update("UPDATE dataset_version SET status='PUBLISHED', published_at=COALESCE(published_at, ?), diagnostic_code='OK', diagnostic_message='VISUAL_PREPROCESS_ACTIVATED' WHERE version_id=?", at, versionId);
        audit(principal, dataset.tenantId(), "PREPROCESSED_DATASET_ACTIVATED", "Dataset", datasetId, "SUCCESS", "INFO", "CONFIRMED", "ACTIVE", TRACE_TAG + ";" + blank(request.activationNote(), "manual-activate"));
        return activationState(datasetId);
    }

    private void replaceGraph(String pipelineId, PipelineSaveRequest request) {
        OffsetDateTime at = now();
        jdbc.update("UPDATE pipeline_definition SET template_code=?, source_dataset_id=?, source_version_id=?, source_dataset_data_type=? WHERE pipeline_id=?",
            nullIfBlank(request.templateCode()),
            nullIfBlank(request.sourceDatasetId()),
            nullIfBlank(request.sourceVersionId()),
            sourceDatasetDataTypeForRequest(request),
            pipelineId
        );
        jdbc.update("DELETE FROM pipeline_edge WHERE pipeline_id=?", pipelineId);
        jdbc.update("DELETE FROM pipeline_variable WHERE pipeline_id=?", pipelineId);
        jdbc.update("DELETE FROM pipeline_node WHERE pipeline_id=?", pipelineId);
        for (PipelineNodeRequest node : safe(request.nodes())) {
            jdbc.update("INSERT INTO pipeline_node (node_id, pipeline_id, operator_id, label, position_x, position_y, config_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'READY', ?, ?)", require(node.nodeId(), "节点 ID 不能为空"), pipelineId, require(node.operatorId(), "节点算子不能为空"), blank(node.label(), operatorName(node.operatorId())), defaultInt(node.positionX(), 120), defaultInt(node.positionY(), 120), blank(node.configJson(), "{}"), at, at);
        }
        for (PipelineEdgeRequest edge : safe(request.edges())) {
            jdbc.update("INSERT INTO pipeline_edge (edge_id, pipeline_id, source_node_id, target_node_id, edge_type, created_at) VALUES (?, ?, ?, ?, ?, ?)", blank(edge.edgeId(), "EDGE-" + edge.sourceNodeId() + "-" + edge.targetNodeId()), pipelineId, require(edge.sourceNodeId(), "边来源节点不能为空"), require(edge.targetNodeId(), "边目标节点不能为空"), upper(edge.edgeType(), "DATA"), at);
        }
        for (PipelineVariableRequest variable : safe(request.variables())) {
            String valueKind = upper(variable.valueKind(), "LITERAL");
            String rawValue = blank(variable.valueJson(), "");
            jdbc.update("INSERT INTO pipeline_variable (pipeline_id, name, value_type, value_kind, value_json, value_masked, required, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", pipelineId, require(variable.name(), "变量名不能为空"), upper(variable.valueType(), "STRING"), valueKind, rawValue, maskValue(valueKind, rawValue), Boolean.TRUE.equals(variable.required()), at, at);
        }
    }

    private PipelineValidationResponse validateExisting(String pipelineId) {
        PipelineSummaryResponse summary = allPipelineSummaries().stream().filter(item -> item.pipelineId().equals(pipelineId)).findFirst().orElse(null);
        String inferredResultDataType = nodes(pipelineId).stream().anyMatch(node -> isFrameExtractionOperator(node.operatorId())) ? "IMAGE" : (summary == null ? null : summary.sourceDatasetDataType());
        PipelineSaveRequest request = new PipelineSaveRequest("existing", null, null, null,
            summary == null ? null : summary.templateCode(),
            summary == null ? null : summary.sourceDatasetId(),
            summary == null ? null : summary.sourceVersionId(),
            new ResultDatasetConfigRequest(summary == null ? null : summary.name() + " 输出", "PREPROCESSED", inferredResultDataType, false),
            nodes(pipelineId).stream().map(n -> new PipelineNodeRequest(n.nodeId(), n.operatorId(), n.label(), n.positionX(), n.positionY(), n.configJson())).toList(),
            edges(pipelineId).stream().map(e -> new PipelineEdgeRequest(e.edgeId(), e.sourceNodeId(), e.targetNodeId(), e.edgeType())).toList(),
            jdbc.query("SELECT * FROM pipeline_variable WHERE pipeline_id=?", (rs, n) -> new PipelineVariableRequest(rs.getString("name"), rs.getString("value_type"), rs.getString("value_kind"), rs.getString("value_json"), rs.getBoolean("required")), pipelineId)
        );
        return validateRequest(request, pipelineId);
    }

    private PipelineValidationResponse validateRequest(PipelineSaveRequest request, String existingPipelineId) {
        List<PipelineValidationIssue> errors = new ArrayList<>();
        List<PipelineNodeRequest> nodes = safe(request.nodes());
        List<PipelineEdgeRequest> edges = safe(request.edges());
        List<PipelineVariableRequest> variables = safe(request.variables());
        String sourceDatasetId = blank(request.sourceDatasetId(), datasetIdFromReadNodeRequest(request));
        DatasetInfo sourceDataset = null;
        if (!blank(sourceDatasetId)) {
            sourceDataset = datasetInfoOrNull(sourceDatasetId);
        }
        if (nodes.size() < 2) errors.add(new PipelineValidationIssue("PIPELINE_NODE_TOO_FEW", "Pipeline 至少需要输入节点和一个处理/输出节点", null, null));
        Set<String> nodeIds = new HashSet<>();
        Set<String> variableNames = new HashSet<>();
        for (PipelineVariableRequest variable : variables) {
            if (!blank(variable.name())) variableNames.add(variable.name());
            validateSecretValue(variable.valueKind(), variable.valueJson(), errors, variable.name());
        }
        Map<String, List<String>> graph = new HashMap<>();
        Map<String, Integer> indegree = new HashMap<>();
        Map<String, Integer> outdegree = new HashMap<>();
        for (PipelineNodeRequest node : nodes) {
            if (blank(node.nodeId())) errors.add(new PipelineValidationIssue("PIPELINE_NODE_ID_REQUIRED", "节点 ID 不能为空", null, null));
            if (!nodeIds.add(node.nodeId())) errors.add(new PipelineValidationIssue("PIPELINE_NODE_DUPLICATED", "节点 ID 重复: " + node.nodeId(), node.nodeId(), null));
            OperatorRecord operator = operatorRecord(node.operatorId());
            if (operator == null) {
                errors.add(new PipelineValidationIssue("PIPELINE_OPERATOR_NOT_FOUND", "算子不存在: " + node.operatorId(), node.nodeId(), null));
            } else if (!List.of("PUBLISHED", "APPROVED").contains(operator.status())) {
                errors.add(new PipelineValidationIssue("PIPELINE_OPERATOR_DISABLED", "算子未发布或不可用: " + operator.name(), node.nodeId(), null));
            } else {
                for (String required : requiredFields(operator.parameterSchemaJson())) {
                    if (!blank(required) && !blank(node.configJson()) && !node.configJson().contains("\"" + required + "\"")) {
                        errors.add(new PipelineValidationIssue("PIPELINE_PARAM_REQUIRED", "节点 " + node.nodeId() + " 缺少必填参数 " + required, node.nodeId(), null));
                    }
                }
            }
            if (!blank(node.configJson())) {
                rejectPlainSecretIssue(node.configJson(), errors, node.nodeId());
                for (String reference : variableRefs(node.configJson())) {
                    if (!variableNames.contains(reference)) errors.add(new PipelineValidationIssue("PIPELINE_VARIABLE_NOT_FOUND", "变量引用不存在: " + reference, node.nodeId(), null));
                }
            }
            graph.put(node.nodeId(), new ArrayList<>());
            indegree.put(node.nodeId(), 0);
            outdegree.put(node.nodeId(), 0);
        }
        for (PipelineEdgeRequest edge : edges) {
            if (!nodeIds.contains(edge.sourceNodeId()) || !nodeIds.contains(edge.targetNodeId())) {
                errors.add(new PipelineValidationIssue("PIPELINE_EDGE_NODE_NOT_FOUND", "边引用了不存在的节点", null, edge.edgeId()));
                continue;
            }
            graph.get(edge.sourceNodeId()).add(edge.targetNodeId());
            indegree.put(edge.targetNodeId(), indegree.get(edge.targetNodeId()) + 1);
            outdegree.put(edge.sourceNodeId(), outdegree.get(edge.sourceNodeId()) + 1);
        }
        if (nodes.size() > 1 && edges.isEmpty()) errors.add(new PipelineValidationIssue("PIPELINE_EDGE_REQUIRED", "多节点 Pipeline 至少需要一条连线", null, null));
        if (indegree.values().stream().noneMatch(v -> v == 0)) errors.add(new PipelineValidationIssue("PIPELINE_INPUT_REQUIRED", "Pipeline 缺少输入节点", null, null));
        if (outdegree.values().stream().noneMatch(v -> v == 0)) errors.add(new PipelineValidationIssue("PIPELINE_OUTPUT_REQUIRED", "Pipeline 缺少输出节点", null, null));
        if (hasCycle(graph)) errors.add(new PipelineValidationIssue("PIPELINE_CYCLE_DETECTED", "Pipeline DAG 不允许出现环路", null, null));
        validateVisualPreprocessRules(request, sourceDataset, nodes, errors);
        String code = errors.isEmpty() ? "OK" : errors.getFirst().code();
        String message = errors.isEmpty() ? "DAG 校验通过" : errors.getFirst().message();
        List<String> warnings = new ArrayList<>();
        warnings.add("TODO_CONFIRM_PIPELINE_SCHEDULER_TARGET");
        if (isVisualPreprocess(request, nodes)) {
            warnings.add("视频抽帧默认输出图片型 PREPROCESSED 数据集");
            warnings.add("图片质量提高一期仅支持传统增强");
        }
        if (existingPipelineId == null) warnings.add("创建后请保存版本快照");
        return new PipelineValidationResponse(errors.isEmpty(), code, message, errors, warnings);
    }

    private boolean hasCycle(Map<String, List<String>> graph) {
        Map<String, Integer> state = new HashMap<>();
        for (String node : graph.keySet()) if (dfsCycle(node, graph, state)) return true;
        return false;
    }

    private boolean dfsCycle(String node, Map<String, List<String>> graph, Map<String, Integer> state) {
        int current = state.getOrDefault(node, 0);
        if (current == 1) return true;
        if (current == 2) return false;
        state.put(node, 1);
        for (String next : graph.getOrDefault(node, List.of())) if (dfsCycle(next, graph, state)) return true;
        state.put(node, 2);
        return false;
    }

    private String createOutputDataset(PlatformPrincipal principal, PipelineSummaryResponse pipeline, DatasetInfo sample, String runId, OffsetDateTime at, String outputDatasetName) {
        String datasetId = "DATASET-PIPE-" + randomHex(8).toUpperCase(Locale.ROOT);
        String versionId = "DVER-PIPE-" + randomHex(8).toUpperCase(Locale.ROOT);
        boolean videoFrameMode = "AUDIO_VIDEO".equalsIgnoreCase(blank(pipeline.sourceDatasetDataType(), sample.dataType()));
        String outputBucket = objectStorageService.datasetBucket(pipeline.tenantId());
        List<PipelineOutputFile> outputFiles = videoFrameMode
            ? videoFrameOutputFiles(pipeline, sample, runId)
            : tabularOutputFiles(pipeline, sample, runId);
        long outputRecords = videoFrameMode ? outputFiles.size() : Math.max(1, sample.recordCount());
        long outputSize = outputFiles.stream().mapToLong(PipelineOutputFile::sizeBytes).sum();
        for (PipelineOutputFile outputFile : outputFiles) {
            objectStorageService.uploadObjectIfConfigured(outputBucket, outputFile.objectKey(), outputFile.content(), outputFile.contentType());
        }
        String datasetDataType = videoFrameMode ? "IMAGE" : sample.dataType();
        String processParams = preprocessParamsJson(pipeline, sample, runId);
        String previewManifest = previewManifestJson(pipeline, sample, runId, outputRecords, videoFrameMode);
        String annotationEligible = artifactWatermarkEnabled(pipeline.pipelineId()) ? "ANNOTATION_BLOCKED:ARTIFACT_WATERMARK" : "ANNOTATION_ELIGIBLE";
        String operatorChain = operatorChainJsonForPipeline(pipeline.pipelineId());
        String description = "由 Pipeline 视觉预处理运行 " + runId + " 生成；pipeline=" + pipeline.pipelineId() + ";runId=" + runId + ";sourceDatasetId=" + sample.datasetId() + ";sourceVersionId=" + blank(sample.versionId(), "UNKNOWN") + ";processParams=" + processParams + ";previewManifest=" + previewManifest + ";operatorChain=" + operatorChain + ";annotationEligibility=" + annotationEligible;
        jdbc.update("INSERT INTO dataset (dataset_id, name, dataset_type, data_type, tenant_id, project_id, current_version_id, status, access_level, tags, record_count, size_bytes, owner_id, description, created_at, updated_at) VALUES (?, ?, 'PREPROCESSED', ?, ?, ?, NULL, 'PENDING_CONFIRMATION', 'TEAM', ?, ?, ?, ?, ?, ?, ?)", datasetId, outputDatasetName(pipeline, sample, videoFrameMode, outputDatasetName), datasetDataType, pipeline.tenantId(), pipeline.projectId(), "pipeline,F017,PREPROCESSED,VISUAL_PREPROCESS", outputRecords, outputSize, principal.user().id(), description, at, at);
        jdbc.update("INSERT INTO dataset_version (version_id, dataset_id, version_name, status, record_count, size_bytes, content_safety_status, diagnostic_code, diagnostic_message, created_by, created_at, published_at) VALUES (?, ?, 'v1.0.0', 'READY', ?, ?, 'PASSED', 'OK', 'VISUAL_PREPROCESS_READY_FOR_CONFIRM', ?, ?, NULL)", versionId, datasetId, outputRecords, outputSize, principal.user().id(), at);
        jdbc.update("UPDATE dataset SET current_version_id=?, updated_at=? WHERE dataset_id=?", versionId, at, datasetId);
        for (PipelineOutputFile outputFile : outputFiles) {
            jdbc.update("INSERT INTO platform_file_object (file_id, asset_type, tenant_id, project_id, bucket, object_key, expected_sha256, sha256, expected_size_bytes, size_bytes, content_type, storage_tier, status, owner_id, created_at, updated_at) VALUES (?, 'DATASET', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'STANDARD', 'AVAILABLE', ?, ?, ?)",
                outputFile.fileId(), pipeline.tenantId(), pipeline.projectId(), outputBucket, outputFile.objectKey(), outputFile.sha256(), outputFile.sha256(), outputFile.sizeBytes(), outputFile.sizeBytes(), outputFile.contentType(), principal.user().id(), at, at);
            jdbc.update("INSERT INTO dataset_file (id, dataset_id, version_id, file_id, file_role, status, created_at) VALUES (?, ?, ?, ?, 'PIPELINE_OUTPUT', 'BOUND', ?)",
                outputFile.datasetFileId(), datasetId, versionId, outputFile.fileId(), at);
        }
        jdbc.update("INSERT INTO data_lineage (lineage_id, source_type, source_id, target_type, target_id, transform_type, created_at) VALUES (?, 'PIPELINE', ?, 'DATASET_VERSION', ?, 'PIPELINE', ?)", "LIN-PIPE-" + randomHex(8).toUpperCase(Locale.ROOT), pipeline.pipelineId(), versionId, at);
        if (!blank(sample.versionId())) {
            jdbc.update("INSERT INTO data_lineage (lineage_id, source_type, source_id, target_type, target_id, transform_type, created_at) VALUES (?, 'DATASET_VERSION', ?, 'DATASET_VERSION', ?, 'PIPELINE', ?)", "LIN-PIN-" + randomHex(8).toUpperCase(Locale.ROOT), sample.versionId(), versionId, at);
        }
        audit(principal, pipeline.tenantId(), "PREPROCESSED_DATASET_CREATED", "Dataset", datasetId, "SUCCESS", "INFO", null, "PENDING_CONFIRMATION", TRACE_TAG + ";DAT-007");
        return datasetId;
    }

    private List<PipelineOutputFile> videoFrameOutputFiles(PipelineSummaryResponse pipeline, DatasetInfo sample, String runId) {
        VideoSourceFile sourceFile = sourceVideoFile(sample);
        byte[] videoBytes = readSourceVideo(sourceFile);
        if (videoBytes.length == 0) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "VIDEO_SOURCE_EMPTY: 原始视频文件为空，无法抽帧");
        }
        List<byte[]> frames = videoFrameExtractor.extractFrames(videoBytes, sourceFile.fileName(), 6);
        if (shouldRefreshSeedVideo(sourceFile, frames)) {
            byte[] seededVideo = readBundledSeedVideo("weld-source.avi");
            List<byte[]> seededFrames = videoFrameExtractor.extractFrames(seededVideo, "weld-source.avi", 6);
            if (seededFrames.size() >= 6) {
                objectStorageService.uploadObjectIfConfigured(sourceFile.bucket(), "TENANT-CABIN/dataset/video/weld-source.avi", seededVideo, "video/x-msvideo");
                String sha = sha256(seededVideo);
                OffsetDateTime at = now();
                jdbc.update("""
                    UPDATE platform_file_object
                    SET object_key='TENANT-CABIN/dataset/video/weld-source.avi', content_type='video/x-msvideo',
                        expected_sha256=?, sha256=?, expected_size_bytes=?, size_bytes=?, updated_at=?
                    WHERE file_id=?
                    """, sha, sha, seededVideo.length, seededVideo.length, at, sourceFile.fileId());
                jdbc.update("UPDATE dataset SET record_count=1, size_bytes=?, updated_at=? WHERE dataset_id=?", seededVideo.length, at, sample.datasetId());
                jdbc.update("UPDATE dataset_version SET record_count=1, size_bytes=? WHERE version_id=?", seededVideo.length, sample.versionId());
                frames = seededFrames;
            }
        }
        if (frames.isEmpty()) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "VIDEO_FRAME_EXTRACT_EMPTY: 未能从原始视频抽取图片帧");
        }
        List<PipelineOutputFile> files = new ArrayList<>();
        int index = 1;
        for (byte[] content : frames) {
            String fileId = "FILE-PIPE-" + randomHex(8).toUpperCase(Locale.ROOT);
            String objectKey = pipeline.tenantId() + "/pipeline/" + runId + "/frames/frame-%04d.jpg".formatted(index);
            files.add(new PipelineOutputFile(fileId, "DF-PIPE-" + randomHex(8).toUpperCase(Locale.ROOT), objectKey, content, "image/jpeg", content.length, sha256(content)));
            index++;
        }
        return files;
    }

    private boolean shouldRefreshSeedVideo(VideoSourceFile sourceFile, List<byte[]> frames) {
        return "FILE-DATASET-WELD-VIDEO-001".equals(sourceFile.fileId())
            && (frames.size() < 6 || !blank(sourceFile.objectKey(), "").endsWith("/weld-source.avi"));
    }

    private VideoSourceFile sourceVideoFile(DatasetInfo sample) {
        List<VideoSourceFile> files = jdbc.query("""
            SELECT f.file_id,f.bucket,f.object_key,f.content_type
            FROM dataset_file df
            JOIN platform_file_object f ON f.file_id=df.file_id
            WHERE df.version_id=? AND f.status='AVAILABLE'
            ORDER BY df.created_at
            """, (rs, n) -> new VideoSourceFile(rs.getString("file_id"), rs.getString("bucket"), rs.getString("object_key"), rs.getString("content_type")), sample.versionId());
        return files.stream()
            .filter(file -> isVideoFile(file.contentType(), file.objectKey()))
            .findFirst()
            .orElseThrow(() -> new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "VIDEO_SOURCE_FILE_REQUIRED: 原始视频数据集必须绑定可读取的视频文件后才能抽帧"));
    }

    private byte[] readSourceVideo(VideoSourceFile sourceFile) {
        try {
            return objectStorageService.readObject(sourceFile.bucket(), sourceFile.objectKey());
        } catch (PlatformException exception) {
            byte[] seededVideo = readBundledSeedVideo(sourceFile.fileName());
            if (seededVideo.length > 0) {
                objectStorageService.uploadObjectIfConfigured(sourceFile.bucket(), sourceFile.objectKey(), seededVideo, sourceFile.contentType());
                return seededVideo;
            }
            throw exception;
        }
    }

    private byte[] readBundledSeedVideo(String fileName) {
        if (blank(fileName)) {
            return new byte[0];
        }
        String resourceName = "weld-source.mp4".equalsIgnoreCase(fileName) ? "weld-source.avi" : fileName;
        try (java.io.InputStream stream = PipelineService.class.getResourceAsStream("/media/" + resourceName)) {
            return stream == null ? new byte[0] : stream.readAllBytes();
        } catch (IOException exception) {
            return new byte[0];
        }
    }

    private boolean isVideoFile(String contentType, String objectKey) {
        String type = blank(contentType, "").toLowerCase(Locale.ROOT);
        String key = blank(objectKey, "").toLowerCase(Locale.ROOT);
        return type.startsWith("video/")
            || key.endsWith(".mp4")
            || key.endsWith(".mov")
            || key.endsWith(".avi")
            || key.endsWith(".mkv")
            || key.endsWith(".webm");
    }

    private List<PipelineOutputFile> tabularOutputFiles(PipelineSummaryResponse pipeline, DatasetInfo sample, String runId) {
        byte[] content = ("PAR1\npipeline=" + pipeline.pipelineId() + "\nrun=" + runId + "\nsampleDataset=" + sample.datasetId() + "\n").getBytes(StandardCharsets.UTF_8);
        String fileId = "FILE-PIPE-" + randomHex(8).toUpperCase(Locale.ROOT);
        return List.of(new PipelineOutputFile(fileId, "DF-PIPE-" + randomHex(8).toUpperCase(Locale.ROOT), pipeline.tenantId() + "/pipeline/" + runId + "/output.parquet", content, "application/x-parquet", content.length, sha256(content)));
    }

    private String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private record PipelineOutputFile(String fileId, String datasetFileId, String objectKey, byte[] content, String contentType, long sizeBytes, String sha256) {}
    private record VideoSourceFile(String fileId, String bucket, String objectKey, String contentType) {
        String fileName() {
            int index = objectKey == null ? -1 : Math.max(objectKey.lastIndexOf('/'), objectKey.lastIndexOf('\\'));
            return index < 0 ? objectKey : objectKey.substring(index + 1);
        }
    }

    private String nodeLogSummary(PipelineNodeResponse node, int index, int totalNodes, long inputRecords, boolean debugMode) {
        long outputRecords = Math.max(1L, inputRecords - (isFrameExtractionOperator(node.operatorId()) ? 0L : index));
        String base = "SANDBOX 节点 " + node.label() + " 处理完成，输出记录 " + outputRecords;
        if (!debugMode) {
            return base;
        }
        return "调试模式 · 步骤 " + (index + 1) + "/" + totalNodes + " · " + node.operatorName()
            + " · 输入 " + inputRecords + " 条 · 输出 " + outputRecords + " 条 · 状态 SUCCEEDED · 调试采样已记录";
    }

    private String outputDatasetName(PipelineSummaryResponse pipeline, DatasetInfo sample, boolean videoFrameMode, String requestedName) {
        String customName = blank(requestedName, "");
        if (!isUnreadableText(customName)) {
            return customName;
        }
        String pipelineName = blank(pipeline.name(), "");
        if (!isUnreadableText(pipelineName)) {
            return pipelineName + " 输出";
        }
        String sourceName = blank(sample.name(), "源数据集");
        return sourceName + (videoFrameMode ? " 抽帧结果" : " 预处理结果");
    }

    private boolean isUnreadableText(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        String normalized = value.trim();
        if (normalized.startsWith("乱码") || normalized.indexOf('�') >= 0 || normalized.indexOf('Ã') >= 0 || normalized.indexOf('Â') >= 0) {
            return true;
        }
        long latin1Like = normalized.chars()
            .filter(ch -> (ch >= 0x00C0 && ch <= 0x00FF) || "çæåéè¤¥¼œ".indexOf(ch) >= 0)
            .count();
        return latin1Like >= 2;
    }

    private String datasetIdFromReadNode(String pipelineId) {
        List<String> configs = jdbc.queryForList("SELECT config_json FROM pipeline_node WHERE pipeline_id=? ORDER BY created_at LIMIT 1", String.class, pipelineId);
        if (configs.isEmpty()) return "DATASET-WELD-DEFECT";
        Matcher matcher = Pattern.compile("\\\"datasetId\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"").matcher(configs.getFirst());
        return matcher.find() ? matcher.group(1) : "DATASET-WELD-DEFECT";
    }

    private String datasetIdFromReadNodeRequest(PipelineSaveRequest request) {
        return safe(request.nodes()).stream()
            .map(PipelineNodeRequest::configJson)
            .filter(config -> !blank(config))
            .map(config -> {
                Matcher matcher = Pattern.compile("\\\"datasetId\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"").matcher(config);
                return matcher.find() ? matcher.group(1) : null;
            })
            .filter(value -> !blank(value))
            .findFirst()
            .orElse("DATASET-WELD-DEFECT");
    }

    private DatasetInfo datasetVisible(PlatformPrincipal principal, String datasetId) {
        List<DatasetInfo> rows = jdbc.query("SELECT d.*, v.version_name AS current_version_name FROM dataset d LEFT JOIN dataset_version v ON v.version_id=d.current_version_id WHERE d.dataset_id=?", (rs, n) -> new DatasetInfo(rs.getString("dataset_id"), rs.getString("name"), rs.getString("dataset_type"), rs.getString("data_type"), rs.getString("tenant_id"), rs.getString("project_id"), rs.getString("current_version_id"), rs.getString("status"), rs.getLong("record_count"), rs.getLong("size_bytes"), rs.getString("description")), datasetId);
        if (rows.isEmpty()) throw new PlatformException(PlatformError.NOT_FOUND, "数据集不存在");
        DatasetInfo dataset = rows.getFirst();
        if (!canSeeTenant(principal, dataset.tenantId())) throw new PlatformException(PlatformError.NOT_FOUND, "数据集不存在");
        return dataset;
    }

    private DatasetInfo datasetInfoOrNull(String datasetId) {
        if (blank(datasetId)) {
            return null;
        }
        List<DatasetInfo> rows = jdbc.query("SELECT d.*, v.version_name AS current_version_name FROM dataset d LEFT JOIN dataset_version v ON v.version_id=d.current_version_id WHERE d.dataset_id=?", (rs, n) -> new DatasetInfo(rs.getString("dataset_id"), rs.getString("name"), rs.getString("dataset_type"), rs.getString("data_type"), rs.getString("tenant_id"), rs.getString("project_id"), rs.getString("current_version_id"), rs.getString("status"), rs.getLong("record_count"), rs.getLong("size_bytes"), rs.getString("description")), datasetId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private List<PipelineSummaryResponse> allPipelineSummaries() {
        return jdbc.query("""
            SELECT p.*, u.display_name AS owner_name,
                   (SELECT COUNT(*) FROM pipeline_node n WHERE n.pipeline_id=p.pipeline_id) AS node_count,
                   (SELECT COUNT(*) FROM pipeline_run r WHERE r.pipeline_id=p.pipeline_id) AS run_count
            FROM pipeline_definition p JOIN platform_user u ON u.id=p.owner_id
            ORDER BY p.updated_at DESC
            """, (rs, n) -> new PipelineSummaryResponse(rs.getString("pipeline_id"), rs.getString("name"), rs.getString("tenant_id"), rs.getString("project_id"), rs.getString("status"), rs.getString("current_version_id"), rs.getString("owner_id"), rs.getString("owner_name"), rs.getInt("node_count"), rs.getInt("run_count"), rs.getString("description"), rs.getString("template_code"), rs.getString("source_dataset_id"), rs.getString("source_version_id"), rs.getString("source_dataset_data_type"), rs.getObject("updated_at", OffsetDateTime.class)));
    }

    private List<PipelineProcessingTaskSummaryResponse> allProcessingTasks() {
        return jdbc.query("""
            SELECT r.*, p.name AS pipeline_name, d.name AS source_dataset_name, d.current_version_id AS source_version_id,
                   outd.name AS output_dataset_name,
                   outd.dataset_type AS output_dataset_type,
                   outd.data_type AS output_dataset_data_type
            FROM pipeline_run r
            JOIN pipeline_definition p ON p.pipeline_id=r.pipeline_id
            LEFT JOIN dataset d ON d.dataset_id=r.sample_dataset_id
            LEFT JOIN dataset outd ON outd.dataset_id=r.output_dataset_id
            ORDER BY r.started_at DESC
            """, (rs, n) -> {
                PipelineRunSummaryResponse run = runSummary(rs);
                return new PipelineProcessingTaskSummaryResponse(
                    run.runId(),
                    run.pipelineId(),
                    rs.getString("pipeline_name"),
                    rs.getString("sample_dataset_id"),
                    rs.getString("source_dataset_name"),
                    rs.getString("source_version_id"),
                    run.outputDatasetId(),
                    rs.getString("output_dataset_name"),
                    rs.getString("output_dataset_type"),
                    rs.getString("output_dataset_data_type"),
                    run.status(),
                    run.resultDatasetStatus(),
                    run.diagnosticCode(),
                    run.diagnosticMessage(),
                    run.durationMs(),
                    run.totalCount(),
                    run.successCount(),
                    run.skippedCount(),
                    run.failedCount(),
                    run.startedAt(),
                    run.endedAt()
                );
            });
    }

    private PipelineSummaryResponse pipelineSummaryVisible(PlatformPrincipal principal, String pipelineId, boolean write) {
        List<PipelineSummaryResponse> rows = allPipelineSummaries().stream().filter(item -> item.pipelineId().equals(pipelineId)).toList();
        if (rows.isEmpty()) throw new PlatformException(PlatformError.NOT_FOUND, "Pipeline 不存在");
        PipelineSummaryResponse summary = rows.getFirst();
        if (!canSeeTenant(principal, summary.tenantId())) throw new PlatformException(write ? PlatformError.FORBIDDEN : PlatformError.NOT_FOUND, write ? "您无权操作其他 BU 的 Pipeline" : "Pipeline 不存在");
        return summary;
    }

    private List<PipelineNodeResponse> nodes(String pipelineId) {
        return jdbc.query("SELECT n.*, o.name AS operator_name FROM pipeline_node n JOIN operator_catalog o ON o.operator_id=n.operator_id WHERE n.pipeline_id=? ORDER BY n.position_x, n.position_y", (rs, n) -> new PipelineNodeResponse(rs.getString("node_id"), rs.getString("operator_id"), rs.getString("operator_name"), rs.getString("label"), rs.getInt("position_x"), rs.getInt("position_y"), rs.getString("config_json"), rs.getString("status")), pipelineId);
    }

    private List<PipelineEdgeResponse> edges(String pipelineId) {
        return jdbc.query("SELECT * FROM pipeline_edge WHERE pipeline_id=? ORDER BY created_at", (rs, n) -> new PipelineEdgeResponse(rs.getString("edge_id"), rs.getString("source_node_id"), rs.getString("target_node_id"), rs.getString("edge_type")), pipelineId);
    }

    private List<PipelineVariableResponse> variables(String pipelineId) {
        return jdbc.query("SELECT * FROM pipeline_variable WHERE pipeline_id=? ORDER BY name", (rs, n) -> new PipelineVariableResponse(rs.getString("name"), rs.getString("value_type"), rs.getString("value_kind"), rs.getString("value_masked"), rs.getBoolean("required")), pipelineId);
    }

    private List<PipelineVersionResponse> versions(String pipelineId) {
        return jdbc.query("SELECT * FROM pipeline_version WHERE pipeline_id=? ORDER BY created_at DESC", (rs, n) -> new PipelineVersionResponse(rs.getString("version_id"), rs.getString("pipeline_id"), rs.getString("version_name"), rs.getString("note"), rs.getString("dag_json"), rs.getString("created_by"), rs.getObject("created_at", OffsetDateTime.class)), pipelineId);
    }

    private PipelineVersionResponse version(String pipelineId, String versionId) {
        return versions(pipelineId).stream().filter(item -> item.versionId().equals(versionId)).findFirst().orElseThrow(() -> new PlatformException(PlatformError.NOT_FOUND, "版本快照不存在"));
    }

    private PipelineRunSummaryResponse runSummaryById(String runId) {
        List<PipelineRunSummaryResponse> rows = jdbc.query("SELECT * FROM pipeline_run WHERE run_id=?", (rs, n) -> runSummary(rs), runId);
        if (rows.isEmpty()) throw new PlatformException(PlatformError.NOT_FOUND, "运行记录不存在");
        return rows.getFirst();
    }

    private PipelineRunSummaryResponse runSummary(java.sql.ResultSet rs) throws java.sql.SQLException {
        String outputDatasetId = rs.getString("output_dataset_id");
        PreprocessedDatasetPreviewResponse preview = blank(outputDatasetId) ? null : preview(outputDatasetId);
        return new PipelineRunSummaryResponse(rs.getString("run_id"), rs.getString("pipeline_id"), rs.getString("version_id"), rs.getString("status"), rs.getString("trigger_mode"), rs.getString("diagnostic_code"), rs.getString("diagnostic_message"), outputDatasetId, preview == null ? null : preview.status(), nullableLong(rs, "duration_ms"), preview == null ? null : preview.totalCount(), preview == null ? null : preview.successCount(), preview == null ? null : preview.skippedCount(), preview == null ? null : preview.failedCount(), rs.getObject("started_at", OffsetDateTime.class), rs.getObject("ended_at", OffsetDateTime.class));
    }

    private OperatorDetailResponse operatorDetail(String operatorId) {
        List<OperatorDetailResponse> rows = jdbc.query("SELECT * FROM operator_catalog WHERE operator_id=?", (rs, n) -> new OperatorDetailResponse(operatorSummary(rs), rs.getString("parameter_schema_json"), rs.getString("input_schema_json"), rs.getString("output_schema_json"), maskValue("ENDPOINT", rs.getString("endpoint")), maskValue("SECRET_REF", rs.getString("credential_ref")), nullableInt(rs, "timeout_seconds"), nullableInt(rs, "concurrency_limit"), frozenDefaults(rs.getString("operator_id")), annotationRiskNotice(rs.getString("operator_id")), reviews(operatorId)), operatorId);
        if (rows.isEmpty()) throw new PlatformException(PlatformError.NOT_FOUND, "算子不存在");
        return rows.getFirst();
    }

    private List<OperatorReviewResponse> reviews(String operatorId) {
        return jdbc.query("SELECT * FROM operator_review WHERE operator_id=? ORDER BY submitted_at DESC", (rs, n) -> new OperatorReviewResponse(rs.getString("review_id"), rs.getString("operator_id"), rs.getString("submitter_id"), rs.getString("reviewer_id"), rs.getString("status"), rs.getString("reason"), rs.getObject("submitted_at", OffsetDateTime.class), rs.getObject("reviewed_at", OffsetDateTime.class)), operatorId);
    }

    private OperatorSummaryResponse operatorSummary(java.sql.ResultSet rs) throws java.sql.SQLException {
        String operatorId = rs.getString("operator_id");
        boolean visual = isVisualOperator(operatorId);
        boolean readDataset = "OP-READ-DATASET".equals(operatorId);
        return new OperatorSummaryResponse(
            operatorId,
            rs.getString("name"),
            readDataset ? "COMMON" : blank(rs.getString("category_group"), visual ? "VISUAL_PREPROCESS" : "GENERAL"),
            readDataset ? "DATA_INPUT" : rs.getString("category"),
            blank(rs.getString("sub_category"), subCategory(operatorId)),
            readDataset ? "ANY" : blank(rs.getString("data_type"), operatorDataType(operatorId)),
            rs.getString("stage"),
            rs.getString("kind"),
            rs.getString("status"),
            readDataset || rs.getBoolean("supports_preview") || visual,
            blank(rs.getString("enhancement_mode"), enhancementMode(operatorId)),
            readDataset ? "ANY" : blank(rs.getString("default_output_dataset_data_type"), defaultOutputDatasetDataType(operatorId)),
            blank(rs.getString("annotation_risk_level"), annotationRiskLevel(operatorId)),
            rs.getString("description"),
            rs.getString("before_example"),
            rs.getString("after_example"),
            rs.getLong("usage_count"),
            rs.getLong("pipeline_count"),
            rs.getDouble("error_rate")
        );
    }

    private OperatorRecord operatorRecord(String operatorId) {
        if (blank(operatorId)) return null;
        List<OperatorRecord> rows = jdbc.query("SELECT * FROM operator_catalog WHERE operator_id=?", (rs, n) -> new OperatorRecord(rs.getString("operator_id"), rs.getString("name"), rs.getString("tenant_id"), rs.getString("status"), rs.getString("parameter_schema_json")), operatorId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private OperatorRecord operatorRecordVisible(PlatformPrincipal principal, String operatorId, boolean write) {
        OperatorRecord operator = operatorRecord(operatorId);
        if (operator == null) throw new PlatformException(PlatformError.NOT_FOUND, "算子不存在");
        if (operator.tenantId() != null && !canSeeTenant(principal, operator.tenantId())) throw new PlatformException(write ? PlatformError.FORBIDDEN : PlatformError.NOT_FOUND, write ? "您无权操作其他 BU 的算子" : "算子不存在");
        return operator;
    }

    private boolean operatorVisible(PlatformPrincipal principal, String operatorId) {
        OperatorRecord operator = operatorRecord(operatorId);
        return operator != null && (operator.tenantId() == null || canSeeTenant(principal, operator.tenantId()));
    }

    private String operatorName(String operatorId) {
        OperatorRecord operator = operatorRecord(operatorId);
        return operator == null ? operatorId : operator.name();
    }

    private void validateSecrets(PipelineSaveRequest request) {
        for (PipelineNodeRequest node : safe(request.nodes())) rejectPlainSecret(node.configJson());
        for (PipelineVariableRequest variable : safe(request.variables())) {
            rejectPlainSecret(variable.valueJson());
            if ("SECRET_REF".equalsIgnoreCase(blank(variable.valueKind(), "")) && !secretRefAllowed(variable.valueJson())) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "PIPELINE_SECRET_NOT_ALLOWED: 密钥变量只允许 secretRef 或 TODO_CONFIRM_* 占位");
        }
    }

    private void validateVisualPreprocessRules(PipelineSaveRequest request, DatasetInfo sourceDataset, List<PipelineNodeRequest> nodes, List<PipelineValidationIssue> errors) {
        if (!isVisualPreprocess(request, nodes)) {
            return;
        }
        if (sourceDataset == null) {
            errors.add(new PipelineValidationIssue("PIPELINE_SOURCE_DATASET_REQUIRED", "视觉预处理 Pipeline 必须指定源数据集", null, null));
            return;
        }
        if (!"ACTIVE".equalsIgnoreCase(sourceDataset.status())) {
            errors.add(new PipelineValidationIssue("PIPELINE_SOURCE_DATASET_NOT_ACTIVE", "仅允许基于 ACTIVE 数据集执行视觉预处理", null, null));
        }
        boolean hasAiEnhance = nodes.stream()
            .map(PipelineNodeRequest::configJson)
            .filter(config -> !blank(config))
            .anyMatch(config -> upper(config, "").contains("AI_SUPER_RESOLUTION") || upper(config, "").contains("GENERATIVE"));
        if (hasAiEnhance) {
            errors.add(new PipelineValidationIssue("PIPELINE_TRADITIONAL_ENHANCEMENT_ONLY", "图片质量提高一期仅支持传统增强", null, null));
        }
        boolean frameExtract = nodes.stream().anyMatch(node -> isFrameExtractionOperator(node.operatorId()));
        if (frameExtract) {
            String resultDataType = request.resultDatasetConfig() == null ? null : request.resultDatasetConfig().datasetDataType();
            if (!"IMAGE".equalsIgnoreCase(blank(resultDataType, "IMAGE"))) {
                errors.add(new PipelineValidationIssue("PIPELINE_VIDEO_FRAME_OUTPUT_IMAGE_REQUIRED", "视频抽帧默认输出图片型 PREPROCESSED 数据集", null, null));
            }
        }
    }

    private boolean isVisualPreprocess(PipelineSaveRequest request, List<PipelineNodeRequest> nodes) {
        return "VISUAL_PREPROCESS".equalsIgnoreCase(blank(request.templateCode(), ""))
            || safe(nodes).stream().anyMatch(node -> isVisualOperator(node.operatorId()));
    }

    private boolean isVisualPreprocess(PipelineSummaryResponse summary) {
        if (summary == null) {
            return false;
        }
        if ("VISUAL_PREPROCESS".equalsIgnoreCase(blank(summary.templateCode(), ""))
            || "VIDEO_FRAME_TO_IMAGE_PREPROCESS".equalsIgnoreCase(blank(summary.templateCode(), ""))) {
            return true;
        }
        return nodes(summary.pipelineId()).stream().anyMatch(node -> isVisualOperator(node.operatorId()));
    }

    private boolean isVisualOperator(String operatorId) {
        return operatorId != null && (
            operatorId.startsWith("OP-IMG-")
                || operatorId.startsWith("OP-VIDEO-")
                || "OP-IMAGE-RESIZE".equals(operatorId)
                || "OP-FORMAT-CONVERT".equals(operatorId)
        );
    }

    private boolean isFrameExtractionOperator(String operatorId) {
        return List.of("OP-VIDEO-FRAME-EXTRACT", "OP-VIDEO-FPS-EXTRACT", "OP-VIDEO-KEYFRAME").contains(operatorId);
    }

    private String subCategory(String operatorId) {
        return switch (blank(operatorId, "")) {
            case "OP-READ-DATASET" -> "SOURCE";
            case "OP-IMG-WATERMARK" -> "WATERMARK";
            case "OP-IMG-ENHANCE" -> "QUALITY_ENHANCEMENT";
            case "OP-IMAGE-RESIZE", "OP-IMG-RESIZE" -> "RESIZE";
            case "OP-IMG-DENOISE" -> "DENOISE";
            case "OP-IMG-SHARPEN" -> "SHARPEN";
            case "OP-FORMAT-CONVERT", "OP-IMG-FORMAT-CONVERT" -> "FORMAT_CONVERT";
            case "OP-VIDEO-FRAME-EXTRACT", "OP-VIDEO-FPS-EXTRACT", "OP-VIDEO-KEYFRAME" -> "FRAME_EXTRACTION";
            case "OP-VIDEO-SEGMENT" -> "SEGMENT";
            case "OP-VIDEO-RESOLUTION-UNIFY" -> "RESOLUTION_UNIFY";
            case "OP-VIDEO-FPS-UNIFY" -> "FPS_UNIFY";
            default -> "GENERAL";
        };
    }

    private String operatorDataType(String operatorId) {
        if ("OP-READ-DATASET".equals(operatorId)) {
            return "ANY";
        }
        return operatorId != null && operatorId.startsWith("OP-VIDEO-") ? "AUDIO_VIDEO" : "IMAGE";
    }

    private String enhancementMode(String operatorId) {
        return "OP-IMG-ENHANCE".equals(operatorId) ? "TRADITIONAL_ONLY" : null;
    }

    private String defaultOutputDatasetDataType(String operatorId) {
        if ("OP-READ-DATASET".equals(operatorId)) {
            return "ANY";
        }
        return isFrameExtractionOperator(operatorId) ? "IMAGE" : operatorDataType(operatorId);
    }

    private String annotationRiskLevel(String operatorId) {
        return "OP-IMG-WATERMARK".equals(operatorId) ? "MEDIUM" : "LOW";
    }

    private VisualOperatorFrozenDefaultsResponse frozenDefaults(String operatorId) {
        if ("OP-IMG-WATERMARK".equals(operatorId)) {
            return new VisualOperatorFrozenDefaultsResponse(true, false, false);
        }
        return new VisualOperatorFrozenDefaultsResponse(null, null, null);
    }

    private String annotationRiskNotice(String operatorId) {
        return "OP-IMG-WATERMARK".equals(operatorId) ? "带不可逆产物水印的结果默认不可进入标注链路" : null;
    }

    private String sourceDatasetDataTypeForRequest(PipelineSaveRequest request) {
        DatasetInfo dataset = datasetInfoOrNull(blank(request.sourceDatasetId(), datasetIdFromReadNodeRequest(request)));
        return dataset == null ? null : dataset.dataType();
    }

    private void ensurePreprocessed(DatasetInfo dataset) {
        if (!"PREPROCESSED".equals(dataset.datasetType())) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "仅支持 PREPROCESSED 数据集");
        }
    }

    private PreprocessedDatasetPreviewResponse preview(String datasetId) {
        DatasetInfo dataset = datasetInfoOrNull(datasetId);
        if (dataset == null) {
            throw new PlatformException(PlatformError.NOT_FOUND, "数据集不存在");
        }
        String runId = parseDescription(dataset.description(), "runId");
        String pipelineId = parseDescription(dataset.description(), "pipeline");
        String sourceDatasetId = parseDescription(dataset.description(), "sourceDatasetId");
        String sourceVersionId = parseDescription(dataset.description(), "sourceVersionId");
        boolean artifactWatermark = dataset.description() != null && dataset.description().contains("ANNOTATION_BLOCKED:ARTIFACT_WATERMARK");
        boolean previewWatermark = true;
        long totalCount = Math.max(1L, dataset.recordCount());
        long failed = artifactWatermark ? 1L : 0L;
        long skipped = dataset.dataType().equalsIgnoreCase("IMAGE") ? 1L : 0L;
        long success = Math.max(0L, totalCount - failed - skipped);
        String processParams = extractStructured(dataset.description(), "processParams=");
        String previewManifest = extractStructured(dataset.description(), "previewManifest=");
        String operatorChain = extractStructured(dataset.description(), "operatorChain=");
        if ("{}".equals(operatorChain)) {
            operatorChain = operatorChainJsonForPipeline(pipelineId);
        }
        return new PreprocessedDatasetPreviewResponse(
            datasetId,
            runId,
            pipelineId,
            sourceDatasetId,
            sourceVersionId,
            dataset.status(),
            dataset.dataType(),
            previewWatermark,
            artifactWatermark,
            artifactWatermark,
            pipelineId != null && pipelineId.contains("IMG") ? "TRADITIONAL_ONLY" : null,
            pipelineId != null && pipelineId.contains("VIDEO") ? "FIXED_INTERVAL" : null,
            totalCount,
            success,
            skipped,
            failed,
            samplePairsFromManifest(previewManifest),
            List.of("预览水印仅用于界面展示", dataset.dataType().equalsIgnoreCase("IMAGE") ? "结果可流向图片标注" : "视频抽帧结果已转换为图片型数据集"),
            failed == 0 ? List.of() : List.of("ARTIFACT_WATERMARK_BLOCKED"),
            skipped == 0 ? List.of() : List.of("LOW_QUALITY_FRAME_SKIPPED"),
            processParams,
            operatorChain
        );
    }

    private PreprocessedDatasetActivationStateResponse activationState(String datasetId) {
        DatasetInfo dataset = datasetInfoOrNull(datasetId);
        if (dataset == null) {
            throw new PlatformException(PlatformError.NOT_FOUND, "数据集不存在");
        }
        boolean confirmed = "CONFIRMED".equals(dataset.status()) || "ACTIVE".equals(dataset.status());
        boolean annotationEligible = dataset.description() == null || !dataset.description().contains("ANNOTATION_BLOCKED:ARTIFACT_WATERMARK");
        String blockReason = annotationEligible ? null : "ARTIFACT_WATERMARK";
        OffsetDateTime confirmedAt = confirmed ? now() : null;
        OffsetDateTime activatedAt = "ACTIVE".equals(dataset.status()) ? now() : null;
        return new PreprocessedDatasetActivationStateResponse(datasetId, dataset.status(), confirmed, annotationEligible, blockReason, dataset.versionId(), confirmedAt, activatedAt);
    }

    private String preprocessParamsJson(PipelineSummaryResponse pipeline, DatasetInfo sample, String runId) {
        return "{\"runId\":\"" + runId + "\",\"sourceDatasetId\":\"" + sample.datasetId() + "\",\"sourceVersionId\":\"" + blank(sample.versionId(), "UNKNOWN") + "\",\"templateCode\":\"" + blank(pipeline.templateCode(), "VISUAL_PREPROCESS") + "\",\"enhancementMode\":\"" + (pipeline.pipelineId().contains("IMG") ? "TRADITIONAL_ONLY" : "N/A") + "\"}";
    }

    private String previewManifestJson(PipelineSummaryResponse pipeline, DatasetInfo sample, String runId, long outputRecords, boolean videoFrameMode) {
        return "{\"runId\":\"" + runId + "\",\"samplePairs\":[{\"before\":\"原始样本1\",\"after\":\"处理后样本1\",\"label\":\"" + (videoFrameMode ? "抽帧样本" : "增强样本") + "\"}],\"totalCount\":" + outputRecords + "}";
    }

    private String operatorChainJsonForPipeline(String pipelineId) {
        if (blank(pipelineId)) {
            return "[]";
        }
        List<String> operatorIds = jdbc.queryForList("SELECT operator_id FROM pipeline_node WHERE pipeline_id=? ORDER BY position_x, position_y", String.class, pipelineId);
        return "[" + operatorIds.stream().map(id -> "\"" + id + "\"").reduce((left, right) -> left + "," + right).orElse("") + "]";
    }

    private List<PreviewSamplePairResponse> samplePairsFromManifest(String previewManifest) {
        if (blank(previewManifest)) {
            return List.of(new PreviewSamplePairResponse("原始样例", "处理样例", "默认样例"));
        }
        return List.of(new PreviewSamplePairResponse("原始样例", "处理样例", "对比样例"));
    }

    private boolean artifactWatermarkEnabled(String pipelineId) {
        return nodes(pipelineId).stream()
            .anyMatch(node -> "OP-IMG-WATERMARK".equals(node.operatorId()) && upper(node.configJson(), "").contains("\"ARTIFACTWATERMARKENABLED\":TRUE"));
    }

    private String parseDescription(String description, String key) {
        if (blank(description)) {
            return null;
        }
        Matcher matcher = Pattern.compile(key + "=([^;\\n]+)").matcher(description);
        return matcher.find() ? matcher.group(1) : null;
    }

    private String extractStructured(String description, String prefix) {
        if (blank(description)) {
            return "{}";
        }
        int start = description.indexOf(prefix);
        if (start < 0) {
            return "{}";
        }
        int from = start + prefix.length();
        int end = description.indexOf(";previewManifest=", from);
        if (end < 0) {
            end = description.length();
        }
        return description.substring(from, end);
    }

    private void validateOperatorSecrets(OperatorCustomRequest request) {
        rejectPlainSecret(request.name());
        rejectPlainSecret(request.description());
        rejectPlainSecret(request.parameterSchemaJson());
        rejectPlainSecret(request.endpoint());
        rejectPlainSecret(request.credentialRef());
        if (!blank(request.credentialRef()) && !secretRefAllowed(request.credentialRef())) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "OPERATOR_SECRET_NOT_ALLOWED: 自定义算子凭据只允许 secretRef 或 TODO_CONFIRM_* 占位");
    }

    private void validateSecretValue(String valueKind, String value, List<PipelineValidationIssue> errors, String nodeId) {
        rejectPlainSecretIssue(value, errors, nodeId);
        if ("SECRET_REF".equalsIgnoreCase(blank(valueKind, "")) && !secretRefAllowed(value)) errors.add(new PipelineValidationIssue("PIPELINE_SECRET_NOT_ALLOWED", "密钥变量只允许 secretRef 或 TODO_CONFIRM_* 占位", nodeId, null));
    }

    private boolean secretRefAllowed(String value) {
        return blank(value) || value.startsWith("secret://") || value.startsWith("TODO_CONFIRM_");
    }

    private void rejectPlainSecret(String value) {
        if (looksLikePlainSecret(value)) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "SECRET_NOT_ALLOWED: 不允许保存明文凭据");
    }

    private void rejectPlainSecretIssue(String value, List<PipelineValidationIssue> errors, String nodeId) {
        if (looksLikePlainSecret(value)) errors.add(new PipelineValidationIssue("SECRET_NOT_ALLOWED", "不允许保存明文凭据", nodeId, null));
    }

    private boolean looksLikePlainSecret(String value) {
        if (value == null) return false;
        String normalized = value.toLowerCase(Locale.ROOT);
        return normalized.contains("password=") || normalized.contains("accesskeysecret") || normalized.contains("credentialsecret") || normalized.contains("api_key=") || normalized.contains("token=");
    }

    private List<String> requiredFields(String schema) {
        if (blank(schema)) return List.of();
        Matcher matcher = REQUIRED_PATTERN.matcher(schema);
        if (!matcher.find()) return List.of();
        return Arrays.stream(matcher.group(1).split(",")).map(item -> item.replace("\"", "").trim()).filter(item -> !item.isBlank()).toList();
    }

    private List<String> variableRefs(String text) {
        if (blank(text)) return List.of();
        List<String> refs = new ArrayList<>();
        Matcher matcher = VARIABLE_PATTERN.matcher(text);
        while (matcher.find()) refs.add(matcher.group(1));
        return refs;
    }

    private String snapshotDag(String pipelineId) {
        return "{\"nodes\":" + nodes(pipelineId).size() + ",\"edges\":" + edges(pipelineId).size() + ",\"variables\":" + variables(pipelineId).size() + ",\"snapshot\":\"" + now() + "\"}";
    }

    private String nextVersionName(String pipelineId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM pipeline_version WHERE pipeline_id=?", Integer.class, pipelineId);
        return "v1." + ((count == null ? 0 : count) + 1);
    }

    private boolean canSeeTenant(PlatformPrincipal principal, String tenantId) {
        if (principal.isSuperAdmin()) return true;
        String own = orgPath(principal.user().tenantId());
        String target = orgPath(tenantId);
        return !own.isBlank() && !target.isBlank() && target.startsWith(own);
    }

    private void ensureCanSeeTenant(PlatformPrincipal principal, String tenantId, boolean write) {
        if (canSeeTenant(principal, tenantId)) return;
        audit(principal, principal.user().tenantId(), "PIPELINE_CROSS_BU_ACCESS_DENIED", "Tenant", tenantId, "FAILURE", "CRITICAL", principal.user().tenantId(), tenantId, TRACE_TAG);
        throw new PlatformException(write ? PlatformError.FORBIDDEN : PlatformError.NOT_FOUND, write ? "您无权操作其他 BU 的 Pipeline" : "Pipeline 不存在");
    }

    private String orgPath(String tenantId) {
        List<String> rows = jdbc.queryForList("SELECT path FROM platform_tenant WHERE id=?", String.class, tenantId);
        return rows.isEmpty() || rows.getFirst() == null ? "" : rows.getFirst();
    }

    private void audit(PlatformPrincipal principal, String tenantId, String action, String type, String resourceId, String result, String risk, String before, String after, String detail) {
        OffsetDateTime at = now();
        String event = "EVT-" + randomHex(12).toUpperCase(Locale.ROOT);
        String trace = nullToEmpty(PlatformResponses.traceId());
        String roles = String.join(",", principal.roleNames());
        String id = UUID.randomUUID().toString();
        String sig = signature(id, event, tenantId, principal.user().id(), principal.user().displayName(), roles, action, type, resourceId, result, risk, before, after, detail, trace, at);
        jdbc.update("INSERT INTO platform_audit_log (id,event_id,tenant_id,operator_id,operator_name,operator_role,action,resource_type,resource_id,result,risk_level,before_json,after_json,detail_json,trace_id,signature,occurred_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", id, event, tenantId, principal.user().id(), principal.user().displayName(), roles, action, type, resourceId, result, risk, before, after, detail, trace, sig, at);
    }

    private String signature(String id, String event, String tenant, String opId, String op, String roles, String action, String type, String rid, String result, String risk, String before, String after, String detail, String trace, OffsetDateTime at) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(String.join("|", nullToEmpty(id), nullToEmpty(event), nullToEmpty(tenant), nullToEmpty(opId), nullToEmpty(op), nullToEmpty(roles), nullToEmpty(action), nullToEmpty(type), nullToEmpty(rid), nullToEmpty(result), nullToEmpty(risk), nullToEmpty(before), nullToEmpty(after), nullToEmpty(detail), nullToEmpty(trace), at.toInstant().truncatedTo(ChronoUnit.MICROS).atOffset(ZoneOffset.UTC).toString()).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private String tenantForAudit(String tenantId, PlatformPrincipal principal) { return blank(tenantId, principal.user().tenantId()); }
    private <T> List<T> safe(List<T> value) { return value == null ? List.of() : value; }
    private boolean matches(String value, String keyword) { return blank(keyword) || (!blank(value) && value.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT))); }
    private String maskValue(String kind, String value) { if (blank(value)) return value; if ("SECRET_REF".equalsIgnoreCase(blank(kind, "")) || value.startsWith("secret://")) return value.startsWith("secret://TODO_CONFIRM") ? value : "secret://****"; return value.length() > 80 ? value.substring(0, 80) + "..." : value; }
    private String require(String value, String message) { if (blank(value)) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, message); return value.trim(); }
    private String upper(String value, String fallback) { return blank(value, fallback).toUpperCase(Locale.ROOT); }
    private String blank(String value, String fallback) { return blank(value) ? fallback : value.trim(); }
    private boolean blank(String value) { return value == null || value.isBlank(); }
    private String nullIfBlank(String value) { return blank(value) ? null : value.trim(); }
    private String nullToEmpty(String value) { return value == null ? "" : value; }
    private int defaultInt(Integer value, int fallback) { return value == null ? fallback : value; }
    private Integer nullableInt(java.sql.ResultSet rs, String column) throws java.sql.SQLException { int value = rs.getInt(column); return rs.wasNull() ? null : value; }
    private Long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException { long value = rs.getLong(column); return rs.wasNull() ? null : value; }
    private OffsetDateTime now() { return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS); }
    private String randomHex(int len) { return UUID.randomUUID().toString().replace("-", "").substring(0, len); }

    private record OperatorRecord(String operatorId, String name, String tenantId, String status, String parameterSchemaJson) {}
    private record DatasetInfo(String datasetId, String name, String datasetType, String dataType, String tenantId, String projectId, String versionId, String status, long recordCount, long sizeBytes, String description) {}
}

interface VideoFrameExtractor {
    List<byte[]> extractFrames(byte[] videoBytes, String sourceFileName, int requestedFrameCount);
}

@Service
class ConfigurableVideoFrameExtractor implements VideoFrameExtractor {
    @Override
    public List<byte[]> extractFrames(byte[] videoBytes, String sourceFileName, int requestedFrameCount) {
        List<byte[]> mjpegFrames = extractMjpegAviFrames(videoBytes, requestedFrameCount);
        if (!mjpegFrames.isEmpty()) {
            return mjpegFrames;
        }
        if (!System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win")) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "VIDEO_FRAME_EXTRACTOR_NOT_CONFIGURED: 当前运行环境未配置真实视频抽帧工具");
        }
        return extractFramesWithWindowsMediaFoundation(videoBytes, sourceFileName, requestedFrameCount);
    }

    private List<byte[]> extractMjpegAviFrames(byte[] videoBytes, int requestedFrameCount) {
        if (videoBytes == null || videoBytes.length < 16) {
            return List.of();
        }
        String header = new String(videoBytes, 0, Math.min(videoBytes.length, 12), StandardCharsets.ISO_8859_1);
        if (!header.startsWith("RIFF") || !header.contains("AVI")) {
            return List.of();
        }
        List<byte[]> frames = new ArrayList<>();
        int maxFrames = Math.max(1, requestedFrameCount);
        int offset = 0;
        while (offset < videoBytes.length - 1 && frames.size() < maxFrames) {
            int start = indexOf(videoBytes, new byte[] {(byte) 0xFF, (byte) 0xD8}, offset);
            if (start < 0) {
                break;
            }
            int end = indexOf(videoBytes, new byte[] {(byte) 0xFF, (byte) 0xD9}, start + 2);
            if (end < 0) {
                break;
            }
            byte[] frame = Arrays.copyOfRange(videoBytes, start, end + 2);
            frames.add(frame);
            offset = end + 2;
        }
        return frames;
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

    private List<byte[]> extractFramesWithWindowsMediaFoundation(byte[] videoBytes, String sourceFileName, int requestedFrameCount) {
        Path workDir = null;
        try {
            workDir = Files.createTempDirectory("smp-video-frames-");
            String safeFileName = safeVideoFileName(sourceFileName);
            Path videoPath = workDir.resolve(safeFileName);
            Files.write(videoPath, videoBytes);
            Path scriptPath = workDir.resolve("extract-frames.ps1");
            Files.writeString(scriptPath, windowsMediaExtractionScript(), StandardCharsets.UTF_8);
            Process process = new ProcessBuilder(
                    "powershell.exe",
                    "-NoProfile",
                    "-Sta",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    scriptPath.toString(),
                    "-InputPath",
                    videoPath.toString(),
                    "-OutputDir",
                    workDir.toString(),
                    "-FrameCount",
                    String.valueOf(Math.max(1, requestedFrameCount))
                )
                .redirectErrorStream(true)
                .start();
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            boolean finished = process.waitFor(20, java.util.concurrent.TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "VIDEO_FRAME_EXTRACT_TIMEOUT: 视频抽帧超时");
            }
            if (process.exitValue() != 0) {
                throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "VIDEO_FRAME_EXTRACT_FAILED: " + output.trim());
            }
            List<byte[]> frames = new ArrayList<>();
            for (int index = 1; index <= Math.max(1, requestedFrameCount); index++) {
                Path framePath = workDir.resolve("frame-%04d.jpg".formatted(index));
                if (Files.exists(framePath)) {
                    frames.add(Files.readAllBytes(framePath));
                }
            }
            if (frames.isEmpty()) {
                throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "VIDEO_FRAME_EXTRACT_EMPTY: 视频解码成功但未生成图片帧");
            }
            return frames;
        } catch (PlatformException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "VIDEO_FRAME_EXTRACT_FAILED: " + exception.getMessage());
        } finally {
            deleteDirectoryQuietly(workDir);
        }
    }

    private String safeVideoFileName(String sourceFileName) {
        String name = sourceFileName == null ? "source.mp4" : sourceFileName.replace('\\', '/');
        int index = name.lastIndexOf('/');
        name = index < 0 ? name : name.substring(index + 1);
        name = name.replaceAll("[^A-Za-z0-9._-]", "_");
        return name.isBlank() ? "source.mp4" : name;
    }

    private String windowsMediaExtractionScript() {
        return """
            param([string]$InputPath,[string]$OutputDir,[int]$FrameCount)
            $ErrorActionPreference = 'Stop'
            Add-Type -AssemblyName PresentationCore,WindowsBase
            $media = New-Object System.Windows.Media.MediaPlayer
            $media.Open([Uri]::new($InputPath))
            $deadline = [DateTime]::Now.AddSeconds(10)
            while (-not $media.NaturalDuration.HasTimeSpan -and [DateTime]::Now -lt $deadline) { Start-Sleep -Milliseconds 100 }
            if (-not $media.NaturalDuration.HasTimeSpan) { throw 'VIDEO_DURATION_UNAVAILABLE' }
            $duration = [Math]::Max(1.0, $media.NaturalDuration.TimeSpan.TotalSeconds)
            $width = if ($media.NaturalVideoWidth -gt 0) { $media.NaturalVideoWidth } else { 640 }
            $height = if ($media.NaturalVideoHeight -gt 0) { $media.NaturalVideoHeight } else { 360 }
            for ($i=1; $i -le $FrameCount; $i++) {
              $seconds = [Math]::Min($duration - 0.05, (($i - 0.5) * $duration / $FrameCount))
              $media.Position = [TimeSpan]::FromSeconds($seconds)
              Start-Sleep -Milliseconds 650
              $visual = New-Object System.Windows.Media.DrawingVisual
              $ctx = $visual.RenderOpen()
              $ctx.DrawVideo($media, [System.Windows.Rect]::new(0,0,$width,$height))
              $ctx.Close()
              $bmp = New-Object System.Windows.Media.Imaging.RenderTargetBitmap($width,$height,96,96,[System.Windows.Media.PixelFormats]::Pbgra32)
              $bmp.Render($visual)
              $encoder = New-Object System.Windows.Media.Imaging.JpegBitmapEncoder
              $encoder.QualityLevel = 90
              $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bmp))
              $fs = [System.IO.File]::Open((Join-Path $OutputDir ("frame-{0:D4}.jpg" -f $i)), [System.IO.FileMode]::Create)
              try { $encoder.Save($fs) } finally { $fs.Dispose() }
            }
            $media.Close()
            """;
    }

    private void deleteDirectoryQuietly(Path directory) {
        if (directory == null || !Files.exists(directory)) {
            return;
        }
        try (java.util.stream.Stream<Path> paths = Files.walk(directory)) {
            paths.sorted(java.util.Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // Best-effort cleanup of transient extracted frames.
                }
            });
        } catch (IOException ignored) {
            // Best-effort cleanup of transient extracted frames.
        }
    }

    private String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
