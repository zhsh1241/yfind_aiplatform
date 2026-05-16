CREATE TABLE platform_tenant (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    parent_id VARCHAR(64),
    status VARCHAR(32) NOT NULL
);

CREATE TABLE platform_user (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(128) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    email VARCHAR(255),
    tenant_id VARCHAR(64) NOT NULL,
    bu_code VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    auth_type VARCHAR(32) NOT NULL,
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    session_version INTEGER NOT NULL DEFAULT 1,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_platform_user_username_tenant UNIQUE (username, tenant_id),
    CONSTRAINT fk_platform_user_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id)
);

CREATE TABLE platform_role (
    code VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    scope VARCHAR(32) NOT NULL,
    preset BOOLEAN NOT NULL,
    tenant_id VARCHAR(64),
    status VARCHAR(32) NOT NULL
);

CREATE TABLE platform_permission (
    code VARCHAR(128) PRIMARY KEY,
    module VARCHAR(64) NOT NULL,
    resource VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    level INTEGER NOT NULL,
    description VARCHAR(512) NOT NULL
);

CREATE TABLE platform_role_permission (
    id VARCHAR(192) PRIMARY KEY,
    role_code VARCHAR(64) NOT NULL,
    permission_code VARCHAR(128) NOT NULL,
    CONSTRAINT uk_platform_role_permission UNIQUE (role_code, permission_code),
    CONSTRAINT fk_platform_role_permission_role FOREIGN KEY (role_code) REFERENCES platform_role(code),
    CONSTRAINT fk_platform_role_permission_permission FOREIGN KEY (permission_code) REFERENCES platform_permission(code)
);

CREATE TABLE platform_user_role (
    id VARCHAR(192) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    role_code VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_platform_user_role UNIQUE (user_id, role_code, tenant_id),
    CONSTRAINT fk_platform_user_role_user FOREIGN KEY (user_id) REFERENCES platform_user(id),
    CONSTRAINT fk_platform_user_role_role FOREIGN KEY (role_code) REFERENCES platform_role(code),
    CONSTRAINT fk_platform_user_role_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id)
);

CREATE TABLE platform_session (
    access_token VARCHAR(128) PRIMARY KEY,
    refresh_token VARCHAR(128) NOT NULL UNIQUE,
    user_id VARCHAR(64) NOT NULL,
    session_version INTEGER NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_platform_session_user FOREIGN KEY (user_id) REFERENCES platform_user(id)
);

CREATE TABLE platform_audit_log (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    operator_id VARCHAR(64) NOT NULL,
    operator_name VARCHAR(128) NOT NULL,
    operator_role VARCHAR(128) NOT NULL,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128),
    result VARCHAR(32) NOT NULL,
    risk_level VARCHAR(32) NOT NULL,
    before_json VARCHAR(4000),
    after_json VARCHAR(4000),
    detail_json VARCHAR(4000),
    trace_id VARCHAR(128),
    signature VARCHAR(128) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_platform_user_tenant_status ON platform_user (tenant_id, status);
CREATE INDEX idx_platform_session_user ON platform_session (user_id, revoked_at);
CREATE INDEX idx_platform_audit_log_tenant_time ON platform_audit_log (tenant_id, occurred_at DESC);
CREATE INDEX idx_platform_audit_log_event ON platform_audit_log (event_id);

INSERT INTO platform_tenant (id, code, name, parent_id, status) VALUES
    ('TENANT-YF', 'YF', '延锋汽车内饰系统', NULL, 'ACTIVE'),
    ('TENANT-CABIN', 'CABIN', '智能座舱事业部', 'TENANT-YF', 'ACTIVE'),
    ('TENANT-QE', 'QE', '质量工程部', 'TENANT-YF', 'ACTIVE');

INSERT INTO platform_role (code, name, description, scope, preset, tenant_id, status) VALUES
    ('SUPER_ADMIN', '超级管理员', '全平台所有权限，包括用户、角色、权限、审计查看', 'GLOBAL', TRUE, NULL, 'ACTIVE'),
    ('BU_ADMIN', 'BU子管理员', 'BU 范围内用户和权限管理', 'TENANT', TRUE, NULL, 'ACTIVE'),
    ('DATA_ANNOTATOR', '数据标注工程师', '标注任务执行与数据集查看', 'TENANT', TRUE, NULL, 'ACTIVE'),
    ('DATA_REVIEWER', '审核工程师', '标注审核与质量复核', 'TENANT', TRUE, NULL, 'ACTIVE'),
    ('MODEL_TRAINER', '模型训练工程师', '模型训练与实验管理', 'TENANT', TRUE, NULL, 'ACTIVE'),
    ('MODEL_OPS', '模型应用工程师', '模型部署与推理服务运维', 'TENANT', TRUE, NULL, 'ACTIVE');

