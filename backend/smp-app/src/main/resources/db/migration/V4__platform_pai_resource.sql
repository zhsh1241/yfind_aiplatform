ALTER TABLE platform_tenant ADD COLUMN pai_binding_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE platform_pai_connection (
    id VARCHAR(96) PRIMARY KEY,
    scope_type VARCHAR(32) NOT NULL,
    scope_id VARCHAR(64) NOT NULL,
    region_id VARCHAR(128) NOT NULL,
    endpoint VARCHAR(256) NOT NULL,
    workspace_id VARCHAR(128) NOT NULL,
    quota_id VARCHAR(128) NOT NULL,
    resource_group_id VARCHAR(128) NOT NULL,
    credential_mode VARCHAR(32) NOT NULL,
    credential_ref_masked VARCHAR(256) NOT NULL,
    enabled BOOLEAN NOT NULL,
    status VARCHAR(32) NOT NULL,
    diagnostic_code VARCHAR(64) NOT NULL,
    diagnostic_message VARCHAR(512) NOT NULL,
    updated_by VARCHAR(64) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_platform_pai_connection_scope UNIQUE (scope_type, scope_id),
    CONSTRAINT fk_platform_pai_connection_scope FOREIGN KEY (scope_id) REFERENCES platform_tenant(id)
);

CREATE TABLE platform_pai_resource_binding (
    binding_id VARCHAR(96) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    scope_type VARCHAR(32) NOT NULL,
    workspace_id VARCHAR(128) NOT NULL,
    workspace_name VARCHAR(128) NOT NULL,
    quota_id VARCHAR(128) NOT NULL,
    quota_name VARCHAR(128) NOT NULL,
    resource_group_id VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    diagnostic_code VARCHAR(64) NOT NULL,
    diagnostic_message VARCHAR(512) NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_by VARCHAR(64) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_platform_pai_binding_org FOREIGN KEY (organization_id) REFERENCES platform_tenant(id)
);
CREATE INDEX idx_platform_pai_binding_org_status ON platform_pai_resource_binding (organization_id, status);

CREATE TABLE platform_pai_resource_snapshot (
    snapshot_id VARCHAR(96) PRIMARY KEY,
    binding_id VARCHAR(96) NOT NULL,
    source_version VARCHAR(64) NOT NULL,
    usage_summary_json VARCHAR(4000) NOT NULL,
    node_summary_json VARCHAR(4000) NOT NULL,
    pool_summary_json VARCHAR(4000) NOT NULL,
    storage_summary_json VARCHAR(4000) NOT NULL,
    status VARCHAR(32) NOT NULL,
    stale BOOLEAN NOT NULL,
    diagnostic_code VARCHAR(64) NOT NULL,
    diagnostic_message VARCHAR(512) NOT NULL,
    pai_request_id VARCHAR(128),
    trace_id VARCHAR(128),
    last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_platform_pai_snapshot_binding FOREIGN KEY (binding_id) REFERENCES platform_pai_resource_binding(binding_id)
);
CREATE INDEX idx_platform_pai_snapshot_binding_time ON platform_pai_resource_snapshot (binding_id, last_sync_at DESC);

CREATE TABLE platform_pai_sync_log (
    sync_id VARCHAR(96) PRIMARY KEY,
    binding_id VARCHAR(96) NOT NULL,
    trigger_type VARCHAR(32) NOT NULL,
    actor_user_id VARCHAR(64) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_ms BIGINT NOT NULL,
    result VARCHAR(32) NOT NULL,
    diagnostic_code VARCHAR(64) NOT NULL,
    diagnostic_message VARCHAR(512) NOT NULL,
    pai_request_id VARCHAR(128),
    trace_id VARCHAR(128),
    CONSTRAINT fk_platform_pai_sync_binding FOREIGN KEY (binding_id) REFERENCES platform_pai_resource_binding(binding_id)
);
CREATE INDEX idx_platform_pai_sync_binding_time ON platform_pai_sync_log (binding_id, started_at DESC);

INSERT INTO platform_permission (code, module, resource, action, level, description) VALUES
    ('menu:resource', '平台管理', 'Menu', 'READ', 1, '资源管理菜单'),
    ('platform:pai-resource:read', '资源管理', 'PaiResource', 'READ', 2, '读取 PAI 资源视图'),
    ('platform:pai-resource:configure', '资源管理', 'PaiConnection', 'CONFIGURE', 4, '配置 PAI 连接'),
    ('platform:pai-resource:sync', '资源管理', 'PaiResource', 'SYNC', 3, '同步 PAI 资源快照'),
    ('platform:pai-resource:binding:read', '资源管理', 'PaiResourceBinding', 'READ', 2, '读取 PAI 资源绑定'),
    ('platform:pai-resource:binding:update', '资源管理', 'PaiResourceBinding', 'UPDATE', 3, '更新 PAI 资源绑定'),
    ('platform:pai-resource:diagnostic:read', '资源管理', 'PaiDiagnostic', 'READ', 2, '读取 PAI 诊断'),
    ('platform:pai-resource:reference:read', '资源管理', 'PaiResourceReference', 'READ', 2, '读取后续任务资源引用');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code
FROM platform_permission
WHERE code IN (
    'menu:resource',
    'platform:pai-resource:read',
    'platform:pai-resource:configure',
    'platform:pai-resource:sync',
    'platform:pai-resource:binding:read',
    'platform:pai-resource:binding:update',
    'platform:pai-resource:diagnostic:read',
    'platform:pai-resource:reference:read'
);

