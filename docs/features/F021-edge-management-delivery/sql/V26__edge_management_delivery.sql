CREATE TABLE edge_server (
    edge_server_id VARCHAR(96) PRIMARY KEY,
    server_name VARCHAR(128) NOT NULL,
    location VARCHAR(255) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    owner_user_id VARCHAR(64) NOT NULL,
    host_address VARCHAR(128) NOT NULL,
    agent_version VARCHAR(64),
    hardware_summary_json VARCHAR(4000),
    resource_summary_json VARCHAR(4000),
    status VARCHAR(32) NOT NULL,
    diagnostic VARCHAR(1000),
    tenant_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    decommissioned_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_edge_server_org FOREIGN KEY (organization_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_edge_server_owner FOREIGN KEY (owner_user_id) REFERENCES platform_user(id),
    CONSTRAINT fk_edge_server_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id)
);

CREATE INDEX idx_edge_server_scope ON edge_server (tenant_id, organization_id, status);

CREATE TABLE edge_deployment (
    deployment_id VARCHAR(96) PRIMARY KEY,
    edge_server_id VARCHAR(96) NOT NULL,
    model_id VARCHAR(96) NOT NULL,
    version_id VARCHAR(96) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    version_no VARCHAR(64) NOT NULL,
    artifact_file_object_id VARCHAR(96) NOT NULL,
    artifact_sha256 VARCHAR(128) NOT NULL,
    strategy VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    approval_status VARCHAR(32) NOT NULL,
    requested_by VARCHAR(64) NOT NULL,
    approved_by VARCHAR(64),
    executed_by VARCHAR(64),
    tenant_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    diagnostic VARCHAR(1000),
    failure_reason VARCHAR(1000),
    retry_count INTEGER NOT NULL DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    deployed_at TIMESTAMP WITH TIME ZONE,
    rolled_back_at TIMESTAMP WITH TIME ZONE,
    rollback_target_deployment_id VARCHAR(96),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_edge_deployment_server FOREIGN KEY (edge_server_id) REFERENCES edge_server(edge_server_id),
    CONSTRAINT fk_edge_deployment_model FOREIGN KEY (model_id) REFERENCES model_registry_model(model_id),
    CONSTRAINT fk_edge_deployment_version FOREIGN KEY (version_id) REFERENCES model_registry_version(version_id),
    CONSTRAINT fk_edge_deployment_model_version FOREIGN KEY (model_id, version_id) REFERENCES model_registry_version(model_id, version_id),
    CONSTRAINT fk_edge_deployment_file FOREIGN KEY (artifact_file_object_id) REFERENCES platform_file_object(file_id),
    CONSTRAINT fk_edge_deployment_requester FOREIGN KEY (requested_by) REFERENCES platform_user(id),
    CONSTRAINT fk_edge_deployment_approver FOREIGN KEY (approved_by) REFERENCES platform_user(id),
    CONSTRAINT fk_edge_deployment_executor FOREIGN KEY (executed_by) REFERENCES platform_user(id),
    CONSTRAINT fk_edge_deployment_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_edge_deployment_org FOREIGN KEY (organization_id) REFERENCES platform_tenant(id)
);

CREATE INDEX idx_edge_deployment_server_status ON edge_deployment (edge_server_id, status);
CREATE INDEX idx_edge_deployment_model_status ON edge_deployment (model_id, version_id, status);
CREATE INDEX idx_edge_deployment_scope_status ON edge_deployment (tenant_id, organization_id, status);

CREATE TABLE edge_deployment_approval (
    approval_id VARCHAR(96) PRIMARY KEY,
    deployment_id VARCHAR(96) NOT NULL,
    approver_user_id VARCHAR(64) NOT NULL,
    decision VARCHAR(32) NOT NULL,
    comment VARCHAR(1000),
    decided_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_edge_approval_deployment FOREIGN KEY (deployment_id) REFERENCES edge_deployment(deployment_id),
    CONSTRAINT fk_edge_approval_user FOREIGN KEY (approver_user_id) REFERENCES platform_user(id)
);

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'menu:edge', '模型部署', 'Menu', 'READ', 1, '边端管理菜单'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='menu:edge');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'edge:server:read', '模型部署', 'EdgeServer', 'READ', 2, '查询边端服务器'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='edge:server:read');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'edge:server:write', '模型部署', 'EdgeServer', 'WRITE', 2, '管理边端服务器'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='edge:server:write');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'edge:deployment:read', '模型部署', 'EdgeDeployment', 'READ', 2, '查询边端下发'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='edge:deployment:read');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'edge:deployment:request', '模型部署', 'EdgeDeployment', 'REQUEST', 2, '申请边端下发'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='edge:deployment:request');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'edge:deployment:approve', '模型部署', 'EdgeDeployment', 'APPROVE', 3, '审批边端下发'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='edge:deployment:approve');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'edge:deployment:execute', '模型部署', 'EdgeDeployment', 'EXECUTE', 3, '执行边端下发'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='edge:deployment:execute');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code FROM platform_permission
WHERE code IN ('menu:edge','edge:server:read','edge:server:write','edge:deployment:read','edge:deployment:request','edge:deployment:approve','edge:deployment:execute')
AND NOT EXISTS (SELECT 1 FROM platform_role_permission rp WHERE rp.id=CONCAT('SUPER_ADMIN::', platform_permission.code));

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('BU_ADMIN::', code), 'BU_ADMIN', code FROM platform_permission
WHERE code IN ('menu:edge','edge:server:read','edge:server:write','edge:deployment:read','edge:deployment:request','edge:deployment:approve','edge:deployment:execute')
AND NOT EXISTS (SELECT 1 FROM platform_role_permission rp WHERE rp.id=CONCAT('BU_ADMIN::', platform_permission.code));

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('MODEL_OPS::', code), 'MODEL_OPS', code FROM platform_permission
WHERE code IN ('menu:edge','edge:server:read','edge:deployment:read','edge:deployment:request','edge:deployment:execute')
AND NOT EXISTS (SELECT 1 FROM platform_role_permission rp WHERE rp.id=CONCAT('MODEL_OPS::', platform_permission.code));
