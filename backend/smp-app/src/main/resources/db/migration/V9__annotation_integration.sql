CREATE TABLE annotation_label_template (
    template_id VARCHAR(96) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    name VARCHAR(160) NOT NULL,
    scene VARCHAR(64) NOT NULL,
    label_type VARCHAR(64) NOT NULL,
    label_schema_json VARCHAR(4000) NOT NULL,
    label_studio_config_xml VARCHAR(4000) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_annotation_template_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_annotation_template_creator FOREIGN KEY (created_by) REFERENCES platform_user(id)
);
CREATE INDEX idx_annotation_template_scope_status ON annotation_label_template (tenant_id, scene, status);

CREATE TABLE annotation_task (
    task_id VARCHAR(96) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64),
    source_dataset_id VARCHAR(96) NOT NULL,
    source_version_id VARCHAR(96),
    template_id VARCHAR(96) NOT NULL,
    name VARCHAR(160) NOT NULL,
    scene VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    review_enabled BOOLEAN NOT NULL,
    prelabel_enabled BOOLEAN NOT NULL,
    label_studio_enabled BOOLEAN NOT NULL,
    prelabel_model_source VARCHAR(512),
    prelabel_confidence DOUBLE PRECISION,
    total_count BIGINT NOT NULL,
    annotated_count BIGINT NOT NULL DEFAULT 0,
    reviewed_count BIGINT NOT NULL DEFAULT 0,
    quality_score INTEGER,
    deadline TIMESTAMP WITH TIME ZONE,
    note VARCHAR(1000),
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_annotation_task_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_annotation_task_project FOREIGN KEY (project_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_annotation_task_dataset FOREIGN KEY (source_dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_annotation_task_version FOREIGN KEY (source_version_id) REFERENCES dataset_version(version_id),
    CONSTRAINT fk_annotation_task_template FOREIGN KEY (template_id) REFERENCES annotation_label_template(template_id),
    CONSTRAINT fk_annotation_task_creator FOREIGN KEY (created_by) REFERENCES platform_user(id)
);
CREATE INDEX idx_annotation_task_scope_status ON annotation_task (tenant_id, project_id, status);
CREATE INDEX idx_annotation_task_dataset ON annotation_task (source_dataset_id, status);

CREATE TABLE annotation_assignment (
    assignment_id VARCHAR(96) PRIMARY KEY,
    task_id VARCHAR(96) NOT NULL,
    assignee_id VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    assigned_by VARCHAR(64) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_annotation_assignment_task FOREIGN KEY (task_id) REFERENCES annotation_task(task_id),
    CONSTRAINT fk_annotation_assignment_user FOREIGN KEY (assignee_id) REFERENCES platform_user(id),
    CONSTRAINT fk_annotation_assignment_by FOREIGN KEY (assigned_by) REFERENCES platform_user(id)
);
CREATE INDEX idx_annotation_assignment_task_role ON annotation_assignment (task_id, role, status);
CREATE INDEX idx_annotation_assignment_user ON annotation_assignment (assignee_id, status);

CREATE TABLE annotation_work_item (
    work_item_id VARCHAR(96) PRIMARY KEY,
    task_id VARCHAR(96) NOT NULL,
    sample_file_id VARCHAR(96),
    sample_key VARCHAR(512) NOT NULL,
    annotator_id VARCHAR(64),
    status VARCHAR(32) NOT NULL,
    prediction_json VARCHAR(4000),
    annotation_json VARCHAR(4000),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_annotation_work_task FOREIGN KEY (task_id) REFERENCES annotation_task(task_id),
    CONSTRAINT fk_annotation_work_file FOREIGN KEY (sample_file_id) REFERENCES platform_file_object(file_id),
    CONSTRAINT fk_annotation_work_annotator FOREIGN KEY (annotator_id) REFERENCES platform_user(id)
);
CREATE INDEX idx_annotation_work_task_status ON annotation_work_item (task_id, status);
CREATE INDEX idx_annotation_work_annotator ON annotation_work_item (annotator_id, status);

CREATE TABLE annotation_review_item (
    review_item_id VARCHAR(96) PRIMARY KEY,
    work_item_id VARCHAR(96) NOT NULL,
    task_id VARCHAR(96) NOT NULL,
    annotator_id VARCHAR(64) NOT NULL,
    reviewer_id VARCHAR(64),
    status VARCHAR(32) NOT NULL,
    review_comment VARCHAR(1000),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_annotation_review_work FOREIGN KEY (work_item_id) REFERENCES annotation_work_item(work_item_id),
    CONSTRAINT fk_annotation_review_task FOREIGN KEY (task_id) REFERENCES annotation_task(task_id),
    CONSTRAINT fk_annotation_review_annotator FOREIGN KEY (annotator_id) REFERENCES platform_user(id),
    CONSTRAINT fk_annotation_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES platform_user(id)
);
CREATE INDEX idx_annotation_review_task_status ON annotation_review_item (task_id, status);
CREATE INDEX idx_annotation_review_reviewer ON annotation_review_item (reviewer_id, status);

CREATE TABLE annotation_dataset_publication (
    publication_id VARCHAR(96) PRIMARY KEY,
    task_id VARCHAR(96) NOT NULL,
    output_dataset_id VARCHAR(96),
    output_version_id VARCHAR(96),
    quality_status VARCHAR(32) NOT NULL,
    coverage_rate DOUBLE PRECISION NOT NULL,
    format_status VARCHAR(32) NOT NULL,
    diagnostic_code VARCHAR(128) NOT NULL,
    diagnostic_message VARCHAR(1000) NOT NULL,
    published_by VARCHAR(64),
    published_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_annotation_publication_task FOREIGN KEY (task_id) REFERENCES annotation_task(task_id),
    CONSTRAINT fk_annotation_publication_dataset FOREIGN KEY (output_dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_annotation_publication_version FOREIGN KEY (output_version_id) REFERENCES dataset_version(version_id),
    CONSTRAINT fk_annotation_publication_user FOREIGN KEY (published_by) REFERENCES platform_user(id)
);
CREATE INDEX idx_annotation_publication_task ON annotation_dataset_publication (task_id, published_at DESC);

CREATE TABLE annotation_external_binding (
    binding_id VARCHAR(96) PRIMARY KEY,
    task_id VARCHAR(96) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    external_project_id VARCHAR(128),
    external_url VARCHAR(512),
    config_status VARCHAR(32) NOT NULL,
    last_sync_status VARCHAR(32) NOT NULL,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    diagnostic_code VARCHAR(128) NOT NULL,
    diagnostic_message VARCHAR(1000) NOT NULL,
    launch_url VARCHAR(512),
    CONSTRAINT fk_annotation_external_task FOREIGN KEY (task_id) REFERENCES annotation_task(task_id)
);
CREATE INDEX idx_annotation_external_task ON annotation_external_binding (task_id, provider);

INSERT INTO platform_permission (code, module, resource, action, level, description) VALUES
    ('menu:ann', '数据管理', 'AnnotationMenu', 'ACCESS', 1, '访问标注任务菜单'),
    ('menu:annreview', '数据管理', 'AnnotationReviewMenu', 'ACCESS', 1, '访问标注审核菜单'),
    ('menu:annwork', '数据管理', 'AnnotationWorkbenchMenu', 'ACCESS', 1, '访问标注工作台菜单'),
    ('data:annotation:read', '数据管理', 'AnnotationTask', 'READ', 2, '查询标注任务'),
    ('data:annotation:write', '数据管理', 'AnnotationTask', 'WRITE', 3, '维护标注任务'),
    ('data:annotation:assign', '数据管理', 'AnnotationAssignment', 'ASSIGN', 3, '分配标注任务'),
    ('data:annotation:submit', '数据管理', 'AnnotationWorkItem', 'SUBMIT', 2, '提交标注结果'),
    ('data:annotation:publish', '数据管理', 'AnnotatedDataset', 'PUBLISH', 3, '发布标注数据集'),
    ('data:annotation:admin', '数据管理', 'AnnotationTask', 'ADMIN', 4, '管理标注任务高危操作'),
    ('data:label-template:read', '数据管理', 'LabelTemplate', 'READ', 2, '查询标签模板'),
    ('data:label-template:write', '数据管理', 'LabelTemplate', 'WRITE', 3, '维护标签模板'),
    ('data:label-template:publish', '数据管理', 'LabelTemplate', 'PUBLISH', 3, '发布标签模板');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code FROM platform_permission
WHERE code IN ('menu:ann','menu:annreview','menu:annwork','data:annotation:read','data:annotation:write','data:annotation:assign','data:annotation:submit','data:annotation:review','data:annotation:publish','data:annotation:admin','data:label-template:read','data:label-template:write','data:label-template:publish')
AND NOT EXISTS (SELECT 1 FROM platform_role_permission rp WHERE rp.id = CONCAT('SUPER_ADMIN::', platform_permission.code));

INSERT INTO platform_role_permission (id, role_code, permission_code) VALUES
    ('BU_ADMIN::menu:ann', 'BU_ADMIN', 'menu:ann'),
    ('BU_ADMIN::menu:annreview', 'BU_ADMIN', 'menu:annreview'),
    ('BU_ADMIN::menu:annwork', 'BU_ADMIN', 'menu:annwork'),
    ('BU_ADMIN::data:annotation:read', 'BU_ADMIN', 'data:annotation:read'),
    ('BU_ADMIN::data:annotation:write', 'BU_ADMIN', 'data:annotation:write'),
    ('BU_ADMIN::data:annotation:assign', 'BU_ADMIN', 'data:annotation:assign'),
    ('BU_ADMIN::data:annotation:submit', 'BU_ADMIN', 'data:annotation:submit'),
    ('BU_ADMIN::data:annotation:review', 'BU_ADMIN', 'data:annotation:review'),
    ('BU_ADMIN::data:annotation:publish', 'BU_ADMIN', 'data:annotation:publish'),
    ('BU_ADMIN::data:label-template:read', 'BU_ADMIN', 'data:label-template:read'),
    ('BU_ADMIN::data:label-template:write', 'BU_ADMIN', 'data:label-template:write'),
    ('BU_ADMIN::data:label-template:publish', 'BU_ADMIN', 'data:label-template:publish'),
    ('DATA_ANNOTATOR::menu:ann', 'DATA_ANNOTATOR', 'menu:ann'),
    ('DATA_ANNOTATOR::menu:annwork', 'DATA_ANNOTATOR', 'menu:annwork'),
    ('DATA_ANNOTATOR::data:annotation:read', 'DATA_ANNOTATOR', 'data:annotation:read'),
    ('DATA_ANNOTATOR::data:annotation:submit', 'DATA_ANNOTATOR', 'data:annotation:submit'),
    ('DATA_ANNOTATOR::data:label-template:read', 'DATA_ANNOTATOR', 'data:label-template:read'),
    ('DATA_REVIEWER::menu:ann', 'DATA_REVIEWER', 'menu:ann'),
    ('DATA_REVIEWER::menu:annreview', 'DATA_REVIEWER', 'menu:annreview'),
    ('DATA_REVIEWER::data:annotation:read', 'DATA_REVIEWER', 'data:annotation:read'),
    ('DATA_REVIEWER::data:label-template:read', 'DATA_REVIEWER', 'data:label-template:read'),
    ('MODEL_TRAINER::data:annotation:read', 'MODEL_TRAINER', 'data:annotation:read');

INSERT INTO annotation_label_template (template_id, tenant_id, name, scene, label_type, label_schema_json, label_studio_config_xml, status, created_by, created_at, updated_at) VALUES
    ('LT-WELD-BBOX', 'TENANT-CABIN', '焊缝缺陷 BBox 模板', 'OBJECT_DETECTION', 'BOUNDING_BOX', '{"labels":[{"name":"裂纹","color":"#E02020"},{"name":"气孔","color":"#F59E0B"},{"name":"夹渣","color":"#2563EB"}]}', '<View><Image name="image" value="$image"/><RectangleLabels name="label" toName="image"><Label value="裂纹"/><Label value="气孔"/><Label value="夹渣"/></RectangleLabels></View>', 'PUBLISHED', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('LT-TEXT-INTENT-DRAFT', 'TENANT-YF', '工单意图分类模板草稿', 'TEXT_LABELING', 'CATEGORY', '{"labels":[{"name":"报修"},{"name":"保养"},{"name":"咨询"}]}', '<View><Text name="text" value="$text"/><Choices name="intent" toName="text"><Choice value="报修"/><Choice value="保养"/><Choice value="咨询"/></Choices></View>', 'DRAFT', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO annotation_task (task_id, tenant_id, project_id, source_dataset_id, source_version_id, template_id, name, scene, status, review_enabled, prelabel_enabled, label_studio_enabled, prelabel_model_source, prelabel_confidence, total_count, annotated_count, reviewed_count, quality_score, deadline, note, created_by, created_at, updated_at) VALUES
    ('ANN-WELD-Q2', 'TENANT-CABIN', NULL, 'DATASET-WELD-DEFECT', 'DVER-WELD-001', 'LT-WELD-BBOX', 'Q2焊缝检测图像标注', 'OBJECT_DETECTION', 'IN_PROGRESS', TRUE, TRUE, TRUE, 'TODO_CONFIRM_PRELABEL_MODEL_SOURCE', 0.70, 8000, 6240, 5800, 92, DATEADD('DAY', 14, CURRENT_TIMESTAMP), '原型任务：目标检测、AI 预标注、Label Studio seam', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO annotation_assignment (assignment_id, task_id, assignee_id, role, status, assigned_by, assigned_at) VALUES
    ('ANN-ASG-001', 'ANN-WELD-Q2', 'USR-ANNOTATOR', 'ANNOTATOR', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP),
    ('ANN-ASG-002', 'ANN-WELD-Q2', 'USR-BU-CABIN', 'REVIEWER', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP);

INSERT INTO annotation_work_item (work_item_id, task_id, sample_file_id, sample_key, annotator_id, status, prediction_json, annotation_json, submitted_at, created_at, updated_at) VALUES
    ('ANN-WI-001', 'ANN-WELD-Q2', 'FILE-DATASET-WELD-001', 'TENANT-CABIN/weld/batch3/0001.jpg', 'USR-ANNOTATOR', 'REVIEW_PENDING', '{"model":"TODO_CONFIRM_PRELABEL_MODEL_SOURCE","boxes":2,"confidence":0.72}', '{"boxes":[{"label":"裂纹","x":12,"y":20,"w":80,"h":32}]}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ANN-WI-002', 'ANN-WELD-Q2', 'FILE-DATASET-WELD-001', 'TENANT-CABIN/weld/batch3/0002.jpg', 'USR-ANNOTATOR', 'DRAFT', '{"model":"TODO_CONFIRM_PRELABEL_MODEL_SOURCE","boxes":1,"confidence":0.68}', '{"boxes":[]}', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ANN-WI-003', 'ANN-WELD-Q2', 'FILE-DATASET-WELD-001', 'TENANT-CABIN/weld/batch3/0003.jpg', 'USR-ANNOTATOR', 'APPROVED', '{"model":"TODO_CONFIRM_PRELABEL_MODEL_SOURCE","boxes":3,"confidence":0.81}', '{"boxes":[{"label":"气孔"}]}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO annotation_review_item (review_item_id, work_item_id, task_id, annotator_id, reviewer_id, status, review_comment, reviewed_at, created_at) VALUES
    ('ANN-RV-001', 'ANN-WI-001', 'ANN-WELD-Q2', 'USR-ANNOTATOR', 'USR-BU-CABIN', 'PENDING', NULL, NULL, CURRENT_TIMESTAMP),
    ('ANN-RV-002', 'ANN-WI-003', 'ANN-WELD-Q2', 'USR-ANNOTATOR', 'USR-BU-CABIN', 'APPROVED', '样例审核通过', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO annotation_dataset_publication (publication_id, task_id, output_dataset_id, output_version_id, quality_status, coverage_rate, format_status, diagnostic_code, diagnostic_message, published_by, published_at) VALUES
    ('ANN-PUB-001', 'ANN-WELD-Q2', NULL, NULL, 'PENDING', 0.78, 'PASSED', 'ANNOTATION_COVERAGE_PENDING', '覆盖率 78% 未达到默认 90%，待补充标注后发布', NULL, NULL);

INSERT INTO annotation_external_binding (binding_id, task_id, provider, external_project_id, external_url, config_status, last_sync_status, last_sync_at, diagnostic_code, diagnostic_message, launch_url) VALUES
    ('ANN-EXT-001', 'ANN-WELD-Q2', 'LABEL_STUDIO', NULL, 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL', 'UNCONFIGURED', 'UNCONFIGURED', NULL, 'LABEL_STUDIO_UNCONFIGURED', 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL;TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET;TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY;TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY', NULL);


