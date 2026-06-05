CREATE TABLE operation_alert_rule (
    rule_id VARCHAR(96) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    source_type VARCHAR(64) NOT NULL,
    condition_expression VARCHAR(1000) NOT NULL,
    enabled BOOLEAN NOT NULL,
    notification_channel VARCHAR(128),
    status VARCHAR(32) NOT NULL,
    diagnostic VARCHAR(1000),
    tenant_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_operation_alert_rule_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id)
);
CREATE INDEX idx_operation_alert_rule_scope ON operation_alert_rule (tenant_id, source_type, enabled);

CREATE TABLE operation_alert_event (
    alert_id VARCHAR(96) PRIMARY KEY,
    rule_id VARCHAR(96) NOT NULL,
    title VARCHAR(200) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    source_type VARCHAR(64) NOT NULL,
    source_id VARCHAR(128) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    owner_user_id VARCHAR(64),
    diagnostic VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    acknowledged_by VARCHAR(64),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(64),
    resolved_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_operation_alert_rule FOREIGN KEY (rule_id) REFERENCES operation_alert_rule(rule_id),
    CONSTRAINT fk_operation_alert_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id),
    CONSTRAINT fk_operation_alert_owner FOREIGN KEY (owner_user_id) REFERENCES platform_user(id),
    CONSTRAINT fk_operation_alert_ack FOREIGN KEY (acknowledged_by) REFERENCES platform_user(id),
    CONSTRAINT fk_operation_alert_resolver FOREIGN KEY (resolved_by) REFERENCES platform_user(id)
);
CREATE INDEX idx_operation_alert_scope ON operation_alert_event (tenant_id, status, severity, created_at DESC);
CREATE INDEX idx_operation_alert_source ON operation_alert_event (source_type, source_id);

CREATE TABLE operation_report_export (
    export_id VARCHAR(96) PRIMARY KEY,
    report_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    requested_by VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    format VARCHAR(32) NOT NULL,
    filters_json VARCHAR(2000),
    download_url_masked VARCHAR(512),
    diagnostic VARCHAR(1000),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_operation_report_export_user FOREIGN KEY (requested_by) REFERENCES platform_user(id),
    CONSTRAINT fk_operation_report_export_tenant FOREIGN KEY (tenant_id) REFERENCES platform_tenant(id)
);
CREATE INDEX idx_operation_report_export_scope ON operation_report_export (tenant_id, report_type, status, requested_at DESC);

INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'menu:sched', '运营中心', 'Menu', 'READ', 1, '调度中心菜单'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='menu:sched');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'menu:report', '运营中心', 'Menu', 'READ', 1, '报表中心菜单'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='menu:report');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'menu:alert', '平台管理', 'Menu', 'READ', 1, '告警中心菜单'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='menu:alert');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'operations:dashboard:read', '运营中心', 'OperationsDashboard', 'READ', 2, '查询运营工作台'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='operations:dashboard:read');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'operations:scheduler:read', '运营中心', 'OperationsScheduler', 'READ', 2, '查询调度中心'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='operations:scheduler:read');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'operations:alert:read', '运营中心', 'OperationsAlert', 'READ', 2, '查询告警中心'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='operations:alert:read');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'operations:alert:handle', '运营中心', 'OperationsAlert', 'HANDLE', 3, '确认和关闭告警'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='operations:alert:handle');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'operations:report:read', '运营中心', 'OperationsReport', 'READ', 2, '查询报表中心'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='operations:report:read');
INSERT INTO platform_permission (code, module, resource, action, level, description)
SELECT 'operations:report:export', '运营中心', 'OperationsReport', 'EXPORT', 3, '创建报表导出请求'
WHERE NOT EXISTS (SELECT 1 FROM platform_permission WHERE code='operations:report:export');

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('SUPER_ADMIN::', code), 'SUPER_ADMIN', code FROM platform_permission
WHERE code IN ('menu:sched','menu:report','menu:alert','operations:dashboard:read','operations:scheduler:read','operations:alert:read','operations:alert:handle','operations:report:read','operations:report:export')
AND NOT EXISTS (SELECT 1 FROM platform_role_permission rp WHERE rp.id=CONCAT('SUPER_ADMIN::', platform_permission.code));

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('BU_ADMIN::', code), 'BU_ADMIN', code FROM platform_permission
WHERE code IN ('menu:sched','menu:report','menu:alert','operations:dashboard:read','operations:scheduler:read','operations:alert:read','operations:alert:handle','operations:report:read','operations:report:export')
AND NOT EXISTS (SELECT 1 FROM platform_role_permission rp WHERE rp.id=CONCAT('BU_ADMIN::', platform_permission.code));

INSERT INTO platform_role_permission (id, role_code, permission_code)
SELECT CONCAT('MODEL_OPS::', code), 'MODEL_OPS', code FROM platform_permission
WHERE code IN ('menu:sched','menu:report','menu:alert','operations:dashboard:read','operations:scheduler:read','operations:alert:read','operations:alert:handle','operations:report:read','operations:report:export')
AND NOT EXISTS (SELECT 1 FROM platform_role_permission rp WHERE rp.id=CONCAT('MODEL_OPS::', platform_permission.code));



