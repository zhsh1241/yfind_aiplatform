CREATE TABLE platform_audit_event (
    id UUID PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    actor VARCHAR(128) NOT NULL,
    action VARCHAR(128) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_platform_audit_event_tenant_time
    ON platform_audit_event (tenant_id, occurred_at DESC);
