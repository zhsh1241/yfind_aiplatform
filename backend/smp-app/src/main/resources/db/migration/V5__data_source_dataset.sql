CREATE TABLE data_source (
    source_id VARCHAR(96) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    source_type VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64),
    endpoint VARCHAR(255) NOT NULL,
    port INTEGER,
    database_name VARCHAR(128),
    credential_mode VARCHAR(64) NOT NULL,
    secret_ref VARCHAR(255),
    shared_scope VARCHAR(32) NOT NULL,
    description VARCHAR(1000),
    status VARCHAR(32) NOT NULL,
    last_test_at TIMESTAMP WITH TIME ZONE,
    diagnostic_code VARCHAR(128),
    diagnostic_message VARCHAR(1000),
    latency_ms INTEGER,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_data_source_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_data_source_project FOREIGN KEY (project_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_data_source_creator FOREIGN KEY (created_by) REFERENCES platform_user(id)
);
CREATE INDEX idx_data_source_scope_status ON data_source (tenant_id, project_id, status);
CREATE INDEX idx_data_source_type ON data_source (source_type);

CREATE TABLE data_source_test_log (
    test_id VARCHAR(96) PRIMARY KEY,
    source_id VARCHAR(96) NOT NULL,
    result VARCHAR(32) NOT NULL,
    diagnostic_code VARCHAR(128) NOT NULL,
    diagnostic_message VARCHAR(1000) NOT NULL,
    latency_ms INTEGER,
    trace_id VARCHAR(128),
    tested_by VARCHAR(64) NOT NULL,
    tested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_data_source_test_source FOREIGN KEY (source_id) REFERENCES data_source(source_id),
    CONSTRAINT fk_data_source_test_user FOREIGN KEY (tested_by) REFERENCES platform_user(id)
);
CREATE INDEX idx_data_source_test_source_time ON data_source_test_log (source_id, tested_at DESC);

CREATE TABLE data_source_sync_task (
    task_id VARCHAR(96) PRIMARY KEY,
    source_id VARCHAR(96) NOT NULL,
    target_dataset_id VARCHAR(96),
    name VARCHAR(128) NOT NULL,
    schedule_mode VARCHAR(64) NOT NULL,
    sync_scope VARCHAR(512),
    status VARCHAR(32) NOT NULL,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_result VARCHAR(32),
    diagnostic_code VARCHAR(128),
    diagnostic_message VARCHAR(1000),
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_data_sync_source FOREIGN KEY (source_id) REFERENCES data_source(source_id),
    CONSTRAINT fk_data_sync_user FOREIGN KEY (created_by) REFERENCES platform_user(id)
);
CREATE INDEX idx_data_sync_source_status ON data_source_sync_task (source_id, status);

CREATE TABLE dataset (
    dataset_id VARCHAR(96) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    dataset_type VARCHAR(64) NOT NULL,
    data_type VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64),
    current_version_id VARCHAR(96),
    status VARCHAR(32) NOT NULL,
    access_level VARCHAR(32) NOT NULL,
    tags VARCHAR(1000),
    record_count BIGINT NOT NULL DEFAULT 0,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    owner_id VARCHAR(64) NOT NULL,
    description VARCHAR(1000),
    archived_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_dataset_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_dataset_project FOREIGN KEY (project_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_dataset_owner FOREIGN KEY (owner_id) REFERENCES platform_user(id)
);
CREATE INDEX idx_dataset_scope_status ON dataset (tenant_id, project_id, status);
CREATE INDEX idx_dataset_type_status ON dataset (dataset_type, status);