INSERT INTO pipeline_run (run_id, pipeline_id, version_id, status, trigger_mode, sample_dataset_id, output_dataset_id, diagnostic_code, diagnostic_message, duration_ms, triggered_by, started_at, ended_at)
SELECT 'RUN-F022-PIPE-FAILED', 'PIPE-IMG-PREP', NULL, 'FAILED', 'MANUAL', NULL, NULL, 'TODO_CONFIRM_SCHEDULER_DIAGNOSTIC', 'F022 调度中心失败任务样例', 120000, 'USR-BU-CABIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM pipeline_run WHERE run_id='RUN-F022-PIPE-FAILED');

INSERT INTO operation_alert_rule (rule_id, name, severity, source_type, condition_expression, enabled, notification_channel, status, diagnostic, tenant_id, created_at, updated_at)
SELECT 'OPR-RULE-EDGE-HEARTBEAT', '边端心跳异常', 'HIGH', 'EDGE', 'edge_server.status IN (OFFLINE,STALE)', TRUE, 'TODO_CONFIRM_NOTIFICATION_CHANNEL', 'UNCONFIGURED', 'TODO_CONFIRM_OBSERVABILITY_PROVIDER;TODO_CONFIRM_NOTIFICATION_CHANNEL', 'TENANT-CABIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM operation_alert_rule WHERE rule_id='OPR-RULE-EDGE-HEARTBEAT');
INSERT INTO operation_alert_rule (rule_id, name, severity, source_type, condition_expression, enabled, notification_channel, status, diagnostic, tenant_id, created_at, updated_at)
SELECT 'OPR-RULE-SECURITY-AUDIT', '高危安全审计事件', 'CRITICAL', 'SECURITY', 'platform_audit_log.risk_level = CRITICAL', TRUE, 'TODO_CONFIRM_NOTIFICATION_CHANNEL', 'UNCONFIGURED', 'TODO_CONFIRM_OBSERVABILITY_PROVIDER;TODO_CONFIRM_NOTIFICATION_CHANNEL', 'TENANT-YF', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM operation_alert_rule WHERE rule_id='OPR-RULE-SECURITY-AUDIT');
INSERT INTO operation_alert_rule (rule_id, name, severity, source_type, condition_expression, enabled, notification_channel, status, diagnostic, tenant_id, created_at, updated_at)
SELECT 'OPR-RULE-PIPELINE-FAILURE', 'Pipeline 任务失败', 'MEDIUM', 'PIPELINE', 'pipeline_run.status = FAILED', TRUE, 'TODO_CONFIRM_NOTIFICATION_CHANNEL', 'UNCONFIGURED', 'TODO_CONFIRM_OBSERVABILITY_PROVIDER;TODO_CONFIRM_NOTIFICATION_CHANNEL', 'TENANT-CABIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM operation_alert_rule WHERE rule_id='OPR-RULE-PIPELINE-FAILURE');

INSERT INTO operation_alert_event (alert_id, rule_id, title, severity, status, source_type, source_id, tenant_id, owner_user_id, diagnostic, created_at, updated_at)
SELECT 'OPR-ALERT-EDGE-001', 'OPR-RULE-EDGE-HEARTBEAT', '上海工厂边端节点心跳过期', 'HIGH', 'OPEN', 'EDGE', 'EDGE-SEED-CABIN-001', 'TENANT-CABIN', 'USR-BU-CABIN', 'TODO_CONFIRM_OBSERVABILITY_PROVIDER;edge heartbeat stale', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM operation_alert_event WHERE alert_id='OPR-ALERT-EDGE-001');
INSERT INTO operation_alert_event (alert_id, rule_id, title, severity, status, source_type, source_id, tenant_id, owner_user_id, diagnostic, created_at, updated_at)
SELECT 'OPR-ALERT-PIPE-001', 'OPR-RULE-PIPELINE-FAILURE', '图像预处理 Pipeline 最近运行失败', 'MEDIUM', 'ACKNOWLEDGED', 'PIPELINE', 'PIPE-IMG-PREP', 'TENANT-CABIN', 'USR-BU-CABIN', '任务失败诊断待接入 TODO_CONFIRM_OBSERVABILITY_PROVIDER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM operation_alert_event WHERE alert_id='OPR-ALERT-PIPE-001');
INSERT INTO operation_alert_event (alert_id, rule_id, title, severity, status, source_type, source_id, tenant_id, owner_user_id, diagnostic, created_at, acknowledged_by, acknowledged_at, updated_at)
SELECT 'OPR-ALERT-SEC-001', 'OPR-RULE-SECURITY-AUDIT', '跨 BU 访问尝试安全告警', 'CRITICAL', 'ACKNOWLEDGED', 'SECURITY', 'CROSS_TENANT_ACCESS_ATTEMPT', 'TENANT-YF', 'USR-ADMIN', 'PLT-011 高危安全事件，需要平台管理员复核', CURRENT_TIMESTAMP, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM operation_alert_event WHERE alert_id='OPR-ALERT-SEC-001');
