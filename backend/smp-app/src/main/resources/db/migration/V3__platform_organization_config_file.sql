ALTER TABLE platform_tenant ADD COLUMN tenant_type VARCHAR(32) NOT NULL DEFAULT 'BU';
ALTER TABLE platform_tenant ADD COLUMN path VARCHAR(512);
ALTER TABLE platform_tenant ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai';
ALTER TABLE platform_tenant ADD COLUMN default_locale VARCHAR(32) NOT NULL DEFAULT 'zh-CN';
ALTER TABLE platform_tenant ADD COLUMN quota_gpu INTEGER NOT NULL DEFAULT 8;
ALTER TABLE platform_tenant ADD COLUMN quota_storage_tb INTEGER NOT NULL DEFAULT 5;
ALTER TABLE platform_tenant ADD COLUMN api_rate_limit_per_day INTEGER NOT NULL DEFAULT 10000;
ALTER TABLE platform_tenant ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE platform_tenant SET tenant_type='CORP', path='/TENANT-YF', quota_gpu=200, quota_storage_tb=2000, api_rate_limit_per_day=50000 WHERE id='TENANT-YF';
UPDATE platform_tenant SET tenant_type='BU', path='/TENANT-YF/TENANT-CABIN', quota_gpu=50, quota_storage_tb=500, api_rate_limit_per_day=10000 WHERE id='TENANT-CABIN';
UPDATE platform_tenant SET tenant_type='BU', path='/TENANT-YF/TENANT-QE', quota_gpu=24, quota_storage_tb=200, api_rate_limit_per_day=8000 WHERE id='TENANT-QE';

CREATE UNIQUE INDEX uk_platform_tenant_project_parent_code ON platform_tenant (parent_id, code);
CREATE INDEX idx_platform_tenant_parent_status ON platform_tenant (parent_id, status);
CREATE INDEX idx_platform_tenant_type_status ON platform_tenant (tenant_type, status);

