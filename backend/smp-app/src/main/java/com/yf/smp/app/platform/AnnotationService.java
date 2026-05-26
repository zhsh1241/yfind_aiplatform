package com.yf.smp.app.platform;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

interface LabelStudioAnnotationAdapter {
    AnnotationExternalBindingResponse status(AnnotationTaskRecord task, AnnotationExternalBindingRecord binding);
    AnnotationExternalBindingResponse syncProject(AnnotationTaskRecord task, AnnotationExternalBindingRecord binding);
    AnnotationExternalBindingResponse syncTask(AnnotationWorkItemRecord item, AnnotationTaskRecord task, AnnotationExternalBindingRecord binding);
    AnnotationExternalBindingResponse importResults(AnnotationTaskRecord task, AnnotationExternalBindingRecord binding);
}

@Component
class UnconfiguredLabelStudioAnnotationAdapter implements LabelStudioAnnotationAdapter {
    private static final String URL = "TODO_CONFIRM_LABEL_STUDIO_BASE_URL";
    private static final String MESSAGE = "TODO_CONFIRM_LABEL_STUDIO_BASE_URL;TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET;TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY;TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY";

    @Override
    public AnnotationExternalBindingResponse status(AnnotationTaskRecord task, AnnotationExternalBindingRecord binding) {
        return response(binding, "UNCONFIGURED", "UNCONFIGURED", null);
    }

    @Override
    public AnnotationExternalBindingResponse syncProject(AnnotationTaskRecord task, AnnotationExternalBindingRecord binding) {
        return response(binding, "UNCONFIGURED", "UNCONFIGURED", null);
    }

    @Override
    public AnnotationExternalBindingResponse syncTask(AnnotationWorkItemRecord item, AnnotationTaskRecord task, AnnotationExternalBindingRecord binding) {
        return response(binding, "UNCONFIGURED", "UNCONFIGURED", null);
    }

    @Override
    public AnnotationExternalBindingResponse importResults(AnnotationTaskRecord task, AnnotationExternalBindingRecord binding) {
        return response(binding, "UNCONFIGURED", "UNCONFIGURED", null);
    }

    private AnnotationExternalBindingResponse response(AnnotationExternalBindingRecord binding, String configStatus, String syncStatus, OffsetDateTime lastSyncAt) {
        return new AnnotationExternalBindingResponse(binding.bindingId(), binding.taskId(), "LABEL_STUDIO", null, URL, null, null, configStatus, syncStatus, "LABEL_STUDIO_UNCONFIGURED", MESSAGE, null, false, lastSyncAt);
    }
}

@Service
public class AnnotationService {
    private static final String TRACE_TAG = "TASK-annotation-integration";
    private static final double MIN_COVERAGE = 0.90d;
    private final JdbcTemplate jdbc;
    private final PlatformIdentityService identityService;
    private final LabelStudioAnnotationAdapter labelStudioAdapter;
    private final ObjectStorageService objectStorageService;

    public AnnotationService(JdbcTemplate jdbc, PlatformIdentityService identityService, LabelStudioAnnotationAdapter labelStudioAdapter, ObjectStorageService objectStorageService) {
        this.jdbc = jdbc;
        this.identityService = identityService;
        this.labelStudioAdapter = labelStudioAdapter;
        this.objectStorageService = objectStorageService;
    }


    public static List<String> supportedExportFormats() {
        return List.of("SMP_JSONL", "LABEL_STUDIO_JSON", "COCO_DETECTION", "YOLO_DETECTION", "VOC_DETECTION", "SEGMENTATION_MASK_MANIFEST");
    }

    public AnnotationOverviewResponse overview(PlatformPrincipal principal) {
        identityService.requirePermission(principal, "data:annotation:read");
        List<AnnotationTaskSummaryResponse> taskItems = allTasks(principal, null, null);
        List<AnnotationLabelTemplateResponse> templateItems = labelTemplates(principal, null, null);
        AnnotationStatsResponse stats = new AnnotationStatsResponse(
            taskItems.size(),
            taskItems.stream().filter(item -> "IN_PROGRESS".equals(item.status())).count(),
            taskItems.stream().filter(item -> "PENDING_REVIEW".equals(item.status()) || "REVIEW_PENDING".equals(item.status())).count(),
            taskItems.stream().filter(item -> "COMPLETED".equals(item.status())).count(),
            templateItems.size()
        );
        return new AnnotationOverviewResponse(stats, taskItems, templateItems);
    }

    public AnnotationTaskListResponse tasks(PlatformPrincipal principal, String status, String keyword, int page, int pageSize) {
        identityService.requirePermission(principal, "data:annotation:read");
        List<AnnotationTaskSummaryResponse> filtered = allTasks(principal, status, keyword);
        int normalizedPage = Math.max(1, page);
        int normalizedPageSize = Math.max(1, Math.min(100, pageSize));
        int from = Math.min((normalizedPage - 1) * normalizedPageSize, filtered.size());
        int to = Math.min(from + normalizedPageSize, filtered.size());
        return new AnnotationTaskListResponse(filtered.subList(from, to), filtered.size(), normalizedPage, normalizedPageSize);
    }

    public AnnotationTaskDetailResponse taskDetail(PlatformPrincipal principal, String taskId) {
        identityService.requirePermission(principal, "data:annotation:read");
        return detail(taskVisible(principal, taskId, false));
    }

