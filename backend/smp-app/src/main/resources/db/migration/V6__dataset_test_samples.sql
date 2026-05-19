INSERT INTO platform_file_object (
    file_id, asset_type, tenant_id, project_id, bucket, object_key,
    expected_sha256, sha256, expected_size_bytes, size_bytes, content_type,
    storage_tier, status, owner_id, created_at, updated_at
)
SELECT 'FILE-DATASET-WELD-PREP-001', 'DATASET', 'TENANT-CABIN', NULL, 'TODO_CONFIRM_MINIO_BUCKET', 'TENANT-CABIN/dataset/preprocessed/FILE-DATASET-WELD-PREP-001.parquet', 'sha256-weld-prep-001', 'sha256-weld-prep-001', 4096, 4096, 'application/x-parquet', 'STANDARD', 'AVAILABLE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM platform_file_object WHERE file_id = 'FILE-DATASET-WELD-PREP-001');

INSERT INTO platform_file_object (
    file_id, asset_type, tenant_id, project_id, bucket, object_key,
    expected_sha256, sha256, expected_size_bytes, size_bytes, content_type,
    storage_tier, status, owner_id, created_at, updated_at
)
SELECT 'FILE-DATASET-WELD-ANN-001', 'DATASET', 'TENANT-CABIN', NULL, 'TODO_CONFIRM_MINIO_BUCKET', 'TENANT-CABIN/dataset/annotated/FILE-DATASET-WELD-ANN-001.jsonl', 'sha256-weld-ann-001', 'sha256-weld-ann-001', 8192, 8192, 'application/jsonl', 'STANDARD', 'AVAILABLE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM platform_file_object WHERE file_id = 'FILE-DATASET-WELD-ANN-001');

INSERT INTO platform_file_object (
    file_id, asset_type, tenant_id, project_id, bucket, object_key,
    expected_sha256, sha256, expected_size_bytes, size_bytes, content_type,
    storage_tier, status, owner_id, created_at, updated_at
)
SELECT 'FILE-DATASET-QE-TAB-001', 'DATASET', 'TENANT-QE', NULL, 'TODO_CONFIRM_MINIO_BUCKET', 'TENANT-QE/dataset/raw/FILE-DATASET-QE-TAB-001.csv', 'sha256-qe-tab-001', 'sha256-qe-tab-001', 3072, 3072, 'text/csv', 'STANDARD', 'AVAILABLE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM platform_file_object WHERE file_id = 'FILE-DATASET-QE-TAB-001');

INSERT INTO dataset (
    dataset_id, name, dataset_type, data_type, tenant_id, project_id,
    current_version_id, status, access_level, tags, record_count,
    size_bytes, owner_id, description, created_at, updated_at
)
SELECT 'DATASET-WELD-PREPROCESSED', '焊缝缺陷预处理特征集', 'PREPROCESSED', 'TABULAR', 'TENANT-CABIN', NULL, NULL, 'ACTIVE', 'TEAM', '焊接,质检,预处理,特征工程', 31200, 4096, 'USR-ADMIN', '由焊缝缺陷原始图片清洗、裁剪和特征提取后的训练输入样例', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset WHERE dataset_id = 'DATASET-WELD-PREPROCESSED');

INSERT INTO dataset (
    dataset_id, name, dataset_type, data_type, tenant_id, project_id,
    current_version_id, status, access_level, tags, record_count,
    size_bytes, owner_id, description, created_at, updated_at
)
SELECT 'DATASET-WELD-ANNOTATED', '焊缝缺陷标注结果集', 'ANNOTATED', 'IMAGE', 'TENANT-CABIN', NULL, NULL, 'ACTIVE', 'RESTRICTED', '焊接,质检,目标检测,标注', 29880, 8192, 'USR-ADMIN', '包含缺陷框、缺陷类型和审核状态的标注样例数据集', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset WHERE dataset_id = 'DATASET-WELD-ANNOTATED');

INSERT INTO dataset (
    dataset_id, name, dataset_type, data_type, tenant_id, project_id,
    current_version_id, status, access_level, tags, record_count,
    size_bytes, owner_id, description, created_at, updated_at
)
SELECT 'DATASET-QE-MEASURE-RAW', '质量检测尺寸测量原始表', 'RAW', 'TABULAR', 'TENANT-QE', NULL, NULL, 'ACTIVE', 'PRIVATE', '质量工程,尺寸测量,SPC', 8600, 3072, 'USR-ADMIN', '质量工程部尺寸测量明细样例，用于验证跨 BU 可见性与权限筛选', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset WHERE dataset_id = 'DATASET-QE-MEASURE-RAW');

INSERT INTO dataset_version (
    version_id, dataset_id, version_name, status, record_count, size_bytes,
    content_safety_status, diagnostic_code, diagnostic_message, created_by,
    created_at, published_at
)
SELECT 'DVER-WELD-PREP-001', 'DATASET-WELD-PREPROCESSED', 'v1.0.0', 'PUBLISHED', 31200, 4096, 'PASSED', 'OK', 'SANDBOX_CONTENT_SAFETY_PASSED', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset_version WHERE version_id = 'DVER-WELD-PREP-001');