CREATE TABLE platform_organization_member (
    id VARCHAR(96) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    role_code VARCHAR(64) NOT NULL,
    scope_type VARCHAR(32) NOT NULL,
    scope_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_platform_org_member UNIQUE (organization_id, user_id, role_code, scope_type, scope_id),
    CONSTRAINT fk_platform_org_member_org FOREIGN KEY (organization_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_platform_org_member_user FOREIGN KEY (user_id) REFERENCES platform_user(id),
    CONSTRAINT fk_platform_org_member_role FOREIGN KEY (role_code) REFERENCES platform_role(code)
);
CREATE INDEX idx_platform_org_member_org_status ON platform_organization_member (organization_id, status);
CREATE INDEX idx_platform_org_member_user_status ON platform_organization_member (user_id, status);

CREATE TABLE platform_config_definition (
    config_key VARCHAR(128) PRIMARY KEY,
    group_name VARCHAR(64) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    value_type VARCHAR(32) NOT NULL,
    default_value VARCHAR(1000) NOT NULL,
    sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    scope_allowed VARCHAR(128) NOT NULL,
    validation_rule VARCHAR(512),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE platform_config_value (
    id VARCHAR(160) PRIMARY KEY,
    config_key VARCHAR(128) NOT NULL,
    scope_type VARCHAR(32) NOT NULL,
    scope_id VARCHAR(64) NOT NULL,
    value_json VARCHAR(2000) NOT NULL,
    masked_value VARCHAR(512),
    version INTEGER NOT NULL,
    updated_by VARCHAR(64) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_platform_config_value UNIQUE (config_key, scope_type, scope_id),
    CONSTRAINT fk_platform_config_value_definition FOREIGN KEY (config_key) REFERENCES platform_config_definition(config_key)
);
CREATE INDEX idx_platform_config_value_scope ON platform_config_value (scope_type, scope_id);

CREATE TABLE platform_config_version (
    id VARCHAR(96) PRIMARY KEY,
    config_key VARCHAR(128) NOT NULL,
    scope_type VARCHAR(32) NOT NULL,
    scope_id VARCHAR(64) NOT NULL,
    version INTEGER NOT NULL,
    value_json VARCHAR(2000) NOT NULL,
    reason VARCHAR(512),
    changed_by VARCHAR(64) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_platform_config_version_definition FOREIGN KEY (config_key) REFERENCES platform_config_definition(config_key)
);
CREATE INDEX idx_platform_config_version_key_scope ON platform_config_version (config_key, scope_type, scope_id, version DESC);

CREATE TABLE platform_file_object (
    file_id VARCHAR(96) PRIMARY KEY,
    asset_type VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64),
    bucket VARCHAR(128) NOT NULL,
    object_key VARCHAR(512) NOT NULL,
    expected_sha256 VARCHAR(128),
    sha256 VARCHAR(128),
    expected_size_bytes BIGINT,
    size_bytes BIGINT,
    content_type VARCHAR(128),
    storage_tier VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    owner_id VARCHAR(64) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_platform_file_object_key UNIQUE (bucket, object_key),
    CONSTRAINT fk_platform_file_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_platform_file_project FOREIGN KEY (project_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_platform_file_owner FOREIGN KEY (owner_id) REFERENCES platform_user(id)
);
CREATE INDEX idx_platform_file_scope_status ON platform_file_object (tenant_id, project_id, status);

CREATE TABLE platform_notification_channel (
    channel_id VARCHAR(96) PRIMARY KEY,
    channel_type VARCHAR(32) NOT NULL,
    scope_type VARCHAR(32) NOT NULL,
    scope_id VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    enabled BOOLEAN NOT NULL,
    config_masked VARCHAR(2000),
    status VARCHAR(32) NOT NULL,
    diagnostic VARCHAR(512),
    last_test_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_platform_notification_channel UNIQUE (channel_type, scope_type, scope_id)
);
CREATE INDEX idx_platform_notification_scope ON platform_notification_channel (scope_type, scope_id, enabled);

CREATE TABLE platform_notification_test_log (
    id VARCHAR(96) PRIMARY KEY,
    channel_id VARCHAR(96) NOT NULL,
    result VARCHAR(32) NOT NULL,
    diagnostic VARCHAR(512),
    tested_by VARCHAR(64) NOT NULL,
    tested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_platform_notification_test_channel FOREIGN KEY (channel_id) REFERENCES platform_notification_channel(channel_id)
);
CREATE INDEX idx_platform_notification_test_channel ON platform_notification_test_log (channel_id, tested_at DESC);

CREATE TABLE platform_api_key (
    key_id VARCHAR(96) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    prefix VARCHAR(32) NOT NULL,
    key_hash VARCHAR(128) NOT NULL,
    masked_key VARCHAR(128) NOT NULL,
    scope_type VARCHAR(32) NOT NULL,
    scope_id VARCHAR(64) NOT NULL,
    permissions VARCHAR(1000),
    status VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uk_platform_api_key_prefix UNIQUE (prefix),
    CONSTRAINT uk_platform_api_key_hash UNIQUE (key_hash)
);
CREATE INDEX idx_platform_api_key_scope_status ON platform_api_key (scope_type, scope_id, status);

INSERT INTO platform_permission (code, module, resource, action, level, description) VALUES
    ('menu:org', '平台管理', 'Menu', 'READ', 1, '组织管理菜单'),
    ('menu:sys', '平台管理', 'Menu', 'READ', 1, '系统配置菜单'),
    ('platform:organization:read', '平台管理', 'Organization', 'READ', 2, '读取组织树'),
    ('platform:organization:create', '平台管理', 'Organization', 'CREATE', 2, '创建组织节点'),
    ('platform:organization:update', '平台管理', 'Organization', 'UPDATE', 2, '更新组织节点'),
    ('platform:organization:delete', '平台管理', 'Organization', 'DELETE', 3, '禁用组织节点'),
    ('platform:organization:member:read', '平台管理', 'OrganizationMember', 'READ', 2, '读取组织成员'),
    ('platform:organization:member:assign', '平台管理', 'OrganizationMember', 'ASSIGN', 3, '分配组织成员'),
    ('platform:organization:member:remove', '平台管理', 'OrganizationMember', 'REMOVE', 3, '移除组织成员'),
    ('platform:config:read', '平台管理', 'Config', 'READ', 2, '读取系统配置'),
    ('platform:config:update', '平台管理', 'Config', 'UPDATE', 3, '更新系统配置'),
    ('platform:config:test', '平台管理', 'Config', 'TEST', 2, '测试配置连通性'),
    ('platform:config:sensitive:read', '平台管理', 'Config', 'READ_SENSITIVE', 4, '读取敏感配置'),
    ('platform:file:read', '平台管理', 'FileObject', 'READ', 2, '读取文件元数据'),
    ('platform:file:init', '平台管理', 'FileObject', 'INIT', 2, '初始化文件上传'),
    ('platform:file:complete', '平台管理', 'FileObject', 'COMPLETE', 2, '完成文件上传登记'),
    ('platform:file:delete', '平台管理', 'FileObject', 'DELETE', 3, '软删除文件'),
    ('platform:file:restore', '平台管理', 'FileObject', 'RESTORE', 3, '恢复文件'),
    ('platform:file:download', '平台管理', 'FileObject', 'DOWNLOAD', 2, '生成下载授权'),
    ('platform:notification:read', '平台管理', 'NotificationChannel', 'READ', 2, '读取通知渠道'),
    ('platform:notification:update', '平台管理', 'NotificationChannel', 'UPDATE', 3, '更新通知渠道'),
    ('platform:notification:test', '平台管理', 'NotificationChannel', 'TEST', 2, '测试通知渠道'),
    ('platform:apikey:read', '平台管理', 'ApiKey', 'READ', 2, '读取 API Key'),
    ('platform:apikey:create', '平台管理', 'ApiKey', 'CREATE', 4, '创建 API Key'),
    ('platform:apikey:revoke', '平台管理', 'ApiKey', 'REVOKE', 4, '撤销 API Key');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code
FROM platform_permission
WHERE code IN (
    'menu:org','menu:sys',
    'platform:organization:read','platform:organization:create','platform:organization:update','platform:organization:delete',
    'platform:organization:member:read','platform:organization:member:assign','platform:organization:member:remove',
    'platform:config:read','platform:config:update','platform:config:test','platform:config:sensitive:read',
    'platform:file:read','platform:file:init','platform:file:complete','platform:file:delete','platform:file:restore','platform:file:download',
    'platform:notification:read','platform:notification:update','platform:notification:test',
    'platform:apikey:read','platform:apikey:create','platform:apikey:revoke'
);

INSERT INTO platform_role_permission (id, role_code, permission_code) VALUES
    ('BU_ADMIN::menu:org', 'BU_ADMIN', 'menu:org'),
    ('BU_ADMIN::menu:sys', 'BU_ADMIN', 'menu:sys'),
    ('BU_ADMIN::platform:organization:read', 'BU_ADMIN', 'platform:organization:read'),
    ('BU_ADMIN::platform:organization:create', 'BU_ADMIN', 'platform:organization:create'),
    ('BU_ADMIN::platform:organization:update', 'BU_ADMIN', 'platform:organization:update'),
    ('BU_ADMIN::platform:organization:delete', 'BU_ADMIN', 'platform:organization:delete'),
    ('BU_ADMIN::platform:organization:member:read', 'BU_ADMIN', 'platform:organization:member:read'),
    ('BU_ADMIN::platform:organization:member:assign', 'BU_ADMIN', 'platform:organization:member:assign'),
    ('BU_ADMIN::platform:organization:member:remove', 'BU_ADMIN', 'platform:organization:member:remove'),
    ('BU_ADMIN::platform:config:read', 'BU_ADMIN', 'platform:config:read'),
    ('BU_ADMIN::platform:config:update', 'BU_ADMIN', 'platform:config:update'),
    ('BU_ADMIN::platform:config:test', 'BU_ADMIN', 'platform:config:test'),
    ('BU_ADMIN::platform:file:read', 'BU_ADMIN', 'platform:file:read'),
    ('BU_ADMIN::platform:file:init', 'BU_ADMIN', 'platform:file:init'),
    ('BU_ADMIN::platform:file:complete', 'BU_ADMIN', 'platform:file:complete'),
    ('BU_ADMIN::platform:file:delete', 'BU_ADMIN', 'platform:file:delete'),
    ('BU_ADMIN::platform:file:restore', 'BU_ADMIN', 'platform:file:restore'),
    ('BU_ADMIN::platform:file:download', 'BU_ADMIN', 'platform:file:download'),
    ('BU_ADMIN::platform:notification:read', 'BU_ADMIN', 'platform:notification:read'),
    ('BU_ADMIN::platform:notification:update', 'BU_ADMIN', 'platform:notification:update'),
    ('BU_ADMIN::platform:notification:test', 'BU_ADMIN', 'platform:notification:test'),
    ('BU_ADMIN::platform:apikey:read', 'BU_ADMIN', 'platform:apikey:read'),
    ('BU_ADMIN::platform:apikey:create', 'BU_ADMIN', 'platform:apikey:create'),
    ('BU_ADMIN::platform:apikey:revoke', 'BU_ADMIN', 'platform:apikey:revoke');

INSERT INTO platform_organization_member (id, organization_id, user_id, role_code, scope_type, scope_id, status, expires_at, created_by, created_at, updated_at) VALUES
    ('OM-TENANT-YF-USR-ADMIN', 'TENANT-YF', 'USR-ADMIN', 'SUPER_ADMIN', 'GLOBAL', 'TENANT-YF', 'ACTIVE', NULL, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('OM-TENANT-CABIN-USR-BU-CABIN', 'TENANT-CABIN', 'USR-BU-CABIN', 'BU_ADMIN', 'BU', 'TENANT-CABIN', 'ACTIVE', NULL, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('OM-TENANT-CABIN-USR-ANNOTATOR', 'TENANT-CABIN', 'USR-ANNOTATOR', 'DATA_ANNOTATOR', 'BU', 'TENANT-CABIN', 'ACTIVE', NULL, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('OM-TENANT-QE-USR-QE', 'TENANT-QE', 'USR-QE', 'DATA_REVIEWER', 'BU', 'TENANT-QE', 'ACTIVE', NULL, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO platform_config_definition (config_key, group_name, display_name, value_type, default_value, sensitive, scope_allowed, validation_rule, status, created_at) VALUES
    ('platform.name', 'basic', '平台名称', 'STRING', '延锋 SMP 工业AI平台', FALSE, 'GLOBAL,BU', 'maxLength=80', 'ACTIVE', CURRENT_TIMESTAMP),
    ('platform.language', 'basic', '平台语言', 'STRING', '简体中文', FALSE, 'GLOBAL,BU', 'enum=简体中文,English', 'ACTIVE', CURRENT_TIMESTAMP),
    ('platform.timezone', 'basic', '时区', 'STRING', 'Asia/Shanghai (UTC+8)', FALSE, 'GLOBAL,BU,PROJECT', 'timezone', 'ACTIVE', CURRENT_TIMESTAMP),
    ('session.timeoutMinutes', 'basic', '会话超时', 'NUMBER', '120', FALSE, 'GLOBAL,BU', 'min=15;max=720', 'ACTIVE', CURRENT_TIMESTAMP),
    ('storage.endpoint', 'storage', '对象存储 Endpoint', 'STRING', 'TODO_CONFIRM_MINIO_ENDPOINT', TRUE, 'GLOBAL', 'todoConfirm', 'ACTIVE', CURRENT_TIMESTAMP),
    ('storage.bucket', 'storage', '存储 Bucket', 'STRING', 'TODO_CONFIRM_MINIO_BUCKET', FALSE, 'GLOBAL,BU', 'bucket', 'ACTIVE', CURRENT_TIMESTAMP),
    ('upload.maxFileSizeMb', 'storage', '最大上传文件', 'NUMBER', '200', FALSE, 'GLOBAL,BU,PROJECT', 'min=1;max=102400', 'ACTIVE', CURRENT_TIMESTAMP),
    ('notification.smtpHost', 'notification', 'SMTP Host', 'STRING', 'TODO_CONFIRM_SMTP_HOST', TRUE, 'GLOBAL,BU', 'todoConfirm', 'ACTIVE', CURRENT_TIMESTAMP),
    ('security.evalDatasetDownload', 'security', '评估集下载开关', 'BOOLEAN', 'true', FALSE, 'GLOBAL,BU,PROJECT', 'boolean', 'ACTIVE', CURRENT_TIMESTAMP),
    ('auth.ssoMetadataUrl', 'auth', 'IdP 元数据 URL', 'STRING', 'TODO_CONFIRM_IDP_METADATA_URL', TRUE, 'GLOBAL', 'todoConfirm', 'ACTIVE', CURRENT_TIMESTAMP),
    ('tag.defaultScenario', 'tag', '默认业务标签', 'STRING', '质量检测', FALSE, 'GLOBAL,BU', 'maxLength=80', 'ACTIVE', CURRENT_TIMESTAMP);

INSERT INTO platform_config_value (id, config_key, scope_type, scope_id, value_json, masked_value, version, updated_by, updated_at) VALUES
    ('CV-platform.name-GLOBAL-TENANT-YF', 'platform.name', 'GLOBAL', 'TENANT-YF', '延锋 SMP 工业AI平台', NULL, 1, 'USR-ADMIN', CURRENT_TIMESTAMP),
    ('CV-upload.maxFileSizeMb-GLOBAL-TENANT-YF', 'upload.maxFileSizeMb', 'GLOBAL', 'TENANT-YF', '200', NULL, 1, 'USR-ADMIN', CURRENT_TIMESTAMP),
    ('CV-upload.maxFileSizeMb-BU-TENANT-CABIN', 'upload.maxFileSizeMb', 'BU', 'TENANT-CABIN', '120', NULL, 1, 'USR-ADMIN', CURRENT_TIMESTAMP),
    ('CV-storage.endpoint-GLOBAL-TENANT-YF', 'storage.endpoint', 'GLOBAL', 'TENANT-YF', 'TODO_CONFIRM_MINIO_ENDPOINT', 'TODO_CONFIRM_MINIO_ENDPOINT', 1, 'USR-ADMIN', CURRENT_TIMESTAMP),
    ('CV-notification.smtpHost-GLOBAL-TENANT-YF', 'notification.smtpHost', 'GLOBAL', 'TENANT-YF', 'TODO_CONFIRM_SMTP_HOST', 'TODO_CONFIRM_SMTP_HOST', 1, 'USR-ADMIN', CURRENT_TIMESTAMP);

INSERT INTO platform_notification_channel (channel_id, channel_type, scope_type, scope_id, name, enabled, config_masked, status, diagnostic, last_test_at, created_at, updated_at) VALUES
    ('NC-GLOBAL-EMAIL', 'EMAIL', 'GLOBAL', 'TENANT-YF', '邮件通知', TRUE, 'host=TODO_CONFIRM_SMTP_HOST;sender=TODO_CONFIRM_SMTP_SENDER', 'UNCONFIGURED', 'TODO_CONFIRM_SMTP_HOST', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('NC-GLOBAL-DINGTALK', 'DINGTALK', 'GLOBAL', 'TENANT-YF', '钉钉通知', FALSE, 'webhook=TODO_CONFIRM_DINGTALK_WEBHOOK', 'UNCONFIGURED', 'TODO_CONFIRM_DINGTALK_WEBHOOK', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('NC-GLOBAL-WECHAT', 'WECHAT', 'GLOBAL', 'TENANT-YF', '质量检测', FALSE, 'webhook=TODO_CONFIRM_WECHAT_WEBHOOK', 'UNCONFIGURED', 'TODO_CONFIRM_WECHAT_WEBHOOK', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('NC-GLOBAL-WEBHOOK', 'WEBHOOK', 'GLOBAL', 'TENANT-YF', '通用 Webhook', FALSE, 'url=TODO_CONFIRM_WEBHOOK_URL', 'UNCONFIGURED', 'TODO_CONFIRM_WEBHOOK_URL', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
