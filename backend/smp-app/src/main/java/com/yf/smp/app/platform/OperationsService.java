package com.yf.smp.app.platform;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class OperationsService {
    private static final String TRACE_TAG = "TASK-dashboard-alert-report";
    private static final List<String> REPORT_TYPES = List.of(
        "PLATFORM_OVERVIEW",
        "DATA_ASSET",
        "MODEL_ASSET",
        "RESOURCE_USAGE",
        "TASK_EXECUTION",
        "EDGE_RUNTIME",
        "SECURITY_COMPLIANCE"
    );

    private final JdbcTemplate jdbc;
    private final PlatformIdentityService identityService;

    OperationsService(JdbcTemplate jdbc, PlatformIdentityService identityService) {
        this.jdbc = jdbc;
        this.identityService = identityService;
    }

    @Transactional(readOnly = true)
    OperationsDashboardOverview dashboardOverview(PlatformPrincipal principal, String tenantId) {
        require(principal, "operations:dashboard:read");
        String scope = resolveTenant(principal, tenantId, false);
        List<OperationsMetric> metrics = List.of(
            metric("datasets", "数据集", countScoped(principal, scope, "dataset", "status <> 'DELETED'"), "个", "+12%", "green"),
            metric("models", "模型资产", countScoped(principal, scope, "model_registry_model", "visibility_status <> 'DELETED'"), "个", "+8%", "blue"),
            metric("edgeServers", "边端节点", countScoped(principal, scope, "edge_server", "1=1"), "台", "稳定", "purple"),
            metric("openAlerts", "未关闭告警", countScoped(principal, scope, "operation_alert_event", "status <> 'RESOLVED'"), "条", "待处理", "gold")
        );
        Map<String, Long> bySeverity = new LinkedHashMap<>();
        for (String severity : List.of("CRITICAL", "HIGH", "MEDIUM", "LOW")) {
            List<Object> args = scopeArgsList(principal, scope);
            args.add(severity);
            bySeverity.put(severity, count("SELECT COUNT(*) FROM operation_alert_event WHERE " + tenantWhere(principal, scope) + " AND severity=? AND status <> 'RESOLVED'", args.toArray()));
        }
        List<DomainHealth> health = List.of(
            new DomainHealth("DATA", metrics.get(0).value() > 0 ? "HEALTHY" : "EMPTY", metrics.get(0).value(), 0, "复用 dataset / annotation 事实源"),
            new DomainHealth("MODEL", metrics.get(1).value() > 0 ? "HEALTHY" : "EMPTY", metrics.get(1).value(), 0, "复用 model registry / evaluation 事实源"),
            new DomainHealth("EDGE", metrics.get(2).value() > 0 ? "WATCH" : "EMPTY", metrics.get(2).value(), metrics.get(3).value(), "复用 F021 边端事实源"),
            new DomainHealth("PLATFORM", "WATCH", countScoped(principal, scope, "platform_audit_log", "1=1"), bySeverity.getOrDefault("CRITICAL", 0L), "审计与告警联动")
        );
        return new OperationsDashboardOverview(metrics, bySeverity, health, "TODO_CONFIRM_OBSERVABILITY_PROVIDER;聚合平台内事实源");
    }

    @Transactional(readOnly = true)
    PageResponse<OperationsTodo> todos(PlatformPrincipal principal, String type, String status, int page, int pageSize) {
        require(principal, "operations:dashboard:read");
        List<OperationsTodo> items = new ArrayList<>();
        jdbc.query("SELECT * FROM operation_alert_event WHERE status <> 'RESOLVED' AND " + tenantWhere(principal, null) + " ORDER BY created_at DESC", (RowCallbackHandler) rs ->
            items.add(new OperationsTodo(rs.getString("alert_id"), "ALERT", rs.getString("title"), rs.getString("severity"), rs.getString("status"), rs.getString("source_type"), rs.getString("source_id"), rs.getString("tenant_id"), rs.getObject("created_at", OffsetDateTime.class), null, "/alert")),
            scopeArgs(principal, null)
        );
        jdbc.query("SELECT * FROM edge_deployment WHERE approval_status='PENDING' AND " + tenantWhere(principal, null) + " ORDER BY requested_at DESC", (RowCallbackHandler) rs ->
            items.add(new OperationsTodo(rs.getString("deployment_id"), "EDGE_APPROVAL", "边端下发待审批 " + rs.getString("model_name"), "HIGH", rs.getString("approval_status"), "EDGE_DEPLOYMENT", rs.getString("deployment_id"), rs.getString("tenant_id"), rs.getObject("requested_at", OffsetDateTime.class), rs.getObject("scheduled_at", OffsetDateTime.class), "/edge")),
            scopeArgs(principal, null)
        );
        jdbc.query("SELECT r.*, p.tenant_id FROM pipeline_run r JOIN pipeline_definition p ON p.pipeline_id=r.pipeline_id WHERE r.status IN ('FAILED','RUNNING') AND " + tenantWhere("p", principal, null) + " ORDER BY r.started_at DESC", (RowCallbackHandler) rs ->
            items.add(new OperationsTodo(rs.getString("run_id"), "SCHEDULER", "Pipeline 任务 " + rs.getString("status"), "FAILED".equals(rs.getString("status")) ? "HIGH" : "MEDIUM", rs.getString("status"), "PIPELINE_RUN", rs.getString("run_id"), rs.getString("tenant_id"), rs.getObject("started_at", OffsetDateTime.class), null, "/sched")),
            scopeArgs(principal, null)
        );
        return page(items.stream()
            .filter(item -> isBlank(type) || item.type().equalsIgnoreCase(type))
            .filter(item -> isBlank(status) || item.status().equalsIgnoreCase(status))
            .sorted((a, b) -> safeTime(b.createdAt()).compareTo(safeTime(a.createdAt())))
            .toList(), page, pageSize);
    }

    @Transactional(readOnly = true)
    PageResponse<OperationsActivity> activities(PlatformPrincipal principal, int page, int pageSize) {
        require(principal, "operations:dashboard:read");
        Object[] args = append(scopeArgs(principal, null), normalizedPageSize(pageSize), offset(page, pageSize));
        List<OperationsActivity> items = jdbc.query(
            "SELECT * FROM platform_audit_log WHERE " + tenantWhere(principal, null) + " ORDER BY occurred_at DESC LIMIT ? OFFSET ?",
            (rs, n) -> new OperationsActivity(rs.getString("id"), rs.getString("action"), rs.getString("resource_type"), rs.getString("resource_id"), rs.getString("operator_name"), rs.getString("result"), rs.getString("risk_level"), rs.getObject("occurred_at", OffsetDateTime.class), rs.getString("detail_json")),
            args
        );
        long total = count("SELECT COUNT(*) FROM platform_audit_log WHERE " + tenantWhere(principal, null), scopeArgs(principal, null));
        return new PageResponse<>(items, total, normalizedPage(page), normalizedPageSize(pageSize));
    }

    @Transactional(readOnly = true)
    SchedulerOverview schedulerOverview(PlatformPrincipal principal, String tenantId) {
        require(principal, "operations:scheduler:read");
        String scope = resolveTenant(principal, tenantId, false);
        List<SchedulerTask> all = schedulerTasksInternal(principal, null, null, scope);
        List<SchedulerQueueSummary> queues = all.stream().map(SchedulerTask::taskType).distinct().sorted().map(type -> {
            List<SchedulerTask> q = all.stream().filter(item -> item.taskType().equals(type)).toList();
            return new SchedulerQueueSummary(type, q.size(), q.stream().filter(item -> "RUNNING".equals(item.status())).count(), q.stream().filter(item -> "FAILED".equals(item.status())).count(), q.stream().filter(item -> List.of("REQUESTED", "PENDING", "READY", "QUEUED").contains(item.status())).count());
        }).toList();
        List<OperationsMetric> metrics = List.of(
            metric("total", "任务总数", all.size(), "个", "平台事实投影", "blue"),
            metric("running", "运行中", all.stream().filter(item -> "RUNNING".equals(item.status())).count(), "个", "实时", "green"),
            metric("failed", "失败", all.stream().filter(item -> "FAILED".equals(item.status())).count(), "个", "需诊断", "gold"),
            metric("seams", "调度 seam", 1, "个", "TODO_CONFIRM_SCHEDULER_AI_ASSISTANT", "purple")
        );
        return new SchedulerOverview(metrics, queues, "TODO_CONFIRM_SCHEDULER_AI_ASSISTANT;不宣称真实 AI 调度");
    }

    @Transactional(readOnly = true)
    PageResponse<SchedulerTask> schedulerTasks(PlatformPrincipal principal, String taskType, String status, String tenantId, int page, int pageSize) {
        require(principal, "operations:scheduler:read");
        String scope = resolveTenant(principal, tenantId, false);
        return page(schedulerTasksInternal(principal, taskType, status, scope), page, pageSize);
    }

    @Transactional
    SchedulerAssistantResponse schedulerAssistant(PlatformPrincipal principal, SchedulerAssistantRequest request) {
        require(principal, "operations:scheduler:read");
        recordAudit(principal, principal.user().tenantId(), "OPERATION_SCHEDULER_ASSISTANT_DIAGNOSED", "SchedulerTask", request == null ? "ALL" : blankToDefault(request.taskId(), "ALL"), "SUCCESS", "INFO", null, null, TRACE_TAG + ";AC-04;TODO_CONFIRM_SCHEDULER_AI_ASSISTANT");
        return new SchedulerAssistantResponse("SEAM", "TODO_CONFIRM_SCHEDULER_AI_ASSISTANT;基于平台事实源生成静态诊断建议", List.of("优先处理 FAILED / CRITICAL 任务", "检查边端心跳与模型 artifact hash", "确认真实调度策略后替换 seam"), now());
    }

    @Transactional(readOnly = true)
    PageResponse<OperationAlert> alerts(PlatformPrincipal principal, String severity, String status, String sourceType, String tenantId, int page, int pageSize) {
        require(principal, "operations:alert:read");
        validateIn(severity, List.of("CRITICAL", "HIGH", "MEDIUM", "LOW"), "severity");
        validateIn(status, List.of("OPEN", "ACKNOWLEDGED", "RESOLVED"), "status");
        String scope = resolveTenant(principal, tenantId, false);
        StringBuilder where = new StringBuilder(tenantWhere(principal, scope));
        List<Object> args = scopeArgsList(principal, scope);
        if (!isBlank(severity)) { where.append(" AND severity=?"); args.add(severity.toUpperCase(Locale.ROOT)); }
        if (!isBlank(status)) { where.append(" AND status=?"); args.add(status.toUpperCase(Locale.ROOT)); }
        if (!isBlank(sourceType)) { where.append(" AND source_type=?"); args.add(sourceType.toUpperCase(Locale.ROOT)); }
        long total = count("SELECT COUNT(*) FROM operation_alert_event WHERE " + where, args.toArray());
        args.add(normalizedPageSize(pageSize));
        args.add(offset(page, pageSize));
        List<OperationAlert> items = jdbc.query("SELECT * FROM operation_alert_event WHERE " + where + " ORDER BY created_at DESC LIMIT ? OFFSET ?", (rs, n) -> alertRow(rs), args.toArray());
        return new PageResponse<>(items, total, normalizedPage(page), normalizedPageSize(pageSize));
    }

    @Transactional(readOnly = true)
    OperationAlertDetail alertDetail(PlatformPrincipal principal, String alertId) {
        require(principal, "operations:alert:read");
        OperationAlert alert = alertById(principal, alertId);
        OperationAlertRule rule = jdbc.queryForObject("SELECT r.* FROM operation_alert_rule r JOIN operation_alert_event a ON a.rule_id=r.rule_id WHERE a.alert_id=?", (rs, n) -> ruleRow(rs), alertId);
        List<OperationsActivity> timeline = jdbc.query("SELECT * FROM platform_audit_log WHERE resource_id=? ORDER BY occurred_at DESC", (rs, n) -> new OperationsActivity(rs.getString("id"), rs.getString("action"), rs.getString("resource_type"), rs.getString("resource_id"), rs.getString("operator_name"), rs.getString("result"), rs.getString("risk_level"), rs.getObject("occurred_at", OffsetDateTime.class), rs.getString("detail_json")), alertId);
        return new OperationAlertDetail(alert, rule, timeline, Map.of("sourceType", alert.sourceType(), "sourceId", alert.sourceId(), "actionPath", actionPath(alert.sourceType())));
    }

    @Transactional
    OperationAlert acknowledgeAlert(PlatformPrincipal principal, String alertId, AlertHandleRequest request) {
        require(principal, "operations:alert:handle");
        OperationAlert current = alertById(principal, alertId);
        if ("RESOLVED".equals(current.status())) throw new PlatformException(40971, 409, "已关闭告警不可重复确认或关闭");
        if (!"ACKNOWLEDGED".equals(current.status())) {
            jdbc.update("UPDATE operation_alert_event SET status='ACKNOWLEDGED', acknowledged_by=?, acknowledged_at=?, diagnostic=?, updated_at=? WHERE alert_id=?", principal.user().id(), now(), appendDiagnostic(current.diagnostic(), request), now(), alertId);
        }
        recordAudit(principal, current.tenantId(), "OPERATION_ALERT_ACKNOWLEDGED", "OperationAlert", alertId, "SUCCESS", "WARNING", current.status(), "ACKNOWLEDGED", TRACE_TAG + ";AC-05;AC-10;" + comment(request));
        return alertById(principal, alertId);
    }

    @Transactional
    OperationAlert resolveAlert(PlatformPrincipal principal, String alertId, AlertHandleRequest request) {
        require(principal, "operations:alert:handle");
        OperationAlert current = alertById(principal, alertId);
        if ("RESOLVED".equals(current.status())) throw new PlatformException(40971, 409, "已关闭告警不可重复确认或关闭");
        OffsetDateTime at = now();
        jdbc.update("UPDATE operation_alert_event SET status='RESOLVED', acknowledged_by=COALESCE(acknowledged_by, ?), acknowledged_at=COALESCE(acknowledged_at, ?), resolved_by=?, resolved_at=?, diagnostic=?, updated_at=? WHERE alert_id=?", principal.user().id(), at, principal.user().id(), at, appendDiagnostic(current.diagnostic(), request), at, alertId);
        recordAudit(principal, current.tenantId(), "OPERATION_ALERT_RESOLVED", "OperationAlert", alertId, "SUCCESS", "WARNING", current.status(), "RESOLVED", TRACE_TAG + ";AC-05;AC-10;" + comment(request));
        return alertById(principal, alertId);
    }

    @Transactional(readOnly = true)
    List<OperationAlertRule> alertRules(PlatformPrincipal principal) {
        require(principal, "operations:alert:read");
        return jdbc.query("SELECT * FROM operation_alert_rule WHERE " + tenantWhere(principal, null) + " ORDER BY severity, source_type", (rs, n) -> ruleRow(rs), scopeArgs(principal, null));
    }

    @Transactional(readOnly = true)
    OperationsReportOverview reportsOverview(PlatformPrincipal principal, String tenantId) {
        require(principal, "operations:report:read");
        String scope = resolveTenant(principal, tenantId, false);
        return new OperationsReportOverview(List.of(
            metric("reportTypes", "报表类型", REPORT_TYPES.size(), "类", "一期固定", "blue"),
            metric("exports", "导出请求", countScoped(principal, scope, "operation_report_export", "1=1"), "条", "可追踪", "green"),
            metric("audit", "审计事件", countScoped(principal, scope, "platform_audit_log", "1=1"), "条", "不可篡改", "purple"),
            metric("openAlerts", "未关闭告警", countScoped(principal, scope, "operation_alert_event", "status <> 'RESOLVED'"), "条", "需处理", "gold")
        ), REPORT_TYPES, "TODO_CONFIRM_REPORT_TEMPLATE;TODO_CONFIRM_REPORT_EXPORT_STORAGE");
    }

    @Transactional(readOnly = true)
    OperationsReportDetail reportDetail(PlatformPrincipal principal, String reportType, String tenantId) {
        require(principal, "operations:report:read");
        String normalized = normalizeReportType(reportType);
        String scope = resolveTenant(principal, tenantId, false);
        Map<String, String> filters = new LinkedHashMap<>();
        filters.put("tenantId", scope == null ? "ALL_VISIBLE" : scope);
        filters.put("from", "TODO_CONFIRM_REPORT_RANGE_START");
        filters.put("to", "TODO_CONFIRM_REPORT_RANGE_END");
        return new OperationsReportDetail(normalized, reportTitle(normalized), filters, reportMetrics(normalized, principal, scope), reportRows(normalized, principal, scope), "TODO_CONFIRM_REPORT_DRILLDOWN;不实现拖拽自定义看板");
    }

    @Transactional
    ReportExportRecord createReportExport(PlatformPrincipal principal, String reportType, ReportExportRequest request) {
        require(principal, "operations:report:export");
        String normalized = normalizeReportType(reportType);
        String format = request == null || isBlank(request.format()) ? "XLSX" : request.format().toUpperCase(Locale.ROOT);
        validateIn(format, List.of("XLSX", "CSV", "JSON"), "format");
        String id = "RPTEXP-" + randomHex(16).toUpperCase(Locale.ROOT);
        String filters = filtersJson(request);
        OffsetDateTime at = now();
        jdbc.update("INSERT INTO operation_report_export (export_id, report_type, status, requested_by, tenant_id, format, filters_json, download_url_masked, diagnostic, requested_at, completed_at) VALUES (?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, NULL)", id, normalized, principal.user().id(), principal.user().tenantId(), format, filters, "TODO_CONFIRM_REPORT_EXPORT_STORAGE/" + id, "TODO_CONFIRM_REPORT_TEMPLATE;TODO_CONFIRM_REPORT_EXPORT_STORAGE", at);
        recordAudit(principal, principal.user().tenantId(), "OPERATION_REPORT_EXPORT_REQUESTED", "OperationReport", id, "SUCCESS", "WARNING", null, normalized, TRACE_TAG + ";AC-08;AC-10;" + filters);
        return exportById(principal, id);
    }

    @Transactional(readOnly = true)
    PageResponse<ReportExportRecord> reportExports(PlatformPrincipal principal, String status, int page, int pageSize) {
        require(principal, "operations:report:read");
        validateIn(status, List.of("PENDING", "RUNNING", "COMPLETED", "FAILED"), "status");
        StringBuilder where = new StringBuilder(tenantWhere(principal, null));
        List<Object> args = scopeArgsList(principal, null);
        if (!isBlank(status)) { where.append(" AND status=?"); args.add(status.toUpperCase(Locale.ROOT)); }
        long total = count("SELECT COUNT(*) FROM operation_report_export WHERE " + where, args.toArray());
        args.add(normalizedPageSize(pageSize));
        args.add(offset(page, pageSize));
        List<ReportExportRecord> items = jdbc.query("SELECT * FROM operation_report_export WHERE " + where + " ORDER BY requested_at DESC LIMIT ? OFFSET ?", (rs, n) -> exportRow(rs), args.toArray());
        return new PageResponse<>(items, total, normalizedPage(page), normalizedPageSize(pageSize));
    }

    private List<SchedulerTask> schedulerTasksInternal(PlatformPrincipal principal, String taskType, String status, String tenantId) {
        List<SchedulerTask> items = new ArrayList<>();
        Object[] scopeArgs = scopeArgs(principal, tenantId);
        jdbc.query("SELECT r.*, p.name, p.tenant_id FROM pipeline_run r JOIN pipeline_definition p ON p.pipeline_id=r.pipeline_id WHERE " + tenantWhere("p", principal, tenantId) + " ORDER BY r.started_at DESC", (RowCallbackHandler) rs -> items.add(new SchedulerTask(rs.getString("run_id"), "PIPELINE", rs.getString("name"), rs.getString("status"), rs.getString("tenant_id"), rs.getString("triggered_by"), rs.getObject("started_at", OffsetDateTime.class), rs.getObject("ended_at", OffsetDateTime.class), nullableLong(rs, "duration_ms"), rs.getString("diagnostic_message"), "/pipeline")), scopeArgs);
        jdbc.query("SELECT * FROM annotation_task WHERE " + tenantWhere(principal, tenantId) + " ORDER BY updated_at DESC", (RowCallbackHandler) rs -> items.add(new SchedulerTask(rs.getString("task_id"), "ANNOTATION", rs.getString("name"), normalizeAnnotationStatus(rs.getString("status")), rs.getString("tenant_id"), rs.getString("created_by"), rs.getObject("created_at", OffsetDateTime.class), null, null, nullableString(rs, "note"), "/ann")), scopeArgs);
        jdbc.query("SELECT * FROM model_evaluation_run WHERE " + tenantWhere(principal, tenantId) + " ORDER BY created_at DESC", (RowCallbackHandler) rs -> items.add(new SchedulerTask(rs.getString("evaluation_run_id"), "MODEL_EVALUATION", rs.getString("model_id") + " · " + rs.getString("version_id"), rs.getString("status"), rs.getString("tenant_id"), rs.getString("owner_user_id"), rs.getObject("created_at", OffsetDateTime.class), rs.getObject("completed_at", OffsetDateTime.class), null, rs.getString("report_summary"), "/eval")), scopeArgs);
        jdbc.query("SELECT * FROM edge_deployment WHERE " + tenantWhere(principal, tenantId) + " ORDER BY requested_at DESC", (RowCallbackHandler) rs -> items.add(new SchedulerTask(rs.getString("deployment_id"), "EDGE_DEPLOYMENT", rs.getString("model_id") + " · " + rs.getString("version_id"), normalizeEdgeStatus(rs.getString("status")), rs.getString("tenant_id"), rs.getString("requested_by"), rs.getObject("requested_at", OffsetDateTime.class), firstNotNull(rs.getObject("deployed_at", OffsetDateTime.class), rs.getObject("rolled_back_at", OffsetDateTime.class)), null, blankToDefault(rs.getString("failure_reason"), rs.getString("diagnostic")), "/edge")), scopeArgs);
        return items.stream()
            .filter(item -> isBlank(taskType) || item.taskType().equalsIgnoreCase(taskType))
            .filter(item -> isBlank(status) || item.status().equalsIgnoreCase(status))
            .sorted((a, b) -> safeTime(b.startedAt()).compareTo(safeTime(a.startedAt())))
            .toList();
    }

    private List<OperationsMetric> reportMetrics(String type, PlatformPrincipal p, String scope) {
        return switch (type) {
            case "DATA_ASSET" -> List.of(metric("datasets", "数据集", countScoped(p, scope, "dataset", "1=1"), "个", "DATA", "blue"), metric("files", "文件对象", countScoped(p, scope, "platform_file_object", "asset_type='DATASET'"), "个", "MinIO seam", "green"));
            case "MODEL_ASSET" -> List.of(metric("models", "模型", countScoped(p, scope, "model_registry_model", "1=1"), "个", "MODEL", "blue"), metric("versions", "模型版本", countVersionScoped(p, scope), "个", "Registry", "green"));
            case "EDGE_RUNTIME" -> List.of(metric("servers", "边端", countScoped(p, scope, "edge_server", "1=1"), "台", "EDGE", "purple"), metric("deployments", "下发", countScoped(p, scope, "edge_deployment", "1=1"), "个", "Delivery", "green"));
            case "SECURITY_COMPLIANCE" -> List.of(metric("critical", "高危审计", countScoped(p, scope, "platform_audit_log", "risk_level='CRITICAL'"), "条", "PLT-011", "gold"), metric("alerts", "安全告警", countScoped(p, scope, "operation_alert_event", "source_type='SECURITY'"), "条", "Security", "purple"));
            default -> List.of(metric("alerts", "未关闭告警", countScoped(p, scope, "operation_alert_event", "status <> 'RESOLVED'"), "条", type, "gold"), metric("activities", "审计活动", countScoped(p, scope, "platform_audit_log", "1=1"), "条", "Audit", "blue"));
        };
    }

    private List<Map<String, Object>> reportRows(String type, PlatformPrincipal p, String scope) {
        List<Map<String, Object>> rows = new ArrayList<>();
        switch (type) {
            case "DATA_ASSET" -> jdbc.query("SELECT dataset_id AS id, name, status, tenant_id FROM dataset WHERE " + tenantWhere(p, scope) + " ORDER BY updated_at DESC LIMIT 10", (RowCallbackHandler) rs -> rows.add(row(rs.getString("id"), rs.getString("name"), rs.getString("status"), rs.getString("tenant_id"))), scopeArgs(p, scope));
            case "MODEL_ASSET" -> jdbc.query("SELECT model_id AS id, name, visibility_status AS status, tenant_id FROM model_registry_model WHERE " + tenantWhere(p, scope) + " ORDER BY updated_at DESC LIMIT 10", (RowCallbackHandler) rs -> rows.add(row(rs.getString("id"), rs.getString("name"), rs.getString("status"), rs.getString("tenant_id"))), scopeArgs(p, scope));
            case "EDGE_RUNTIME" -> jdbc.query("SELECT edge_server_id AS id, server_name AS name, status, tenant_id FROM edge_server WHERE " + tenantWhere(p, scope) + " ORDER BY updated_at DESC LIMIT 10", (RowCallbackHandler) rs -> rows.add(row(rs.getString("id"), rs.getString("name"), rs.getString("status"), rs.getString("tenant_id"))), scopeArgs(p, scope));
            default -> jdbc.query("SELECT alert_id AS id, title AS name, status, tenant_id FROM operation_alert_event WHERE " + tenantWhere(p, scope) + " ORDER BY created_at DESC LIMIT 10", (RowCallbackHandler) rs -> rows.add(row(rs.getString("id"), rs.getString("name"), rs.getString("status"), rs.getString("tenant_id"))), scopeArgs(p, scope));
        }
        return rows;
    }

    private Map<String, Object> row(String id, String name, String status, String tenantId) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("name", name);
        row.put("status", status);
        row.put("tenantId", tenantId);
        return row;
    }

    private long countScoped(PlatformPrincipal p, String scope, String table, String extraWhere) {
        return count("SELECT COUNT(*) FROM " + table + " WHERE " + tenantWhere(p, scope) + " AND " + extraWhere, scopeArgs(p, scope));
    }

    private long countVersionScoped(PlatformPrincipal p, String scope) {
        return count("SELECT COUNT(*) FROM model_registry_version v JOIN model_registry_model m ON m.model_id=v.model_id WHERE " + tenantWhere("m", p, scope), scopeArgs(p, scope));
    }

    private String tenantWhere(PlatformPrincipal principal, String tenantId) {
        return principal.isSuperAdmin() && tenantId == null ? "tenant_id IS NOT NULL" : "tenant_id=?";
    }

    private String tenantWhere(String alias, PlatformPrincipal principal, String tenantId) {
        return principal.isSuperAdmin() && tenantId == null ? alias + ".tenant_id IS NOT NULL" : alias + ".tenant_id=?";
    }

    private Object[] scopeArgs(PlatformPrincipal principal, String tenantId) {
        return principal.isSuperAdmin() && tenantId == null ? new Object[]{} : new Object[]{tenantId == null ? principal.user().tenantId() : tenantId};
    }

    private List<Object> scopeArgsList(PlatformPrincipal principal, String tenantId) {
        return new ArrayList<>(List.of(scopeArgs(principal, tenantId)));
    }

    private String resolveTenant(PlatformPrincipal p, String tenantId, boolean write) {
        if (isBlank(tenantId)) return p.isSuperAdmin() ? null : p.user().tenantId();
        if (!p.isSuperAdmin() && !Objects.equals(p.user().tenantId(), tenantId)) {
            recordAudit(p, p.user().tenantId(), "OPERATION_CROSS_TENANT_ACCESS_DENIED", "Tenant", tenantId, "FAILURE", "CRITICAL", p.user().tenantId(), tenantId, TRACE_TAG + ";AC-09");
            throw new PlatformException(40304, 403, write ? "无权操作其他 BU 的运营资源" : "无权访问其他 BU 的运营资源");
        }
        return tenantId;
    }

    private void require(PlatformPrincipal p, String permission) {
        try {
            identityService.requirePermission(p, permission);
        } catch (PlatformException e) {
            if (e.httpStatus() == 403) throw new PlatformException(40304, 403, "无运营中心权限");
            throw e;
        }
    }

    private void validateIn(String value, List<String> allowed, String name) {
        if (!isBlank(value) && !allowed.contains(value.toUpperCase(Locale.ROOT))) throw new PlatformException(40000, 400, name + " 参数非法");
    }

    private String normalizeReportType(String reportType) {
        String normalized = blankToDefault(reportType, "PLATFORM_OVERVIEW").toUpperCase(Locale.ROOT);
        if (!REPORT_TYPES.contains(normalized)) throw new PlatformException(42271, 422, "报表类型不支持");
        return normalized;
    }

    private String reportTitle(String type) {
        return switch (type) {
            case "DATA_ASSET" -> "数据资产报表";
            case "MODEL_ASSET" -> "模型资产报表";
            case "RESOURCE_USAGE" -> "资源使用报表";
            case "TASK_EXECUTION" -> "任务执行报表";
            case "EDGE_RUNTIME" -> "边端运行报表";
            case "SECURITY_COMPLIANCE" -> "安全合规报表";
            default -> "平台运营总览";
        };
    }

    private OperationAlert alertById(PlatformPrincipal p, String id) {
        try {
            OperationAlert alert = jdbc.queryForObject("SELECT * FROM operation_alert_event WHERE alert_id=?", (rs, n) -> alertRow(rs), id);
            if (alert == null) throw new PlatformException(40400, 404, "告警不存在");
            resolveTenant(p, alert.tenantId(), false);
            return alert;
        } catch (EmptyResultDataAccessException e) {
            throw new PlatformException(40400, 404, "告警不存在");
        }
    }

    private OperationAlert alertRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new OperationAlert(rs.getString("alert_id"), rs.getString("title"), rs.getString("severity"), rs.getString("status"), rs.getString("source_type"), rs.getString("source_id"), rs.getString("tenant_id"), rs.getString("owner_user_id"), rs.getString("diagnostic"), rs.getObject("created_at", OffsetDateTime.class), rs.getObject("acknowledged_at", OffsetDateTime.class), rs.getObject("resolved_at", OffsetDateTime.class));
    }

    private OperationAlertRule ruleRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new OperationAlertRule(rs.getString("rule_id"), rs.getString("name"), rs.getString("severity"), rs.getString("source_type"), rs.getString("condition_expression"), rs.getBoolean("enabled"), rs.getString("notification_channel"), rs.getString("status"), rs.getString("diagnostic"));
    }

    private ReportExportRecord exportById(PlatformPrincipal p, String id) {
        ReportExportRecord record = jdbc.queryForObject("SELECT * FROM operation_report_export WHERE export_id=?", (rs, n) -> exportRow(rs), id);
        if (record != null) resolveTenant(p, record.tenantId(), false);
        return record;
    }

    private ReportExportRecord exportRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ReportExportRecord(rs.getString("export_id"), rs.getString("report_type"), rs.getString("status"), rs.getString("requested_by"), rs.getString("tenant_id"), rs.getString("format"), rs.getString("filters_json"), rs.getString("download_url_masked"), rs.getString("diagnostic"), rs.getObject("requested_at", OffsetDateTime.class), rs.getObject("completed_at", OffsetDateTime.class));
    }

    private OperationsMetric metric(String key, String name, long value, String unit, String trend, String status) { return new OperationsMetric(key, name, value, unit, trend, status); }
    private <T> PageResponse<T> page(List<T> list, int page, int pageSize) { int p = normalizedPage(page), ps = normalizedPageSize(pageSize), from = Math.min((p - 1) * ps, list.size()), to = Math.min(from + ps, list.size()); return new PageResponse<>(list.subList(from, to), list.size(), p, ps); }
    private int normalizedPage(int page) { return Math.max(1, page); }
    private int normalizedPageSize(int pageSize) { return Math.max(1, Math.min(100, pageSize)); }
    private int offset(int page, int pageSize) { return (normalizedPage(page) - 1) * normalizedPageSize(pageSize); }
    private Object[] append(Object[] args, Object... tail) { Object[] out = new Object[args.length + tail.length]; System.arraycopy(args, 0, out, 0, args.length); System.arraycopy(tail, 0, out, args.length, tail.length); return out; }
    private long count(String sql, Object... args) { Long c = jdbc.queryForObject(sql, Long.class, args); return c == null ? 0L : c; }
    private Long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException { long v = rs.getLong(column); return rs.wasNull() ? null : v; }
    private String nullableString(java.sql.ResultSet rs, String column) { try { return rs.getString(column); } catch (java.sql.SQLException e) { return null; } }
    private OffsetDateTime firstNotNull(OffsetDateTime a, OffsetDateTime b) { return a == null ? b : a; }
    private OffsetDateTime safeTime(OffsetDateTime value) { return value == null ? OffsetDateTime.MIN : value; }
    private String normalizeAnnotationStatus(String status) { return "IN_PROGRESS".equals(status) ? "RUNNING" : status; }
    private String normalizeEdgeStatus(String status) { return switch (status) { case "REQUESTED", "APPROVED", "QUEUED", "TRANSFERRING", "VERIFYING" -> "RUNNING"; default -> status; }; }
    private String actionPath(String sourceType) { return switch (sourceType) { case "EDGE" -> "/edge"; case "PIPELINE" -> "/pipeline"; case "SECURITY" -> "/perm"; default -> "/dash"; }; }
    private String appendDiagnostic(String diagnostic, AlertHandleRequest request) { return blankToDefault(diagnostic, "") + ";handled=" + comment(request); }
    private String comment(AlertHandleRequest request) { return request == null || isBlank(request.comment()) ? "no-comment" : request.comment().trim(); }
    private String filtersJson(ReportExportRequest request) { if (request == null || request.filters() == null || request.filters().isEmpty()) return "{}"; return request.filters().toString(); }
    private boolean isBlank(String value) { return value == null || value.isBlank(); }
    private String blankToDefault(String value, String fallback) { return isBlank(value) ? fallback : value.trim(); }
    private String randomHex(int len) { return UUID.randomUUID().toString().replace("-", "").substring(0, len); }
    private OffsetDateTime now() { return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS); }

    private void recordAudit(PlatformPrincipal p, String tenantId, String action, String type, String rid, String result, String risk, String before, String after, String detail) {
        OffsetDateTime at = now();
        String id = UUID.randomUUID().toString();
        String event = "EVT-" + randomHex(16).toUpperCase(Locale.ROOT);
        String roles = String.join(",", p.roleNames());
        String trace = PlatformResponses.traceId() == null ? "" : PlatformResponses.traceId();
        String sig = signature(id, event, tenantId, p.user().id(), p.user().displayName(), roles, action, type, rid, result, risk, before, after, detail, trace, at);
        jdbc.update("INSERT INTO platform_audit_log (id,event_id,tenant_id,operator_id,operator_name,operator_role,action,resource_type,resource_id,result,risk_level,before_json,after_json,detail_json,trace_id,signature,occurred_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", id, event, tenantId, p.user().id(), p.user().displayName(), roles, action, type, rid, result, risk, before, after, detail, trace, sig, at);
    }

    private String signature(String id, String event, String tenant, String op, String name, String roles, String action, String type, String rid, String result, String risk, String before, String after, String detail, String trace, OffsetDateTime at) {
        return sha256(String.join("|", List.of(n(id), n(event), n(tenant), n(op), n(name), n(roles), n(action), n(type), n(rid), n(result), n(risk), n(before), n(after), n(detail), n(trace), at.toInstant().truncatedTo(ChronoUnit.MICROS).atOffset(ZoneOffset.UTC).toString())));
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private String n(String value) { return value == null ? "" : value; }
}