INSERT INTO dataset_version (
    version_id, dataset_id, version_name, status, record_count, size_bytes,
    content_safety_status, diagnostic_code, diagnostic_message, created_by,
    created_at, published_at
)
SELECT 'DVER-WELD-ANN-001', 'DATASET-WELD-ANNOTATED', 'v1.0.0', 'PUBLISHED', 29880, 8192, 'PASSED', 'OK', 'SANDBOX_CONTENT_SAFETY_PASSED', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset_version WHERE version_id = 'DVER-WELD-ANN-001');

INSERT INTO dataset_version (
    version_id, dataset_id, version_name, status, record_count, size_bytes,
    content_safety_status, diagnostic_code, diagnostic_message, created_by,
    created_at, published_at
)
SELECT 'DVER-QE-TAB-001', 'DATASET-QE-MEASURE-RAW', 'v1.0.0', 'PUBLISHED', 8600, 3072, 'PASSED', 'OK', 'SANDBOX_CONTENT_SAFETY_PASSED', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset_version WHERE version_id = 'DVER-QE-TAB-001');

UPDATE dataset SET current_version_id='DVER-WELD-PREP-001' WHERE dataset_id='DATASET-WELD-PREPROCESSED';
UPDATE dataset SET current_version_id='DVER-WELD-ANN-001' WHERE dataset_id='DATASET-WELD-ANNOTATED';
UPDATE dataset SET current_version_id='DVER-QE-TAB-001' WHERE dataset_id='DATASET-QE-MEASURE-RAW';

INSERT INTO dataset_file (id, dataset_id, version_id, file_id, file_role, status, created_at)
SELECT 'DF-WELD-PREP-001', 'DATASET-WELD-PREPROCESSED', 'DVER-WELD-PREP-001', 'FILE-DATASET-WELD-PREP-001', 'PREPROCESSED', 'BOUND', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset_file WHERE id = 'DF-WELD-PREP-001');

INSERT INTO dataset_file (id, dataset_id, version_id, file_id, file_role, status, created_at)
SELECT 'DF-WELD-ANN-001', 'DATASET-WELD-ANNOTATED', 'DVER-WELD-ANN-001', 'FILE-DATASET-WELD-ANN-001', 'ANNOTATION', 'BOUND', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset_file WHERE id = 'DF-WELD-ANN-001');

INSERT INTO dataset_file (id, dataset_id, version_id, file_id, file_role, status, created_at)
SELECT 'DF-QE-TAB-001', 'DATASET-QE-MEASURE-RAW', 'DVER-QE-TAB-001', 'FILE-DATASET-QE-TAB-001', 'RAW', 'BOUND', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset_file WHERE id = 'DF-QE-TAB-001');

INSERT INTO data_lineage (lineage_id, source_type, source_id, target_type, target_id, transform_type, created_at)
SELECT 'LIN-WELD-RAW-PREP-001', 'DATASET_VERSION', 'DVER-WELD-001', 'DATASET_VERSION', 'DVER-WELD-PREP-001', 'PREPROCESS', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM data_lineage WHERE lineage_id = 'LIN-WELD-RAW-PREP-001');

INSERT INTO data_lineage (lineage_id, source_type, source_id, target_type, target_id, transform_type, created_at)
SELECT 'LIN-WELD-PREP-ANN-001', 'DATASET_VERSION', 'DVER-WELD-PREP-001', 'DATASET_VERSION', 'DVER-WELD-ANN-001', 'ANNOTATION', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM data_lineage WHERE lineage_id = 'LIN-WELD-PREP-ANN-001');

INSERT INTO data_lineage (lineage_id, source_type, source_id, target_type, target_id, transform_type, created_at)
SELECT 'LIN-DSRC-QE-TAB-001', 'DATA_SOURCE', 'DSRC-YF-API', 'DATASET_VERSION', 'DVER-QE-TAB-001', 'IMPORT', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM data_lineage WHERE lineage_id = 'LIN-DSRC-QE-TAB-001');

INSERT INTO dataset_access_grant (
    grant_id, dataset_id, version_id, user_id, granted_by, expires_at,
    status, created_at
)
SELECT 'DAG-WELD-ANNOTATOR-001', 'DATASET-WELD-ANNOTATED', 'DVER-WELD-ANN-001', 'USR-ANNOTATOR', 'USR-ADMIN', TIMESTAMP '2026-12-31 23:59:59', 'ACTIVE', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset_access_grant WHERE grant_id = 'DAG-WELD-ANNOTATOR-001');

INSERT INTO dataset_access_grant (
    grant_id, dataset_id, version_id, user_id, granted_by, expires_at,
    status, created_at
)
SELECT 'DAG-WELD-BUADMIN-001', 'DATASET-WELD-ANNOTATED', 'DVER-WELD-ANN-001', 'USR-BU-CABIN', 'USR-ADMIN', TIMESTAMP '2026-12-31 23:59:59', 'ACTIVE', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset_access_grant WHERE grant_id = 'DAG-WELD-BUADMIN-001');
