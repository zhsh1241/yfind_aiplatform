UPDATE platform_file_object
SET bucket = 'smp-datasets',
    object_key = 'TENANT-CABIN/dataset/FILE-DATASET-WELD-001/foundry-blowhole.jpg',
    content_type = 'image/jpeg',
    expected_size_bytes = 136711,
    size_bytes = 136711,
    updated_at = CURRENT_TIMESTAMP
WHERE file_id = 'FILE-DATASET-WELD-001'
  AND content_type = 'text/csv';

INSERT INTO platform_user_role (id, user_id, role_code, tenant_id, active, expires_at, created_at)
SELECT 'USR-BU-CABIN::DATA_REVIEWER::TENANT-CABIN', 'USR-BU-CABIN', 'DATA_REVIEWER', 'TENANT-CABIN', TRUE, NULL, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM platform_user_role
    WHERE user_id = 'USR-BU-CABIN' AND role_code = 'DATA_REVIEWER' AND tenant_id = 'TENANT-CABIN'
);
