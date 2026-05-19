ALTER TABLE annotation_external_binding ADD COLUMN workspace_id VARCHAR(128);
ALTER TABLE annotation_external_binding ADD COLUMN secret_ref VARCHAR(256);
ALTER TABLE annotation_external_binding ADD COLUMN external_task_count BIGINT NOT NULL DEFAULT 0;
ALTER TABLE annotation_external_binding ADD COLUMN last_error_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE annotation_external_binding ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE annotation_external_task_binding (
    binding_id VARCHAR(96) PRIMARY KEY,
    task_id VARCHAR(96) NOT NULL,
    work_item_id VARCHAR(96) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    external_project_id VARCHAR(128),
    external_task_id VARCHAR(128),
    external_task_url VARCHAR(512),
    sync_status VARCHAR(32) NOT NULL,
    import_status VARCHAR(32) NOT NULL,
    diagnostic_code VARCHAR(128) NOT NULL,
    diagnostic_message VARCHAR(1000) NOT NULL,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_import_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_annotation_external_task_binding_task FOREIGN KEY (task_id) REFERENCES annotation_task(task_id),
    CONSTRAINT fk_annotation_external_task_binding_work FOREIGN KEY (work_item_id) REFERENCES annotation_work_item(work_item_id)
);

CREATE UNIQUE INDEX uk_annotation_external_task_work ON annotation_external_task_binding (provider, work_item_id);
CREATE INDEX idx_annotation_external_task_external ON annotation_external_task_binding (provider, external_project_id, external_task_id);
CREATE INDEX idx_annotation_external_task_task ON annotation_external_task_binding (task_id, sync_status, import_status);
