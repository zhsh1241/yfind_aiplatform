package com.yf.smp.app.platform;

import java.time.OffsetDateTime;
import java.util.List;

record PaiResourceStatusResponse(
    String status,
    boolean configured,
    boolean enabled,
    String regionId,
    String endpoint,
    String workspaceId,
    String quotaId,
    String resourceGroupId,
    String credentialMode,
    String credentialRefMasked,
    String diagnosticCode,
    String diagnosticMessage,
    OffsetDateTime lastSyncAt,
    boolean stale
) {
}

record PaiResourceOverviewResponse(
    String status,
    String scopeType,
    String scopeId,
    String bindingId,
    String workspaceId,
    String quotaId,
    String resourceGroupId,
    OffsetDateTime lastSyncAt,
    boolean stale,
    String diagnosticCode,
    String diagnosticMessage,
    List<PaiResourceUsageCard> cards,
    String updatedFrom
) {
}

record PaiResourceUsageCard(String key, String label, long used, long total, String unit, int percent, String status) {
}

record PaiResourceBindingResponse(
    String bindingId,
    String organizationId,
    String organizationName,
    String scopeType,
    String workspaceId,
    String workspaceName,
    String quotaId,
    String quotaName,
    String resourceGroupId,
    String status,
    String diagnosticCode,
    String diagnosticMessage,
    OffsetDateTime lastSyncAt
) {
}

record PaiResourceNodeResponse(
    String nodeId,
    String sourceType,
    String hostOrZone,
    String gpuSpec,
    int cpuCores,
    int memoryGb,
    int gpuTotal,
    int gpuUsed,
    int gpuUtilizationPercent,
    String status,
    String diagnostic
) {
}

record PaiResourcePoolResponse(
    String poolId,
    String poolName,
    String sourceType,
    String bindingId,
    String quotaId,
    String workspaceId,
    int gpuUsed,
    int gpuTotal,
    int cpuUsed,
    int cpuTotal,
    int memoryUsedGb,
    int memoryTotalGb,
    int userCount,
    String status
) {
}

record PaiResourceStorageResponse(
    String storageId,
    String name,
    String sourceType,
    long capacityGb,
    long usedGb,
    int percent,
    String status,
    String diagnostic
) {
}

record PaiResourceBindingUpdateRequest(
    String organizationId,
    String workspaceId,
    String workspaceName,
    String quotaId,
    String quotaName,
    String resourceGroupId,
    String status,
    String diagnosticMessage
) {
}

record PaiConnectionUpdateRequest(
    String regionId,
    String endpoint,
    String workspaceId,
    String quotaId,
    String resourceGroupId,
    String credentialMode,
    String credentialRefMasked,
    Boolean enabled,
    String status,
    String diagnosticMessage
) {
}

record PaiResourceSyncRequest(String bindingId, Boolean force) {
}

record PaiSyncResponse(
    String syncId,
    String bindingId,
    String result,
    String status,
    String diagnosticCode,
    String diagnosticMessage,
    OffsetDateTime lastSyncAt,
    boolean stale,
    String paiRequestId
) {
}

record PaiResourceReferenceResponse(
    String resourceBindingId,
    String organizationId,
    String paiWorkspaceId,
    String paiQuotaId,
    String paiResourceGroupId,
    String status,
    boolean usable,
    String diagnosticCode,
    String diagnosticMessage
) {
}

record PaiConnectionRecord(
    String id,
    String scopeType,
    String scopeId,
    String regionId,
    String endpoint,
    String workspaceId,
    String quotaId,
    String resourceGroupId,
    String credentialMode,
    String credentialRefMasked,
    boolean enabled,
    String status,
    String diagnosticCode,
    String diagnosticMessage,
    OffsetDateTime updatedAt
) {
}

record PaiBindingRecord(
    String bindingId,
    String organizationId,
    String organizationName,
    String organizationPath,
    String scopeType,
    String workspaceId,
    String workspaceName,
    String quotaId,
    String quotaName,
    String resourceGroupId,
    String status,
    String diagnosticCode,
    String diagnosticMessage,
    OffsetDateTime updatedAt
) {
}

record PaiSnapshotRecord(
    String snapshotId,
    String bindingId,
    String sourceVersion,
    String usageSummaryJson,
    String nodeSummaryJson,
    String poolSummaryJson,
    String storageSummaryJson,
    String status,
    boolean stale,
    String diagnosticCode,
    String diagnosticMessage,
    String paiRequestId,
    String traceId,
    OffsetDateTime lastSyncAt
) {
}

record PaiClientSyncResult(
    String result,
    String status,
    String diagnosticCode,
    String diagnosticMessage,
    boolean stale,
    String paiRequestId,
    String usageSummaryJson,
    String nodeSummaryJson,
    String poolSummaryJson,
    String storageSummaryJson
) {
    static PaiClientSyncResult unconfigured(String bindingId, String diagnostic) {
        return new PaiClientSyncResult(
            "FAILED",
            "UNCONFIGURED",
            "PAI_UNCONFIGURED",
            diagnostic,
            true,
            "TODO_CONFIRM_PAI_REQUEST_ID_OR_SANDBOX",
            "[]",
            "[]",
            "[]",
            "[]"
        );
    }

    static PaiClientSyncResult sandbox(PaiBindingRecord binding) {
        String usage = """
            [{"key":"gpu","label":"GPU 总量","used":36,"total":48,"unit":"卡","percent":75,"status":"WARNING"},{"key":"npu","label":"NPU 算力","used":6,"total":16,"unit":"卡","percent":38,"status":"READY"},{"key":"cpu","label":"CPU 核心","used":128,"total":192,"unit":"核","percent":67,"status":"READY"},{"key":"storage","label":"PAI/OSS 存储","used":145408,"total":204800,"unit":"GB","percent":71,"status":"READY"}]
            """.trim();
        String nodes = """
            [{"nodeId":"pai-node-a100-01","sourceType":"PAI_QUOTA_NODE","hostOrZone":"cn-shanghai-a","gpuSpec":"8×A100 80G","cpuCores":96,"memoryGb":768,"gpuTotal":8,"gpuUsed":6,"gpuUtilizationPercent":75,"status":"READY","diagnostic":"from PAI quota sandbox snapshot"}]
            """.trim();
        String pools = """
            [{"poolId":"%s","poolName":"%s","sourceType":"PAI_RESOURCE_QUOTA","bindingId":"%s","quotaId":"%s","workspaceId":"%s","gpuUsed":21,"gpuTotal":24,"cpuUsed":240,"cpuTotal":384,"memoryUsedGb":1024,"memoryTotalGb":1536,"userCount":12,"status":"READY"}]
            """.formatted(binding.quotaId(), binding.quotaName(), binding.bindingId(), binding.quotaId(), binding.workspaceId()).trim();
        String storage = """
            [{"storageId":"oss-pai-workspace-cabin","name":"PAI Workspace OSS","sourceType":"PAI_WORKSPACE_STORAGE","capacityGb":204800,"usedGb":145408,"percent":71,"status":"READY","diagnostic":"workspace storage sandbox summary"}]
            """.trim();
        return new PaiClientSyncResult("SUCCESS", "READY", "OK", "PAI resource sandbox snapshot synchronized", false, "SANDBOX-REQUEST-" + binding.bindingId(), usage, nodes, pools, storage);
    }
}
