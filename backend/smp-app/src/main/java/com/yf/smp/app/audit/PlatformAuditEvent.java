package com.yf.smp.app.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "platform_audit_event")
public class PlatformAuditEvent {
    @Id
    private UUID id;

    @Column(nullable = false, length = 64)
    private String tenantId;

    @Column(nullable = false, length = 128)
    private String actor;

    @Column(nullable = false, length = 128)
    private String action;

    @Column(nullable = false)
    private OffsetDateTime occurredAt;

    protected PlatformAuditEvent() {
    }

    public PlatformAuditEvent(UUID id, String tenantId, String actor, String action, OffsetDateTime occurredAt) {
        this.id = id;
        this.tenantId = tenantId;
        this.actor = actor;
        this.action = action;
        this.occurredAt = occurredAt;
    }

    public UUID getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getActor() {
        return actor;
    }

    public String getAction() {
        return action;
    }

    public OffsetDateTime getOccurredAt() {
        return occurredAt;
    }
}
