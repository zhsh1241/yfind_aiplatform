ALTER TABLE platform_role ADD COLUMN parent_role_code VARCHAR(64);

ALTER TABLE platform_role
    ADD CONSTRAINT fk_platform_role_parent_role
    FOREIGN KEY (parent_role_code) REFERENCES platform_role(code);

CREATE INDEX idx_platform_role_tenant_status ON platform_role (tenant_id, status);

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::platform:role:create', 'BU_ADMIN', 'platform:role:create'
WHERE NOT EXISTS (
    SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::platform:role:create'
);

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::platform:permission:update', 'BU_ADMIN', 'platform:permission:update'
WHERE NOT EXISTS (
    SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::platform:permission:update'
);