INSERT INTO platform_role_permission (id, role_code, permission_code) VALUES
    ('BU_ADMIN::menu:resource', 'BU_ADMIN', 'menu:resource'),
    ('BU_ADMIN::platform:pai-resource:read', 'BU_ADMIN', 'platform:pai-resource:read'),
    ('BU_ADMIN::platform:pai-resource:sync', 'BU_ADMIN', 'platform:pai-resource:sync'),
    ('BU_ADMIN::platform:pai-resource:binding:read', 'BU_ADMIN', 'platform:pai-resource:binding:read'),
    ('BU_ADMIN::platform:pai-resource:diagnostic:read', 'BU_ADMIN', 'platform:pai-resource:diagnostic:read'),
    ('BU_ADMIN::platform:pai-resource:reference:read', 'BU_ADMIN', 'platform:pai-resource:reference:read');

INSERT INTO platform_pai_connection (id, scope_type, scope_id, region_id, endpoint, workspace_id, quota_id, resource_group_id, credential_mode, credential_ref_masked, enabled, status, diagnostic_code, diagnostic_message, updated_by, updated_at) VALUES
    ('PAI-CONN-GLOBAL', 'GLOBAL', 'TENANT-YF', 'TODO_CONFIRM_PAI_REGION', 'TODO_CONFIRM_PAI_ENDPOINT', 'TODO_CONFIRM_PAI_WORKSPACE_ID', 'TODO_CONFIRM_PAI_QUOTA_ID', 'TODO_CONFIRM_PAI_RESOURCE_GROUP_ID', 'RAM_ROLE', 'TODO_CONFIRM_PAI_RAM_ROLE_ARN', FALSE, 'UNCONFIGURED', 'PAI_UNCONFIGURED', 'TODO_CONFIRM_PAI_REGION;TODO_CONFIRM_PAI_WORKSPACE_ID;TODO_CONFIRM_PAI_QUOTA_ID', 'USR-ADMIN', CURRENT_TIMESTAMP);

INSERT INTO platform_pai_resource_binding (binding_id, organization_id, scope_type, workspace_id, workspace_name, quota_id, quota_name, resource_group_id, status, diagnostic_code, diagnostic_message, created_by, created_at, updated_by, updated_at) VALUES
    ('PAI-BIND-CABIN', 'TENANT-CABIN', 'BU', 'pai-ws-cabin-sandbox', 'PAI-CABIN-SANDBOX', 'quota-cabin-sandbox', '训练资源配额 Sandbox', 'rg-cabin-general', 'ACTIVE', 'OK', 'SANDBOX_PAI_BINDING_FOR_CONTRACT_TEST_ONLY', 'USR-ADMIN', CURRENT_TIMESTAMP, 'USR-ADMIN', CURRENT_TIMESTAMP),
    ('PAI-BIND-QE', 'TENANT-QE', 'BU', 'pai-ws-qe-sandbox', 'PAI-QE-SANDBOX', 'quota-qe-sandbox', '质检资源配额 Sandbox', 'rg-qe-general', 'ACTIVE', 'OK', 'SANDBOX_PAI_BINDING_FOR_CONTRACT_TEST_ONLY', 'USR-ADMIN', CURRENT_TIMESTAMP, 'USR-ADMIN', CURRENT_TIMESTAMP);

INSERT INTO platform_pai_resource_snapshot (snapshot_id, binding_id, source_version, usage_summary_json, node_summary_json, pool_summary_json, storage_summary_json, status, stale, diagnostic_code, diagnostic_message, pai_request_id, trace_id, last_sync_at) VALUES
    ('PAI-SNAP-CABIN-SEED', 'PAI-BIND-CABIN', 'SANDBOX-2026-05-17',
     '[{"key":"gpu","label":"GPU 总量","used":36,"total":48,"unit":"卡","percent":75,"status":"WARNING"},{"key":"npu","label":"NPU 算力","used":6,"total":16,"unit":"卡","percent":38,"status":"READY"},{"key":"cpu","label":"CPU 核心","used":128,"total":192,"unit":"核","percent":67,"status":"READY"},{"key":"storage","label":"PAI/OSS 存储","used":145408,"total":204800,"unit":"GB","percent":71,"status":"READY"}]',
     '[{"nodeId":"pai-node-a100-01","sourceType":"PAI_QUOTA_NODE","hostOrZone":"cn-shanghai-a","gpuSpec":"8×A100 80G","cpuCores":96,"memoryGb":768,"gpuTotal":8,"gpuUsed":6,"gpuUtilizationPercent":75,"status":"READY","diagnostic":"from PAI quota sandbox snapshot"}]',
     '[{"poolId":"quota-cabin-sandbox","poolName":"训练资源配额 Sandbox","sourceType":"PAI_RESOURCE_QUOTA","bindingId":"PAI-BIND-CABIN","quotaId":"quota-cabin-sandbox","workspaceId":"pai-ws-cabin-sandbox","gpuUsed":21,"gpuTotal":24,"cpuUsed":240,"cpuTotal":384,"memoryUsedGb":1024,"memoryTotalGb":1536,"userCount":12,"status":"READY"}]',
     '[{"storageId":"oss-pai-workspace-cabin","name":"PAI Workspace OSS","sourceType":"PAI_WORKSPACE_STORAGE","capacityGb":204800,"usedGb":145408,"percent":71,"status":"READY","diagnostic":"workspace storage sandbox summary"}]',
     'READY', FALSE, 'OK', 'PAI resource sandbox snapshot synchronized', 'SANDBOX-REQUEST-CABIN', 'seed', CURRENT_TIMESTAMP);
