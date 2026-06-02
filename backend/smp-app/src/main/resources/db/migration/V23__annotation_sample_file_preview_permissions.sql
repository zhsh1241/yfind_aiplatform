INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT role_code || '::' || permission_code, role_code, permission_code
FROM (VALUES
    ('DATA_ANNOTATOR', 'platform:file:read'),
    ('DATA_ANNOTATOR', 'platform:file:download'),
    ('DATA_REVIEWER', 'platform:file:read'),
    ('DATA_REVIEWER', 'platform:file:download')
) AS required_permissions(role_code, permission_code)
WHERE NOT EXISTS (
    SELECT 1
    FROM platform_role_permission existing
    WHERE existing.role_code = required_permissions.role_code
      AND existing.permission_code = required_permissions.permission_code
);
