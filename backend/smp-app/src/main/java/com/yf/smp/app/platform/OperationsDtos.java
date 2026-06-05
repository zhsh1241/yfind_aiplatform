package com.yf.smp.app.platform;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

record OperationsMetric(String key, String name, long value, String unit, String trend, String status) {
}

record DomainHealth(String domain, String status, long total, long warnings, String diagnostic) {
}

record OperationsDashboardOverview(
    List<OperationsMetric> metrics,
    Map<String, Long> alertsBySeverity,
    List<DomainHealth> domainHealth,
    String diagnostic
) {
}

record OperationsTodo(
    String todoId,
    String type,
    String title,
    String priority,
    String status,
    String sourceType,
    String sourceId,
    String tenantId,
    OffsetDateTime createdAt,
    OffsetDateTime dueAt,
    String actionPath
) {
}

record OperationsActivity(
    String activityId,
    String action,
    String resourceType,
    String resourceId,
    String operatorName,
    String result,
    String riskLevel,
    OffsetDateTime occurredAt,
    String detail
) {
}

record SchedulerOverview(
    List<OperationsMetric> metrics,
    List<SchedulerQueueSummary> queues,
    String diagnostic
) {
}

record SchedulerQueueSummary(String taskType, long total, long running, long failed, long waiting) {
}

record SchedulerTask(
    String taskId,
    String taskType,
    String name,
    String status,
    String tenantId,
    String ownerId,
    OffsetDateTime startedAt,
    OffsetDateTime endedAt,
    Long durationMs,
    String diagnostic,
    String sourcePath
) {
}

record SchedulerAssistantRequest(String taskId, String question) {
}

record SchedulerAssistantResponse(String status, String diagnostic, List<String> suggestions, OffsetDateTime generatedAt) {
}

record OperationAlert(
    String alertId,
    String title,
    String severity,
    String status,
    String sourceType,
    String sourceId,
    String tenantId,
    String ownerUserId,
    String diagnostic,
    OffsetDateTime createdAt,
    OffsetDateTime acknowledgedAt,
    OffsetDateTime resolvedAt
) {
}

record OperationAlertDetail(
    OperationAlert alert,
    OperationAlertRule rule,
    List<OperationsActivity> timeline,
    Map<String, String> relatedResource
) {
}

record OperationAlertRule(
    String ruleId,
    String name,
    String severity,
    String sourceType,
    String conditionExpression,
    boolean enabled,
    String notificationChannel,
    String status,
    String diagnostic
) {
}

record AlertHandleRequest(String comment) {
}

record OperationsReportOverview(List<OperationsMetric> metrics, List<String> reportTypes, String diagnostic) {
}

record OperationsReportDetail(
    String reportType,
    String title,
    Map<String, String> filters,
    List<OperationsMetric> metrics,
    List<Map<String, Object>> rows,
    String drillDownSeam
) {
}

record ReportExportRequest(String format, Map<String, String> filters) {
}

record ReportExportRecord(
    String exportId,
    String reportType,
    String status,
    String requestedBy,
    String tenantId,
    String format,
    String filtersJson,
    String downloadUrlMasked,
    String diagnostic,
    OffsetDateTime requestedAt,
    OffsetDateTime completedAt
) {
}