CREATE TABLE dataset_version (
    version_id VARCHAR(96) PRIMARY KEY,
    dataset_id VARCHAR(96) NOT NULL,
    version_name VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    record_count BIGINT NOT NULL DEFAULT 0,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    content_safety_status VARCHAR(64) NOT NULL,
    diagnostic_code VARCHAR(128),
    diagnostic_message VARCHAR(1000),
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_dataset_version_dataset FOREIGN KEY (dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT uk_dataset_version UNIQUE (dataset_id, version_name)
);
CREATE INDEX idx_dataset_version_dataset_status ON dataset_version (dataset_id, status);
ALTER TABLE dataset ADD CONSTRAINT fk_dataset_current_version FOREIGN KEY (current_version_id) REFERENCES dataset_version(version_id);

CREATE TABLE dataset_file (
    id VARCHAR(96) PRIMARY KEY,
    dataset_id VARCHAR(96) NOT NULL,
    version_id VARCHAR(96) NOT NULL,
    file_id VARCHAR(96) NOT NULL,
    file_role VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_dataset_file_dataset FOREIGN KEY (dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_dataset_file_version FOREIGN KEY (version_id) REFERENCES dataset_version(version_id),
    CONSTRAINT fk_dataset_file_file FOREIGN KEY (file_id) REFERENCES platform_file_object(file_id),
    CONSTRAINT uk_dataset_file UNIQUE (version_id, file_id)
);
CREATE INDEX idx_dataset_file_version ON dataset_file (version_id, status);

CREATE TABLE data_lineage (
    lineage_id VARCHAR(96) PRIMARY KEY,
    source_type VARCHAR(64) NOT NULL,
    source_id VARCHAR(96) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(96) NOT NULL,
    transform_type VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_data_lineage_target ON data_lineage (target_type, target_id);

CREATE TABLE dataset_access_request (
    request_id VARCHAR(96) PRIMARY KEY,
    dataset_id VARCHAR(96) NOT NULL,
    requester_id VARCHAR(64) NOT NULL,
    purpose VARCHAR(1000) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reviewed_by VARCHAR(64),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_dataset_access_request_dataset FOREIGN KEY (dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_dataset_access_request_user FOREIGN KEY (requester_id) REFERENCES platform_user(id)
);
CREATE INDEX idx_dataset_access_request_dataset ON dataset_access_request (dataset_id, status);

CREATE TABLE dataset_access_grant (
    grant_id VARCHAR(96) PRIMARY KEY,
    dataset_id VARCHAR(96) NOT NULL,
    version_id VARCHAR(96),
    user_id VARCHAR(64) NOT NULL,
    granted_by VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_dataset_access_grant_dataset FOREIGN KEY (dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_dataset_access_grant_version FOREIGN KEY (version_id) REFERENCES dataset_version(version_id),
    CONSTRAINT fk_dataset_access_grant_user FOREIGN KEY (user_id) REFERENCES platform_user(id)
);
CREATE INDEX idx_dataset_access_grant_user ON dataset_access_grant (dataset_id, user_id, status, expires_at);

CREATE TABLE dataset_reference_guard (
    reference_id VARCHAR(96) PRIMARY KEY,
    dataset_id VARCHAR(96) NOT NULL,
    version_id VARCHAR(96),
    ref_type VARCHAR(64) NOT NULL,
    ref_id VARCHAR(96) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_dataset_reference_dataset FOREIGN KEY (dataset_id) REFERENCES dataset(dataset_id),
    CONSTRAINT fk_dataset_reference_version FOREIGN KEY (version_id) REFERENCES dataset_version(version_id)
);
CREATE INDEX idx_dataset_reference_dataset ON dataset_reference_guard (dataset_id, status);

INSERT INTO platform_permission (code, module, resource, action, level, description) VALUES
    ('menu:datasrc', '数据管理', 'Menu', 'READ', 1, '数据源管理菜单'),
    ('menu:ds', '数据管理', 'Menu', 'READ', 1, '数据集管理菜单'),
    ('menu:portal', '数据管理', 'Menu', 'READ', 1, '数据资产门户菜单'),
    ('menu:lineage', '数据管理', 'Menu', 'READ', 1, '数据血缘菜单'),
    ('data:source:read', '数据管理', 'DataSource', 'READ', 2, '查询数据源'),
    ('data:source:write', '数据管理', 'DataSource', 'WRITE', 3, '维护数据源'),
    ('data:source:test', '数据管理', 'DataSource', 'TEST', 2, '测试数据源连接'),
    ('data:source:activate', '数据管理', 'DataSource', 'ACTIVATE', 3, '激活或禁用数据源'),
    ('data:sync-task:read', '数据管理', 'DataSourceSyncTask', 'READ', 2, '查询数据同步任务'),
    ('data:sync-task:write', '数据管理', 'DataSourceSyncTask', 'WRITE', 3, '维护数据同步任务'),
    ('data:dataset:read', '数据管理', 'Dataset', 'READ', 2, '查询数据集'),
    ('data:dataset:write', '数据管理', 'Dataset', 'WRITE', 3, '维护数据集'),
    ('data:dataset:publish', '数据管理', 'DatasetVersion', 'PUBLISH', 3, '发布数据集版本'),
    ('data:dataset:delete', '数据管理', 'Dataset', 'DELETE', 4, '归档或回收数据集'),
    ('data:dataset:download', '数据管理', 'DatasetFile', 'DOWNLOAD', 2, '下载数据集文件'),
    ('data:dataset:grant', '数据管理', 'DatasetAccessGrant', 'GRANT', 3, '审批数据集访问'),
    ('data:dataset:access-request:review', '数据管理', 'DatasetAccessRequest', 'REVIEW', 3, '审核数据访问申请'),
    ('data:lineage:read', '数据管理', 'DataLineage', 'READ', 2, '查询数据血缘');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code
FROM platform_permission
WHERE (code IN (
    'menu:datasrc','menu:ds','menu:portal','menu:lineage',
    'data:source:read','data:source:write','data:source:test','data:source:activate',
    'data:sync-task:read','data:sync-task:write',
    'data:dataset:read','data:dataset:write','data:dataset:publish','data:dataset:delete','data:dataset:download','data:dataset:grant','data:dataset:access-request:review','data:lineage:read'
))
AND NOT EXISTS (
    SELECT 1 FROM platform_role_permission rp
    WHERE rp.id = CONCAT('SUPER_ADMIN::', platform_permission.code)
);

INSERT INTO platform_role_permission (id, role_code, permission_code) VALUES
    ('BU_ADMIN::menu:datasrc', 'BU_ADMIN', 'menu:datasrc'),
    ('BU_ADMIN::menu:ds', 'BU_ADMIN', 'menu:ds'),
    ('BU_ADMIN::menu:portal', 'BU_ADMIN', 'menu:portal'),
    ('BU_ADMIN::menu:lineage', 'BU_ADMIN', 'menu:lineage'),
    ('BU_ADMIN::data:source:read', 'BU_ADMIN', 'data:source:read'),
    ('BU_ADMIN::data:source:write', 'BU_ADMIN', 'data:source:write'),
    ('BU_ADMIN::data:source:test', 'BU_ADMIN', 'data:source:test'),
    ('BU_ADMIN::data:source:activate', 'BU_ADMIN', 'data:source:activate'),
    ('BU_ADMIN::data:sync-task:read', 'BU_ADMIN', 'data:sync-task:read'),
    ('BU_ADMIN::data:sync-task:write', 'BU_ADMIN', 'data:sync-task:write'),
    ('BU_ADMIN::data:dataset:read', 'BU_ADMIN', 'data:dataset:read'),
    ('BU_ADMIN::data:dataset:write', 'BU_ADMIN', 'data:dataset:write'),
    ('BU_ADMIN::data:dataset:publish', 'BU_ADMIN', 'data:dataset:publish'),
    ('BU_ADMIN::data:dataset:delete', 'BU_ADMIN', 'data:dataset:delete'),
    ('BU_ADMIN::data:dataset:download', 'BU_ADMIN', 'data:dataset:download'),
    ('BU_ADMIN::data:dataset:grant', 'BU_ADMIN', 'data:dataset:grant'),
    ('BU_ADMIN::data:dataset:access-request:review', 'BU_ADMIN', 'data:dataset:access-request:review'),
    ('BU_ADMIN::data:lineage:read', 'BU_ADMIN', 'data:lineage:read'),
    ('DATA_ANNOTATOR::menu:ds', 'DATA_ANNOTATOR', 'menu:ds'),
    ('DATA_ANNOTATOR::menu:portal', 'DATA_ANNOTATOR', 'menu:portal'),
    ('DATA_ANNOTATOR::data:dataset:read', 'DATA_ANNOTATOR', 'data:dataset:read'),
    ('DATA_ANNOTATOR::data:dataset:download', 'DATA_ANNOTATOR', 'data:dataset:download'),
    ('DATA_REVIEWER::menu:ds', 'DATA_REVIEWER', 'menu:ds'),
    ('DATA_REVIEWER::data:dataset:read', 'DATA_REVIEWER', 'data:dataset:read'),
    ('MODEL_TRAINER::menu:ds', 'MODEL_TRAINER', 'menu:ds'),
    ('MODEL_TRAINER::data:dataset:read', 'MODEL_TRAINER', 'data:dataset:read'),
    ('MODEL_TRAINER::data:dataset:download', 'MODEL_TRAINER', 'data:dataset:download');

INSERT INTO platform_file_object (file_id, asset_type, tenant_id, project_id, bucket, object_key, expected_sha256, sha256, expected_size_bytes, size_bytes, content_type, storage_tier, status, owner_id, created_at, updated_at) VALUES
    ('FILE-DATASET-WELD-001', 'DATASET', 'TENANT-CABIN', NULL, 'TODO_CONFIRM_MINIO_BUCKET', 'TENANT-CABIN/dataset/FILE-DATASET-WELD-001.csv', 'sha256-weld-001', 'sha256-weld-001', 1024, 1024, 'text/csv', 'STANDARD', 'AVAILABLE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('FILE-DATASET-TEXT-001', 'DATASET', 'TENANT-YF', NULL, 'TODO_CONFIRM_MINIO_BUCKET', 'TENANT-YF/dataset/FILE-DATASET-TEXT-001.jsonl', 'sha256-text-001', 'sha256-text-001', 2048, 2048, 'application/jsonl', 'STANDARD', 'AVAILABLE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO data_source (source_id, name, source_type, tenant_id, project_id, endpoint, port, database_name, credential_mode, secret_ref, shared_scope, description, status, last_test_at, diagnostic_code, diagnostic_message, latency_ms, created_by, created_at, updated_at) VALUES
    ('DSRC-CABIN-MINIO', '图像存储桶', 'OBJECT_STORAGE', 'TENANT-CABIN', NULL, 'minio.sandbox.internal', 9000, 'weld-images', 'SECRET_REF', 'secret://TODO_CONFIRM_MINIO_DATASET', 'BU', '焊缝图像数据源 sandbox seam', 'ACTIVE', CURRENT_TIMESTAMP, 'OK', 'SANDBOX connection verified', 38, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('DSRC-YF-API', '工单文本 API', 'API', 'TENANT-YF', NULL, 'TODO_CONFIRM_WORKORDER_API_ENDPOINT', NULL, 'workorder', 'SECRET_REF', 'secret://TODO_CONFIRM_WORKORDER_API', 'GLOBAL', '待确认工单 API', 'UNCONFIGURED', NULL, 'DATA_SOURCE_UNCONFIGURED', 'TODO_CONFIRM_WORKORDER_API_ENDPOINT', NULL, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO dataset (dataset_id, name, dataset_type, data_type, tenant_id, project_id, current_version_id, status, access_level, tags, record_count, size_bytes, owner_id, description, created_at, updated_at) VALUES
    ('DATASET-WELD-DEFECT', '焊缝缺陷检测数据集', 'RAW', 'IMAGE', 'TENANT-CABIN', NULL, NULL, 'ACTIVE', 'RESTRICTED', '焊接,质检,目标检测,工业视觉', 31200, 1024, 'USR-ADMIN', '焊缝缺陷图片样例数据集', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('DATASET-WORKORDER-TEXT', '工单文本分类语料库', 'RAW', 'TEXT', 'TENANT-YF', NULL, NULL, 'ACTIVE', 'PUBLIC', '工单,NLP,文本分类', 125600, 2048, 'USR-ADMIN', '工单文本公开样例数据集', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO dataset_version (version_id, dataset_id, version_name, status, record_count, size_bytes, content_safety_status, diagnostic_code, diagnostic_message, created_by, created_at, published_at) VALUES
    ('DVER-WELD-001', 'DATASET-WELD-DEFECT', 'v1.0.0', 'PUBLISHED', 31200, 1024, 'PASSED', 'OK', 'SANDBOX_CONTENT_SAFETY_PASSED', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('DVER-TEXT-001', 'DATASET-WORKORDER-TEXT', 'v2.1.0', 'PUBLISHED', 125600, 2048, 'PASSED', 'OK', 'SANDBOX_CONTENT_SAFETY_PASSED', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE dataset SET current_version_id='DVER-WELD-001' WHERE dataset_id='DATASET-WELD-DEFECT';
UPDATE dataset SET current_version_id='DVER-TEXT-001' WHERE dataset_id='DATASET-WORKORDER-TEXT';

INSERT INTO dataset_file (id, dataset_id, version_id, file_id, file_role, status, created_at) VALUES
    ('DF-WELD-001', 'DATASET-WELD-DEFECT', 'DVER-WELD-001', 'FILE-DATASET-WELD-001', 'RAW', 'BOUND', CURRENT_TIMESTAMP),
    ('DF-TEXT-001', 'DATASET-WORKORDER-TEXT', 'DVER-TEXT-001', 'FILE-DATASET-TEXT-001', 'RAW', 'BOUND', CURRENT_TIMESTAMP);

INSERT INTO data_lineage (lineage_id, source_type, source_id, target_type, target_id, transform_type, created_at) VALUES
    ('LIN-DSRC-WELD-001', 'DATA_SOURCE', 'DSRC-CABIN-MINIO', 'DATASET_VERSION', 'DVER-WELD-001', 'IMPORT', CURRENT_TIMESTAMP),
    ('LIN-DSRC-TEXT-001', 'DATA_SOURCE', 'DSRC-YF-API', 'DATASET_VERSION', 'DVER-TEXT-001', 'IMPORT', CURRENT_TIMESTAMP);