    public AnnotationWorkItemPageResponse workItems(PlatformPrincipal principal, String taskId, int page, int pageSize) {
        requireAnyPermission(principal, "data:annotation:submit", "data:annotation:read");
        AnnotationTaskRecord task = taskVisible(principal, taskId, false);
        List<AnnotationWorkItemResponse> visible = workItemResponses(task.taskId()).stream()
            .filter(item -> principal.hasPermission("data:annotation:read") || principal.user().id().equals(item.annotatorId()))
            .toList();
        int normalizedPage = Math.max(1, page);
        int normalizedPageSize = Math.max(1, Math.min(200, pageSize));
        int from = Math.min((normalizedPage - 1) * normalizedPageSize, visible.size());
        int to = Math.min(from + normalizedPageSize, visible.size());
        return new AnnotationWorkItemPageResponse(visible.subList(from, to), visible.size(), normalizedPage, normalizedPageSize);
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public AnnotationTaskDetailResponse createTask(PlatformPrincipal principal, AnnotationTaskCreateRequest request) {
        identityService.requirePermission(principal, "data:annotation:write");
        identityService.requirePermission(principal, "data:annotation:assign");
        DatasetInfo source = datasetVisible(principal, require(request.sourceDatasetId(), "源数据集不能为空"), true);
        if (!"ACTIVE".equals(source.status())) {
            audit(principal, source.tenantId(), "ANNOTATION_TASK_CREATE_FAILED", "Dataset", source.datasetId(), "FAILURE", "WARNING", source.status(), "ACTIVE_REQUIRED", TRACE_TAG + ";DAT-009");
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "所选数据集状态不可用：DAT-009 要求源数据集必须为 ACTIVE");
        }
        if (!"IMAGE".equals(upper(source.dataType(), ""))) {
            audit(principal, source.tenantId(), "ANNOTATION_TASK_CREATE_FAILED", "Dataset", source.datasetId(), "FAILURE", "WARNING", source.dataType(), "IMAGE_REQUIRED", TRACE_TAG + ";DAT-013");
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "DAT-013 仅支持图片数据集创建图片打标或图片分割任务");
        }
        AnnotationLabelTemplateRecord template = resolveTaskTemplate(principal, source, request);
        String scene = normalizeScene(request.scene(), template.scene());
        String templateScene = normalizeScene(template.scene(), "IMAGE_TAGGING");
        ensureImageScene(scene, "DAT-013 仅支持图片打标或图片分割标注场景");
        ensureImageScene(templateScene, "DAT-013 仅支持图片打标或图片分割标签模板");
        if (!scene.equals(templateScene)) {
            audit(principal, source.tenantId(), "ANNOTATION_TASK_CREATE_FAILED", "LabelTemplate", template.templateId(), "FAILURE", "WARNING", template.scene(), scene, TRACE_TAG + ";DAT-013");
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "DAT-013 标签模板场景必须与标注任务场景一致");
        }
        List<String> assignees = safe(request.assigneeIds());
        List<String> reviewers = safe(request.reviewerIds());
        for (String id : assignees) ensureActiveUserInTenant(id, source.tenantId(), "标注员");
        for (String id : reviewers) ensureActiveUserInTenant(id, source.tenantId(), "审核员");
        if (Boolean.TRUE.equals(request.reviewEnabled())) ensureNoSelfReview(assignees, reviewers, principal, source.tenantId(), "NEW");

        String id = "ANN-" + randomHex(10).toUpperCase(Locale.ROOT);
        OffsetDateTime at = now();
        String sourceVersionId = blank(request.sourceVersionId(), source.currentVersionId());
        long total = countDatasetFiles(sourceVersionId);
        if (total <= 0) {
            total = Math.max(1L, source.recordCount());
        }
        String status = assignees.isEmpty() ? "DRAFT" : "IN_PROGRESS";
        jdbc.update("""
            INSERT INTO annotation_task (task_id, tenant_id, project_id, source_dataset_id, source_version_id, template_id, name, scene, status, review_enabled, prelabel_enabled, label_studio_enabled, prelabel_model_source, prelabel_confidence, total_count, annotated_count, reviewed_count, quality_score, deadline, note, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, ?, ?, ?, ?, ?)
            """, id, source.tenantId(), source.projectId(), source.datasetId(), sourceVersionId, template.templateId(), require(request.name(), "标注任务名称不能为空"), scene, status, bool(request.reviewEnabled(), true), bool(request.prelabelEnabled(), false), bool(request.labelStudioEnabled(), true), blank(request.prelabelModelSource(), "TODO_CONFIRM_PRELABEL_MODEL_SOURCE"), request.prelabelConfidence(), total, request.deadline(), nullIfBlank(request.note()), principal.user().id(), at, at);
        replaceAssignments(principal, id, assignees, reviewers);
        createInitialWorkItems(id, source, sourceVersionId, assignees, bool(request.prelabelEnabled(), false), total, at);
        ensureBinding(id);
        audit(principal, source.tenantId(), "ANNOTATION_TASK_CREATED", "AnnotationTask", id, "SUCCESS", "INFO", null, status, TRACE_TAG);
        if (!assignees.isEmpty() || !reviewers.isEmpty()) {
            audit(principal, source.tenantId(), "ANNOTATION_TASK_ASSIGNED", "AnnotationTask", id, "SUCCESS", "INFO", null, assignees + ";" + reviewers, TRACE_TAG);
        }
        return detail(taskRecord(id));
    }

    private AnnotationLabelTemplateRecord resolveTaskTemplate(PlatformPrincipal principal, DatasetInfo source, AnnotationTaskCreateRequest request) {
        if (!blank(request.templateId())) {
            AnnotationLabelTemplateRecord template = templateVisible(principal, require(request.templateId(), "标签模板不能为空"), false);
            ensureTemplateUsableForTask(principal, source, template);
            return template;
        }
        List<String> inlineLabels = normalizeInlineLabels(request.inlineLabels());
        if (inlineLabels.isEmpty()) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "请选择标签模板或在创建任务时至少输入一个标签");
        }
        String scene = normalizeScene(request.scene(), "IMAGE_TAGGING");
        ensureImageScene(scene, "DAT-013 仅支持图片打标或图片分割标注场景");
        return createInlineTemplateForTask(principal, source, scene, inlineLabels, request.inlineTemplateName());
    }

    private void ensureTemplateUsableForTask(PlatformPrincipal principal, DatasetInfo source, AnnotationLabelTemplateRecord template) {
        if (!source.tenantId().equals(template.tenantId())) {
            audit(principal, source.tenantId(), "ANNOTATION_CROSS_TENANT_DENIED", "LabelTemplate", template.templateId(), "FAILURE", "CRITICAL", source.tenantId(), template.tenantId(), TRACE_TAG + ";DAT-012");
            throw new PlatformException(PlatformError.FORBIDDEN, "标签模板与数据集不属于同一 BU");
        }
        if (!"PUBLISHED".equals(template.status())) {
            audit(principal, source.tenantId(), "ANNOTATION_TASK_CREATE_FAILED", "LabelTemplate", template.templateId(), "FAILURE", "WARNING", template.status(), "PUBLISHED_REQUIRED", TRACE_TAG + ";DAT-003");
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "任务尚未配置已发布标签模板：DAT-003 要求模板为 PUBLISHED");
        }
    }

    private AnnotationLabelTemplateRecord createInlineTemplateForTask(PlatformPrincipal principal, DatasetInfo source, String scene, List<String> inlineLabels, String inlineTemplateName) {
        String templateId = "LT-" + randomHex(10).toUpperCase(Locale.ROOT);
        OffsetDateTime at = now();
        String schemaJson = labelSchemaJson(inlineLabels, scene);
        jdbc.update(
            "INSERT INTO annotation_label_template (template_id, tenant_id, name, scene, label_type, label_schema_json, label_studio_config_xml, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'PUBLISHED', ?, ?, ?)",
            templateId,
            source.tenantId(),
            blank(inlineTemplateName, source.name() + " " + sceneLabel(scene) + "模板"),
            scene,
            defaultLabelType(scene),
            schemaJson,
            defaultConfigXml(scene, schemaJson),
            principal.user().id(),
            at,
            at
        );
        audit(principal, source.tenantId(), "ANNOTATION_TEMPLATE_CREATED", "LabelTemplate", templateId, "SUCCESS", "INFO", null, "PUBLISHED", TRACE_TAG + ";INLINE_TASK_TEMPLATE");
        audit(principal, source.tenantId(), "ANNOTATION_TEMPLATE_PUBLISHED", "LabelTemplate", templateId, "SUCCESS", "INFO", "DRAFT", "PUBLISHED", TRACE_TAG + ";INLINE_TASK_TEMPLATE");
        return templateRecord(templateId);
    }

    @Transactional
    public AnnotationTaskDetailResponse assign(PlatformPrincipal principal, String taskId, AnnotationTaskAssignRequest request) {
        identityService.requirePermission(principal, "data:annotation:assign");
        AnnotationTaskRecord task = taskVisible(principal, taskId, true);
        List<String> assignees = safe(request.assigneeIds());
        List<String> reviewers = safe(request.reviewerIds());
        for (String id : assignees) ensureActiveUserInTenant(id, task.tenantId(), "标注员");
        for (String id : reviewers) ensureActiveUserInTenant(id, task.tenantId(), "审核员");
        if (task.reviewEnabled()) ensureNoSelfReview(assignees, reviewers, principal, task.tenantId(), taskId);
        replaceAssignments(principal, taskId, assignees, reviewers);
        distributePendingWorkItems(taskId, assignees);
        jdbc.update("UPDATE annotation_task SET status=CASE WHEN status='DRAFT' THEN 'ASSIGNED' ELSE status END, updated_at=? WHERE task_id=?", now(), taskId);
        audit(principal, task.tenantId(), "ANNOTATION_TASK_ASSIGNED", "AnnotationTask", taskId, "SUCCESS", "INFO", null, assignees + ";" + reviewers, TRACE_TAG);
        return detail(taskRecord(taskId));
    }

    @Transactional
    public AnnotationTaskDetailResponse start(PlatformPrincipal principal, String taskId) {
        return transitionTask(principal, taskId, "data:annotation:write", "IN_PROGRESS", "ANNOTATION_TASK_STARTED", List.of("DRAFT", "ASSIGNED", "PAUSED"));
    }

    @Transactional
    public AnnotationTaskDetailResponse pause(PlatformPrincipal principal, String taskId) {
        return transitionTask(principal, taskId, "data:annotation:admin", "PAUSED", "ANNOTATION_TASK_PAUSED", List.of("DRAFT", "ASSIGNED", "IN_PROGRESS"));
    }

    @Transactional
    public AnnotationTaskDetailResponse cancel(PlatformPrincipal principal, String taskId) {
        return transitionTask(principal, taskId, "data:annotation:admin", "CANCELLED", "ANNOTATION_TASK_CANCELLED", List.of("DRAFT", "ASSIGNED", "IN_PROGRESS", "PAUSED"));
    }

    public List<AnnotationLabelTemplateResponse> labelTemplates(PlatformPrincipal principal, String status, String scene) {
        identityService.requirePermission(principal, "data:label-template:read");
        return jdbc.query("SELECT * FROM annotation_label_template ORDER BY updated_at DESC", (rs, n) -> templateResponse(rs))
            .stream()
            .filter(item -> canSeeTenant(principal, item.tenantId()))
            .filter(item -> blank(status) || item.status().equalsIgnoreCase(status))
            .filter(item -> blank(scene) || item.scene().equalsIgnoreCase(scene))
            .toList();
    }

    @Transactional
    public AnnotationLabelTemplateResponse createTemplate(PlatformPrincipal principal, AnnotationLabelTemplateRequest request) {
        identityService.requirePermission(principal, "data:label-template:write");
        String tenantId = blank(request.tenantId(), principal.user().tenantId());
        ensureCanSeeTenant(principal, tenantId, true);
        String id = "LT-" + randomHex(10).toUpperCase(Locale.ROOT);
        OffsetDateTime at = now();
        String scene = normalizeScene(request.scene(), "IMAGE_TAGGING");
        ensureImageScene(scene, "DAT-013 仅支持图片打标或图片分割标签模板");
        String schemaJson = blank(request.labelSchemaJson(), "{\"labels\":[]}");
        jdbc.update("INSERT INTO annotation_label_template (template_id, tenant_id, name, scene, label_type, label_schema_json, label_studio_config_xml, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)", id, tenantId, require(request.name(), "标签模板名称不能为空"), scene, upper(request.labelType(), defaultLabelType(scene)), schemaJson, blank(request.labelStudioConfigXml(), defaultConfigXml(scene, schemaJson)), principal.user().id(), at, at);
        audit(principal, tenantId, "ANNOTATION_TEMPLATE_CREATED", "LabelTemplate", id, "SUCCESS", "INFO", null, "DRAFT", TRACE_TAG);
        return template(id);
    }

    @Transactional
    public AnnotationLabelTemplateResponse updateTemplate(PlatformPrincipal principal, String templateId, AnnotationLabelTemplateRequest request) {
        identityService.requirePermission(principal, "data:label-template:write");
        AnnotationLabelTemplateRecord current = templateVisible(principal, templateId, true);
        if (!"DRAFT".equals(current.status())) throw new PlatformException(PlatformError.CONFLICT, "仅 DRAFT 标签模板可编辑");
        String scene = normalizeScene(request.scene(), current.scene());
        ensureImageScene(scene, "DAT-013 仅支持图片打标或图片分割标签模板");
        String schemaJson = blank(request.labelSchemaJson(), current.labelSchemaJson());
        jdbc.update("UPDATE annotation_label_template SET name=?, scene=?, label_type=?, label_schema_json=?, label_studio_config_xml=?, updated_at=? WHERE template_id=?", blank(request.name(), current.name()), scene, upper(request.labelType(), current.labelType()), schemaJson, blank(request.labelStudioConfigXml(), defaultConfigXml(scene, schemaJson)), now(), templateId);
        return template(templateId);
    }

    @Transactional
    public AnnotationLabelTemplateResponse publishTemplate(PlatformPrincipal principal, String templateId) {
        identityService.requirePermission(principal, "data:label-template:publish");
        AnnotationLabelTemplateRecord current = templateVisible(principal, templateId, true);
        jdbc.update("UPDATE annotation_label_template SET status='PUBLISHED', updated_at=? WHERE template_id=?", now(), templateId);
        audit(principal, current.tenantId(), "ANNOTATION_TEMPLATE_PUBLISHED", "LabelTemplate", templateId, "SUCCESS", "INFO", current.status(), "PUBLISHED", TRACE_TAG);
        return template(templateId);
    }

    @Transactional
    public AnnotationLabelTemplateResponse archiveTemplate(PlatformPrincipal principal, String templateId) {
        identityService.requirePermission(principal, "data:label-template:publish");
        templateVisible(principal, templateId, true);
        jdbc.update("UPDATE annotation_label_template SET status='ARCHIVED', updated_at=? WHERE template_id=?", now(), templateId);
        return template(templateId);
    }

    public AnnotationLabelStudioConfigResponse labelStudioConfig(PlatformPrincipal principal, String templateId) {
        identityService.requirePermission(principal, "data:label-template:read");
        AnnotationLabelTemplateRecord template = templateVisible(principal, templateId, false);
        return new AnnotationLabelStudioConfigResponse(template.templateId(), template.labelStudioConfigXml(), "OK", "LABEL_STUDIO_CONFIG_GENERATED");
    }

    @Transactional
    public AnnotationWorkItemResponse saveDraft(PlatformPrincipal principal, String workItemId, AnnotationWorkItemRequest request) {
        identityService.requirePermission(principal, "data:annotation:submit");
        AnnotationWorkItemRecord item = workItemVisible(principal, workItemId, true);
        ensureWorkOwnerOrAdmin(principal, item);
        if (!List.of("PENDING", "DRAFT", "REJECTED").contains(item.status())) throw new PlatformException(PlatformError.CONFLICT, "当前状态不可保存草稿");
        jdbc.update("UPDATE annotation_work_item SET annotation_json=?, status='DRAFT', annotator_id=COALESCE(annotator_id, ?), updated_at=? WHERE work_item_id=?", require(request.annotationJson(), "annotationJson 不能为空"), principal.user().id(), now(), workItemId);
        recalcTask(item.taskId());
        return workItem(workItemId);
    }

    @Transactional
    public AnnotationWorkItemResponse submit(PlatformPrincipal principal, String workItemId, AnnotationWorkItemRequest request) {
        identityService.requirePermission(principal, "data:annotation:submit");
        AnnotationWorkItemRecord item = workItemVisible(principal, workItemId, true);
        ensureWorkOwnerOrAdmin(principal, item);
        if (!List.of("PENDING", "DRAFT", "REJECTED", "SUBMITTED").contains(item.status())) throw new PlatformException(PlatformError.CONFLICT, "当前状态不可提交标注结果");
        AnnotationTaskRecord task = taskRecord(item.taskId());
        String annotatorId = blank(item.annotatorId(), principal.user().id());
        String next = task.reviewEnabled() ? "REVIEW_PENDING" : "APPROVED";
        OffsetDateTime at = now();
        jdbc.update("UPDATE annotation_work_item SET annotation_json=?, annotator_id=?, status=?, submitted_at=?, updated_at=? WHERE work_item_id=?", require(request.annotationJson(), "annotationJson 不能为空"), annotatorId, next, at, at, workItemId);
        if (task.reviewEnabled()) ensureReviewItemForWork(task, workItemId, annotatorId, at);
        audit(principal, task.tenantId(), "ANNOTATION_RESULT_SUBMITTED", "AnnotationWorkItem", workItemId, "SUCCESS", "INFO", item.status(), next, TRACE_TAG);
        recalcTask(task.taskId());
        return workItem(workItemId);
    }

    public List<AnnotationReviewItemResponse> reviewItems(PlatformPrincipal principal, String status, String taskId) {
        identityService.requirePermission(principal, "data:annotation:review");
        return jdbc.query("""
            SELECT r.*, t.name AS task_name, au.display_name AS annotator_name, ru.display_name AS reviewer_name
            FROM annotation_review_item r
            JOIN annotation_task t ON t.task_id=r.task_id
            JOIN platform_user au ON au.id=r.annotator_id
            LEFT JOIN platform_user ru ON ru.id=r.reviewer_id
            ORDER BY r.created_at DESC
            """, (rs, n) -> reviewResponse(rs))
            .stream()
            .filter(item -> canSeeTenant(principal, reviewTenant(item.taskId())))
            .filter(item -> blank(status) || item.status().equalsIgnoreCase(status))
            .filter(item -> blank(taskId) || item.taskId().equals(taskId))
            .toList();
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public AnnotationReviewItemResponse approve(PlatformPrincipal principal, String reviewItemId) {
        identityService.requirePermission(principal, "data:annotation:review");
        ReviewRecord review = reviewRecord(reviewItemId);
        AnnotationTaskRecord task = taskVisible(principal, review.taskId(), true);
        if (principal.user().id().equals(review.annotatorId())) {
            audit(principal, task.tenantId(), "ANNOTATION_REVIEW_SELF_REJECTED", "AnnotationReview", reviewItemId, "FAILURE", "CRITICAL", review.annotatorId(), principal.user().id(), TRACE_TAG + ";DAT-004");
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "不允许审核自己提交的标注结果：DAT-004");
        }
        if (!List.of("PENDING", "REJECTED").contains(review.status())) throw new PlatformException(PlatformError.CONFLICT, "当前审核项不可通过");
        OffsetDateTime at = now();
        jdbc.update("UPDATE annotation_review_item SET status='APPROVED', reviewer_id=?, review_comment='审核通过', reviewed_at=? WHERE review_item_id=?", principal.user().id(), at, reviewItemId);
        jdbc.update("UPDATE annotation_work_item SET status='APPROVED', updated_at=? WHERE work_item_id=?", at, review.workItemId());
        audit(principal, task.tenantId(), "ANNOTATION_REVIEW_APPROVED", "AnnotationReview", reviewItemId, "SUCCESS", "INFO", review.status(), "APPROVED", TRACE_TAG);
        recalcTask(task.taskId());
        return reviewItem(reviewItemId);
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public AnnotationReviewItemResponse reject(PlatformPrincipal principal, String reviewItemId, AnnotationReviewRequest request) {
        identityService.requirePermission(principal, "data:annotation:review");
        ReviewRecord review = reviewRecord(reviewItemId);
        AnnotationTaskRecord task = taskVisible(principal, review.taskId(), true);
        if (principal.user().id().equals(review.annotatorId())) {
            audit(principal, task.tenantId(), "ANNOTATION_REVIEW_SELF_REJECTED", "AnnotationReview", reviewItemId, "FAILURE", "CRITICAL", review.annotatorId(), principal.user().id(), TRACE_TAG + ";DAT-004");
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "不允许审核自己提交的标注结果：DAT-004");
        }
        String reason = require(request.reason(), "驳回原因不能为空");
        OffsetDateTime at = now();
        jdbc.update("UPDATE annotation_review_item SET status='REJECTED', reviewer_id=?, review_comment=?, reviewed_at=? WHERE review_item_id=?", principal.user().id(), reason, at, reviewItemId);
        jdbc.update("UPDATE annotation_work_item SET status='REJECTED', updated_at=? WHERE work_item_id=?", at, review.workItemId());
        audit(principal, task.tenantId(), "ANNOTATION_REVIEW_REJECTED", "AnnotationReview", reviewItemId, "SUCCESS", "WARNING", review.status(), "REJECTED", reason + ";" + TRACE_TAG);
        recalcTask(task.taskId());
        return reviewItem(reviewItemId);
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public AnnotationPublicationResponse qualityCheck(PlatformPrincipal principal, String taskId) {
        identityService.requirePermission(principal, "data:annotation:publish");
        AnnotationTaskRecord task = taskVisible(principal, taskId, true);
        AnnotationPublicationResponse result = calculateQuality(task);
        upsertPublication(taskId, result, principal, false);
        if (!"PASSED".equals(result.qualityStatus())) {
            audit(principal, task.tenantId(), "ANNOTATION_QUALITY_CHECK_FAILED", "AnnotationTask", taskId, "FAILURE", "WARNING", null, Double.toString(result.coverageRate()), TRACE_TAG + ";DAT-010");
        }
        return result;
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public AnnotationPublicationResponse publishDataset(PlatformPrincipal principal, String taskId) {
        identityService.requirePermission(principal, "data:annotation:publish");
        AnnotationTaskRecord task = taskVisible(principal, taskId, true);
        AnnotationPublicationResponse check = calculateQuality(task);
        if (!"PASSED".equals(check.qualityStatus())) {
            upsertPublication(taskId, check, principal, false);
            audit(principal, task.tenantId(), "ANNOTATION_QUALITY_CHECK_FAILED", "AnnotationTask", taskId, "FAILURE", "WARNING", null, Double.toString(check.coverageRate()), TRACE_TAG + ";DAT-010");
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, check.diagnosticMessage());
        }
        List<AnnotationPublicationResponse> existing = publications(taskId).stream().filter(item -> item.outputDatasetId() != null).toList();
        if (!existing.isEmpty()) return existing.getFirst();
        DatasetInfo source = datasetInfo(task.sourceDatasetId());
        OffsetDateTime at = now();
        String datasetId = "DATASET-ANN-" + task.taskId().replaceFirst("^ANN-", "");
        if (exists("SELECT COUNT(*) FROM dataset WHERE dataset_id=?", datasetId)) datasetId = "DATASET-ANN-" + randomHex(8).toUpperCase(Locale.ROOT);
        String versionId = "DVER-ANN-" + randomHex(10).toUpperCase(Locale.ROOT);
        String fileId = "FILE-ANN-" + randomHex(12).toUpperCase(Locale.ROOT);
        String dfId = "DF-ANN-" + randomHex(10).toUpperCase(Locale.ROOT);
        String sha = sha256(task.taskId() + ":" + task.reviewedCount() + ":" + at);
        long size = Math.max(512L, task.reviewedCount() * 256L);
        String annotationBucket = objectStorageService.datasetBucket(task.tenantId());
        String annotationObjectKey = task.tenantId() + "/annotation/" + task.taskId() + "/labels.jsonl";
        String annotationPayload = "{\"taskId\":\"" + task.taskId() + "\",\"reviewedCount\":" + task.reviewedCount() + ",\"scene\":\"" + task.scene() + "\"}\n";
        objectStorageService.uploadObjectIfConfigured(annotationBucket, annotationObjectKey, annotationPayload.getBytes(StandardCharsets.UTF_8), "application/jsonl");
        jdbc.update("INSERT INTO dataset (dataset_id,name,dataset_type,data_type,tenant_id,project_id,current_version_id,status,access_level,tags,record_count,size_bytes,owner_id,description,created_at,updated_at) VALUES (?,?,?,?,?,?,NULL,'ACTIVE','TEAM',?,?,?,?,?,?,?)", datasetId, task.name() + " 标注结果", "ANNOTATED", source.dataType(), task.tenantId(), task.projectId(), "标注,ANNOTATED," + task.scene(), task.reviewedCount(), size, principal.user().id(), "由标注任务 " + task.taskId() + " 生成", at, at);
        jdbc.update("INSERT INTO dataset_version (version_id,dataset_id,version_name,status,record_count,size_bytes,content_safety_status,diagnostic_code,diagnostic_message,created_by,created_at,published_at) VALUES (?,?,?,'PUBLISHED',?,?,'PASSED','OK','ANNOTATION_QUALITY_CHECK_PASSED',?,?,?)", versionId, datasetId, "v1.0.0", task.reviewedCount(), size, principal.user().id(), at, at);
        jdbc.update("UPDATE dataset SET current_version_id=?, updated_at=? WHERE dataset_id=?", versionId, at, datasetId);
        jdbc.update("INSERT INTO platform_file_object (file_id,asset_type,tenant_id,project_id,bucket,object_key,expected_sha256,sha256,expected_size_bytes,size_bytes,content_type,storage_tier,status,owner_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", fileId, "DATASET", task.tenantId(), task.projectId(), annotationBucket, annotationObjectKey, sha, sha, size, size, "application/jsonl", "STANDARD", "AVAILABLE", principal.user().id(), at, at);
        jdbc.update("INSERT INTO dataset_file (id,dataset_id,version_id,file_id,file_role,status,created_at) VALUES (?,?,?,?,?,?,?)", dfId, datasetId, versionId, fileId, "ANNOTATION_RESULT", "BOUND", at);
        jdbc.update("INSERT INTO data_lineage (lineage_id,source_type,source_id,target_type,target_id,transform_type,created_at) VALUES (?,?,?,?,?,?,?)", "LIN-ANN-" + randomHex(8).toUpperCase(Locale.ROOT), "ANNOTATION_TASK", task.taskId(), "DATASET_VERSION", versionId, "ANNOTATION", at);
        jdbc.update("INSERT INTO data_lineage (lineage_id,source_type,source_id,target_type,target_id,transform_type,created_at) VALUES (?,?,?,?,?,?,?)", "LIN-ANN-IN-" + randomHex(8).toUpperCase(Locale.ROOT), "DATASET_VERSION", task.sourceVersionId(), "DATASET_VERSION", versionId, "ANNOTATION", at);
        jdbc.update("UPDATE annotation_task SET status='COMPLETED', updated_at=? WHERE task_id=?", at, taskId);
        AnnotationPublicationResponse published = new AnnotationPublicationResponse(publicationId(taskId), taskId, "PASSED", check.coverageRate(), "PASSED", "OK", "ANNOTATION_DATASET_PUBLISHED", datasetId, versionId, fileId, "ANNOTATION_RESULT", at);
        upsertPublication(taskId, published, principal, true);
        audit(principal, task.tenantId(), "ANNOTATION_DATASET_PUBLISHED", "Dataset", datasetId, "SUCCESS", "CRITICAL", taskId, versionId, TRACE_TAG);
        return published;
    }

    public AnnotationExternalBindingResponse labelStudioStatus(PlatformPrincipal principal, String taskId) {
        identityService.requirePermission(principal, "data:annotation:read");
        AnnotationTaskRecord task = taskVisible(principal, taskId, false);
        return labelStudioAdapter.status(task, binding(taskId));
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public AnnotationExternalBindingResponse syncLabelStudioProject(PlatformPrincipal principal, String taskId) {
        identityService.requirePermission(principal, "data:annotation:admin");
        AnnotationTaskRecord task = taskVisible(principal, taskId, true);
        AnnotationExternalBindingResponse result = labelStudioAdapter.syncProject(task, binding(taskId));
        persistBinding(result);
        audit(principal, task.tenantId(), "PROJECT_SYNCED".equals(result.lastSyncStatus()) ? "ANNOTATION_LABEL_STUDIO_PROJECT_SYNCED" : "ANNOTATION_LABEL_STUDIO_SYNC_FAILED", "AnnotationTask", taskId, "PROJECT_SYNCED".equals(result.lastSyncStatus()) ? "SUCCESS" : "FAILURE", "PROJECT_SYNCED".equals(result.lastSyncStatus()) ? "INFO" : "WARNING", null, result.diagnosticCode(), TRACE_TAG + ";" + result.diagnosticMessage());
        return result;
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public AnnotationExternalBindingResponse syncLabelStudioTask(PlatformPrincipal principal, String workItemId) {
        identityService.requirePermission(principal, "data:annotation:submit");
        AnnotationWorkItemRecord item = workItemVisible(principal, workItemId, false);
        AnnotationTaskRecord task = taskRecord(item.taskId());
        AnnotationExternalBindingResponse result = labelStudioAdapter.syncTask(item, task, binding(task.taskId()));
        persistBinding(result);
        audit(principal, task.tenantId(), "TASK_SYNCED".equals(result.lastSyncStatus()) ? "ANNOTATION_LABEL_STUDIO_TASK_SYNCED" : "ANNOTATION_LABEL_STUDIO_SYNC_FAILED", "AnnotationWorkItem", workItemId, "TASK_SYNCED".equals(result.lastSyncStatus()) ? "SUCCESS" : "FAILURE", "TASK_SYNCED".equals(result.lastSyncStatus()) ? "INFO" : "WARNING", null, result.diagnosticCode(), TRACE_TAG + ";" + result.diagnosticMessage());
        return result;
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public AnnotationExternalBindingResponse importLabelStudioResults(PlatformPrincipal principal, String taskId) {
        identityService.requirePermission(principal, "data:annotation:admin");
        AnnotationTaskRecord task = taskVisible(principal, taskId, true);
        AnnotationExternalBindingResponse result = labelStudioAdapter.importResults(task, binding(taskId));
        persistBinding(result);
        audit(principal, task.tenantId(), "RESULT_IMPORTED".equals(result.lastSyncStatus()) ? "ANNOTATION_LABEL_STUDIO_RESULTS_IMPORTED" : "ANNOTATION_LABEL_STUDIO_IMPORT_FAILED", "AnnotationTask", taskId, "RESULT_IMPORTED".equals(result.lastSyncStatus()) ? "SUCCESS" : "FAILURE", "RESULT_IMPORTED".equals(result.lastSyncStatus()) ? "INFO" : "WARNING", null, result.diagnosticCode(), TRACE_TAG + ";import-results");
        return result;
    }


    public List<DatasetAnnotationTaskResponse> tasksForDataset(PlatformPrincipal principal, String datasetId) {
        identityService.requirePermission(principal, "data:annotation:read");
        datasetVisible(principal, datasetId, false);
        return allTasks(principal, null, null).stream()
            .filter(task -> datasetId.equals(task.sourceDatasetId()))
            .map(task -> new DatasetAnnotationTaskResponse(task, exports(principal, task.taskId())))
            .toList();
    }

    public List<AnnotationTrainingExportResponse> exports(PlatformPrincipal principal, String taskId) {
        identityService.requirePermission(principal, "data:annotation:read");
        AnnotationTaskRecord task = taskVisible(principal, taskId, false);
        return jdbc.query("SELECT * FROM annotation_training_export WHERE task_id=? ORDER BY requested_at DESC", (rs, n) -> exportResponse(rs), task.taskId());
    }

    public AnnotationTrainingExportResponse export(PlatformPrincipal principal, String exportId) {
        identityService.requirePermission(principal, "data:annotation:read");
        AnnotationTrainingExportResponse export = exportById(exportId);
        taskVisible(principal, export.taskId(), false);
        return export;
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public AnnotationTrainingExportResponse createExport(PlatformPrincipal principal, String taskId, AnnotationTrainingExportRequest request) {
        identityService.requirePermission(principal, "data:annotation:export");
        AnnotationTaskRecord task = taskVisible(principal, taskId, true);
        String format = upper(request.format(), "SMP_JSONL");
        if (!supportedExportFormats().contains(format)) {
            audit(principal, task.tenantId(), "ANNOTATION_EXPORT_FAILED", "AnnotationTask", taskId, "FAILURE", "WARNING", format, "UNSUPPORTED_FORMAT", TRACE_TAG + ";TODO_CONFIRM_TRAINING_EXPORT_FORMATS");
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "UNSUPPORTED_FORMAT: TODO_CONFIRM_TRAINING_EXPORT_FORMATS");
        }
        ensureFormatCompatible(task, format, principal);
        AnnotationPublicationResponse publication = readyPublication(task, principal);
        OffsetDateTime at = now();
        long size = estimateExportSize(task, format);
        boolean async = size > 200L * 1024L * 1024L;
        String exportId = "AEXP-" + randomHex(12).toUpperCase(Locale.ROOT);
        String fileId = async ? null : "FILE-AEXP-" + randomHex(10).toUpperCase(Locale.ROOT);
        String status = async ? "GENERATING" : "AVAILABLE";
        String diagnosticCode = async ? "ANNOTATION_EXPORT_ASYNC_REQUIRED" : "ANNOTATION_EXPORT_READY";
        String diagnosticMessage = async ? "导出文件超过 200 MB，已进入异步生成队列" : format + " 自包含训练包已生成，包含图片副本";
        if (!async) {
            String sha = sha256(task.taskId() + ":" + format + ":" + at);
            String exportBucket = objectStorageService.datasetBucket(task.tenantId());
            String exportObjectKey = task.tenantId() + "/annotation/" + task.taskId() + "/exports/" + format.toLowerCase(Locale.ROOT) + "/" + exportId + packageExtension(format);
            String exportPayload = "{\"taskId\":\"" + task.taskId() + "\",\"format\":\"" + format + "\",\"exportId\":\"" + exportId + "\"}";
            objectStorageService.uploadObjectIfConfigured(exportBucket, exportObjectKey, exportPayload.getBytes(StandardCharsets.UTF_8), contentType(format));
            jdbc.update("INSERT INTO platform_file_object (file_id,asset_type,tenant_id,project_id,bucket,object_key,expected_sha256,sha256,expected_size_bytes,size_bytes,content_type,storage_tier,status,owner_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", fileId, "DATASET", task.tenantId(), task.projectId(), exportBucket, exportObjectKey, sha, sha, size, size, contentType(format), "STANDARD", "AVAILABLE", principal.user().id(), at, at);
        }
        jdbc.update("""
            INSERT INTO annotation_training_export (export_id,task_id,output_dataset_id,output_version_id,source_annotation_file_id,export_file_id,format,format_version,options_json,status,diagnostic_code,diagnostic_message,size_bytes,async_required,package_includes_images,requested_by,requested_at,generated_at,expires_at,tenant_id,project_id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, exportId, task.taskId(), publication.outputDatasetId(), publication.outputVersionId(), publication.annotationArtifactFileId(), fileId, format, "1.0", nullIfBlank(request.optionsJson()), status, diagnosticCode, diagnosticMessage, size, async, true, principal.user().id(), at, async ? null : at, at.plusMonths(3), task.tenantId(), task.projectId());
        audit(principal, task.tenantId(), "ANNOTATION_EXPORT_REQUESTED", "AnnotationTrainingExport", exportId, "SUCCESS", "INFO", null, format, TRACE_TAG + ";includesImages=true;threshold=200MB;retention=3months");
        if (!async) audit(principal, task.tenantId(), "ANNOTATION_EXPORT_GENERATED", "AnnotationTrainingExport", exportId, "SUCCESS", "INFO", null, fileId, TRACE_TAG);
        return exportById(exportId);
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public AnnotationTrainingExportResponse exportDownloadUrl(PlatformPrincipal principal, String exportId) {
        identityService.requirePermission(principal, "data:dataset:download");
        identityService.requirePermission(principal, "platform:file:download");
        AnnotationTrainingExportResponse export = export(principal, exportId);
        AnnotationTaskRecord task = taskRecord(export.taskId());
        if (export.expiresAt() != null && export.expiresAt().isBefore(now())) {
            audit(principal, task.tenantId(), "ANNOTATION_EXPORT_EXPIRED", "AnnotationTrainingExport", exportId, "FAILURE", "WARNING", export.expiresAt().toString(), "DOWNLOAD", TRACE_TAG);
            throw new PlatformException(PlatformError.CONFLICT, "ANNOTATION_EXPORT_EXPIRED: 导出文件已过期，请重新生成");
        }
        if (blank(export.fileId())) throw new PlatformException(PlatformError.CONFLICT, "ANNOTATION_EXPORT_NOT_READY: 导出文件尚未生成");
        String diagnostic = objectStorageService.downloadDiagnostic();
        String url = diagnostic.startsWith("TODO_CONFIRM") ? null : objectStorageService.publicObjectUrl(objectStorageService.datasetBucket(task.tenantId()), task.tenantId() + "/annotation/" + task.taskId() + "/exports/" + export.format().toLowerCase(Locale.ROOT) + "/" + export.exportId() + packageExtension(export.format()));
        audit(principal, task.tenantId(), "ANNOTATION_EXPORT_DOWNLOADED", "AnnotationTrainingExport", exportId, "SUCCESS", "INFO", export.fileId(), diagnostic, TRACE_TAG);
        return new AnnotationTrainingExportResponse(export.exportId(), export.taskId(), export.format(), export.formatVersion(), export.status(), diagnostic, diagnostic.startsWith("TODO_CONFIRM") ? "文件下载未配置：" + diagnostic : export.diagnosticMessage(), export.fileId(), url, export.sizeBytes(), export.asyncRequired(), export.packageIncludesImages(), export.requestedAt(), export.generatedAt(), export.expiresAt());
    }

    private AnnotationTaskDetailResponse transitionTask(PlatformPrincipal principal, String taskId, String permission, String target, String action, List<String> allowed) {
        identityService.requirePermission(principal, permission);
        AnnotationTaskRecord task = taskVisible(principal, taskId, true);
        if (!allowed.contains(task.status())) throw new PlatformException(PlatformError.CONFLICT, "非法任务状态流转");
        jdbc.update("UPDATE annotation_task SET status=?, updated_at=? WHERE task_id=?", target, now(), taskId);
        audit(principal, task.tenantId(), action, "AnnotationTask", taskId, "SUCCESS", "WARNING", task.status(), target, TRACE_TAG);
        return detail(taskRecord(taskId));
    }

    private AnnotationTaskDetailResponse detail(AnnotationTaskRecord task) {
        return new AnnotationTaskDetailResponse(summary(task), assignments(task.taskId()), List.of(), reviewItemResponses(task.taskId()), publications(task.taskId()), bindingResponse(binding(task.taskId())));
    }

    private List<AnnotationTaskSummaryResponse> allTasks(PlatformPrincipal principal, String status, String keyword) {
        return jdbc.query("""
            SELECT t.*, d.name AS source_dataset_name, lt.name AS template_name
            FROM annotation_task t
            JOIN dataset d ON d.dataset_id=t.source_dataset_id
            JOIN annotation_label_template lt ON lt.template_id=t.template_id
            ORDER BY t.updated_at DESC
            """, (rs, n) -> taskSummary(rs))
            .stream()
            .filter(item -> canSeeTenant(principal, item.tenantId()))
            .filter(item -> blank(status) || item.status().equalsIgnoreCase(status))
            .filter(item -> blank(keyword) || contains(item.name(), keyword) || contains(item.sourceDatasetName(), keyword) || contains(item.taskId(), keyword))
            .toList();
    }

    private AnnotationTaskSummaryResponse taskSummary(ResultSet rs) throws SQLException {
        String taskId = rs.getString("task_id");
        return new AnnotationTaskSummaryResponse(taskId, rs.getString("name"), rs.getString("scene"), sceneLabel(rs.getString("scene")), rs.getString("source_dataset_id"), rs.getString("source_dataset_name"), rs.getString("template_id"), rs.getString("template_name"), rs.getString("tenant_id"), rs.getString("status"), rs.getBoolean("review_enabled"), rs.getBoolean("prelabel_enabled"), rs.getBoolean("label_studio_enabled"), rs.getLong("total_count"), rs.getLong("annotated_count"), rs.getLong("reviewed_count"), nullableInt(rs, "quality_score"), assignmentUsers(taskId), rs.getObject("deadline", OffsetDateTime.class), rs.getObject("updated_at", OffsetDateTime.class));
    }

    private AnnotationTaskSummaryResponse summary(AnnotationTaskRecord task) {
        DatasetInfo dataset = datasetInfo(task.sourceDatasetId());
        AnnotationLabelTemplateRecord template = templateRecord(task.templateId());
        return new AnnotationTaskSummaryResponse(task.taskId(), task.name(), task.scene(), sceneLabel(task.scene()), task.sourceDatasetId(), dataset.name(), task.templateId(), template.name(), task.tenantId(), task.status(), task.reviewEnabled(), task.prelabelEnabled(), task.labelStudioEnabled(), task.totalCount(), task.annotatedCount(), task.reviewedCount(), task.qualityScore(), assignmentUsers(task.taskId()), task.deadline(), task.updatedAt());
    }

    private List<AnnotationUserResponse> assignmentUsers(String taskId) {
        return jdbc.query("SELECT a.*, u.display_name FROM annotation_assignment a JOIN platform_user u ON u.id=a.assignee_id WHERE a.task_id=? AND a.status='ACTIVE' ORDER BY a.role, u.display_name", (rs, n) -> new AnnotationUserResponse(rs.getString("assignee_id"), rs.getString("display_name"), rs.getString("role")), taskId);
    }

    private List<AnnotationAssignmentResponse> assignments(String taskId) {
        return jdbc.query("SELECT a.*, u.display_name AS assignee_name FROM annotation_assignment a JOIN platform_user u ON u.id=a.assignee_id WHERE a.task_id=? ORDER BY a.role, a.assigned_at", (rs, n) -> new AnnotationAssignmentResponse(rs.getString("assignment_id"), rs.getString("task_id"), rs.getString("assignee_id"), rs.getString("assignee_name"), rs.getString("role"), rs.getString("status"), rs.getString("assigned_by"), rs.getObject("assigned_at", OffsetDateTime.class)), taskId);
    }

    private List<AnnotationWorkItemResponse> workItemResponses(String taskId) {
        return jdbc.query("""
            SELECT w.*, u.display_name AS annotator_name
            FROM annotation_work_item w LEFT JOIN platform_user u ON u.id=w.annotator_id
            WHERE w.task_id=? ORDER BY w.sample_key
            """, (rs, n) -> new AnnotationWorkItemResponse(rs.getString("work_item_id"), rs.getString("task_id"), rs.getString("sample_key"), rs.getString("sample_file_id"), rs.getString("annotator_id"), rs.getString("annotator_name"), rs.getString("status"), rs.getString("prediction_json"), rs.getString("annotation_json"), rs.getObject("submitted_at", OffsetDateTime.class), rs.getObject("updated_at", OffsetDateTime.class)), taskId);
    }

    private List<AnnotationReviewItemResponse> reviewItemResponses(String taskId) {
        return jdbc.query("""
            SELECT r.*, t.name AS task_name, au.display_name AS annotator_name, ru.display_name AS reviewer_name
            FROM annotation_review_item r
            JOIN annotation_task t ON t.task_id=r.task_id
            JOIN platform_user au ON au.id=r.annotator_id
            LEFT JOIN platform_user ru ON ru.id=r.reviewer_id
            WHERE r.task_id=? ORDER BY r.created_at DESC
            """, (rs, n) -> reviewResponse(rs), taskId);
    }

    private AnnotationReviewItemResponse reviewResponse(ResultSet rs) throws SQLException {
        return new AnnotationReviewItemResponse(rs.getString("review_item_id"), rs.getString("work_item_id"), rs.getString("task_id"), rs.getString("task_name"), rs.getString("annotator_id"), rs.getString("annotator_name"), rs.getString("reviewer_id"), rs.getString("reviewer_name"), rs.getString("status"), rs.getString("review_comment"), rs.getObject("reviewed_at", OffsetDateTime.class));
    }

    private List<AnnotationPublicationResponse> publications(String taskId) {
        return jdbc.query("SELECT * FROM annotation_dataset_publication WHERE task_id=? ORDER BY COALESCE(published_at, CURRENT_TIMESTAMP) DESC", (rs, n) -> new AnnotationPublicationResponse(rs.getString("publication_id"), rs.getString("task_id"), rs.getString("quality_status"), rs.getDouble("coverage_rate"), rs.getString("format_status"), rs.getString("diagnostic_code"), rs.getString("diagnostic_message"), rs.getString("output_dataset_id"), rs.getString("output_version_id"), nullableColumn(rs, "annotation_artifact_file_id"), nullableColumn(rs, "annotation_artifact_role"), rs.getObject("published_at", OffsetDateTime.class)), taskId);
    }

    private void replaceAssignments(PlatformPrincipal principal, String taskId, List<String> assignees, List<String> reviewers) {
        jdbc.update("UPDATE annotation_assignment SET status='REPLACED' WHERE task_id=?", taskId);
        OffsetDateTime at = now();
        for (String id : assignees.stream().distinct().toList()) insertAssignment(principal, taskId, id, "ANNOTATOR", at);
        for (String id : reviewers.stream().distinct().toList()) insertAssignment(principal, taskId, id, "REVIEWER", at);
    }

    private void insertAssignment(PlatformPrincipal principal, String taskId, String assigneeId, String role, OffsetDateTime at) {
        jdbc.update("INSERT INTO annotation_assignment (assignment_id,task_id,assignee_id,role,status,assigned_by,assigned_at) VALUES (?,?,?,?,?,?,?)", "ANN-ASG-" + randomHex(10).toUpperCase(Locale.ROOT), taskId, assigneeId, role, "ACTIVE", principal.user().id(), at);
    }

    private void createInitialWorkItems(String taskId, DatasetInfo source, String sourceVersionId, List<String> assignees, boolean prelabel, long total, OffsetDateTime at) {
        List<String> sampleFileIds = sampleFiles(sourceVersionId);
        int count = sampleFileIds.isEmpty() ? (int) Math.max(1L, total) : sampleFileIds.size();
        String annotator = assignees.isEmpty() ? null : assignees.getFirst();
        for (int i = 1; i <= count; i++) {
            String sampleFileId = sampleFileIds.isEmpty() ? null : sampleFileIds.get((i - 1) % sampleFileIds.size());
            jdbc.update("INSERT INTO annotation_work_item (work_item_id,task_id,sample_file_id,sample_key,annotator_id,status,prediction_json,annotation_json,submitted_at,created_at,updated_at) VALUES (?,?,?,?,?,'PENDING',?,?,NULL,?,?)", "ANN-WI-" + randomHex(10).toUpperCase(Locale.ROOT), taskId, sampleFileId, source.tenantId() + "/annotation/" + taskId + "/sample-" + i + ".jpg", annotator, prelabel ? "{\"model\":\"TODO_CONFIRM_PRELABEL_MODEL_SOURCE\",\"confidence\":0.70}" : null, null, at, at);
        }
    }

    private void distributePendingWorkItems(String taskId, List<String> assignees) {
        if (assignees.isEmpty()) return;
        List<String> itemIds = jdbc.queryForList("SELECT work_item_id FROM annotation_work_item WHERE task_id=? ORDER BY sample_key", String.class, taskId);
        int index = 0;
        for (String itemId : itemIds) {
            jdbc.update("UPDATE annotation_work_item SET annotator_id=?, updated_at=? WHERE work_item_id=?", assignees.get(index % assignees.size()), now(), itemId);
            index++;
        }
    }

    private void ensureReviewItemForWork(AnnotationTaskRecord task, String workItemId, String annotatorId, OffsetDateTime at) {
        String reviewer = candidateReviewers(task).stream().filter(id -> !id.equals(annotatorId)).findFirst().orElse(null);
        if (reviewer == null) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "不允许审核自己提交的标注结果：任务缺少非提交人的审核员");
        List<String> existing = jdbc.queryForList("SELECT review_item_id FROM annotation_review_item WHERE work_item_id=?", String.class, workItemId);
        if (existing.isEmpty()) {
            jdbc.update("INSERT INTO annotation_review_item (review_item_id,work_item_id,task_id,annotator_id,reviewer_id,status,review_comment,reviewed_at,created_at) VALUES (?,?,?,?,?,'PENDING',NULL,NULL,?)", "ANN-RV-" + randomHex(10).toUpperCase(Locale.ROOT), workItemId, task.taskId(), annotatorId, reviewer, at);
        } else {
            jdbc.update("UPDATE annotation_review_item SET annotator_id=?, reviewer_id=?, status='PENDING', review_comment=NULL, reviewed_at=NULL WHERE work_item_id=?", annotatorId, reviewer, workItemId);
        }
    }

    private void recalcTask(String taskId) {
        long annotated = count("SELECT COUNT(*) FROM annotation_work_item WHERE task_id=? AND status IN ('SUBMITTED','REVIEW_PENDING','APPROVED')", taskId);
        long reviewed = count("SELECT COUNT(*) FROM annotation_work_item WHERE task_id=? AND status='APPROVED'", taskId);
        AnnotationTaskRecord task = taskRecord(taskId);
        int score = task.totalCount() == 0 ? 0 : (int) Math.min(100, Math.round((reviewed * 100.0d) / task.totalCount()));
        String status = task.status();
        if (reviewed >= task.totalCount() && task.totalCount() > 0) status = "APPROVED";
        else if (task.reviewEnabled() && annotated > 0) status = "PENDING_REVIEW";
        else if (annotated > 0) status = "IN_PROGRESS";
        jdbc.update("UPDATE annotation_task SET annotated_count=?, reviewed_count=?, quality_score=?, status=?, updated_at=? WHERE task_id=?", annotated, reviewed, score, status, now(), taskId);
    }

    private AnnotationPublicationResponse calculateQuality(AnnotationTaskRecord task) {
        recalcTask(task.taskId());
        AnnotationTaskRecord fresh = taskRecord(task.taskId());
        double coverage = fresh.totalCount() == 0 ? 0 : fresh.reviewedCount() / (double) fresh.totalCount();
        boolean passed = coverage >= MIN_COVERAGE && count("SELECT COUNT(*) FROM annotation_work_item WHERE task_id=? AND status <> 'APPROVED'", fresh.taskId()) == 0;
        if (passed) return new AnnotationPublicationResponse(publicationId(task.taskId()), task.taskId(), "PASSED", round(coverage), "PASSED", "OK", "ANNOTATION_QUALITY_CHECK_PASSED", null, null, null, null, null);
        String message = "ANNOTATION_QUALITY_CHECK_FAILED: 覆盖率 " + Math.round(coverage * 100) + "% 未达到 90%，或存在未审核通过样本";
        return new AnnotationPublicationResponse(publicationId(task.taskId()), task.taskId(), "FAILED", round(coverage), "PASSED", "ANNOTATION_QUALITY_CHECK_FAILED", message, null, null, null, null, null);
    }

    private void upsertPublication(String taskId, AnnotationPublicationResponse result, PlatformPrincipal principal, boolean published) {
        List<String> ids = jdbc.queryForList("SELECT publication_id FROM annotation_dataset_publication WHERE task_id=?", String.class, taskId);
        String id = ids.isEmpty() ? result.publicationId() : ids.getFirst();
        if (ids.isEmpty()) {
            jdbc.update("INSERT INTO annotation_dataset_publication (publication_id,task_id,output_dataset_id,output_version_id,annotation_artifact_file_id,annotation_artifact_role,quality_status,coverage_rate,format_status,diagnostic_code,diagnostic_message,published_by,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", id, taskId, result.outputDatasetId(), result.outputVersionId(), result.annotationArtifactFileId(), result.annotationArtifactRole(), result.qualityStatus(), result.coverageRate(), result.formatStatus(), result.diagnosticCode(), result.diagnosticMessage(), published ? principal.user().id() : null, result.publishedAt());
        } else {
            jdbc.update("UPDATE annotation_dataset_publication SET output_dataset_id=?, output_version_id=?, annotation_artifact_file_id=?, annotation_artifact_role=?, quality_status=?, coverage_rate=?, format_status=?, diagnostic_code=?, diagnostic_message=?, published_by=?, published_at=? WHERE publication_id=?", result.outputDatasetId(), result.outputVersionId(), result.annotationArtifactFileId(), result.annotationArtifactRole(), result.qualityStatus(), result.coverageRate(), result.formatStatus(), result.diagnosticCode(), result.diagnosticMessage(), published ? principal.user().id() : null, result.publishedAt(), id);
        }
    }

    private String publicationId(String taskId) {
        List<String> rows = jdbc.queryForList("SELECT publication_id FROM annotation_dataset_publication WHERE task_id=?", String.class, taskId);
        return rows.isEmpty() ? "ANN-PUB-" + randomHex(10).toUpperCase(Locale.ROOT) : rows.getFirst();
    }


    private AnnotationPublicationResponse readyPublication(AnnotationTaskRecord task, PlatformPrincipal principal) {
        if (!"COMPLETED".equals(task.status())) {
            audit(principal, task.tenantId(), "ANNOTATION_EXPORT_FAILED", "AnnotationTask", task.taskId(), "FAILURE", "WARNING", task.status(), "COMPLETED_REQUIRED", TRACE_TAG + ";ANNOTATION_EXPORT_NOT_READY");
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "ANNOTATION_EXPORT_NOT_READY: 标注任务完成并发布后才能导出训练格式");
        }
        List<AnnotationPublicationResponse> rows = publications(task.taskId()).stream().filter(p -> "PASSED".equals(p.qualityStatus()) && p.annotationArtifactFileId() != null).toList();
        if (rows.isEmpty()) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "ANNOTATION_ARTIFACT_MISSING: 缺少 ANNOTATION_RESULT 标注文件");
        return rows.getFirst();
    }

    private void ensureFormatCompatible(AnnotationTaskRecord task, String format, PlatformPrincipal principal) {
        boolean segmentation = "IMAGE_SEGMENTATION".equals(normalizeScene(task.scene(), ""));
        if (segmentation && List.of("COCO_DETECTION", "YOLO_DETECTION", "VOC_DETECTION").contains(format)) {
            audit(principal, task.tenantId(), "ANNOTATION_EXPORT_FAILED", "AnnotationTrainingExport", task.taskId(), "FAILURE", "WARNING", task.scene(), format, TRACE_TAG + ";ANNOTATION_EXPORT_FORMAT_INCOMPATIBLE");
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "ANNOTATION_EXPORT_FORMAT_INCOMPATIBLE: 图片分割任务不能导出检测框格式");
        }
        if (!segmentation && "SEGMENTATION_MASK_MANIFEST".equals(format)) {
            audit(principal, task.tenantId(), "ANNOTATION_EXPORT_FAILED", "AnnotationTrainingExport", task.taskId(), "FAILURE", "WARNING", task.scene(), format, TRACE_TAG + ";ANNOTATION_EXPORT_FORMAT_INCOMPATIBLE");
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "ANNOTATION_EXPORT_FORMAT_INCOMPATIBLE: 图片打标任务不能导出分割 mask 格式");
        }
    }

    private long estimateExportSize(AnnotationTaskRecord task, String format) {
        long imageCopyBytes = Math.max(1L, task.totalCount()) * 1024L * 1024L;
        long annotationBytes = Math.max(64L * 1024L, task.reviewedCount() * 4096L);
        long formatOverhead = switch (format) { case "COCO_DETECTION", "LABEL_STUDIO_JSON" -> 512L * 1024L; case "SEGMENTATION_MASK_MANIFEST" -> 2L * 1024L * 1024L; default -> 256L * 1024L; };
        return imageCopyBytes + annotationBytes + formatOverhead;
    }

    private AnnotationTrainingExportResponse exportById(String exportId) {
        List<AnnotationTrainingExportResponse> rows = jdbc.query("SELECT * FROM annotation_training_export WHERE export_id=?", (rs, n) -> exportResponse(rs), exportId);
        if (rows.isEmpty()) throw new PlatformException(PlatformError.NOT_FOUND, "导出记录不存在");
        return rows.getFirst();
    }

    private AnnotationTrainingExportResponse exportResponse(ResultSet rs) throws SQLException {
        return new AnnotationTrainingExportResponse(rs.getString("export_id"), rs.getString("task_id"), rs.getString("format"), rs.getString("format_version"), rs.getString("status"), rs.getString("diagnostic_code"), rs.getString("diagnostic_message"), rs.getString("export_file_id"), null, nullableLong(rs, "size_bytes"), rs.getBoolean("async_required"), rs.getBoolean("package_includes_images"), rs.getObject("requested_at", OffsetDateTime.class), rs.getObject("generated_at", OffsetDateTime.class), rs.getObject("expires_at", OffsetDateTime.class));
    }

    private String configValue(String key, String tenantId) {
        List<String> values = jdbc.queryForList("SELECT value_json FROM platform_config_value WHERE config_key=? AND ((scope_type='BU' AND scope_id=?) OR (scope_type='GLOBAL' AND scope_id='TENANT-YF')) ORDER BY CASE WHEN scope_type='BU' THEN 0 ELSE 1 END", String.class, key, tenantId);
        if (!values.isEmpty()) return values.getFirst();
        values = jdbc.queryForList("SELECT default_value FROM platform_config_definition WHERE config_key=?", String.class, key);
        return values.isEmpty() ? null : values.getFirst();
    }

    private String packageExtension(String format) { return "SMP_JSONL".equals(format) ? ".jsonl" : ".zip"; }
    private String contentType(String format) { return "SMP_JSONL".equals(format) ? "application/jsonl" : "application/zip"; }

    private AnnotationTaskRecord taskVisible(PlatformPrincipal principal, String taskId, boolean write) {
        AnnotationTaskRecord task = taskRecord(taskId);
        if (!canSeeTenant(principal, task.tenantId())) {
            audit(principal, principal.user().tenantId(), "ANNOTATION_CROSS_TENANT_DENIED", "AnnotationTask", taskId, "FAILURE", "CRITICAL", principal.user().tenantId(), task.tenantId(), TRACE_TAG + ";DAT-012");
            throw new PlatformException(write ? PlatformError.FORBIDDEN : PlatformError.NOT_FOUND, write ? "您无权操作其他 BU 的标注任务" : "标注任务不存在");
        }
        return task;
    }

    private AnnotationLabelTemplateRecord templateVisible(PlatformPrincipal principal, String templateId, boolean write) {
        AnnotationLabelTemplateRecord template = templateRecord(templateId);
        if (!canSeeTenant(principal, template.tenantId())) {
            audit(principal, principal.user().tenantId(), "ANNOTATION_CROSS_TENANT_DENIED", "LabelTemplate", templateId, "FAILURE", "CRITICAL", principal.user().tenantId(), template.tenantId(), TRACE_TAG + ";DAT-012");
            throw new PlatformException(write ? PlatformError.FORBIDDEN : PlatformError.NOT_FOUND, write ? "您无权操作其他 BU 的标签模板" : "标签模板不存在");
        }
        return template;
    }

    private AnnotationWorkItemRecord workItemVisible(PlatformPrincipal principal, String workItemId, boolean write) {
        AnnotationWorkItemRecord item = workItemRecord(workItemId);
        taskVisible(principal, item.taskId(), write);
        return item;
    }

    private DatasetInfo datasetVisible(PlatformPrincipal principal, String datasetId, boolean write) {
        DatasetInfo dataset = datasetInfo(datasetId);
        if (!canSeeTenant(principal, dataset.tenantId())) {
            audit(principal, principal.user().tenantId(), "ANNOTATION_CROSS_TENANT_DENIED", "Dataset", datasetId, "FAILURE", "CRITICAL", principal.user().tenantId(), dataset.tenantId(), TRACE_TAG + ";DAT-012");
            throw new PlatformException(write ? PlatformError.FORBIDDEN : PlatformError.NOT_FOUND, write ? "您无权操作其他 BU 的数据集" : "数据集不存在");
        }
        return dataset;
    }

    private void ensureWorkOwnerOrAdmin(PlatformPrincipal principal, AnnotationWorkItemRecord item) {
        if (principal.hasPermission("data:annotation:admin") || blank(item.annotatorId()) || principal.user().id().equals(item.annotatorId())) return;
        throw new PlatformException(PlatformError.FORBIDDEN, "只能提交分配给自己的标注工作项");
    }

    private void ensureActiveUserInTenant(String userId, String tenantId, String roleLabel) {
        PlatformUser user = identityService.findUserById(userId);
        if (!"ACTIVE".equals(user.status())) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, roleLabel + "账号已停用");
        if (!canSeeTenantById(user.tenantId(), tenantId)) throw new PlatformException(PlatformError.FORBIDDEN, roleLabel + "不属于任务 BU");
    }

    private void ensureNoSelfReview(List<String> assignees, List<String> reviewers, PlatformPrincipal principal, String tenantId, String resourceId) {
        for (String id : assignees) {
            if (reviewers.contains(id)) {
                audit(principal, tenantId, "ANNOTATION_REVIEW_SELF_REJECTED", "AnnotationTask", resourceId, "FAILURE", "CRITICAL", id, id, TRACE_TAG + ";DAT-004");
                throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "不允许审核自己提交的标注结果：DAT-004");
            }
        }
    }

    private List<String> activeReviewers(String taskId) {
        return jdbc.queryForList("SELECT assignee_id FROM annotation_assignment WHERE task_id=? AND role='REVIEWER' AND status='ACTIVE' ORDER BY assigned_at", String.class, taskId);
    }

    private List<String> candidateReviewers(AnnotationTaskRecord task) {
        List<String> assigned = activeReviewers(task.taskId()).stream().distinct().toList();
        if (!assigned.isEmpty()) {
            return assigned;
        }
        List<String> organizationMembers = jdbc.queryForList("""
            SELECT DISTINCT om.user_id
            FROM platform_organization_member om
            JOIN platform_user u ON u.id = om.user_id
            WHERE om.organization_id=?
              AND om.status='ACTIVE'
              AND u.status='ACTIVE'
              AND om.user_id IN (
                  SELECT ur.user_id
                  FROM platform_user_role ur
                  WHERE ur.active=TRUE
                    AND (ur.expires_at IS NULL OR ur.expires_at > ?)
                    AND ur.tenant_id=?
                    AND ur.role_code IN ('DATA_REVIEWER', 'BU_ADMIN', 'SUPER_ADMIN')
              )
            ORDER BY om.user_id
            """, String.class, task.tenantId(), now(), task.tenantId());
        List<String> sameTenantActiveUsers = jdbc.queryForList("""
            SELECT DISTINCT u.id
            FROM platform_user u
            WHERE u.tenant_id=?
              AND u.status='ACTIVE'
              AND u.id IN (
                  SELECT ur.user_id
                  FROM platform_user_role ur
                  WHERE ur.active=TRUE
                    AND (ur.expires_at IS NULL OR ur.expires_at > ?)
                    AND ur.tenant_id=?
                    AND ur.role_code IN ('DATA_REVIEWER', 'BU_ADMIN', 'SUPER_ADMIN')
              )
            ORDER BY u.id
            """, String.class, task.tenantId(), now(), task.tenantId());
        LinkedHashSet<String> merged = new LinkedHashSet<>();
        merged.addAll(organizationMembers);
        merged.addAll(sameTenantActiveUsers);
        return List.copyOf(merged);
    }

    private String reviewTenant(String taskId) {
        return taskRecord(taskId).tenantId();
    }

    private AnnotationTaskRecord taskRecord(String id) {
        List<AnnotationTaskRecord> rows = jdbc.query("SELECT * FROM annotation_task WHERE task_id=?", (rs, n) -> new AnnotationTaskRecord(rs.getString("task_id"), rs.getString("tenant_id"), rs.getString("project_id"), rs.getString("source_dataset_id"), rs.getString("source_version_id"), rs.getString("template_id"), rs.getString("name"), rs.getString("scene"), rs.getString("status"), rs.getBoolean("review_enabled"), rs.getBoolean("prelabel_enabled"), rs.getBoolean("label_studio_enabled"), rs.getString("prelabel_model_source"), nullableDouble(rs, "prelabel_confidence"), rs.getLong("total_count"), rs.getLong("annotated_count"), rs.getLong("reviewed_count"), nullableInt(rs, "quality_score"), rs.getObject("deadline", OffsetDateTime.class), rs.getString("note"), rs.getString("created_by"), rs.getObject("updated_at", OffsetDateTime.class)), id);
        if (rows.isEmpty()) throw new PlatformException(PlatformError.NOT_FOUND, "标注任务不存在");
        return rows.getFirst();
    }

    private AnnotationLabelTemplateRecord templateRecord(String id) {
        List<AnnotationLabelTemplateRecord> rows = jdbc.query("SELECT * FROM annotation_label_template WHERE template_id=?", (rs, n) -> new AnnotationLabelTemplateRecord(rs.getString("template_id"), rs.getString("tenant_id"), rs.getString("name"), rs.getString("scene"), rs.getString("label_type"), rs.getString("label_schema_json"), rs.getString("label_studio_config_xml"), rs.getString("status"), rs.getString("created_by"), rs.getObject("updated_at", OffsetDateTime.class)), id);
        if (rows.isEmpty()) throw new PlatformException(PlatformError.NOT_FOUND, "标签模板不存在");
        return rows.getFirst();
    }

    private AnnotationWorkItemRecord workItemRecord(String id) {
        List<AnnotationWorkItemRecord> rows = jdbc.query("SELECT * FROM annotation_work_item WHERE work_item_id=?", (rs, n) -> new AnnotationWorkItemRecord(rs.getString("work_item_id"), rs.getString("task_id"), rs.getString("sample_file_id"), rs.getString("sample_key"), rs.getString("annotator_id"), rs.getString("status"), rs.getString("prediction_json"), rs.getString("annotation_json")), id);
        if (rows.isEmpty()) throw new PlatformException(PlatformError.NOT_FOUND, "标注工作项不存在");
        return rows.getFirst();
    }

    private ReviewRecord reviewRecord(String id) {
        List<ReviewRecord> rows = jdbc.query("SELECT * FROM annotation_review_item WHERE review_item_id=?", (rs, n) -> new ReviewRecord(rs.getString("review_item_id"), rs.getString("work_item_id"), rs.getString("task_id"), rs.getString("annotator_id"), rs.getString("reviewer_id"), rs.getString("status")), id);
        if (rows.isEmpty()) throw new PlatformException(PlatformError.NOT_FOUND, "审核项不存在");
        return rows.getFirst();
    }

    private DatasetInfo datasetInfo(String id) {
        List<DatasetInfo> rows = jdbc.query("SELECT * FROM dataset WHERE dataset_id=?", (rs, n) -> new DatasetInfo(rs.getString("dataset_id"), rs.getString("name"), rs.getString("dataset_type"), rs.getString("data_type"), rs.getString("tenant_id"), rs.getString("project_id"), rs.getString("current_version_id"), rs.getString("status"), rs.getLong("record_count"), rs.getLong("size_bytes"), rs.getString("owner_id")), id);
        if (rows.isEmpty()) throw new PlatformException(PlatformError.NOT_FOUND, "数据集不存在");
        return rows.getFirst();
    }

    private List<String> sampleFiles(String versionId) {
        List<String> imageFiles = jdbc.queryForList("""
            SELECT df.file_id
            FROM dataset_file df
            JOIN platform_file_object pfo ON pfo.file_id = df.file_id
            WHERE df.version_id=?
              AND df.status='BOUND'
              AND pfo.status='AVAILABLE'
              AND pfo.content_type LIKE 'image/%'
            ORDER BY df.created_at, df.file_id
            """, String.class, versionId);
        if (!imageFiles.isEmpty()) {
            return imageFiles;
        }
        return jdbc.queryForList("SELECT file_id FROM dataset_file WHERE version_id=? ORDER BY created_at, file_id", String.class, versionId);
    }

    private long countDatasetFiles(String versionId) {
        Long count = jdbc.queryForObject("SELECT COUNT(1) FROM dataset_file WHERE version_id=?", Long.class, versionId);
        return count == null ? 0L : count;
    }

    private AnnotationWorkItemResponse workItem(String id) {
        return workItemResponses(workItemRecord(id).taskId()).stream().filter(item -> item.workItemId().equals(id)).findFirst().orElseThrow();
    }

    private AnnotationReviewItemResponse reviewItem(String id) {
        ReviewRecord review = reviewRecord(id);
        return reviewItemResponses(review.taskId()).stream().filter(item -> item.reviewItemId().equals(id)).findFirst().orElseThrow();
    }

    private AnnotationLabelTemplateResponse template(String id) {
        AnnotationLabelTemplateRecord template = templateRecord(id);
        return new AnnotationLabelTemplateResponse(template.templateId(), template.name(), template.scene(), template.labelType(), template.labelSchemaJson(), template.labelStudioConfigXml(), template.status(), template.tenantId(), template.createdBy(), template.updatedAt());
    }

    private AnnotationLabelTemplateResponse templateResponse(ResultSet rs) throws SQLException {
        return new AnnotationLabelTemplateResponse(rs.getString("template_id"), rs.getString("name"), rs.getString("scene"), rs.getString("label_type"), rs.getString("label_schema_json"), rs.getString("label_studio_config_xml"), rs.getString("status"), rs.getString("tenant_id"), rs.getString("created_by"), rs.getObject("updated_at", OffsetDateTime.class));
    }

    private void ensureBinding(String taskId) {
        if (exists("SELECT COUNT(*) FROM annotation_external_binding WHERE task_id=? AND provider='LABEL_STUDIO'", taskId)) return;
        jdbc.update("INSERT INTO annotation_external_binding (binding_id,task_id,provider,external_project_id,external_url,config_status,last_sync_status,last_sync_at,diagnostic_code,diagnostic_message,launch_url) VALUES (?,?, 'LABEL_STUDIO', NULL, 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL', 'UNCONFIGURED', 'UNCONFIGURED', NULL, 'LABEL_STUDIO_UNCONFIGURED', 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL;TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET;TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY;TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY', NULL)", "ANN-EXT-" + randomHex(10).toUpperCase(Locale.ROOT), taskId);
    }

    private AnnotationExternalBindingRecord binding(String taskId) {
        ensureBinding(taskId);
        return jdbc.queryForObject("SELECT * FROM annotation_external_binding WHERE task_id=? AND provider='LABEL_STUDIO'", (rs, n) -> new AnnotationExternalBindingRecord(rs.getString("binding_id"), rs.getString("task_id"), rs.getString("provider"), rs.getString("external_project_id"), rs.getString("external_url"), rs.getString("config_status"), rs.getString("last_sync_status"), rs.getString("diagnostic_code"), rs.getString("diagnostic_message"), rs.getString("launch_url"), rs.getObject("last_sync_at", OffsetDateTime.class)), taskId);
    }

    private AnnotationExternalBindingResponse bindingResponse(AnnotationExternalBindingRecord binding) {
        AnnotationExternalTaskBindingRecord taskBinding = latestTaskBinding(binding.taskId());
        String externalTaskId = taskBinding == null ? null : taskBinding.externalTaskId();
        String externalTaskUrl = taskBinding == null ? null : taskBinding.externalTaskUrl();
        return new AnnotationExternalBindingResponse(binding.bindingId(), binding.taskId(), binding.provider(), binding.externalProjectId(), binding.externalUrl(), externalTaskId, externalTaskUrl, binding.configStatus(), binding.lastSyncStatus(), binding.diagnosticCode(), binding.diagnosticMessage(), blank(binding.launchUrl(), externalTaskUrl), isRetryable(binding.diagnosticCode()), binding.lastSyncAt());
    }

    private void persistBinding(AnnotationExternalBindingResponse response) {
        jdbc.update("UPDATE annotation_external_binding SET external_project_id=?, external_url=?, config_status=?, last_sync_status=?, diagnostic_code=?, diagnostic_message=?, launch_url=?, last_sync_at=?, last_error_at=CASE WHEN ? THEN ? ELSE last_error_at END, retry_count=CASE WHEN ? THEN retry_count + 1 ELSE retry_count END WHERE binding_id=?", response.externalProjectId(), response.externalUrl(), response.configStatus(), response.lastSyncStatus(), response.diagnosticCode(), response.diagnosticMessage(), response.launchUrl(), response.lastSyncAt(), !"SUCCESS".equals(response.lastSyncStatus()) && !"PROJECT_SYNCED".equals(response.lastSyncStatus()) && !"TASK_SYNCED".equals(response.lastSyncStatus()) && !"RESULT_IMPORTED".equals(response.lastSyncStatus()), response.lastSyncAt(), Boolean.TRUE.equals(response.retryable()), response.bindingId());
    }

    private AnnotationExternalTaskBindingRecord latestTaskBinding(String taskId) {
        List<AnnotationExternalTaskBindingRecord> rows = jdbc.query("SELECT * FROM annotation_external_task_binding WHERE task_id=? AND provider='LABEL_STUDIO' ORDER BY COALESCE(last_sync_at, CURRENT_TIMESTAMP) DESC", (rs, n) -> taskBinding(rs), taskId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private AnnotationExternalTaskBindingRecord taskBinding(ResultSet rs) throws SQLException {
        return new AnnotationExternalTaskBindingRecord(rs.getString("binding_id"), rs.getString("task_id"), rs.getString("work_item_id"), rs.getString("provider"), rs.getString("external_project_id"), rs.getString("external_task_id"), rs.getString("external_task_url"), rs.getString("sync_status"), rs.getString("import_status"), rs.getString("diagnostic_code"), rs.getString("diagnostic_message"), rs.getObject("last_sync_at", OffsetDateTime.class), rs.getObject("last_import_at", OffsetDateTime.class));
    }

    private boolean isRetryable(String code) {
        return "LABEL_STUDIO_UNREACHABLE".equals(code) || "LABEL_STUDIO_RESULT_NOT_READY".equals(code);
    }

    private boolean canSeeTenant(PlatformPrincipal principal, String tenantId) {
        return principal.isSuperAdmin() || canSeeTenantById(principal.user().tenantId(), tenantId);
    }

    private boolean canSeeTenantById(String ownId, String targetId) {
        String own = orgPath(ownId);
        String target = orgPath(targetId);
        return !own.isBlank() && !target.isBlank() && target.startsWith(own);
    }

    private void ensureCanSeeTenant(PlatformPrincipal principal, String tenantId, boolean write) {
        if (canSeeTenant(principal, tenantId)) return;
        throw new PlatformException(write ? PlatformError.FORBIDDEN : PlatformError.NOT_FOUND, write ? "您无权操作其他 BU 的标注资源" : "标注资源不存在");
    }

    private String orgPath(String tenantId) {
        List<String> rows = jdbc.queryForList("SELECT path FROM platform_tenant WHERE id=?", String.class, tenantId);
        return rows.isEmpty() || rows.getFirst() == null ? "" : rows.getFirst();
    }

    private void requireAnyPermission(PlatformPrincipal principal, String... permissions) {
        for (String permission : permissions) if (principal.hasPermission(permission)) return;
        identityService.requirePermission(principal, permissions[0]);
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

    private String defaultConfigXml(String scene, String labelSchemaJson) {
        List<String> labels = labelsFromSchema(labelSchemaJson);
        String labelNodes = labels.stream().map(label -> "<Label value=\"" + xmlEscape(label) + "\"/>").reduce("", String::concat);
        if ("IMAGE_SEGMENTATION".equals(normalizeScene(scene, "IMAGE_TAGGING"))) {
            return "<View><Image name=\"image\" value=\"$image\"/><PolygonLabels name=\"label\" toName=\"image\">" + labelNodes + "</PolygonLabels></View>";
        }
        return "<View><Image name=\"image\" value=\"$image\"/><RectangleLabels name=\"label\" toName=\"image\">" + labelNodes + "</RectangleLabels></View>";
    }

    private String labelSchemaJson(List<String> labels, String scene) {
        String labelItems = normalizeInlineLabels(labels).stream()
            .map(label -> "\"" + jsonEscape(label) + "\"")
            .reduce((left, right) -> left + "," + right)
            .orElse("");
        String dataType = "TEXT_LABELING".equals(normalizeScene(scene, "")) ? ",\"dataType\":\"TEXT\"" : "";
        return "{\"labels\":[" + labelItems + "]" + dataType + "}";
    }

    private String defaultLabelType(String scene) {
        return "IMAGE_SEGMENTATION".equals(normalizeScene(scene, "IMAGE_TAGGING")) ? "POLYGON" : "BOUNDING_BOX";
    }

    private List<String> labelsFromSchema(String labelSchemaJson) {
        if (blank(labelSchemaJson)) return List.of("待确认标签");
        Matcher matcher = Pattern.compile("\"labels\"\\s*:\\s*\\[(.*?)]").matcher(labelSchemaJson);
        if (!matcher.find()) return List.of("待确认标签");
        List<String> labels = Pattern.compile("\"([^\"]+)\"").matcher(matcher.group(1)).results().map(match -> match.group(1)).toList();
        return labels.isEmpty() ? List.of("待确认标签") : labels;
    }

    private String xmlEscape(String value) {
        return value.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String sceneLabel(String scene) {
        return switch (normalizeScene(scene, "")) {
            case "IMAGE_TAGGING" -> "图片打标";
            case "IMAGE_SEGMENTATION" -> "图片分割";
            default -> blank(scene, "未分类");
        };
    }

    private List<String> normalizeInlineLabels(List<String> labels) {
        if (labels == null || labels.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String label : labels) {
            if (label == null) continue;
            String[] parts = label.split("[,，、\\n\\r]+");
            for (String part : parts) {
                String item = part == null ? "" : part.trim();
                if (!item.isEmpty()) {
                    normalized.add(item);
                }
            }
        }
        return new ArrayList<>(normalized);
    }

    private String normalizeScene(String value, String fallback) {
        String scene = upper(value, fallback);
        return switch (scene) {
            case "OBJECT_DETECTION", "IMAGE_CLASSIFICATION", "OBJECT_CLASSIFICATION" -> "IMAGE_TAGGING";
            case "SEGMENTATION", "SEMANTIC_SEGMENTATION" -> "IMAGE_SEGMENTATION";
            default -> scene;
        };
    }

    private void ensureImageScene(String scene, String message) {
        String normalized = normalizeScene(scene, "");
        if (!List.of("IMAGE_TAGGING", "IMAGE_SEGMENTATION").contains(normalized)) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, message);
        }
    }

    private String nullableColumn(ResultSet rs, String column) throws SQLException {
        try {
            return rs.getString(column);
        } catch (SQLException ignored) {
            return null;
        }
    }

    private double round(double value) { return Math.round(value * 1000.0d) / 1000.0d; }
    private boolean exists(String sql, Object... args) { return count(sql, args) > 0; }
    private long count(String sql, Object... args) { Long count = jdbc.queryForObject(sql, Long.class, args); return count == null ? 0L : count; }
    private String sha256(String value) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); } catch (NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); } }
    private boolean contains(String value, String keyword) { return !blank(value) && value.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT)); }
    private List<String> safe(List<String> value) { return value == null ? List.of() : value.stream().filter(item -> !blank(item)).distinct().toList(); }
    private boolean bool(Boolean value, boolean fallback) { return value == null ? fallback : value; }
    private String require(String value, String message) { if (blank(value)) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, message); return value.trim(); }
    private String upper(String value, String fallback) { return blank(value, fallback).toUpperCase(Locale.ROOT); }
    private String blank(String value, String fallback) { return blank(value) ? fallback : value.trim(); }
    private boolean blank(String value) { return value == null || value.isBlank(); }
    private String nullIfBlank(String value) { return blank(value) ? null : value.trim(); }
    private String nullToEmpty(String value) { return value == null ? "" : value; }
    private Integer nullableInt(ResultSet rs, String column) throws SQLException { int value = rs.getInt(column); return rs.wasNull() ? null : value; }
    private Long nullableLong(ResultSet rs, String column) throws SQLException { long value = rs.getLong(column); return rs.wasNull() ? null : value; }
    private Double nullableDouble(ResultSet rs, String column) throws SQLException { double value = rs.getDouble(column); return rs.wasNull() ? null : value; }
    private OffsetDateTime now() { return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS); }
    private String randomHex(int len) { return UUID.randomUUID().toString().replace("-", "").substring(0, len); }
}

record AnnotationTaskRecord(String taskId, String tenantId, String projectId, String sourceDatasetId, String sourceVersionId, String templateId, String name, String scene, String status, boolean reviewEnabled, boolean prelabelEnabled, boolean labelStudioEnabled, String prelabelModelSource, Double prelabelConfidence, long totalCount, long annotatedCount, long reviewedCount, Integer qualityScore, OffsetDateTime deadline, String note, String createdBy, OffsetDateTime updatedAt) {}
record AnnotationLabelTemplateRecord(String templateId, String tenantId, String name, String scene, String labelType, String labelSchemaJson, String labelStudioConfigXml, String status, String createdBy, OffsetDateTime updatedAt) {}
record AnnotationWorkItemRecord(String workItemId, String taskId, String sampleFileId, String sampleKey, String annotatorId, String status, String predictionJson, String annotationJson) {}
record ReviewRecord(String reviewItemId, String workItemId, String taskId, String annotatorId, String reviewerId, String status) {}
record AnnotationExternalBindingRecord(String bindingId, String taskId, String provider, String externalProjectId, String externalUrl, String configStatus, String lastSyncStatus, String diagnosticCode, String diagnosticMessage, String launchUrl, OffsetDateTime lastSyncAt) {}
record AnnotationExternalTaskBindingRecord(String bindingId, String taskId, String workItemId, String provider, String externalProjectId, String externalTaskId, String externalTaskUrl, String syncStatus, String importStatus, String diagnosticCode, String diagnosticMessage, OffsetDateTime lastSyncAt, OffsetDateTime lastImportAt) {}
record DatasetInfo(String datasetId, String name, String datasetType, String dataType, String tenantId, String projectId, String currentVersionId, String status, long recordCount, long sizeBytes, String ownerId) {}