INSERT INTO platform_permission (code, module, resource, action, level, description) VALUES
    ('menu:dash', '工作台', 'Menu', 'READ', 1, '工作台菜单'),
    ('menu:usermgmt', '平台管理', 'Menu', 'READ', 1, '用户管理菜单'),
    ('menu:hub', '模型开发', 'Menu', 'READ', 1, '模型市场菜单'),
    ('menu:perm', '平台管理', 'Menu', 'READ', 1, '权限管理菜单'),
    ('platform:user:read', '平台管理', 'User', 'READ', 2, '查询用户'),
    ('platform:user:create', '平台管理', 'User', 'CREATE', 2, '创建用户'),
    ('platform:user:update', '平台管理', 'User', 'UPDATE', 2, '更新用户状态'),
    ('platform:role:assign', '平台管理', 'Role', 'ASSIGN', 2, '分配用户角色'),
    ('platform:role:read', '平台管理', 'Role', 'READ', 2, '查询角色'),
    ('platform:role:create', '平台管理', 'Role', 'CREATE', 2, '创建角色'),
    ('platform:permission:read', '平台管理', 'Permission', 'READ', 2, '查询权限矩阵'),
    ('platform:permission:update', '平台管理', 'Permission', 'UPDATE', 2, '更新角色权限'),
    ('platform:audit:read', '平台管理', 'AuditLog', 'READ', 2, '查询审计日志'),
    ('platform:audit:export', '平台管理', 'AuditLog', 'EXPORT', 2, '导出审计日志'),
    ('data:annotation:execute', '数据管理', 'AnnotationTask', 'EXECUTE', 2, '执行标注任务'),
    ('data:annotation:review', '数据管理', 'AnnotationTask', 'REVIEW', 2, '审核标注任务'),
    ('model:training:create', '模型开发', 'TrainingJob', 'CREATE', 2, '创建训练任务'),
    ('model:service:operate', '模型开发', 'InferenceService', 'OPERATE', 2, '运维推理服务');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code FROM platform_permission;

INSERT INTO platform_role_permission (id, role_code, permission_code) VALUES
    ('BU_ADMIN::menu:dash', 'BU_ADMIN', 'menu:dash'),
    ('BU_ADMIN::menu:usermgmt', 'BU_ADMIN', 'menu:usermgmt'),
    ('BU_ADMIN::menu:perm', 'BU_ADMIN', 'menu:perm'),
    ('BU_ADMIN::platform:user:read', 'BU_ADMIN', 'platform:user:read'),
    ('BU_ADMIN::platform:user:create', 'BU_ADMIN', 'platform:user:create'),
    ('BU_ADMIN::platform:user:update', 'BU_ADMIN', 'platform:user:update'),
    ('BU_ADMIN::platform:role:assign', 'BU_ADMIN', 'platform:role:assign'),
    ('BU_ADMIN::platform:role:read', 'BU_ADMIN', 'platform:role:read'),
    ('BU_ADMIN::platform:permission:read', 'BU_ADMIN', 'platform:permission:read'),
    ('DATA_ANNOTATOR::menu:dash', 'DATA_ANNOTATOR', 'menu:dash'),
    ('DATA_ANNOTATOR::menu:hub', 'DATA_ANNOTATOR', 'menu:hub'),
    ('DATA_ANNOTATOR::data:annotation:execute', 'DATA_ANNOTATOR', 'data:annotation:execute'),
    ('DATA_REVIEWER::menu:dash', 'DATA_REVIEWER', 'menu:dash'),
    ('DATA_REVIEWER::data:annotation:review', 'DATA_REVIEWER', 'data:annotation:review'),
    ('MODEL_TRAINER::menu:dash', 'MODEL_TRAINER', 'menu:dash'),
    ('MODEL_TRAINER::model:training:create', 'MODEL_TRAINER', 'model:training:create'),
    ('MODEL_OPS::menu:dash', 'MODEL_OPS', 'menu:dash'),
    ('MODEL_OPS::model:service:operate', 'MODEL_OPS', 'model:service:operate');

INSERT INTO platform_user (id, username, password_hash, display_name, email, tenant_id, bu_code, status, auth_type, failed_login_count, locked_until, session_version, last_login_at, created_at, updated_at) VALUES
    ('USR-ADMIN', 'admin', '$2a$10$iQHMpURId5.xHemjCnsDtuJm91Utedo7YpWjvcxdtlyYcwblCVSs.', '平台管理员', 'admin@yf.local', 'TENANT-YF', 'YF', 'ACTIVE', 'LOCAL', 0, NULL, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('USR-BU-CABIN', 'buadmin', '$2a$10$iQHMpURId5.xHemjCnsDtuJm91Utedo7YpWjvcxdtlyYcwblCVSs.', '座舱BU管理员', 'buadmin@yf.local', 'TENANT-CABIN', 'CABIN', 'ACTIVE', 'LOCAL', 0, NULL, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('USR-ANNOTATOR', 'annotator', '$2a$10$iQHMpURId5.xHemjCnsDtuJm91Utedo7YpWjvcxdtlyYcwblCVSs.', '数据标注员', 'annotator@yf.local', 'TENANT-CABIN', 'CABIN', 'ACTIVE', 'LOCAL', 0, NULL, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('USR-QE', 'qeuser', '$2a$10$iQHMpURId5.xHemjCnsDtuJm91Utedo7YpWjvcxdtlyYcwblCVSs.', '质量工程师', 'qeuser@yf.local', 'TENANT-QE', 'QE', 'ACTIVE', 'LOCAL', 0, NULL, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO platform_user_role (id, user_id, role_code, tenant_id, active, expires_at, created_at) VALUES
    ('USR-ADMIN::SUPER_ADMIN::TENANT-YF', 'USR-ADMIN', 'SUPER_ADMIN', 'TENANT-YF', TRUE, NULL, CURRENT_TIMESTAMP),
    ('USR-BU-CABIN::BU_ADMIN::TENANT-CABIN', 'USR-BU-CABIN', 'BU_ADMIN', 'TENANT-CABIN', TRUE, NULL, CURRENT_TIMESTAMP),
    ('USR-ANNOTATOR::DATA_ANNOTATOR::TENANT-CABIN', 'USR-ANNOTATOR', 'DATA_ANNOTATOR', 'TENANT-CABIN', TRUE, NULL, CURRENT_TIMESTAMP),
    ('USR-QE::DATA_REVIEWER::TENANT-QE', 'USR-QE', 'DATA_REVIEWER', 'TENANT-QE', TRUE, NULL, CURRENT_TIMESTAMP);
