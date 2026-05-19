CREATE TABLE operator_catalog (
    operator_id VARCHAR(96) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(96) NOT NULL,
    stage VARCHAR(96) NOT NULL,
    kind VARCHAR(32) NOT NULL,
    tenant_id VARCHAR(64),
    description VARCHAR(1000),
    parameter_schema_json VARCHAR(4000) NOT NULL,
    input_schema_json VARCHAR(2000) NOT NULL,
    output_schema_json VARCHAR(2000) NOT NULL,
    endpoint VARCHAR(512),
    credential_ref VARCHAR(255),
    timeout_seconds INTEGER,
    concurrency_limit INTEGER,
    status VARCHAR(32) NOT NULL,
    version VARCHAR(64) NOT NULL,
    before_example VARCHAR(1000),
    after_example VARCHAR(1000),
    usage_count BIGINT NOT NULL DEFAULT 0,
    pipeline_count BIGINT NOT NULL DEFAULT 0,
    error_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_operator_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_operator_creator FOREIGN KEY (created_by) REFERENCES platform_user(id)
);
CREATE INDEX idx_operator_category_status ON operator_catalog (category, stage, status);
CREATE INDEX idx_operator_tenant_status ON operator_catalog (tenant_id, status);

CREATE TABLE operator_review (
    review_id VARCHAR(96) PRIMARY KEY,
    operator_id VARCHAR(96) NOT NULL,
    submitter_id VARCHAR(64) NOT NULL,
    reviewer_id VARCHAR(64),
    status VARCHAR(32) NOT NULL,
    reason VARCHAR(1000),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_operator_review_operator FOREIGN KEY (operator_id) REFERENCES operator_catalog(operator_id),
    CONSTRAINT fk_operator_review_submitter FOREIGN KEY (submitter_id) REFERENCES platform_user(id),
    CONSTRAINT fk_operator_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES platform_user(id)
);
CREATE INDEX idx_operator_review_operator ON operator_review (operator_id, submitted_at DESC);

CREATE TABLE pipeline_definition (
    pipeline_id VARCHAR(96) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64),
    status VARCHAR(32) NOT NULL,
    current_version_id VARCHAR(96),
    owner_id VARCHAR(64) NOT NULL,
    description VARCHAR(1000),
    diagnostic_code VARCHAR(128),
    diagnostic_message VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_pipeline_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_pipeline_project FOREIGN KEY (project_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_pipeline_owner FOREIGN KEY (owner_id) REFERENCES platform_user(id)
);
CREATE INDEX idx_pipeline_scope_status ON pipeline_definition (tenant_id, project_id, status);

CREATE TABLE pipeline_version (
    version_id VARCHAR(96) PRIMARY KEY,
    pipeline_id VARCHAR(96) NOT NULL,
    version_name VARCHAR(64) NOT NULL,
    note VARCHAR(1000),
    dag_json VARCHAR(4000) NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_pipeline_version_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipeline_definition(pipeline_id),
    CONSTRAINT fk_pipeline_version_creator FOREIGN KEY (created_by) REFERENCES platform_user(id),
    CONSTRAINT uk_pipeline_version UNIQUE (pipeline_id, version_name)
);
CREATE INDEX idx_pipeline_version_pipeline ON pipeline_version (pipeline_id, created_at DESC);

CREATE TABLE pipeline_node (
    node_id VARCHAR(96) NOT NULL,
    pipeline_id VARCHAR(96) NOT NULL,
    operator_id VARCHAR(96) NOT NULL,
    label VARCHAR(160) NOT NULL,
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    config_json VARCHAR(4000) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (pipeline_id, node_id),
    CONSTRAINT fk_pipeline_node_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipeline_definition(pipeline_id),
    CONSTRAINT fk_pipeline_node_operator FOREIGN KEY (operator_id) REFERENCES operator_catalog(operator_id)
);
CREATE INDEX idx_pipeline_node_operator ON pipeline_node (operator_id, status);

CREATE TABLE pipeline_edge (
    edge_id VARCHAR(96) PRIMARY KEY,
    pipeline_id VARCHAR(96) NOT NULL,
    source_node_id VARCHAR(96) NOT NULL,
    target_node_id VARCHAR(96) NOT NULL,
    edge_type VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_pipeline_edge_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipeline_definition(pipeline_id)
);
CREATE INDEX idx_pipeline_edge_pipeline ON pipeline_edge (pipeline_id);

