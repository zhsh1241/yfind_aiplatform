CREATE TABLE annotation_tag (
    tag_id VARCHAR(96) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    color VARCHAR(32),
    description VARCHAR(500),
    status VARCHAR(32) NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_annotation_tag_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_annotation_tag_creator FOREIGN KEY (created_by) REFERENCES platform_user(id),
    CONSTRAINT uk_annotation_tag_tenant_name UNIQUE (tenant_id, name)
);
CREATE INDEX idx_annotation_tag_scope_status ON annotation_tag (tenant_id, status, updated_at DESC);

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'data:tag:read', '数据管理', 'AnnotationTag', 'READ', 2, '查询独立标签目录'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'data:tag:read');

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'data:tag:write', '数据管理', 'AnnotationTag', 'WRITE', 3, '维护独立标签目录'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'data:tag:write');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code
FROM platform_permission
WHERE code IN ('data:tag:read','data:tag:write')
AND NOT EXISTS (SELECT 1 FROM platform_role_permission rp WHERE rp.id = CONCAT('SUPER_ADMIN::', platform_permission.code));

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::data:tag:read', 'BU_ADMIN', 'data:tag:read'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::data:tag:read');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::data:tag:write', 'BU_ADMIN', 'data:tag:write'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::data:tag:write');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'DATA_ANNOTATOR::data:tag:read', 'DATA_ANNOTATOR', 'data:tag:read'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'DATA_ANNOTATOR::data:tag:read');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'DATA_REVIEWER::data:tag:read', 'DATA_REVIEWER', 'data:tag:read'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'DATA_REVIEWER::data:tag:read');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'MODEL_TRAINER::data:tag:read', 'MODEL_TRAINER', 'data:tag:read'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'MODEL_TRAINER::data:tag:read');

INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-WELD-CRACK', 'TENANT-CABIN', '裂纹', '#E02020', '焊缝缺陷标注标签，可直接用于新建标注任务', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='裂纹');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-WELD-PORE', 'TENANT-CABIN', '气孔', '#F59E0B', '焊缝缺陷标注标签，可直接用于新建标注任务', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='气孔');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-WELD-SLAG', 'TENANT-CABIN', '夹渣', '#2563EB', '焊缝缺陷标注标签，可直接用于新建标注任务', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='夹渣');
