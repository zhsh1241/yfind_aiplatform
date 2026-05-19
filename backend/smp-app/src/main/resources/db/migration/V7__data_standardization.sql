CREATE TABLE data_standard_task (
    task_id VARCHAR(96) PRIMARY KEY,
    source_dataset_id VARCHAR(96) NOT NULL,
    source_version_id VARCHAR(96),
    output_dataset_id VARCHAR(96),
    name VARCHAR(160) NOT NULL,
    standard_profile VARCHAR(96) NOT NULL,
    rule_json VARCHAR(4000) NOT NULL,
    status VARCHAR(32) NOT NULL,
    quality_score_before INTEGER,
    quality_score_after INTEGER,
    diagnostic_code VARCHAR(128),
    diagnostic_message VARCHAR(1000),
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_run_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_data_standard_source_dataset FOREIGN KEY (source_dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_data_standard_source_version FOREIGN KEY (source_version_id) REFERENCES dataset_version(version_id),
    CONSTRAINT fk_data_standard_output_dataset FOREIGN KEY (output_dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_data_standard_creator FOREIGN KEY (created_by) REFERENCES platform_user(id)
);
CREATE INDEX idx_data_standard_source ON data_standard_task (source_dataset_id, status);

INSERT INTO platform_permission (code, module, resource, action, level, description) VALUES
    ('menu:pipeline', '数据管理', 'Menu', 'READ', 1, 'Pipeline 设计器菜单'),
    ('menu:opmarket', '数据管理', 'Menu', 'READ', 1, '算子广场菜单'),
    ('data:standard:read', '数据管理', 'DataStandard', 'READ', 2, '查询数据标准画像和任务'),
    ('data:standard:write', '数据管理', 'DataStandardTask', 'WRITE', 3, '创建数据标准化任务'),
    ('data:standard:run', '数据管理', 'DataStandardTask', 'RUN', 3, '运行数据标准化任务');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code
FROM platform_permission
WHERE code IN ('menu:pipeline','menu:opmarket','data:standard:read','data:standard:write','data:standard:run')
AND NOT EXISTS (
    SELECT 1 FROM platform_role_permission rp
    WHERE rp.id = CONCAT('SUPER_ADMIN::', platform_permission.code)
);

INSERT INTO platform_role_permission (id, role_code, permission_code) VALUES
    ('BU_ADMIN::menu:pipeline', 'BU_ADMIN', 'menu:pipeline'),
    ('BU_ADMIN::menu:opmarket', 'BU_ADMIN', 'menu:opmarket'),
    ('BU_ADMIN::data:standard:read', 'BU_ADMIN', 'data:standard:read'),
    ('BU_ADMIN::data:standard:write', 'BU_ADMIN', 'data:standard:write'),
    ('BU_ADMIN::data:standard:run', 'BU_ADMIN', 'data:standard:run'),
    ('MODEL_TRAINER::menu:pipeline', 'MODEL_TRAINER', 'menu:pipeline'),
    ('MODEL_TRAINER::data:standard:read', 'MODEL_TRAINER', 'data:standard:read');

INSERT INTO data_standard_task (task_id, source_dataset_id, source_version_id, output_dataset_id, name, standard_profile, rule_json, status, quality_score_before, quality_score_after, diagnostic_code, diagnostic_message, created_by, created_at, updated_at, last_run_at)
VALUES
    ('DSTD-WELD-001', 'DATASET-WELD-DEFECT', 'DVER-WELD-001', NULL, '焊缝图像数据 Schema 校验与归一化', 'INDUSTRIAL_VISUAL_STANDARD', '{"operators":["validate","dedup","normalize"],"sourceTypes":["OBJECT_STORAGE","FILE"]}', 'READY', 82, NULL, 'READY_FOR_STANDARDIZATION', '已生成字段映射、去重、图像归一化和标注格式标准化规则', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
    ('DSTD-TEXT-001', 'DATASET-WORKORDER-TEXT', 'DVER-TEXT-001', NULL, '工单文本字段标准化与分词校验', 'WORKORDER_TEXT_STANDARD', '{"operators":["validate","normalize","tokenize"],"sourceTypes":["API","RELATIONAL_DB"]}', 'READY', 86, NULL, 'READY_FOR_STANDARDIZATION', '已生成工单号、故障描述、时间字段和文本清洗规则', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL);
