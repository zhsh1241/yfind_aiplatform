package com.yf.smp.app.platform;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformOrganizationConfigService {
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcTemplate jdbc;
    private final PlatformIdentityService identityService;

    public PlatformOrganizationConfigService(JdbcTemplate jdbc, PlatformIdentityService identityService) {
        this.jdbc = jdbc;
        this.identityService = identityService;
    }

    public OrganizationTreeResponse organizationTree(PlatformPrincipal principal) {
        identityService.requirePermission(principal, "platform:organization:read");
        Map<String, MutableOrganizationNode> byId = new LinkedHashMap<>();
        for (OrganizationRecord record : visibleOrganizations(principal)) {
            byId.put(record.id(), new MutableOrganizationNode(record, userCount(record.id()), Math.max(1, userCount(record.id()) * 2), new ArrayList<>()));
        }
        List<MutableOrganizationNode> roots = new ArrayList<>();
        for (MutableOrganizationNode node : byId.values()) {
            String parentId = node.record().parentId();
            if (parentId != null && byId.containsKey(parentId)) {
                byId.get(parentId).children().add(node);
            } else {
                roots.add(node);
            }
        }
        return new OrganizationTreeResponse(roots.stream().map(this::toResponse).toList());
    }

    @Transactional
    public OrganizationNodeResponse createOrganization(PlatformPrincipal principal, OrganizationRequest request) {
        identityService.requirePermission(principal, "platform:organization:create");
        String parentId = blankToDefault(request.parentId(), "TENANT-YF");
        OrganizationRecord parent = organization(parentId);
        ensureCanManageOrganization(principal, parent);
        String type = blankToDefault(request.tenantType(), parent.tenantType().equals("CORP") ? "BU" : "PROJECT").toUpperCase(Locale.ROOT);
        if (!List.of("BU", "PROJECT").contains(type)) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "组织类型仅支持 BU 或 PROJECT");
        }
        if ("PROJECT".equals(type) && !"BU".equals(parent.tenantType())) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "PROJECT 必须挂在 BU 下");
        }
        if ("BU".equals(type) && !"CORP".equals(parent.tenantType())) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "BU 必须挂在集团下");
        }
        String code = normalizeCode(request.code());
        ensureCodeUnique(type, parentId, code);
        int quotaGpu = positiveOrDefault(request.quotaGpu(), Math.min(8, parent.quotaGpu()));
        int quotaStorage = positiveOrDefault(request.quotaStorageTb(), Math.min(5, parent.quotaStorageTb()));
        int apiLimit = positiveOrDefault(request.apiRateLimitPerDay(), Math.min(10000, parent.apiRateLimitPerDay()));
        ensureQuotaWithinParent(parent, quotaGpu, quotaStorage, apiLimit);
        String id = "TENANT-" + code;
        OffsetDateTime now = now();
        jdbc.update("""
            INSERT INTO platform_tenant (id, code, name, parent_id, status, tenant_type, path, timezone, default_locale, quota_gpu, quota_storage_tb, api_rate_limit_per_day, updated_at)
            VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?)
            """, id, code, requireText(request.name(), "组织名称不能为空"), parentId, type, parent.path() + "/" + id, blankToDefault(request.timezone(), parent.timezone()), blankToDefault(request.defaultLocale(), parent.defaultLocale()), quotaGpu, quotaStorage, apiLimit, now);
        recordAudit(principal, principal.user().tenantId(), "ORG_NODE_CREATED", "Organization", id, "SUCCESS", "CRITICAL", null, request.name(), "type=" + type + ";parent=" + parentId);
        return toResponse(new MutableOrganizationNode(organization(id), 0, 0, List.of()));
    }

    @Transactional
    public OrganizationNodeResponse updateOrganization(PlatformPrincipal principal, String organizationId, OrganizationUpdateRequest request) {
        identityService.requirePermission(principal, "platform:organization:update");
        OrganizationRecord current = organization(organizationId);
        ensureCanManageOrganization(principal, current);
        int quotaGpu = positiveOrDefault(request.quotaGpu(), current.quotaGpu());
        int quotaStorage = positiveOrDefault(request.quotaStorageTb(), current.quotaStorageTb());
        int apiLimit = positiveOrDefault(request.apiRateLimitPerDay(), current.apiRateLimitPerDay());
        if (!"CORP".equals(current.tenantType()) && current.parentId() != null) {
            ensureQuotaWithinParent(organization(current.parentId()), quotaGpu, quotaStorage, apiLimit);
        }
        jdbc.update("""
            UPDATE platform_tenant SET name=?, timezone=?, default_locale=?, quota_gpu=?, quota_storage_tb=?, api_rate_limit_per_day=?, updated_at=? WHERE id=?
            """, blankToDefault(request.name(), current.name()), blankToDefault(request.timezone(), current.timezone()), blankToDefault(request.defaultLocale(), current.defaultLocale()), quotaGpu, quotaStorage, apiLimit, now(), organizationId);
        recordAudit(principal, current.id(), "ORG_NODE_UPDATED", "Organization", organizationId, "SUCCESS", "WARNING", current.name(), blankToDefault(request.name(), current.name()), "quotaGpu=" + quotaGpu);
        return toResponse(new MutableOrganizationNode(organization(organizationId), userCount(organizationId), Math.max(1, userCount(organizationId) * 2), List.of()));
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public void deleteOrganization(PlatformPrincipal principal, String organizationId) {
        identityService.requirePermission(principal, "platform:organization:delete");
        OrganizationRecord record = organization(organizationId);
        ensureCanManageOrganization(principal, record);
        int childCount = count("SELECT COUNT(*) FROM platform_tenant WHERE parent_id=? AND status='ACTIVE'", organizationId);
        int memberCount = count("SELECT COUNT(*) FROM platform_organization_member WHERE organization_id=? AND status='ACTIVE'", organizationId);
        int fileCount = count("SELECT COUNT(*) FROM platform_file_object WHERE (tenant_id=? OR project_id=?) AND status <> 'DELETED'", organizationId, organizationId);
        if (childCount + memberCount + fileCount > 0) {
            recordAudit(principal, record.id(), "ORG_NODE_DELETE_BLOCKED", "Organization", organizationId, "FAILURE", "CRITICAL", null, null, "children=" + childCount + ";members=" + memberCount + ";files=" + fileCount);
            throw new PlatformException(PlatformError.CONFLICT, "组织存在子节点、成员或文件引用，无法删除");
        }
        jdbc.update("UPDATE platform_tenant SET status='DISABLED', updated_at=? WHERE id=?", now(), organizationId);
        recordAudit(principal, record.id(), "ORG_NODE_DISABLED", "Organization", organizationId, "SUCCESS", "CRITICAL", "ACTIVE", "DISABLED", "soft-delete");
    }

    public PageResponse<OrganizationMemberResponse> members(PlatformPrincipal principal) {
        identityService.requirePermission(principal, "platform:organization:member:read");
        List<OrganizationMemberResponse> items = jdbc.query("""
            SELECT om.*, t.name AS organization_name, u.username, u.display_name
            FROM platform_organization_member om
            JOIN platform_tenant t ON t.id=om.organization_id
            JOIN platform_user u ON u.id=om.user_id
            ORDER BY om.created_at DESC
            """, (rs, rowNum) -> new OrganizationMemberResponse(
            rs.getString("id"), rs.getString("organization_id"), rs.getString("organization_name"), rs.getString("user_id"),
            rs.getString("username"), rs.getString("display_name"), rs.getString("role_code"), rs.getString("scope_type"),
            rs.getString("scope_id"), rs.getString("status"), rs.getObject("expires_at", OffsetDateTime.class)
        )).stream().filter(item -> canSeeScope(principal, item.organizationId())).toList();
        return new PageResponse<>(items, items.size(), 1, Math.max(items.size(), 1));
    }

    @Transactional
    public OrganizationMemberResponse assignMember(PlatformPrincipal principal, String organizationId, OrganizationMemberRequest request) {
        identityService.requirePermission(principal, "platform:organization:member:assign");
        OrganizationRecord organization = organization(organizationId);
        ensureCanManageOrganization(principal, organization);
        PlatformUser user = identityService.findUserById(requireText(request.userId(), "用户不能为空"));
        if (!principal.isSuperAdmin() && !Objects.equals(principal.user().tenantId(), user.tenantId())) {
            recordCrossTenant(principal, user.tenantId());
            throw new PlatformException(PlatformError.FORBIDDEN, "您无权跨 BU 分配成员");
        }
        String roleCode = requireText(request.roleCode(), "角色不能为空");
        ensureRoleExists(roleCode);
        String scopeType = blankToDefault(request.scopeType(), organization.tenantType()).toUpperCase(Locale.ROOT);
        String scopeId = blankToDefault(request.scopeId(), organizationId);
        if (!canSeeScope(principal, scopeId)) {
            recordCrossTenant(principal, scopeId);
            throw new PlatformException(PlatformError.FORBIDDEN, "您无权操作该组织作用域");
        }
        String id = jdbc.queryForList("""
            SELECT id FROM platform_organization_member
            WHERE organization_id=? AND user_id=? AND role_code=? AND scope_type=? AND scope_id=?
            """, String.class, organizationId, user.id(), roleCode, scopeType, scopeId).stream()
            .findFirst()
            .orElse("OM-" + organizationId + "-" + user.id() + "-" + roleCode);
        OffsetDateTime now = now();
        if (count("SELECT COUNT(*) FROM platform_organization_member WHERE id=?", id) > 0) {
            jdbc.update("UPDATE platform_organization_member SET status='ACTIVE', scope_type=?, scope_id=?, expires_at=?, updated_at=? WHERE id=?", scopeType, scopeId, request.expiresAt(), now, id);
        } else {
            jdbc.update("""
                INSERT INTO platform_organization_member (id, organization_id, user_id, role_code, scope_type, scope_id, status, expires_at, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)
                """, id, organizationId, user.id(), roleCode, scopeType, scopeId, request.expiresAt(), principal.user().id(), now, now);
        }
        recordAudit(principal, organization.id(), "ORG_MEMBER_ASSIGNED", "OrganizationMember", id, "SUCCESS", "CRITICAL", null, user.id() + ":" + roleCode, "scope=" + scopeType + ":" + scopeId);
        return memberById(id);
    }

    @Transactional
    public void removeMember(PlatformPrincipal principal, String organizationId, String memberId) {
        identityService.requirePermission(principal, "platform:organization:member:remove");
        OrganizationRecord organization = organization(organizationId);
        ensureCanManageOrganization(principal, organization);
        jdbc.update("UPDATE platform_organization_member SET status='REMOVED', updated_at=? WHERE id=? AND organization_id=?", now(), memberId, organizationId);
        recordAudit(principal, organization.id(), "ORG_MEMBER_REMOVED", "OrganizationMember", memberId, "SUCCESS", "CRITICAL", "ACTIVE", "REMOVED", "member-remove");
    }

    public List<ConfigItemResponse> configs(PlatformPrincipal principal, String scopeType, String scopeId) {
        identityService.requirePermission(principal, "platform:config:read");
        String normalizedScopeType = blankToDefault(scopeType, principal.isSuperAdmin() ? "GLOBAL" : "BU").toUpperCase(Locale.ROOT);
        String normalizedScopeId = blankToDefault(scopeId, principal.isSuperAdmin() ? "TENANT-YF" : principal.user().tenantId());
        ensureScopeAccess(principal, normalizedScopeType, normalizedScopeId, false);
        return jdbc.query("SELECT * FROM platform_config_definition WHERE status='ACTIVE' ORDER BY group_name, config_key", (rs, rowNum) -> {
            ConfigDefinition definition = new ConfigDefinition(rs.getString("config_key"), rs.getString("group_name"), rs.getString("display_name"), rs.getString("value_type"), rs.getString("default_value"), rs.getBoolean("sensitive"), rs.getString("scope_allowed"), rs.getString("validation_rule"), rs.getString("status"));
            EffectiveConfig effective = effectiveConfig(definition, normalizedScopeType, normalizedScopeId);
            ConfigValue scopeValue = configValue(definition.key(), normalizedScopeType, normalizedScopeId);
            return new ConfigItemResponse(definition.key(), definition.groupName(), definition.displayName(), definition.valueType(), split(definition.scopeAllowed()), definition.sensitive(), maskIfSensitive(definition, definition.defaultValue()), normalizedScopeType, normalizedScopeId, scopeValue == null ? null : maskIfSensitive(definition, scopeValue.value()), maskIfSensitive(definition, effective.value()), effective.inheritedFrom(), scopeValue == null ? 0 : scopeValue.version(), definition.status());
        });
    }

    public ConfigEffectiveResponse effective(PlatformPrincipal principal, String key, String scopeType, String scopeId) {
        identityService.requirePermission(principal, "platform:config:read");
        String normalizedScopeType = blankToDefault(scopeType, principal.isSuperAdmin() ? "GLOBAL" : "BU").toUpperCase(Locale.ROOT);
        String normalizedScopeId = blankToDefault(scopeId, principal.isSuperAdmin() ? "TENANT-YF" : principal.user().tenantId());
        ensureScopeAccess(principal, normalizedScopeType, normalizedScopeId, false);
        ConfigDefinition definition = configDefinition(key);
        EffectiveConfig effective = effectiveConfig(definition, normalizedScopeType, normalizedScopeId);
        return new ConfigEffectiveResponse(key, maskIfSensitive(definition, effective.value()), effective.inheritedFrom(), definition.sensitive());
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public ConfigItemResponse updateConfig(PlatformPrincipal principal, String key, ConfigUpdateRequest request) {
        identityService.requirePermission(principal, "platform:config:update");
        ConfigDefinition definition = configDefinition(key);
        String scopeType = requireText(request.scopeType(), "配置作用域不能为空").toUpperCase(Locale.ROOT);
        String scopeId = requireText(request.scopeId(), "配置作用域 ID 不能为空");
        ensureScopeAccess(principal, scopeType, scopeId, true);
        if (!split(definition.scopeAllowed()).contains(scopeType)) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "该配置不允许写入 " + scopeType + " 作用域");
        }
        String value = requireText(request.value(), "配置值不能为空");
        validateConfigLimit(principal, definition, scopeType, scopeId, value);
        ConfigValue old = configValue(key, scopeType, scopeId);
        int version = old == null ? 1 : old.version() + 1;
        String id = "CV-" + key + "-" + scopeType + "-" + scopeId;
        OffsetDateTime now = now();
        if (old == null) {
            jdbc.update("""
                INSERT INTO platform_config_value (id, config_key, scope_type, scope_id, value_json, masked_value, version, updated_by, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, id, key, scopeType, scopeId, value, definition.sensitive() ? mask(value) : null, version, principal.user().id(), now);
        } else {
            jdbc.update("UPDATE platform_config_value SET value_json=?, masked_value=?, version=?, updated_by=?, updated_at=? WHERE id=?", value, definition.sensitive() ? mask(value) : null, version, principal.user().id(), now, id);
        }
        jdbc.update("INSERT INTO platform_config_version (id, config_key, scope_type, scope_id, version, value_json, reason, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", "CFGVER-" + randomHex(8), key, scopeType, scopeId, version, value, request.reason(), principal.user().id(), now);
        recordAudit(principal, scopeId, "CONFIG_UPDATED", "Config", key, "SUCCESS", "GLOBAL".equals(scopeType) ? "CRITICAL" : "WARNING", old == null ? null : old.value(), value, "scope=" + scopeType + ":" + scopeId + ";version=" + version);
        return configs(principal, scopeType, scopeId).stream().filter(item -> item.key().equals(key)).findFirst().orElseThrow();
    }

    public PageResponse<FileObjectResponse> files(PlatformPrincipal principal, String assetType, String status, String organizationId) {
        identityService.requirePermission(principal, "platform:file:read");
        List<FileObjectResponse> items = jdbc.query("SELECT * FROM platform_file_object ORDER BY created_at DESC", (rs, rowNum) -> fileResponse(rs))
            .stream()
            .filter(file -> canSeeScope(principal, file.tenantId()))
            .filter(file -> assetType == null || assetType.isBlank() || file.assetType().equalsIgnoreCase(assetType))
            .filter(file -> status == null || status.isBlank() || file.status().equalsIgnoreCase(status))
            .filter(file -> organizationId == null || organizationId.isBlank() || Objects.equals(file.tenantId(), organizationId) || Objects.equals(file.projectId(), organizationId))
            .toList();
        return new PageResponse<>(items, items.size(), 1, Math.max(items.size(), 1));
    }

    @Transactional
    public FileObjectResponse initFile(PlatformPrincipal principal, FileInitRequest request) {
        identityService.requirePermission(principal, "platform:file:init");
        String tenantId = blankToDefault(request.tenantId(), principal.user().tenantId());
        ensureScopeAccess(principal, "BU", tenantId, true);
        String fileId = "FILE-" + randomHex(8).toUpperCase(Locale.ROOT);
        String bucket = effectiveConfig(configDefinition("storage.bucket"), "BU", tenantId).value();
        if (bucket == null || bucket.startsWith("TODO_CONFIRM")) {
            bucket = "TODO_CONFIRM_MINIO_BUCKET";
        }
        String filename = blankToDefault(request.filename(), fileId + ".bin").replaceAll("[^A-Za-z0-9._-]", "_");
        String objectKey = tenantId + "/" + blankToDefault(request.assetType(), "GENERIC").toLowerCase(Locale.ROOT) + "/" + fileId + "/" + filename;
        OffsetDateTime now = now();
        jdbc.update("""
            INSERT INTO platform_file_object (file_id, asset_type, tenant_id, project_id, bucket, object_key, expected_sha256, expected_size_bytes, content_type, storage_tier, status, owner_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INITIATED', ?, ?, ?)
            """, fileId, blankToDefault(request.assetType(), "GENERIC"), tenantId, blankToNull(request.projectId()), bucket, objectKey, blankToNull(request.expectedSha256()), request.expectedSizeBytes(), blankToDefault(request.contentType(), "application/octet-stream"), blankToDefault(request.storageTier(), "HOT"), principal.user().id(), now, now);
        recordAudit(principal, tenantId, "FILE_OBJECT_INITIATED", "FileObject", fileId, "SUCCESS", "INFO", null, objectKey, "bucket=" + bucket);
        return file(fileId);
    }

    @Transactional(noRollbackFor = PlatformException.class)
    public FileObjectResponse completeFile(PlatformPrincipal principal, String fileId, FileCompleteRequest request) {
        identityService.requirePermission(principal, "platform:file:complete");
        FileObjectResponse file = file(fileId);
        ensureScopeAccess(principal, "BU", file.tenantId(), true);
        if (!"INITIATED".equals(file.status())) {
            throw new PlatformException(PlatformError.CONFLICT, "文件不是可完成状态");
        }
        String sha = requireText(request.sha256(), "sha256 不能为空");
        Long size = request.sizeBytes();
        if (size == null || size < 0) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "文件大小非法");
        }
        boolean hashMismatch = file.expectedSha256() != null && !file.expectedSha256().equalsIgnoreCase(sha);
        boolean sizeMismatch = file.expectedSizeBytes() != null && !Objects.equals(file.expectedSizeBytes(), size);
        if (hashMismatch || sizeMismatch) {
            jdbc.update("UPDATE platform_file_object SET status='FAILED', sha256=?, size_bytes=?, updated_at=? WHERE file_id=?", sha, size, now(), fileId);
            recordAudit(principal, file.tenantId(), "FILE_HASH_MISMATCH", "FileObject", fileId, "FAILURE", "WARNING", file.expectedSha256() + ":" + file.expectedSizeBytes(), sha + ":" + size, "hashMismatch=" + hashMismatch + ";sizeMismatch=" + sizeMismatch);
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "文件 hash 或大小与初始化元数据不一致");
        }
        jdbc.update("UPDATE platform_file_object SET status='AVAILABLE', sha256=?, size_bytes=?, updated_at=? WHERE file_id=?", sha, size, now(), fileId);
        recordAudit(principal, file.tenantId(), "FILE_UPLOAD_COMPLETED", "FileObject", fileId, "SUCCESS", "INFO", null, sha, "size=" + size);
        return file(fileId);
    }

    @Transactional
    public void deleteFile(PlatformPrincipal principal, String fileId) {
        identityService.requirePermission(principal, "platform:file:delete");
        FileObjectResponse file = file(fileId);
        ensureScopeAccess(principal, "BU", file.tenantId(), true);
        jdbc.update("UPDATE platform_file_object SET status='DELETED', deleted_at=?, updated_at=? WHERE file_id=?", now(), now(), fileId);
        recordAudit(principal, file.tenantId(), "FILE_SOFT_DELETED", "FileObject", fileId, "SUCCESS", "CRITICAL", file.status(), "DELETED", "soft-delete");
    }

    @Transactional
    public FileObjectResponse restoreFile(PlatformPrincipal principal, String fileId) {
        identityService.requirePermission(principal, "platform:file:restore");
        FileObjectResponse file = file(fileId);
        ensureScopeAccess(principal, "BU", file.tenantId(), true);
        jdbc.update("UPDATE platform_file_object SET status='AVAILABLE', deleted_at=NULL, updated_at=? WHERE file_id=?", now(), fileId);
        recordAudit(principal, file.tenantId(), "FILE_RESTORED", "FileObject", fileId, "SUCCESS", "WARNING", file.status(), "AVAILABLE", "restore");
        return file(fileId);
    }

    @Transactional
    public FileDownloadResponse downloadUrl(PlatformPrincipal principal, String fileId) {
        identityService.requirePermission(principal, "platform:file:download");
        FileObjectResponse file = file(fileId);
        ensureScopeAccess(principal, "BU", file.tenantId(), false);
        if (!"AVAILABLE".equals(file.status())) {
            throw new PlatformException(PlatformError.CONFLICT, "文件当前不可下载");
        }
        String endpoint = effectiveConfig(configDefinition("storage.endpoint"), "GLOBAL", "TENANT-YF").value();
        String diagnostic = endpoint == null || endpoint.startsWith("TODO_CONFIRM") ? "TODO_CONFIRM_MINIO_ENDPOINT" : "SIGNED_URL_READY";
        String status = diagnostic.startsWith("TODO_CONFIRM") ? "UNCONFIGURED" : "READY";
        String url = diagnostic.startsWith("TODO_CONFIRM") ? null : endpoint + "/" + file.bucket() + "/" + file.objectKey() + "?TODO_CONFIRM_MINIO_SIGNATURE";
        recordAudit(principal, file.tenantId(), "FILE_DOWNLOAD_REQUESTED", "FileObject", fileId, "SUCCESS", "INFO", null, null, diagnostic);
        return new FileDownloadResponse(fileId, status, url, diagnostic);
    }

    public List<NotificationChannelResponse> notificationChannels(PlatformPrincipal principal) {
        identityService.requirePermission(principal, "platform:notification:read");
        return jdbc.query("SELECT * FROM platform_notification_channel ORDER BY channel_type", (rs, rowNum) -> channelResponse(rs))
            .stream().filter(item -> canSeeScope(principal, item.scopeId())).toList();
    }

    @Transactional
    public NotificationChannelResponse updateNotificationChannel(PlatformPrincipal principal, String channelId, NotificationChannelUpdateRequest request) {
        identityService.requirePermission(principal, "platform:notification:update");
        NotificationChannelResponse current = channel(channelId);
        ensureScopeAccess(principal, current.scopeType(), current.scopeId(), true);
        String configMasked = blankToDefault(request.configMasked(), current.configMasked());
        String diagnostic = blankToDefault(request.diagnostic(), configMasked != null && configMasked.contains("TODO_CONFIRM") ? firstTodo(configMasked) : "READY");
        boolean enabled = request.enabled() == null ? current.enabled() : request.enabled();
        String status = diagnostic.startsWith("TODO_CONFIRM") ? "UNCONFIGURED" : "READY";
        jdbc.update("UPDATE platform_notification_channel SET enabled=?, config_masked=?, status=?, diagnostic=?, updated_at=? WHERE channel_id=?", enabled, maskNotificationConfig(configMasked), status, diagnostic, now(), channelId);
        recordAudit(principal, current.scopeId(), "NOTIFICATION_CHANNEL_UPDATED", "NotificationChannel", channelId, "SUCCESS", "WARNING", current.configMasked(), maskNotificationConfig(configMasked), diagnostic);
        return channel(channelId);
    }

    @Transactional
    public NotificationTestResponse testNotificationChannel(PlatformPrincipal principal, String channelId) {
        identityService.requirePermission(principal, "platform:notification:test");
        NotificationChannelResponse channel = channel(channelId);
        ensureScopeAccess(principal, channel.scopeType(), channel.scopeId(), false);
        OffsetDateTime now = now();
        String result = channel.enabled() && "READY".equals(channel.status()) ? "READY" : "UNCONFIGURED";
        String diagnostic = "READY".equals(result) ? "发送 seam 已触发，真实外部通道由 TODO_CONFIRM_* 集成确认" : blankToDefault(channel.diagnostic(), "TODO_CONFIRM_NOTIFICATION_CHANNEL");
        jdbc.update("INSERT INTO platform_notification_test_log (id, channel_id, result, diagnostic, tested_by, tested_at) VALUES (?, ?, ?, ?, ?, ?)", "NTL-" + randomHex(8), channelId, result, diagnostic, principal.user().id(), now);
        jdbc.update("UPDATE platform_notification_channel SET last_test_at=?, status=?, diagnostic=?, updated_at=? WHERE channel_id=?", now, result, diagnostic, now, channelId);
        recordAudit(principal, channel.scopeId(), "READY".equals(result) ? "NOTIFICATION_TEST_REQUESTED" : "NOTIFICATION_TEST_FAILED", "NotificationChannel", channelId, "READY".equals(result) ? "SUCCESS" : "FAILURE", "READY".equals(result) ? "INFO" : "WARNING", null, result, diagnostic);
        return new NotificationTestResponse(channelId, result, diagnostic, now);
    }

    public List<ApiKeyResponse> apiKeys(PlatformPrincipal principal) {
        identityService.requirePermission(principal, "platform:apikey:read");
        return jdbc.query("SELECT * FROM platform_api_key ORDER BY created_at DESC", (rs, rowNum) -> apiKeyResponse(rs, null))
            .stream().filter(item -> canSeeScope(principal, item.scopeId())).toList();
    }

    @Transactional
    public ApiKeyResponse createApiKey(PlatformPrincipal principal, ApiKeyCreateRequest request) {
        identityService.requirePermission(principal, "platform:apikey:create");
        String scopeType = blankToDefault(request.scopeType(), principal.isSuperAdmin() ? "GLOBAL" : "BU").toUpperCase(Locale.ROOT);
        String scopeId = blankToDefault(request.scopeId(), principal.isSuperAdmin() ? "TENANT-YF" : principal.user().tenantId());
        ensureScopeAccess(principal, scopeType, scopeId, true);
        String prefix = "smp_live_" + randomHex(4);
        String secret = randomHex(24);
        String plain = prefix + "_" + secret;
        String hash = sha256(plain);
        String masked = prefix + "************" + secret.substring(secret.length() - 4);
        OffsetDateTime now = now();
        OffsetDateTime expiresAt = request.expiresInDays() == null || request.expiresInDays() == 0 ? null : now.plusDays(Math.max(1, request.expiresInDays()));
        String id = "AK-" + randomHex(8).toUpperCase(Locale.ROOT);
        jdbc.update("""
            INSERT INTO platform_api_key (key_id, name, prefix, key_hash, masked_key, scope_type, scope_id, permissions, status, expires_at, revoked_at, created_by, created_at, last_used_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, NULL, ?, ?, NULL)
            """, id, requireText(request.name(), "API Key 名称不能为空"), prefix, hash, masked, scopeType, scopeId, String.join(",", request.permissions() == null ? List.of("INFERENCE_READ") : request.permissions()), expiresAt, principal.user().id(), now);
        recordAudit(principal, scopeId, "API_KEY_CREATED", "ApiKey", id, "SUCCESS", "CRITICAL", null, masked, "plainTextShownOnce=true;TODO_CONFIRM_API_GATEWAY_KEY_STRATEGY");
        return apiKey(id, plain);
    }

    @Transactional
    public ApiKeyResponse revokeApiKey(PlatformPrincipal principal, String keyId) {
        identityService.requirePermission(principal, "platform:apikey:revoke");
        ApiKeyResponse current = apiKey(keyId, null);
        ensureScopeAccess(principal, current.scopeType(), current.scopeId(), true);
        if ("REVOKED".equals(current.status())) {
            throw new PlatformException(PlatformError.CONFLICT, "API Key 已撤销");
        }
        jdbc.update("UPDATE platform_api_key SET status='REVOKED', revoked_at=? WHERE key_id=?", now(), keyId);
        recordAudit(principal, current.scopeId(), "API_KEY_REVOKED", "ApiKey", keyId, "SUCCESS", "CRITICAL", "ACTIVE", "REVOKED", current.maskedKey());
        return apiKey(keyId, null);
    }

    private List<OrganizationRecord> visibleOrganizations(PlatformPrincipal principal) {
        if (principal.isSuperAdmin()) {
            return jdbc.query("SELECT * FROM platform_tenant ORDER BY path, code", (rs, rowNum) -> orgRecord(rs));
        }
        OrganizationRecord own = organization(principal.user().tenantId());
        return jdbc.query("SELECT * FROM platform_tenant WHERE path LIKE ? ORDER BY path, code", (rs, rowNum) -> orgRecord(rs), own.path() + "%");
    }

    private void ensureCodeUnique(String type, String parentId, String code) {
        int existing = "BU".equals(type)
            ? count("SELECT COUNT(*) FROM platform_tenant WHERE code=?", code)
            : count("SELECT COUNT(*) FROM platform_tenant WHERE parent_id=? AND code=?", parentId, code);
        if (existing > 0) throw new PlatformException(PlatformError.CONFLICT, "组织编码已存在");
    }

    private void ensureQuotaWithinParent(OrganizationRecord parent, int quotaGpu, int quotaStorage, int apiLimit) {
        if (quotaGpu > parent.quotaGpu() || quotaStorage > parent.quotaStorageTb() || apiLimit > parent.apiRateLimitPerDay()) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "BU/PROJECT 配置不能突破上级或集团上限");
        }
    }

    private void validateConfigLimit(PlatformPrincipal principal, ConfigDefinition definition, String scopeType, String scopeId, String value) {
        if (!"upload.maxFileSizeMb".equals(definition.key()) || "GLOBAL".equals(scopeType)) return;
        int proposed = parseInt(value, "配置值必须为数字");
        int global = parseInt(effectiveConfig(definition, "GLOBAL", "TENANT-YF").value(), "全局配置非法");
        if (proposed > global) {
            recordAudit(principal, scopeId, "CONFIG_LIMIT_REJECTED", "Config", definition.key(), "FAILURE", "CRITICAL", String.valueOf(global), value, "scope=" + scopeType + ":" + scopeId);
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, "BU/PROJECT 配置不能突破集团上限");
        }
    }

    private EffectiveConfig effectiveConfig(ConfigDefinition definition, String scopeType, String scopeId) {
        ConfigValue direct = configValue(definition.key(), scopeType, scopeId);
        if (direct != null) return new EffectiveConfig(direct.value(), scopeType + ":" + scopeId);
        if ("PROJECT".equals(scopeType)) {
            OrganizationRecord project = organization(scopeId);
            if (project.parentId() != null) {
                ConfigValue bu = configValue(definition.key(), "BU", project.parentId());
                if (bu != null) return new EffectiveConfig(bu.value(), "BU:" + project.parentId());
            }
        }
        ConfigValue global = configValue(definition.key(), "GLOBAL", "TENANT-YF");
        if (global != null) return new EffectiveConfig(global.value(), "GLOBAL:TENANT-YF");
        return new EffectiveConfig(definition.defaultValue(), "DEFAULT");
    }

    private void ensureScopeAccess(PlatformPrincipal principal, String scopeType, String scopeId, boolean write) {
        if ("GLOBAL".equals(scopeType.toUpperCase(Locale.ROOT))) {
            if (!principal.isSuperAdmin()) {
                recordCrossTenant(principal, scopeId);
                throw new PlatformException(PlatformError.FORBIDDEN, write ? "BU 管理员不能修改集团级配置" : "无权访问集团级配置");
            }
            return;
        }
        ensureCanManageOrganization(principal, organization(scopeId));
    }

    private void ensureCanManageOrganization(PlatformPrincipal principal, OrganizationRecord target) {
        if (principal.isSuperAdmin()) return;
        OrganizationRecord own = organization(principal.user().tenantId());
        if (target.path() != null && target.path().startsWith(own.path())) return;
        recordCrossTenant(principal, target.id());
        throw new PlatformException(PlatformError.FORBIDDEN, "您无权操作其他 BU 的资源");
    }

    private boolean canSeeScope(PlatformPrincipal principal, String scopeId) {
        if (principal.isSuperAdmin()) return true;
        try {
            return organization(scopeId).path().startsWith(organization(principal.user().tenantId()).path());
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private OrganizationRecord organization(String id) {
        return jdbc.queryForObject("SELECT * FROM platform_tenant WHERE id=?", (rs, rowNum) -> orgRecord(rs), id);
    }

    private OrganizationRecord orgRecord(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new OrganizationRecord(rs.getString("id"), rs.getString("code"), rs.getString("name"), rs.getString("parent_id"), rs.getString("status"), rs.getString("tenant_type"), rs.getString("path"), rs.getString("timezone"), rs.getString("default_locale"), rs.getInt("quota_gpu"), rs.getInt("quota_storage_tb"), rs.getInt("api_rate_limit_per_day"));
    }

    private OrganizationNodeResponse toResponse(MutableOrganizationNode node) {
        OrganizationRecord r = node.record();
        return new OrganizationNodeResponse(r.id(), r.code(), r.name(), r.tenantType(), r.parentId(), r.path(), r.status(), r.timezone(), r.defaultLocale(), r.quotaGpu(), r.quotaStorageTb(), r.apiRateLimitPerDay(), node.userCount(), node.usedGpu(), node.children().stream().map(this::toResponse).toList());
    }

    private OrganizationMemberResponse memberById(String id) {
        return jdbc.queryForObject("""
            SELECT om.*, t.name AS organization_name, u.username, u.display_name
            FROM platform_organization_member om
            JOIN platform_tenant t ON t.id=om.organization_id
            JOIN platform_user u ON u.id=om.user_id
            WHERE om.id=?
            """, (rs, rowNum) -> new OrganizationMemberResponse(rs.getString("id"), rs.getString("organization_id"), rs.getString("organization_name"), rs.getString("user_id"), rs.getString("username"), rs.getString("display_name"), rs.getString("role_code"), rs.getString("scope_type"), rs.getString("scope_id"), rs.getString("status"), rs.getObject("expires_at", OffsetDateTime.class)), id);
    }

    private void ensureRoleExists(String roleCode) {
        if (count("SELECT COUNT(*) FROM platform_role WHERE code=?", roleCode) == 0) throw new PlatformException(PlatformError.NOT_FOUND, "角色不存在");
    }

    private int userCount(String organizationId) {
        return count("SELECT COUNT(*) FROM platform_user WHERE tenant_id=?", organizationId);
    }

    private ConfigDefinition configDefinition(String key) {
        return jdbc.queryForObject("SELECT * FROM platform_config_definition WHERE config_key=?", (rs, rowNum) -> new ConfigDefinition(rs.getString("config_key"), rs.getString("group_name"), rs.getString("display_name"), rs.getString("value_type"), rs.getString("default_value"), rs.getBoolean("sensitive"), rs.getString("scope_allowed"), rs.getString("validation_rule"), rs.getString("status")), key);
    }

    private ConfigValue configValue(String key, String scopeType, String scopeId) {
        List<ConfigValue> values = jdbc.query("SELECT * FROM platform_config_value WHERE config_key=? AND scope_type=? AND scope_id=?", (rs, rowNum) -> new ConfigValue(rs.getString("value_json"), rs.getInt("version")), key, scopeType, scopeId);
        return values.isEmpty() ? null : values.getFirst();
    }

    private FileObjectResponse file(String fileId) {
        return jdbc.queryForObject("SELECT * FROM platform_file_object WHERE file_id=?", (rs, rowNum) -> fileResponse(rs), fileId);
    }

    private FileObjectResponse fileResponse(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new FileObjectResponse(rs.getString("file_id"), rs.getString("asset_type"), rs.getString("tenant_id"), rs.getString("project_id"), rs.getString("bucket"), rs.getString("object_key"), rs.getString("expected_sha256"), rs.getString("sha256"), nullableLong(rs, "expected_size_bytes"), nullableLong(rs, "size_bytes"), rs.getString("content_type"), rs.getString("storage_tier"), rs.getString("status"), rs.getString("owner_id"), rs.getObject("created_at", OffsetDateTime.class), rs.getObject("updated_at", OffsetDateTime.class));
    }

    private NotificationChannelResponse channel(String channelId) {
        return jdbc.queryForObject("SELECT * FROM platform_notification_channel WHERE channel_id=?", (rs, rowNum) -> channelResponse(rs), channelId);
    }

    private NotificationChannelResponse channelResponse(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new NotificationChannelResponse(rs.getString("channel_id"), rs.getString("channel_type"), rs.getString("scope_type"), rs.getString("scope_id"), rs.getString("name"), rs.getBoolean("enabled"), rs.getString("config_masked"), rs.getString("status"), rs.getString("diagnostic"), rs.getObject("last_test_at", OffsetDateTime.class));
    }

    private ApiKeyResponse apiKey(String keyId, String plainText) {
        return jdbc.queryForObject("SELECT * FROM platform_api_key WHERE key_id=?", (rs, rowNum) -> apiKeyResponse(rs, plainText), keyId);
    }

    private ApiKeyResponse apiKeyResponse(java.sql.ResultSet rs, String plainText) throws java.sql.SQLException {
        return new ApiKeyResponse(rs.getString("key_id"), rs.getString("name"), rs.getString("prefix"), rs.getString("masked_key"), plainText, rs.getString("scope_type"), rs.getString("scope_id"), split(blankToDefault(rs.getString("permissions"), "")), rs.getString("status"), rs.getObject("expires_at", OffsetDateTime.class), rs.getObject("revoked_at", OffsetDateTime.class), rs.getObject("created_at", OffsetDateTime.class), rs.getObject("last_used_at", OffsetDateTime.class));
    }

    private void recordCrossTenant(PlatformPrincipal principal, String target) {
        recordAudit(principal, principal.user().tenantId(), "CROSS_TENANT_ACCESS_ATTEMPT", "Tenant", target, "FAILURE", "CRITICAL", principal.user().tenantId(), target, "cross-bu");
    }

    private void recordAudit(PlatformPrincipal principal, String tenantId, String action, String resourceType, String resourceId, String result, String riskLevel, String before, String after, String detail) {
        OffsetDateTime occurredAt = now();
        String eventId = "EVT-" + randomHex(8).toUpperCase(Locale.ROOT);
        String traceId = nullToEmpty(PlatformResponses.traceId());
        String operatorRole = String.join(",", principal.roleNames());
        String id = UUID.randomUUID().toString();
        String signature = sha256(String.join("|", nullToEmpty(id), nullToEmpty(eventId), nullToEmpty(tenantId), nullToEmpty(principal.user().id()), nullToEmpty(principal.user().displayName()), nullToEmpty(operatorRole), nullToEmpty(action), nullToEmpty(resourceType), nullToEmpty(resourceId), nullToEmpty(result), nullToEmpty(riskLevel), nullToEmpty(before), nullToEmpty(after), nullToEmpty(detail), nullToEmpty(traceId), canonicalTime(occurredAt)));
        jdbc.update("""
            INSERT INTO platform_audit_log (id, event_id, tenant_id, operator_id, operator_name, operator_role, action, resource_type, resource_id, result, risk_level, before_json, after_json, detail_json, trace_id, signature, occurred_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, id, eventId, tenantId, principal.user().id(), principal.user().displayName(), operatorRole, action, resourceType, resourceId, result, riskLevel, before, after, detail, traceId, signature, occurredAt);
    }

    private int count(String sql, Object... args) {
        Integer value = jdbc.queryForObject(sql, Integer.class, args);
        return value == null ? 0 : value;
    }

    private String normalizeCode(String value) {
        return requireText(value, "组织编码不能为空").toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9-]", "-");
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, message);
        return value.trim();
    }

    private int positiveOrDefault(Integer value, int defaultValue) {
        return value == null || value <= 0 ? defaultValue : value;
    }

    private int parseInt(String value, String message) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException exception) {
            throw new PlatformException(PlatformError.BUSINESS_RULE_FAILED, message);
        }
    }

    private String maskIfSensitive(ConfigDefinition definition, String value) {
        return definition.sensitive() ? mask(value) : value;
    }

    private String mask(String value) {
        if (value == null || value.isBlank()) return "";
        if (value.startsWith("TODO_CONFIRM")) return value;
        if (value.length() <= 4) return "****";
        return value.substring(0, Math.min(4, value.length())) + "****" + value.substring(value.length() - 2);
    }

    private String maskNotificationConfig(String value) {
        if (value == null) return null;
        return value.replaceAll("(?i)(password|secret|token)=([^;]+)", "$1=****");
    }

    private String firstTodo(String value) {
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("TODO_CONFIRM_[A-Z0-9_]+", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(value);
        return matcher.find() ? matcher.group().toUpperCase(Locale.ROOT) : "TODO_CONFIRM_NOTIFICATION_CHANNEL";
    }

    private List<String> split(String value) {
        if (value == null || value.isBlank()) return List.of();
        return java.util.Arrays.stream(value.split(",")).map(String::trim).filter(item -> !item.isBlank()).toList();
    }

    private String randomHex(int bytes) {
        byte[] buffer = new byte[bytes];
        RANDOM.nextBytes(buffer);
        return HexFormat.of().formatHex(buffer);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String canonicalTime(OffsetDateTime value) {
        return value == null ? "" : value.toInstant().truncatedTo(ChronoUnit.MICROS).atOffset(ZoneOffset.UTC).toString();
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);
    }

    private String blankToDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private Long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private record OrganizationRecord(String id, String code, String name, String parentId, String status, String tenantType, String path, String timezone, String defaultLocale, int quotaGpu, int quotaStorageTb, int apiRateLimitPerDay) {
    }

    private record MutableOrganizationNode(OrganizationRecord record, int userCount, int usedGpu, List<MutableOrganizationNode> children) {
    }

    private record ConfigDefinition(String key, String groupName, String displayName, String valueType, String defaultValue, boolean sensitive, String scopeAllowed, String validationRule, String status) {
    }

    private record ConfigValue(String value, int version) {
    }

    private record EffectiveConfig(String value, String inheritedFrom) {
    }
}
