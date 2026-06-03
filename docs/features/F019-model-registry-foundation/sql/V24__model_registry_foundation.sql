CREATE TABLE model_registry_model (
    model_id VARCHAR(96) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(2000),
    framework VARCHAR(64) NOT NULL,
    task_type VARCHAR(128) NOT NULL,
    input_format VARCHAR(255) NOT NULL,
    output_format VARCHAR(255) NOT NULL,
    runtime_requirements VARCHAR(4000),
    tags_json VARCHAR(2000),
    scope VARCHAR(32) NOT NULL,
    pending_scope VARCHAR(32),
    pending_scope_reason VARCHAR(1000),
    source VARCHAR(64) NOT NULL,
    owner_user_id VARCHAR(64) NOT NULL,
    owner_org_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    current_version_id VARCHAR(96),
    visibility_status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_model_registry_model_owner_user FOREIGN KEY (owner_user_id) REFERENCES platform_user(id),
    CONSTRAINT fk_model_registry_model_owner_org FOREIGN KEY (owner_org_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_model_registry_model_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id)
);

CREATE INDEX idx_model_registry_model_scope ON model_registry_model (tenant_id, owner_org_id, scope);
CREATE INDEX idx_model_registry_model_framework_task ON model_registry_model (framework, task_type);

CREATE TABLE model_registry_version (
    version_id VARCHAR(96) PRIMARY KEY,
    model_id VARCHAR(96) NOT NULL,
    version_no VARCHAR(64) NOT NULL,
    file_object_id VARCHAR(96) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_extension VARCHAR(16) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum VARCHAR(128),
    storage_bucket VARCHAR(128) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    runtime_requirements VARCHAR(4000),
    metrics_summary_json VARCHAR(4000),
    security_scan_status VARCHAR(32) NOT NULL,
    evaluation_status VARCHAR(32) NOT NULL,
    evaluation_record_id VARCHAR(128),
    evaluation_proof VARCHAR(1000),
    status VARCHAR(32) NOT NULL,
    active_deployment_count INTEGER NOT NULL DEFAULT 0,
    active_reference_json VARCHAR(4000),
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_model_registry_version_model_version UNIQUE (model_id, version_no),
    CONSTRAINT fk_model_registry_version_model FOREIGN KEY (model_id) REFERENCES model_registry_model(model_id),
    CONSTRAINT fk_model_registry_version_file FOREIGN KEY (file_object_id) REFERENCES platform_file_object(file_id),
    CONSTRAINT fk_model_registry_version_creator FOREIGN KEY (created_by) REFERENCES platform_user(id)
);

CREATE INDEX idx_model_registry_version_model_status ON model_registry_version (model_id, status);

