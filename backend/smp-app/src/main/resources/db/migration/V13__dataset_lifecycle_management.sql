ALTER TABLE dataset_version
    ADD COLUMN source_version_id VARCHAR(96);

ALTER TABLE dataset_version
    ADD CONSTRAINT fk_dataset_version_source
        FOREIGN KEY (source_version_id) REFERENCES dataset_version(version_id);

ALTER TABLE dataset_upload_session
    ADD COLUMN target_action VARCHAR(32) DEFAULT 'CREATE_DATASET' NOT NULL;

ALTER TABLE dataset_upload_session
    ADD COLUMN target_dataset_id VARCHAR(96);

ALTER TABLE dataset_upload_session
    ADD COLUMN target_version_id VARCHAR(96);

ALTER TABLE dataset_upload_session
    ADD CONSTRAINT fk_dataset_upload_session_target_dataset
        FOREIGN KEY (target_dataset_id) REFERENCES dataset(dataset_id);

ALTER TABLE dataset_upload_session
    ADD CONSTRAINT fk_dataset_upload_session_target_version
        FOREIGN KEY (target_version_id) REFERENCES dataset_version(version_id);

UPDATE dataset_version
SET version_name = 'v1'
WHERE version_name IN ('v1.0.0', 'v2.1.0');

UPDATE dataset_version
SET source_version_id = NULL
WHERE source_version_id IS NULL;

INSERT INTO platform_file_object (file_id, asset_type, tenant_id, project_id, bucket, object_key, expected_sha256, sha256, expected_size_bytes, size_bytes, content_type, storage_tier, status, owner_id, created_at, updated_at)
SELECT 'FILE-DATASET-WELD-002', 'DATASET', 'TENANT-CABIN', NULL, 'TODO_CONFIRM_MINIO_BUCKET', 'TENANT-CABIN/dataset/FILE-DATASET-WELD-002.csv', 'sha256-weld-002', 'sha256-weld-002', 2048, 2048, 'text/csv', 'STANDARD', 'AVAILABLE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM platform_file_object WHERE file_id = 'FILE-DATASET-WELD-002');
