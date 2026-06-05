CREATE TABLE model_evaluation_run (
    evaluation_run_id VARCHAR(96) PRIMARY KEY,
    model_id VARCHAR(96) NOT NULL,
    version_id VARCHAR(96) NOT NULL,
    dataset_id VARCHAR(96) NOT NULL,
    dataset_version_id VARCHAR(96) NOT NULL,
    task_type VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    metric_config_json VARCHAR(4000),
    threshold_config_json VARCHAR(4000) NOT NULL,
    result_summary_json VARCHAR(4000),
    report_summary VARCHAR(4000),
    curve_data_json VARCHAR(4000),
    confusion_matrix_json VARCHAR(4000),
    error_cases_json VARCHAR(4000),
    executor_type VARCHAR(64) NOT NULL,
    external_run_id VARCHAR(128),
    notes VARCHAR(1000),
    owner_user_id VARCHAR(64) NOT NULL,
    owner_org_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_model_evaluation_run_model FOREIGN KEY (model_id) REFERENCES model_registry_model(model_id),
    CONSTRAINT fk_model_evaluation_run_version FOREIGN KEY (version_id) REFERENCES model_registry_version(version_id),
    CONSTRAINT fk_model_evaluation_run_model_version FOREIGN KEY (model_id, version_id) REFERENCES model_registry_version(model_id, version_id),
    CONSTRAINT fk_model_evaluation_run_dataset FOREIGN KEY (dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_model_evaluation_run_dataset_version FOREIGN KEY (dataset_version_id) REFERENCES dataset_version(version_id),
    CONSTRAINT fk_model_evaluation_run_owner FOREIGN KEY (owner_user_id) REFERENCES platform_user(id),
    CONSTRAINT fk_model_evaluation_run_owner_org FOREIGN KEY (owner_org_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_model_evaluation_run_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id)
);

CREATE INDEX idx_model_evaluation_run_version_status ON model_evaluation_run (model_id, version_id, status);
CREATE INDEX idx_model_evaluation_run_tenant_status ON model_evaluation_run (tenant_id, owner_org_id, status);
CREATE INDEX idx_model_evaluation_run_dataset_version ON model_evaluation_run (dataset_version_id);

CREATE TABLE model_evaluation_metric (
    metric_id VARCHAR(96) PRIMARY KEY,
    evaluation_run_id VARCHAR(96) NOT NULL,
    metric_name VARCHAR(128) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    threshold_value DOUBLE PRECISION,
    passed BOOLEAN NOT NULL,
    category VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_model_evaluation_metric_run FOREIGN KEY (evaluation_run_id) REFERENCES model_evaluation_run(evaluation_run_id)
);

CREATE UNIQUE INDEX uk_model_evaluation_metric_name ON model_evaluation_metric (evaluation_run_id, metric_name, category);

CREATE TABLE model_evaluation_report_artifact (
    artifact_id VARCHAR(96) PRIMARY KEY,
    evaluation_run_id VARCHAR(96) NOT NULL,
    artifact_type VARCHAR(64) NOT NULL,
    file_object_id VARCHAR(96),
    name VARCHAR(255) NOT NULL,
    download_policy VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_model_evaluation_artifact_run FOREIGN KEY (evaluation_run_id) REFERENCES model_evaluation_run(evaluation_run_id),
    CONSTRAINT fk_model_evaluation_artifact_file FOREIGN KEY (file_object_id) REFERENCES platform_file_object(file_id)
);

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'menu:eval', '模型开发', 'Menu', 'READ', 1, '模型评估菜单'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'menu:eval');

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'model:evaluation:read', '模型开发', 'ModelEvaluation', 'READ', 2, '查看模型评估'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'model:evaluation:read');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'model:evaluation:write', '模型开发', 'ModelEvaluation', 'WRITE', 2, '创建模型评估'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'model:evaluation:write');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'model:evaluation:import', '模型开发', 'ModelEvaluation', 'IMPORT', 3, '导入模型评估结果'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'model:evaluation:import');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'model:evaluation:download', '模型开发', 'ModelEvaluation', 'DOWNLOAD', 2, '下载模型评估报告 artifact'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'model:evaluation:download');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code
FROM platform_permission
WHERE code IN ('menu:eval','model:evaluation:read','model:evaluation:write','model:evaluation:import','model:evaluation:download')
AND NOT EXISTS (SELECT 1 FROM platform_role_permission rp WHERE rp.id = CONCAT('SUPER_ADMIN::', platform_permission.code));

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::menu:eval', 'BU_ADMIN', 'menu:eval'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::menu:eval');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::model:evaluation:read', 'BU_ADMIN', 'model:evaluation:read'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::model:evaluation:read');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::model:evaluation:write', 'BU_ADMIN', 'model:evaluation:write'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::model:evaluation:write');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::model:evaluation:import', 'BU_ADMIN', 'model:evaluation:import'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::model:evaluation:import');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::model:evaluation:download', 'BU_ADMIN', 'model:evaluation:download'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::model:evaluation:download');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'MODEL_TRAINER::menu:eval', 'MODEL_TRAINER', 'menu:eval'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'MODEL_TRAINER::menu:eval');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'MODEL_TRAINER::model:evaluation:read', 'MODEL_TRAINER', 'model:evaluation:read'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'MODEL_TRAINER::model:evaluation:read');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'MODEL_TRAINER::model:evaluation:write', 'MODEL_TRAINER', 'model:evaluation:write'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'MODEL_TRAINER::model:evaluation:write');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'MODEL_TRAINER::model:evaluation:import', 'MODEL_TRAINER', 'model:evaluation:import'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'MODEL_TRAINER::model:evaluation:import');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'MODEL_TRAINER::model:evaluation:download', 'MODEL_TRAINER', 'model:evaluation:download'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'MODEL_TRAINER::model:evaluation:download');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'DATA_REVIEWER::menu:eval', 'DATA_REVIEWER', 'menu:eval'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'DATA_REVIEWER::menu:eval');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'DATA_REVIEWER::model:evaluation:read', 'DATA_REVIEWER', 'model:evaluation:read'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'DATA_REVIEWER::model:evaluation:read');
