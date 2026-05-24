CREATE TABLE annotation_training_export (
    export_id VARCHAR(96) PRIMARY KEY,
    task_id VARCHAR(96) NOT NULL,
    output_dataset_id VARCHAR(96),
    output_version_id VARCHAR(96),
    source_annotation_file_id VARCHAR(96),
    export_file_id VARCHAR(96),
    format VARCHAR(64) NOT NULL,
    format_version VARCHAR(32) NOT NULL DEFAULT '1.0',
    options_json VARCHAR(4000),
    status VARCHAR(32) NOT NULL,
    diagnostic_code VARCHAR(96) NOT NULL,
    diagnostic_message VARCHAR(1000) NOT NULL,
    size_bytes BIGINT,
    async_required BOOLEAN NOT NULL DEFAULT FALSE,
    package_includes_images BOOLEAN NOT NULL DEFAULT TRUE,
    requested_by VARCHAR(64) NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    tenant_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64),
    CONSTRAINT fk_annotation_training_export_task FOREIGN KEY (task_id) REFERENCES annotation_task(task_id),
    CONSTRAINT fk_annotation_training_export_output_dataset FOREIGN KEY (output_dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_annotation_training_export_output_version FOREIGN KEY (output_version_id) REFERENCES dataset_version(version_id),
    CONSTRAINT fk_annotation_training_export_source_file FOREIGN KEY (source_annotation_file_id) REFERENCES platform_file_object(file_id),
    CONSTRAINT fk_annotation_training_export_file FOREIGN KEY (export_file_id) REFERENCES platform_file_object(file_id),
    CONSTRAINT fk_annotation_training_export_requested_by FOREIGN KEY (requested_by) REFERENCES platform_user(id),
    CONSTRAINT fk_annotation_training_export_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_annotation_training_export_project FOREIGN KEY (project_id) REFERENCES platform_tenant(id)
);

CREATE INDEX idx_annotation_training_export_task ON annotation_training_export (task_id, format, status);
CREATE INDEX idx_annotation_training_export_scope ON annotation_training_export (tenant_id, project_id, status);
CREATE INDEX idx_annotation_training_export_file ON annotation_training_export (export_file_id);

INSERT INTO platform_permission (code, module, resource, action, level, description) VALUES
    ('data:annotation:export', '数据管理', 'AnnotationTrainingExport', 'EXPORT', 3, '生成标注训练格式导出');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code FROM platform_permission
WHERE code = 'data:annotation:export'
AND NOT EXISTS (SELECT 1 FROM platform_role_permission rp WHERE rp.id = CONCAT('SUPER_ADMIN::', platform_permission.code));

INSERT INTO platform_role_permission (id, role_code, permission_code) VALUES
    ('BU_ADMIN::data:annotation:export', 'BU_ADMIN', 'data:annotation:export'),
    ('MODEL_TRAINER::data:annotation:export', 'MODEL_TRAINER', 'data:annotation:export');