CREATE TABLE model_access_request (
    request_id VARCHAR(96) PRIMARY KEY,
    model_id VARCHAR(96) NOT NULL,
    version_id VARCHAR(96),
    requester_user_id VARCHAR(64) NOT NULL,
    requester_org_id VARCHAR(64) NOT NULL,
    owner_org_id VARCHAR(64) NOT NULL,
    permission VARCHAR(32) NOT NULL,
    reason VARCHAR(1000),
    status VARCHAR(32) NOT NULL,
    review_comment VARCHAR(1000),
    reviewed_by VARCHAR(64),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_model_access_request_model FOREIGN KEY (model_id) REFERENCES model_registry_model(model_id),
    CONSTRAINT fk_model_access_request_version FOREIGN KEY (version_id) REFERENCES model_registry_version(version_id),
    CONSTRAINT fk_model_access_request_requester FOREIGN KEY (requester_user_id) REFERENCES platform_user(id),
    CONSTRAINT fk_model_access_request_requester_org FOREIGN KEY (requester_org_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_model_access_request_owner_org FOREIGN KEY (owner_org_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_model_access_request_reviewer FOREIGN KEY (reviewed_by) REFERENCES platform_user(id)
);

CREATE INDEX idx_model_access_request_model_status ON model_access_request (model_id, status);

CREATE TABLE model_access_grant (
    grant_id VARCHAR(96) PRIMARY KEY,
    model_id VARCHAR(96) NOT NULL,
    version_id VARCHAR(96),
    requester_user_id VARCHAR(64) NOT NULL,
    requester_org_id VARCHAR(64) NOT NULL,
    owner_org_id VARCHAR(64) NOT NULL,
    permission VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    source_request_id VARCHAR(96) NOT NULL,
    approved_by VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_model_access_grant_model FOREIGN KEY (model_id) REFERENCES model_registry_model(model_id),
    CONSTRAINT fk_model_access_grant_version FOREIGN KEY (version_id) REFERENCES model_registry_version(version_id),
    CONSTRAINT fk_model_access_grant_requester FOREIGN KEY (requester_user_id) REFERENCES platform_user(id),
    CONSTRAINT fk_model_access_grant_requester_org FOREIGN KEY (requester_org_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_model_access_grant_owner_org FOREIGN KEY (owner_org_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_model_access_grant_request FOREIGN KEY (source_request_id) REFERENCES model_access_request(request_id),
    CONSTRAINT fk_model_access_grant_approver FOREIGN KEY (approved_by) REFERENCES platform_user(id)
);

CREATE INDEX idx_model_access_grant_lookup ON model_access_grant (model_id, requester_org_id, permission, status);

ALTER TABLE model_registry_model
    ADD CONSTRAINT fk_model_registry_model_current_version
    FOREIGN KEY (current_version_id) REFERENCES model_registry_version(version_id);

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'model:model:read', '模型开发', 'ModelRegistry', 'READ', 2, '查询模型中心'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'model:model:read');

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'model:model:write', '模型开发', 'ModelRegistry', 'WRITE', 2, '创建模型'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'model:model:write');

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'model:model:manage', '模型开发', 'ModelRegistry', 'MANAGE', 3, '管理模型元数据'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'model:model:manage');

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'model:model:download', '模型开发', 'ModelRegistry', 'DOWNLOAD', 2, '下载模型文件'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'model:model:download');

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'model:model:use', '模型开发', 'ModelRegistry', 'USE', 2, '将模型用于训练'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'model:model:use');

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'model:model:deploy', '模型开发', 'ModelRegistry', 'DEPLOY', 3, '将模型用于部署'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'model:model:deploy');

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'model:version:write', '模型开发', 'ModelVersion', 'WRITE', 2, '创建模型版本'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'model:version:write');

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'model:version:manage', '模型开发', 'ModelVersion', 'MANAGE', 3, '流转模型版本'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'model:version:manage');

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'model:version:delete', '模型开发', 'ModelVersion', 'DELETE', 3, '删除模型版本'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code = 'model:version:delete');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code
FROM platform_permission
WHERE code IN (
    'model:model:read', 'model:model:write', 'model:model:manage',
    'model:model:download', 'model:model:use', 'model:model:deploy',
    'model:version:write', 'model:version:manage', 'model:version:delete'
)
AND NOT EXISTS (
    SELECT 1 FROM platform_role_permission rp
    WHERE rp.id = CONCAT('SUPER_ADMIN::', platform_permission.code)
);

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::model:model:read', 'BU_ADMIN', 'model:model:read'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::model:model:read');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::model:model:write', 'BU_ADMIN', 'model:model:write'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::model:model:write');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::model:model:manage', 'BU_ADMIN', 'model:model:manage'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::model:model:manage');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::model:model:download', 'BU_ADMIN', 'model:model:download'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::model:model:download');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::model:model:use', 'BU_ADMIN', 'model:model:use'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::model:model:use');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::model:model:deploy', 'BU_ADMIN', 'model:model:deploy'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::model:model:deploy');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::model:version:write', 'BU_ADMIN', 'model:version:write'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::model:version:write');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::model:version:manage', 'BU_ADMIN', 'model:version:manage'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::model:version:manage');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'BU_ADMIN::model:version:delete', 'BU_ADMIN', 'model:version:delete'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'BU_ADMIN::model:version:delete');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'MODEL_TRAINER::menu:hub', 'MODEL_TRAINER', 'menu:hub'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'MODEL_TRAINER::menu:hub');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'MODEL_TRAINER::model:model:read', 'MODEL_TRAINER', 'model:model:read'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'MODEL_TRAINER::model:model:read');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'MODEL_TRAINER::model:model:write', 'MODEL_TRAINER', 'model:model:write'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'MODEL_TRAINER::model:model:write');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'MODEL_TRAINER::model:model:download', 'MODEL_TRAINER', 'model:model:download'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'MODEL_TRAINER::model:model:download');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'MODEL_TRAINER::model:model:use', 'MODEL_TRAINER', 'model:model:use'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'MODEL_TRAINER::model:model:use');
INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT 'MODEL_TRAINER::model:version:write', 'MODEL_TRAINER', 'model:version:write'
WHERE NOT EXISTS (SELECT 1 FROM platform_role_permission WHERE id = 'MODEL_TRAINER::model:version:write');
