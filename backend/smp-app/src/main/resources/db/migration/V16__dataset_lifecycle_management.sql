CREATE TABLE IF NOT EXISTS dataset_upload_session (
    session_id VARCHAR(96) PRIMARY KEY,
    dataset_id VARCHAR(96),
    version_id VARCHAR(96),
    tenant_id VARCHAR(64) NOT NULL,
    creation_mode VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    dataset_name VARCHAR(160) NOT NULL,
    dataset_type VARCHAR(64) NOT NULL,
    data_type VARCHAR(64) NOT NULL,
    access_level VARCHAR(32) NOT NULL,
    tags VARCHAR(1000),
    description VARCHAR(1000),
    total_files INTEGER NOT NULL DEFAULT 0,
    accepted_files INTEGER NOT NULL DEFAULT 0,
    rejected_files INTEGER NOT NULL DEFAULT 0,
    diagnostic_code VARCHAR(128),
    diagnostic_message VARCHAR(1000),
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    committed_at TIMESTAMP WITH TIME ZONE,
    target_action VARCHAR(32) DEFAULT 'CREATE_DATASET' NOT NULL,
    target_dataset_id VARCHAR(96),
    target_version_id VARCHAR(96),
    CONSTRAINT fk_dataset_upload_session_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_dataset_upload_session_dataset FOREIGN KEY (dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_dataset_upload_session_version FOREIGN KEY (version_id) REFERENCES dataset_version(version_id),
    CONSTRAINT fk_dataset_upload_session_user FOREIGN KEY (created_by) REFERENCES platform_user(id),
    CONSTRAINT fk_dataset_upload_session_target_dataset FOREIGN KEY (target_dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_dataset_upload_session_target_version FOREIGN KEY (target_version_id) REFERENCES dataset_version(version_id)
);
CREATE INDEX IF NOT EXISTS idx_dataset_upload_session_scope ON dataset_upload_session (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS dataset_upload_session_file (
    id VARCHAR(96) PRIMARY KEY,
    session_id VARCHAR(96) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_id VARCHAR(96),
    status VARCHAR(32) NOT NULL,
    size_bytes BIGINT,
    content_type VARCHAR(128),
    diagnostic_code VARCHAR(128),
    diagnostic_message VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_dataset_upload_file_session FOREIGN KEY (session_id) REFERENCES dataset_upload_session(session_id),
    CONSTRAINT fk_dataset_upload_file_file FOREIGN KEY (file_id) REFERENCES platform_file_object(file_id)
);
CREATE INDEX IF NOT EXISTS idx_dataset_upload_session_file ON dataset_upload_session_file (session_id, status, created_at DESC);

ALTER TABLE dataset_version
    ADD COLUMN IF NOT EXISTS source_version_id VARCHAR(96);

ALTER TABLE dataset_version
    ADD CONSTRAINT fk_dataset_version_source
        FOREIGN KEY (source_version_id) REFERENCES dataset_version(version_id);

INSERT INTO platform_config_definition (config_key, group_name, display_name, value_type, default_value, sensitive, scope_allowed, validation_rule, status, created_at)
SELECT 'content_safety.endpoint', 'security', '内容安全服务 Endpoint', 'STRING', 'TODO_CONFIRM_CONTENT_SAFETY_ENDPOINT', TRUE, 'GLOBAL,BU', 'todoConfirm', 'ACTIVE', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM platform_config_definition WHERE config_key = 'content_safety.endpoint'
);

UPDATE dataset_version
SET version_name = 'v1'
WHERE version_name IN ('v1.0.0', 'v2.1.0');

INSERT INTO platform_file_object (file_id, asset_type, tenant_id, project_id, bucket, object_key, expected_sha256, sha256, expected_size_bytes, size_bytes, content_type, storage_tier, status, owner_id, created_at, updated_at)
SELECT 'FILE-DATASET-WELD-002', 'DATASET', 'TENANT-CABIN', NULL, 'TODO_CONFIRM_MINIO_BUCKET', 'TENANT-CABIN/dataset/FILE-DATASET-WELD-002.csv', 'sha256-weld-002', 'sha256-weld-002', 2048, 2048, 'text/csv', 'STANDARD', 'AVAILABLE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM platform_file_object WHERE file_id = 'FILE-DATASET-WELD-002');