CREATE TABLE pipeline_variable (
    pipeline_id VARCHAR(96) NOT NULL,
    name VARCHAR(96) NOT NULL,
    value_type VARCHAR(32) NOT NULL,
    value_kind VARCHAR(32) NOT NULL,
    value_json VARCHAR(2000),
    value_masked VARCHAR(512),
    required BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (pipeline_id, name),
    CONSTRAINT fk_pipeline_variable_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipeline_definition(pipeline_id)
);

CREATE TABLE pipeline_run (
    run_id VARCHAR(96) PRIMARY KEY,
    pipeline_id VARCHAR(96) NOT NULL,
    version_id VARCHAR(96),
    status VARCHAR(32) NOT NULL,
    trigger_mode VARCHAR(32) NOT NULL,
    sample_dataset_id VARCHAR(96),
    output_dataset_id VARCHAR(96),
    diagnostic_code VARCHAR(128),
    diagnostic_message VARCHAR(1000),
    duration_ms BIGINT,
    triggered_by VARCHAR(64) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_pipeline_run_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipeline_definition(pipeline_id),
    CONSTRAINT fk_pipeline_run_version FOREIGN KEY (version_id) REFERENCES pipeline_version(version_id),
    CONSTRAINT fk_pipeline_run_sample_dataset FOREIGN KEY (sample_dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_pipeline_run_output_dataset FOREIGN KEY (output_dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_pipeline_run_triggered_by FOREIGN KEY (triggered_by) REFERENCES platform_user(id)
);
CREATE INDEX idx_pipeline_run_pipeline ON pipeline_run (pipeline_id, started_at DESC);

CREATE TABLE pipeline_run_node (
    node_run_id VARCHAR(96) PRIMARY KEY,
    run_id VARCHAR(96) NOT NULL,
    node_id VARCHAR(96) NOT NULL,
    operator_name VARCHAR(160) NOT NULL,
    status VARCHAR(32) NOT NULL,
    duration_ms BIGINT,
    log_summary VARCHAR(1000),
    error_code VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_pipeline_run_node_run FOREIGN KEY (run_id) REFERENCES pipeline_run(run_id)
);
CREATE INDEX idx_pipeline_run_node_run ON pipeline_run_node (run_id);

ALTER TABLE pipeline_definition ADD CONSTRAINT fk_pipeline_current_version FOREIGN KEY (current_version_id) REFERENCES pipeline_version(version_id);

INSERT INTO platform_permission (code, module, resource, action, level, description) VALUES
    ('data:pipeline:read', '数据管理', 'Pipeline', 'READ', 2, '查询 Pipeline 定义与运行历史'),
    ('data:pipeline:write', '数据管理', 'Pipeline', 'WRITE', 3, '维护 Pipeline DAG 与变量'),
    ('data:pipeline:run', '数据管理', 'PipelineRun', 'RUN', 3, '发起 Pipeline 沙箱运行'),
    ('data:pipeline:admin', '数据管理', 'Pipeline', 'ADMIN', 4, '管理 Pipeline 高危操作'),
    ('data:operator:read', '数据管理', 'Operator', 'READ', 2, '查询算子广场'),
    ('data:operator:write', '数据管理', 'Operator', 'WRITE', 3, '维护自定义算子'),
    ('data:operator:review', '数据管理', 'OperatorReview', 'REVIEW', 4, '审核自定义算子'),
    ('data:operator:admin', '数据管理', 'Operator', 'ADMIN', 4, '管理算子发布状态');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code
FROM platform_permission
WHERE code IN ('data:pipeline:read','data:pipeline:write','data:pipeline:run','data:pipeline:admin','data:operator:read','data:operator:write','data:operator:review','data:operator:admin')
AND NOT EXISTS (SELECT 1 FROM platform_role_permission rp WHERE rp.id = CONCAT('SUPER_ADMIN::', platform_permission.code));

INSERT INTO platform_role_permission (id, role_code, permission_code) VALUES
    ('BU_ADMIN::data:pipeline:read', 'BU_ADMIN', 'data:pipeline:read'),
    ('BU_ADMIN::data:pipeline:write', 'BU_ADMIN', 'data:pipeline:write'),
    ('BU_ADMIN::data:pipeline:run', 'BU_ADMIN', 'data:pipeline:run'),
    ('BU_ADMIN::data:operator:read', 'BU_ADMIN', 'data:operator:read'),
    ('BU_ADMIN::data:operator:write', 'BU_ADMIN', 'data:operator:write'),
    ('BU_ADMIN::data:operator:review', 'BU_ADMIN', 'data:operator:review'),
    ('MODEL_TRAINER::menu:opmarket', 'MODEL_TRAINER', 'menu:opmarket'),
    ('MODEL_TRAINER::data:pipeline:read', 'MODEL_TRAINER', 'data:pipeline:read'),
    ('MODEL_TRAINER::data:pipeline:run', 'MODEL_TRAINER', 'data:pipeline:run'),
    ('MODEL_TRAINER::data:operator:read', 'MODEL_TRAINER', 'data:operator:read'),
    ('DATA_REVIEWER::menu:pipeline', 'DATA_REVIEWER', 'menu:pipeline'),
    ('DATA_REVIEWER::data:pipeline:read', 'DATA_REVIEWER', 'data:pipeline:read'),
    ('DATA_REVIEWER::data:operator:read', 'DATA_REVIEWER', 'data:operator:read');

INSERT INTO operator_catalog (operator_id, name, category, stage, kind, tenant_id, description, parameter_schema_json, input_schema_json, output_schema_json, endpoint, credential_ref, timeout_seconds, concurrency_limit, status, version, before_example, after_example, usage_count, pipeline_count, error_rate, created_by, created_at, updated_at) VALUES
    ('OP-READ-DATASET', '读取数据集', '数据输入', '读取', 'BUILTIN', NULL, '从 F009 数据集版本读取样例数据', '{"required":["datasetId"],"properties":{"datasetId":{"type":"string"}}}', '{"dataset":"ANY"}', '{"records":"ANY"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '数据集版本', 'Pipeline 输入记录', 4210, 31, 0.01, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('OP-IMAGE-RESIZE', '图像缩放', '图像处理', '预处理', 'BUILTIN', NULL, '按目标尺寸调整工业图像大小', '{"required":["width","height"],"properties":{"width":{"type":"integer"},"height":{"type":"integer"}}}', '{"dataType":"IMAGE"}', '{"dataType":"IMAGE"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '不同分辨率图片', '统一 1024×1024', 3890, 24, 0.01, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('OP-IMAGE-AUGMENT', '图像增强', '图像处理', '增强', 'BUILTIN', NULL, '亮度、旋转、裁剪等数据增强', '{"required":["mode"],"properties":{"mode":{"type":"string"},"strength":{"type":"number"}}}', '{"dataType":"IMAGE"}', '{"dataType":"IMAGE"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '样本量不足', '增强样本多样性', 3512, 22, 0.02, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('OP-DATA-VALIDATE', '数据校验', '质量校验', '校验', 'BUILTIN', NULL, '验证 Schema、空值、范围和内容安全', '{"required":["profile"],"properties":{"profile":{"type":"string"}}}', '{"dataset":"ANY"}', '{"qualityReport":"JSON"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '字段不一致', '输出质量报告', 2840, 19, 0.015, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('OP-DATA-DEDUP', '去重', '质量校验', '清洗', 'BUILTIN', NULL, '基于 hash 或业务主键去除重复样本', '{"required":["keyStrategy"],"properties":{"keyStrategy":{"type":"string"}}}', '{"records":"ANY"}', '{"records":"DEDUPED"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '重复样本', '唯一样本', 2601, 17, 0.01, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('OP-NORMALIZE', '归一化', '标准化', '标准化', 'BUILTIN', NULL, '统一单位、时间和数值尺度', '{"required":["profile"],"properties":{"profile":{"type":"string"}}}', '{"records":"ANY"}', '{"records":"NORMALIZED"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '单位混杂', '标准单位输出', 3120, 21, 0.012, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('OP-FORMAT-CONVERT', '格式转换', '格式转换', '输出', 'BUILTIN', NULL, 'COCO/YOLO/CSV/JSONL 等格式转换', '{"required":["targetFormat"],"properties":{"targetFormat":{"type":"string"}}}', '{"records":"ANY"}', '{"file":"STANDARDIZED"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '源格式混杂', '目标格式统一', 2470, 14, 0.018, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('OP-STANDARDIZE-DATASET', 'F010 数据标准化', '标准化', '标准化', 'BUILTIN', NULL, '复用 F010 标准画像与标准化任务能力', '{"required":["standardProfile"],"properties":{"standardProfile":{"type":"string"}}}', '{"dataset":"RAW"}', '{"dataset":"PREPROCESSED"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '原始数据集', 'PREPROCESSED 标准化数据集', 1987, 12, 0.01, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('OP-HTTP-CUSTOM', 'HTTP 自定义算子', '自定义算子', '扩展', 'HTTP', NULL, '调用第三方 HTTP 接口作为 Pipeline 节点；生产调用策略待确认', '{"required":["endpoint","credentialRef"],"properties":{"endpoint":{"type":"string"},"credentialRef":{"type":"string"}}}', '{"records":"ANY"}', '{"records":"ANY"}', 'TODO_CONFIRM_OPERATOR_HTTP_ENDPOINT', 'secret://TODO_CONFIRM_OPERATOR_SECRET', 30, 2, 'PUBLISHED', '1.0.0', '外部服务难以接入', '低代码集成外部 API', 320, 3, 0.05, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO pipeline_definition (pipeline_id, name, tenant_id, project_id, status, current_version_id, owner_id, description, diagnostic_code, diagnostic_message, created_at, updated_at)
VALUES ('PIPE-IMG-PREP', '图像预处理 Pipeline', 'TENANT-CABIN', NULL, 'VALIDATED', NULL, 'USR-ADMIN', '焊缝缺陷图像预处理与标准化样例 Pipeline', 'OK', 'DAG 校验通过', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO pipeline_node (node_id, pipeline_id, operator_id, label, position_x, position_y, config_json, status, created_at, updated_at) VALUES
    ('read', 'PIPE-IMG-PREP', 'OP-READ-DATASET', '读取焊缝数据集', 80, 150, '{"datasetId":"DATASET-WELD-DEFECT"}', 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('resize', 'PIPE-IMG-PREP', 'OP-IMAGE-RESIZE', '图像缩放', 300, 150, '{"width":1024,"height":1024}', 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('normalize', 'PIPE-IMG-PREP', 'OP-NORMALIZE', '归一化', 520, 150, '{"profile":"INDUSTRIAL_VISUAL_STANDARD"}', 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('format', 'PIPE-IMG-PREP', 'OP-FORMAT-CONVERT', '格式转换', 740, 150, '{"targetFormat":"COCO"}', 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO pipeline_edge (edge_id, pipeline_id, source_node_id, target_node_id, edge_type, created_at) VALUES
    ('EDGE-read-resize', 'PIPE-IMG-PREP', 'read', 'resize', 'DATA', CURRENT_TIMESTAMP),
    ('EDGE-resize-normalize', 'PIPE-IMG-PREP', 'resize', 'normalize', 'DATA', CURRENT_TIMESTAMP),
    ('EDGE-normalize-format', 'PIPE-IMG-PREP', 'normalize', 'format', 'DATA', CURRENT_TIMESTAMP);

INSERT INTO pipeline_variable (pipeline_id, name, value_type, value_kind, value_json, value_masked, required, created_at, updated_at) VALUES
    ('PIPE-IMG-PREP', 'batch_size', 'INT', 'LITERAL', '32', '32', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PIPE-IMG-PREP', 'output_bucket', 'STRING', 'ENV_REF', 'TODO_CONFIRM_PIPELINE_OUTPUT_BUCKET', 'TODO_CONFIRM_PIPELINE_OUTPUT_BUCKET', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PIPE-IMG-PREP', 'operator_secret', 'STRING', 'SECRET_REF', 'secret://TODO_CONFIRM_PIPELINE_OPERATOR_SECRET', 'secret://TODO_CONFIRM_PIPELINE_OPERATOR_SECRET', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO pipeline_version (version_id, pipeline_id, version_name, note, dag_json, created_by, created_at)
VALUES ('PVER-IMG-PREP-001', 'PIPE-IMG-PREP', 'v1.0', '初始 Pipeline', '{"nodes":4,"edges":3,"variables":3}', 'USR-ADMIN', CURRENT_TIMESTAMP);
UPDATE pipeline_definition SET current_version_id='PVER-IMG-PREP-001' WHERE pipeline_id='PIPE-IMG-PREP';
