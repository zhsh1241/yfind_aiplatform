CREATE TABLE dataset_upload_session (
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
    CONSTRAINT fk_dataset_upload_session_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_dataset_upload_session_dataset FOREIGN KEY (dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_dataset_upload_session_version FOREIGN KEY (version_id) REFERENCES dataset_version(version_id),
    CONSTRAINT fk_dataset_upload_session_user FOREIGN KEY (created_by) REFERENCES platform_user(id)
);
CREATE INDEX idx_dataset_upload_session_scope ON dataset_upload_session (tenant_id, status, created_at DESC);

CREATE TABLE dataset_upload_session_file (
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
CREATE INDEX idx_dataset_upload_session_file ON dataset_upload_session_file (session_id, status, created_at DESC);
