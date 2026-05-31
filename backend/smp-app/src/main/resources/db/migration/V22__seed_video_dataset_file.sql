INSERT INTO platform_file_object (
    file_id, asset_type, tenant_id, project_id, bucket, object_key,
    expected_sha256, sha256, expected_size_bytes, size_bytes, content_type,
    storage_tier, status, owner_id, created_at, updated_at
)
SELECT 'FILE-DATASET-WELD-VIDEO-001', 'DATASET', 'TENANT-CABIN', NULL, 'smp-datasets',
       'TENANT-CABIN/dataset/video/weld-source.avi',
       'e97f010966c4a4293261eb8ab0eba0753dba554b1cca691868384a1ee0309519', 'e97f010966c4a4293261eb8ab0eba0753dba554b1cca691868384a1ee0309519', 102140, 102140, 'video/x-msvideo',
       'STANDARD', 'AVAILABLE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM platform_file_object WHERE file_id='FILE-DATASET-WELD-VIDEO-001');

INSERT INTO dataset_file (id, dataset_id, version_id, file_id, file_role, status, created_at)
SELECT 'DF-WELD-VIDEO-001', 'DATASET-WELD-VIDEO-001', 'DVER-WELD-VIDEO-001',
       'FILE-DATASET-WELD-VIDEO-001', 'RAW', 'BOUND', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset_file WHERE id='DF-WELD-VIDEO-001');

UPDATE dataset SET record_count=1, size_bytes=102140 WHERE dataset_id='DATASET-WELD-VIDEO-001';
UPDATE dataset_version SET record_count=1, size_bytes=102140 WHERE version_id='DVER-WELD-VIDEO-001';
