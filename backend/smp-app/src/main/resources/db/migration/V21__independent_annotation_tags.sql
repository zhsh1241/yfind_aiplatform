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
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-WELD-LACK-FUSION', 'TENANT-CABIN', '未熔合', '#722ED1', '焊缝缺陷标注标签，可用于目标检测、分割和质检复核', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='未熔合');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-WELD-UNDERCUT', 'TENANT-CABIN', '咬边', '#EB2F96', '焊缝边缘缺陷标签，用于外观质量检测', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='咬边');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-WELD-OVERLAP', 'TENANT-CABIN', '焊瘤', '#FA8C16', '焊缝成形异常标签，用于外观质量检测', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='焊瘤');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-WELD-SPATTER', 'TENANT-CABIN', '飞溅', '#13C2C2', '焊接飞溅缺陷标签，用于视觉质检与清洁度分析', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='飞溅');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-WELD-BURN-THROUGH', 'TENANT-CABIN', '烧穿', '#F5222D', '焊接穿透异常标签，用于严重缺陷识别', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='烧穿');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-WELD-INCOMPLETE-PENETRATION', 'TENANT-CABIN', '未焊透', '#2F54EB', '焊接深度不足标签，用于工艺缺陷分析', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='未焊透');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-SURFACE-SCRATCH', 'TENANT-CABIN', '划痕', '#1677FF', '表面外观缺陷标签，用于工业视觉检测', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='划痕');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-SURFACE-DENT', 'TENANT-CABIN', '凹坑', '#52C41A', '表面压痕与凹陷标签，用于外观质量检测', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='凹坑');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-SURFACE-STAIN', 'TENANT-CABIN', '污渍', '#A0D911', '表面污染标签，用于外观检测与清洁度复核', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='污渍');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-SURFACE-DEFORMATION', 'TENANT-CABIN', '形变', '#FAAD14', '零件形变标签，用于结构外观异常检测', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='形变');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-SURFACE-MISSING-PART', 'TENANT-CABIN', '缺件', '#AD6800', '装配缺失标签，用于产线视觉巡检', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='缺件');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-SURFACE-MISALIGNMENT', 'TENANT-CABIN', '错位', '#08979C', '装配位置异常标签，用于产线视觉巡检', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='错位');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-SURFACE-FOREIGN-MATERIAL', 'TENANT-CABIN', '异物', '#531DAB', '异物与杂质标签，用于外观质量检测', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='异物');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-SURFACE-COLOR-DIFF', 'TENANT-CABIN', '色差', '#C41D7F', '颜色差异标签，用于内饰外观一致性检测', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-CABIN' AND name='色差');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-QE-DIMENSION-OOS', 'TENANT-QE', '尺寸超差', '#D4380D', '质量工程测量标签，用于尺寸异常数据集筛选', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-QE' AND name='尺寸超差');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-QE-PROCESS-DRIFT', 'TENANT-QE', '工艺漂移', '#7CB305', '质量工程过程标签，用于趋势异常和工艺波动分析', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-QE' AND name='工艺漂移');
INSERT INTO annotation_tag (tag_id, tenant_id, name, color, description, status, created_by, created_at, updated_at)
SELECT 'ATAG-QE-OUTLIER', 'TENANT-QE', '异常点', '#0958D9', '质量数据异常标签，用于测量与时序数据筛选', 'ACTIVE', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM annotation_tag WHERE tenant_id='TENANT-QE' AND name='异常点');
