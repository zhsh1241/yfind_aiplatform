import type { Page } from '@playwright/test';

export const e2eUser = {
  id: 'USR-ADMIN',
  username: 'admin',
  displayName: '平台管理员',
  tenantId: 'TENANT-YF',
  tenantName: '延锋汽车内饰系统',
  buCode: 'YF',
  status: 'ACTIVE',
  roles: ['SUPER_ADMIN'],
  roleNames: ['超级管理员'],
  permissions: ['menu:dash', 'menu:hub', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource', 'menu:datasrc', 'menu:ds', 'menu:portal', 'menu:lineage', 'menu:pipeline', 'menu:opmarket', 'data:pipeline:read', 'data:pipeline:write', 'data:pipeline:run', 'data:operator:read', 'data:operator:write', 'data:operator:review', 'data:standard:read', 'data:standard:write', 'data:standard:run', 'menu:ann', 'menu:annwork', 'menu:annreview', 'data:annotation:read', 'data:annotation:write', 'data:annotation:assign', 'data:annotation:submit', 'data:annotation:review', 'data:annotation:publish', 'data:label-template:read', 'data:label-template:write', 'data:label-template:publish'],
  menuPermissions: ['dash', 'hub', 'usermgmt', 'perm', 'org', 'sys', 'resource', 'datasrc', 'ds', 'portal', 'lineage', 'pipeline', 'opmarket', 'ann', 'annwork', 'annreview'],
  sessionVersion: 1,
};


const organizationTree = { nodes: [{ id: 'TENANT-YF', code: 'YF', name: '花叔工业智能', tenantType: 'CORP', parentId: null, path: '/TENANT-YF', status: 'ACTIVE', timezone: 'Asia/Shanghai', defaultLocale: 'zh-CN', quotaGpu: 200, quotaStorageTb: 2000, apiRateLimitPerDay: 50000, userCount: 1, usedGpu: 2, children: [{ id: 'TENANT-CABIN', code: 'CABIN', name: '智能座舱事业部', tenantType: 'BU', parentId: 'TENANT-YF', path: '/TENANT-YF/TENANT-CABIN', status: 'ACTIVE', timezone: 'Asia/Shanghai', defaultLocale: 'zh-CN', quotaGpu: 50, quotaStorageTb: 500, apiRateLimitPerDay: 10000, userCount: 2, usedGpu: 7, children: [{ id: 'TENANT-VISION', code: 'VISION', name: '视觉质检项目', tenantType: 'PROJECT', parentId: 'TENANT-CABIN', path: '/TENANT-YF/TENANT-CABIN/TENANT-VISION', status: 'ACTIVE', timezone: 'Asia/Shanghai', defaultLocale: 'zh-CN', quotaGpu: 8, quotaStorageTb: 5, apiRateLimitPerDay: 1000, userCount: 1, usedGpu: 2, children: [] }] }] }] };
const organizationMembers = { items: [{ id: 'OM-001', organizationId: 'TENANT-CABIN', organizationName: '智能座舱事业部', userId: 'USR-001', username: 'admin', displayName: '平台管理员', roleCode: 'SUPER_ADMIN', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', status: 'ACTIVE', expiresAt: null }], total: 1, page: 1, pageSize: 1 };
const platformConfigs = [
  { key: 'platform.name', groupName: 'basic', displayName: '平台名称', valueType: 'STRING', scopeAllowed: ['GLOBAL', 'BU'], sensitive: false, defaultValue: '延锋 SMP 工业AI平台', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: '延锋 SMP 工业AI平台', effectiveValue: '延锋 SMP 工业AI平台', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'upload.maxFileSizeMb', groupName: 'storage', displayName: '最大上传文件', valueType: 'NUMBER', scopeAllowed: ['GLOBAL', 'BU', 'PROJECT'], sensitive: false, defaultValue: '200', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: '200', effectiveValue: '200', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'notification.smtpHost', groupName: 'notification', displayName: 'SMTP Host', valueType: 'STRING', scopeAllowed: ['GLOBAL', 'BU'], sensitive: true, defaultValue: 'TODO_CONFIRM_SMTP_HOST', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: 'TODO_CONFIRM_SMTP_HOST', effectiveValue: 'TODO_CONFIRM_SMTP_HOST', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'security.evalDatasetDownload', groupName: 'security', displayName: '评估集下载开关', valueType: 'BOOLEAN', scopeAllowed: ['GLOBAL', 'BU', 'PROJECT'], sensitive: false, defaultValue: 'true', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: 'true', effectiveValue: 'true', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'auth.ssoMetadataUrl', groupName: 'auth', displayName: 'IdP 元数据 URL', valueType: 'STRING', scopeAllowed: ['GLOBAL'], sensitive: true, defaultValue: 'TODO_CONFIRM_IDP_METADATA_URL', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: 'TODO_CONFIRM_IDP_METADATA_URL', effectiveValue: 'TODO_CONFIRM_IDP_METADATA_URL', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'tag.defaultScenario', groupName: 'tag', displayName: '默认业务标签', valueType: 'STRING', scopeAllowed: ['GLOBAL', 'BU'], sensitive: false, defaultValue: '质量检测', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: '质量检测', effectiveValue: '质量检测', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
];
const fileObjects = { items: [{ fileId: 'FILE-001', assetType: 'DATASET', tenantId: 'TENANT-CABIN', projectId: 'TENANT-VISION', bucket: 'TODO_CONFIRM_MINIO_BUCKET', objectKey: 'TENANT-CABIN/DATASET/FILE-001.bin', expectedSha256: 'abc', sha256: 'abc', expectedSizeBytes: 1024, sizeBytes: 1024, contentType: 'application/octet-stream', storageTier: 'STANDARD', status: 'AVAILABLE', ownerId: 'USR-001', createdAt: '2026-05-17T00:00:00Z', updatedAt: '2026-05-17T00:00:00Z' }], total: 1, page: 1, pageSize: 1 };
const notificationChannels = [{ channelId: 'NC-GLOBAL-EMAIL', channelType: 'EMAIL', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', name: '邮件通知', enabled: true, configMasked: 'host=TODO_CONFIRM_SMTP_HOST;sender=TODO_CONFIRM_SMTP_SENDER', status: 'UNCONFIGURED', diagnostic: 'TODO_CONFIRM_SMTP_HOST', lastTestAt: null }];
const apiKeys = [{ id: 'AK-001', name: 'CI/CD 集成 Key', prefix: 'smp_live_abcd', maskedKey: 'smp_live_abcd********c91e', plainTextKey: null, scopeType: 'BU', scopeId: 'TENANT-CABIN', permissions: ['INFERENCE_READ'], status: 'ACTIVE', expiresAt: '2026-08-15T00:00:00Z', revokedAt: null, createdAt: '2026-05-17T00:00:00Z', lastUsedAt: null }];

const auditLog = { id: 'AUD-001', eventId: 'EVT-E2E', tenantId: 'TENANT-YF', operatorId: 'USR-ADMIN', operatorName: '平台管理员', operatorRole: 'SUPER_ADMIN', action: 'AUDIT_EXPORT_REQUESTED', resourceType: 'AuditLog', resourceId: 'EXPORT', result: 'SUCCESS', riskLevel: 'CRITICAL', beforeJson: null, afterJson: null, detailJson: 'TODO_CONFIRM_AUDIT_COLD_STORAGE', traceId: 'e2e', signature: 'abcdef1234567890', occurredAt: '2026-05-16T08:00:00Z' };

const dataSources = [{ sourceId: 'DSRC-CABIN-MINIO', name: 'Image bucket', sourceType: 'OBJECT_STORAGE', tenantId: 'TENANT-CABIN', projectId: null, endpoint: 'minio.sandbox.internal', port: 9000, databaseName: 'weld-images', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://TODO_CONFIRM_MINIO_DATASET', sharedScope: 'BU', description: 'object storage sandbox seam', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX OBJECT_STORAGE connector verified', latencyMs: 38, updatedAt: '2026-05-18T00:00:00Z' }, { sourceId: 'DSRC-CABIN-DB', name: 'MES relational db', sourceType: 'RELATIONAL_DB', tenantId: 'TENANT-CABIN', projectId: null, endpoint: 'postgres.sandbox.internal', port: 5432, databaseName: 'mes_order', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://sandbox/db', sharedScope: 'BU', description: 'relational db sandbox connector', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX RELATIONAL_DB connector verified', latencyMs: 41, updatedAt: '2026-05-18T00:00:00Z' }, { sourceId: 'DSRC-CABIN-STREAM', name: 'Weld event stream', sourceType: 'STREAM', tenantId: 'TENANT-CABIN', projectId: null, endpoint: 'kafka.sandbox.internal', port: 9092, databaseName: 'weld-events', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://sandbox/stream', sharedScope: 'BU', description: 'stream sandbox connector', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX STREAM connector verified', latencyMs: 39, updatedAt: '2026-05-18T00:00:00Z' }, { sourceId: 'DSRC-CABIN-TS', name: 'Equipment time-series', sourceType: 'TIME_SERIES', tenantId: 'TENANT-CABIN', projectId: null, endpoint: 'influx.sandbox.internal', port: 8086, databaseName: 'equipment_metrics', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://sandbox/timeseries', sharedScope: 'BU', description: 'time-series sandbox connector', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX TIME_SERIES connector verified', latencyMs: 37, updatedAt: '2026-05-18T00:00:00Z' }, { sourceId: 'DSRC-CABIN-OPC', name: 'Weld OPC-UA', sourceType: 'INDUSTRIAL_PROTOCOL', tenantId: 'TENANT-CABIN', projectId: null, endpoint: 'opcua.sandbox.internal', port: 4840, databaseName: 'ns=2;s=weld', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://sandbox/opcua', sharedScope: 'BU', description: 'industrial protocol sandbox connector', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX INDUSTRIAL_PROTOCOL connector verified', latencyMs: 45, updatedAt: '2026-05-18T00:00:00Z' }, { sourceId: 'DSRC-YF-API', name: 'Workorder API', sourceType: 'API', tenantId: 'TENANT-YF', projectId: null, endpoint: 'api.sandbox.internal', port: null, databaseName: 'workorder', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://TODO_CONFIRM_WORKORDER_API', sharedScope: 'GLOBAL', description: 'api sandbox connector', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX API connector verified', latencyMs: 42, updatedAt: '2026-05-18T00:00:00Z' }];
const syncTasks = [{ taskId: 'DSYNC-001', sourceId: 'DSRC-CABIN-MINIO', sourceName: '图像存储桶', targetDatasetId: 'DATASET-WELD-DEFECT', targetDatasetName: '焊缝缺陷检测数据集', name: '生产图像同步', scheduleMode: 'HOURLY', syncScope: 'prefix=/weld', status: 'PAUSED', lastRunAt: null, lastResult: 'UNCONFIGURED', diagnosticCode: 'DATA_SYNC_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_DATA_CONNECTOR_SCHEDULER' }];
const datasets = { items: [{ datasetId: 'DATASET-WELD-DEFECT', name: '焊缝缺陷检测数据集', datasetType: 'RAW', dataType: 'IMAGE', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-WELD-002', currentVersionName: 'v2', status: 'ACTIVE', accessLevel: 'RESTRICTED', tags: ['焊接','质检','目标检测'], versionCount: 2, recordCount: 31200, sizeBytes: 3072, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '焊缝缺陷图片样例数据集', archivedAt: null, updatedAt: '2026-05-18T00:00:00Z', mutable: true, hardDeletable: false }, { datasetId: 'DATASET-WORKORDER-TEXT', name: '工单文本分类语料库', datasetType: 'RAW', dataType: 'TEXT', tenantId: 'TENANT-YF', projectId: null, currentVersionId: 'DVER-TEXT-001', currentVersionName: 'v1', status: 'ARCHIVED', accessLevel: 'PUBLIC', tags: ['工单','NLP'], versionCount: 1, recordCount: 125600, sizeBytes: 2048, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '工单文本公开样例数据集', archivedAt: '2026-05-18T01:00:00Z', updatedAt: '2026-05-18T01:00:00Z', mutable: false, hardDeletable: true }], total: 2, page: 1, pageSize: 20, stats: { total: 2, raw: 2, preprocessed: 0, annotated: 0, restricted: 1, totalSizeBytes: 5120 } };
const datasetVersions = [
  { versionId: 'DVER-WELD-001', datasetId: 'DATASET-WELD-DEFECT', versionName: 'v1', status: 'PUBLISHED', isCurrent: false, sourceVersionId: null, recordCount: 16000, fileCount: 1, sizeBytes: 1024, contentSafetyStatus: 'PASSED', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX_CONTENT_SAFETY_PASSED', createdAt: '2026-05-18T00:00:00Z', publishedAt: '2026-05-18T00:00:00Z', mutable: false, deletable: false, deleteBlockedReason: 'DATASET_VERSION_IMMUTABLE' },
  { versionId: 'DVER-WELD-002', datasetId: 'DATASET-WELD-DEFECT', versionName: 'v2', status: 'READY', isCurrent: true, sourceVersionId: 'DVER-WELD-001', recordCount: 31200, fileCount: 2, sizeBytes: 3072, contentSafetyStatus: 'PASSED', diagnosticCode: 'OK', diagnosticMessage: 'VERSION_READY', createdAt: '2026-05-18T01:00:00Z', publishedAt: null, mutable: true, deletable: true, deleteBlockedReason: null },
];
const datasetFilesByVersion = {
  'DVER-WELD-001': [{ bindingId: 'DF-WELD-001', datasetId: 'DATASET-WELD-DEFECT', versionId: 'DVER-WELD-001', fileId: 'FILE-DATASET-WELD-001', fileRole: 'RAW', status: 'BOUND', objectKey: 'TENANT-CABIN/dataset/FILE-DATASET-WELD-001.csv', contentType: 'text/csv', sizeBytes: 1024, sha256: 'sha256-weld-001' }],
  'DVER-WELD-002': [
    { bindingId: 'DF-WELD-002', datasetId: 'DATASET-WELD-DEFECT', versionId: 'DVER-WELD-002', fileId: 'FILE-DATASET-WELD-001', fileRole: 'RAW', status: 'BOUND', objectKey: 'TENANT-CABIN/dataset/FILE-DATASET-WELD-001.csv', contentType: 'text/csv', sizeBytes: 1024, sha256: 'sha256-weld-001' },
    { bindingId: 'DF-WELD-003', datasetId: 'DATASET-WELD-DEFECT', versionId: 'DVER-WELD-002', fileId: 'FILE-DATASET-WELD-002', fileRole: 'RAW', status: 'BOUND', objectKey: 'TENANT-CABIN/dataset/FILE-DATASET-WELD-002.jpg', contentType: 'image/jpeg', sizeBytes: 2048, sha256: 'sha256-weld-002' },
  ],
};
const buildDatasetDetail = (versionId = 'DVER-WELD-002') => ({ dataset: datasets.items[0], selectedVersionId: versionId, selectedVersion: datasetVersions.find((item) => item.versionId === versionId), versions: datasetVersions, files: datasetFilesByVersion[versionId as keyof typeof datasetFilesByVersion] ?? [], grants: [], lineage: [{ lineageId: 'LIN-DSRC-WELD-001', sourceType: 'DATA_SOURCE', sourceId: 'DSRC-CABIN-MINIO', targetType: 'DATASET_VERSION', targetId: versionId, transformType: 'IMPORT', createdAt: '2026-05-18T00:00:00Z' }], previewStatus: versionId === 'DVER-WELD-002' ? 'PREVIEWABLE' : 'UNSUPPORTED', previewDiagnostic: versionId === 'DVER-WELD-002' ? '样例可预览' : '非图片/不可预览文件显示元数据退化状态' });
const datasetDetail = buildDatasetDetail();
const uploadDatasetSummary = { datasetId: 'DATASET-UPLOAD-E2E', name: 'F015 本地上传数据集', datasetType: 'RAW', dataType: 'IMAGE', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-UPLOAD-E2E', currentVersionName: 'v1', status: 'ACTIVE', accessLevel: 'TEAM', tags: [], versionCount: 1, recordCount: 1, sizeBytes: 1024, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '本地上传创建', archivedAt: null, updatedAt: '2026-05-18T02:00:00Z', mutable: true, hardDeletable: false };
const uploadDatasetVersion = { versionId: 'DVER-UPLOAD-E2E', datasetId: 'DATASET-UPLOAD-E2E', versionName: 'v1', status: 'READY', isCurrent: true, sourceVersionId: null, recordCount: 1, fileCount: 1, sizeBytes: 1024, contentSafetyStatus: 'PASSED', diagnosticCode: 'OK', diagnosticMessage: 'VERSION_READY', createdAt: '2026-05-18T02:00:00Z', publishedAt: null, mutable: true, deletable: false, deleteBlockedReason: 'DATASET_VERSION_LAST_ONE_FORBIDDEN' };
const uploadDatasetDetail = { dataset: uploadDatasetSummary, selectedVersionId: 'DVER-UPLOAD-E2E', selectedVersion: uploadDatasetVersion, versions: [uploadDatasetVersion], files: [{ bindingId: 'DF-UPLOAD-001', datasetId: 'DATASET-UPLOAD-E2E', versionId: 'DVER-UPLOAD-E2E', fileId: 'FILE-UPLOAD-001', fileRole: 'RAW', status: 'BOUND', objectKey: 'TENANT-CABIN/upload/FILE-UPLOAD-001.jpg', contentType: 'image/jpeg', sizeBytes: 1024, sha256: 'sha256-upload-001' }], grants: [], lineage: [], previewStatus: 'PREVIEWABLE', previewDiagnostic: '样例可预览' };
const riskDatasetDetail = { dataset: { datasetId: 'DATASET-UPLOAD-RISK', name: 'F015 高风险内容', datasetType: 'RAW', dataType: 'IMAGE', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-UPLOAD-RISK', currentVersionName: 'v1', status: 'DRAFT', accessLevel: 'TEAM', tags: [], versionCount: 1, recordCount: 0, sizeBytes: 2048, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '高风险内容待处理', archivedAt: null, updatedAt: '2026-05-18T02:00:00Z', mutable: true, hardDeletable: false }, selectedVersionId: 'DVER-UPLOAD-RISK', selectedVersion: { versionId: 'DVER-UPLOAD-RISK', datasetId: 'DATASET-UPLOAD-RISK', versionName: 'v1', status: 'SECURITY_PENDING', isCurrent: true, sourceVersionId: null, recordCount: 0, fileCount: 0, sizeBytes: 2048, contentSafetyStatus: 'BLOCKED', diagnosticCode: 'DATASET_UPLOAD_SECURITY_BLOCKED', diagnosticMessage: 'SECURITY_BLOCKED', createdAt: '2026-05-18T02:00:00Z', publishedAt: null, mutable: false, deletable: false, deleteBlockedReason: 'DATASET_VERSION_IMMUTABLE' }, versions: [{ versionId: 'DVER-UPLOAD-RISK', datasetId: 'DATASET-UPLOAD-RISK', versionName: 'v1', status: 'SECURITY_PENDING', isCurrent: true, sourceVersionId: null, recordCount: 0, fileCount: 0, sizeBytes: 2048, contentSafetyStatus: 'BLOCKED', diagnosticCode: 'DATASET_UPLOAD_SECURITY_BLOCKED', diagnosticMessage: 'SECURITY_BLOCKED', createdAt: '2026-05-18T02:00:00Z', publishedAt: null, mutable: false, deletable: false, deleteBlockedReason: 'DATASET_VERSION_IMMUTABLE' }], files: [], grants: [], lineage: [], previewStatus: 'UNSUPPORTED', previewDiagnostic: '高风险内容未进入可用版本' };
const datasetUploadSession = { sessionId: 'DUS-E2E-001', datasetId: 'DATASET-UPLOAD-E2E', versionId: 'DVER-UPLOAD-E2E', status: 'PENDING_UPLOAD', creationMode: 'LOCAL_UPLOAD', targetAction: 'CREATE_DATASET', targetDatasetId: null, targetVersionId: null, progress: { phase: 'PENDING_UPLOAD', percent: 0 }, summary: { totalFiles: 0, acceptedFiles: 0, rejectedFiles: 0 }, datasetStatus: 'DRAFT', versionStatus: 'DRAFT', diagnosticCode: 'OK', diagnosticMessage: 'SESSION_CREATED', files: [] };
const datasetUploadSessionUploaded = { ...datasetUploadSession, status: 'UPLOADING', progress: { phase: 'UPLOADING_FILES', percent: 45 }, summary: { totalFiles: 2, acceptedFiles: 1, rejectedFiles: 1 }, diagnosticMessage: 'UPLOAD_SUMMARY_UPDATED', files: [{ fileName: 'weld-1.jpg', fileId: 'FILE-UPLOAD-001', status: 'UPLOADED', sizeBytes: 1024, contentType: 'image/jpeg', diagnosticCode: 'OK', diagnosticMessage: 'FILE_ACCEPTED' }, { fileName: 'bad.txt', fileId: null, status: 'REJECTED', sizeBytes: 20, contentType: 'application/octet-stream', diagnosticCode: 'DATASET_UPLOAD_FILE_TYPE_UNSUPPORTED', diagnosticMessage: '仅支持图片文件与 zip 包' }] };
const datasetUploadSessionReady = { ...datasetUploadSessionUploaded, status: 'READY', progress: { phase: 'READY', percent: 100 }, datasetStatus: 'ACTIVE', versionStatus: 'READY', diagnosticCode: 'DATASET_UPLOAD_READY', diagnosticMessage: '本地上传数据集已完成文件绑定，可进入后续流程' };
const datasetUploadSessionProcessing = { ...datasetUploadSessionUploaded, datasetId: 'DATASET-UPLOAD-E2E', versionId: 'DVER-UPLOAD-E2E', status: 'PROCESSING', progress: { phase: 'SECURITY_SCAN', percent: 70 }, datasetStatus: 'DRAFT', versionStatus: 'DRAFT', diagnosticCode: 'OK', diagnosticMessage: 'SECURITY_SCAN' };
const datasetUploadSessionAppend = { sessionId: 'DUS-E2E-APPEND', datasetId: null, versionId: null, status: 'PENDING_UPLOAD', creationMode: 'LOCAL_UPLOAD', targetAction: 'APPEND_VERSION', targetDatasetId: 'DATASET-WELD-DEFECT', targetVersionId: 'DVER-WELD-002', progress: { phase: 'PENDING_UPLOAD', percent: 0 }, summary: { totalFiles: 0, acceptedFiles: 0, rejectedFiles: 0 }, datasetStatus: 'ACTIVE', versionStatus: 'READY', diagnosticCode: 'OK', diagnosticMessage: 'SESSION_CREATED', files: [] };
const datasetUploadSessionAppendUploaded = { ...datasetUploadSessionAppend, status: 'UPLOADING', progress: { phase: 'UPLOADING_FILES', percent: 45 }, summary: { totalFiles: 1, acceptedFiles: 1, rejectedFiles: 0 }, diagnosticCode: 'OK', diagnosticMessage: 'UPLOAD_SUMMARY_UPDATED', files: [{ fileName: 'append-1.jpg', fileId: 'FILE-UPLOAD-APPEND-001', status: 'UPLOADED', sizeBytes: 1536, contentType: 'image/jpeg', diagnosticCode: 'OK', diagnosticMessage: 'FILE_ACCEPTED' }] };
const datasetUploadSessionAppendProcessing = { ...datasetUploadSessionAppendUploaded, datasetId: 'DATASET-WELD-DEFECT', versionId: 'DVER-WELD-002', status: 'PROCESSING', progress: { phase: 'SECURITY_SCAN', percent: 70 }, datasetStatus: 'ACTIVE', versionStatus: 'READY', diagnosticCode: 'OK', diagnosticMessage: 'SECURITY_SCAN' };
const datasetUploadSessionAppendReady = { ...datasetUploadSessionAppendUploaded, datasetId: 'DATASET-WELD-DEFECT', versionId: 'DVER-WELD-002', status: 'READY', progress: { phase: 'READY', percent: 100 }, datasetStatus: 'ACTIVE', versionStatus: 'SECURITY_PENDING', diagnosticCode: 'DATASET_UPLOAD_APPEND_READY', diagnosticMessage: '文件已追加到既有版本，等待内容安全与索引完成' };
const datasetUploadSessionRiskUploaded = { ...datasetUploadSession, status: 'UPLOADING', progress: { phase: 'UPLOADING_FILES', percent: 45 }, summary: { totalFiles: 1, acceptedFiles: 1, rejectedFiles: 0 }, diagnosticMessage: 'UPLOAD_SUMMARY_UPDATED', files: [{ fileName: 'risk-photo.jpg', fileId: 'FILE-UPLOAD-RISK', status: 'UPLOADED', sizeBytes: 2048, contentType: 'image/jpeg', diagnosticCode: 'DATASET_UPLOAD_SECURITY_BLOCKED', diagnosticMessage: '检测到高风险内容' }] };
const datasetUploadSessionRiskProcessing = { ...datasetUploadSessionRiskUploaded, datasetId: 'DATASET-UPLOAD-RISK', versionId: 'DVER-UPLOAD-RISK', status: 'PROCESSING', progress: { phase: 'SECURITY_SCAN', percent: 70 }, datasetStatus: 'DRAFT', versionStatus: 'DRAFT', diagnosticCode: 'OK', diagnosticMessage: 'SECURITY_SCAN' };
const datasetUploadSessionRiskCommit = { ...datasetUploadSessionRiskUploaded, status: 'SECURITY_PENDING', progress: { phase: 'SECURITY_PENDING', percent: 100 }, datasetId: 'DATASET-UPLOAD-RISK', versionId: 'DVER-UPLOAD-RISK', datasetStatus: 'DRAFT', versionStatus: 'SECURITY_PENDING', diagnosticCode: 'DATASET_UPLOAD_SECURITY_BLOCKED', diagnosticMessage: 'SECURITY_BLOCKED', files: [{ fileName: 'risk-photo.jpg', fileId: 'FILE-UPLOAD-RISK', status: 'SECURITY_BLOCKED', sizeBytes: 2048, contentType: 'image/jpeg', diagnosticCode: 'DATASET_UPLOAD_SECURITY_BLOCKED', diagnosticMessage: '检测到高风险内容' }] };
const standardProfile = { datasetId: 'DATASET-WELD-DEFECT', datasetName: '焊缝缺陷检测数据集', datasetType: 'RAW', dataType: 'IMAGE', sourceType: 'OBJECT_STORAGE', profileStatus: 'PROFILED', qualityScore: 88, fieldCount: 4, matchedFieldCount: 4, issueCount: 1, fields: [{ sourceField: 'object_key', standardField: 'object_key', displayName: '对象路径', dataType: 'STRING', unit: null, required: true, mappingStatus: 'MATCHED', rule: '必须可追溯到对象路径' }, { sourceField: 'sha256', standardField: 'sha256', displayName: '内容哈希', dataType: 'STRING', unit: null, required: true, mappingStatus: 'MATCHED', rule: 'hash 必须一致' }] };
const standardTask = { taskId: 'DSTD-WELD-001', sourceDatasetId: 'DATASET-WELD-DEFECT', sourceDatasetName: '焊缝缺陷检测数据集', sourceVersionId: 'DVER-WELD-001', outputDatasetId: null, outputDatasetName: null, name: '焊缝图像数据 Schema 校验与归一化', standardProfile: 'INDUSTRIAL_VISUAL_STANDARD', status: 'READY', qualityScoreBefore: 88, qualityScoreAfter: null, diagnosticCode: 'READY_FOR_STANDARDIZATION', diagnosticMessage: '已生成字段映射、去重、图像归一化和标注格式标准化规则', lastRunAt: null, updatedAt: '2026-05-18T00:00:00Z' };
const standardOverview = { stats: { datasetCount: 2, profiledCount: 2, compliantCount: 1, issueCount: 2, taskCount: 1 }, profiles: [standardProfile, { ...standardProfile, datasetId: 'DATASET-WORKORDER-TEXT', datasetName: '工单文本分类语料库', dataType: 'TEXT', sourceType: 'API', qualityScore: 91, issueCount: 0 }], tasks: [standardTask] };

const operatorItems = [
  { operatorId: 'OP-READ-DATASET', name: '数据集读取', category: '数据输入', stage: '输入', kind: 'BUILTIN', status: 'PUBLISHED', description: '从 F009 数据集版本读取样本和元数据', beforeExample: '已发布数据集', afterExample: 'Pipeline 输入数据流', usageCount: 4210, pipelineCount: 31, errorRate: 0.01 },
  { operatorId: 'OP-IMAGE-RESIZE', name: '图像缩放', category: '图像处理', stage: '预处理', kind: 'BUILTIN', status: 'PUBLISHED', description: '统一图片尺寸并保留原始比例', beforeExample: '原始分辨率图片', afterExample: '输出 1024×1024', usageCount: 3890, pipelineCount: 24, errorRate: 0.01 },
  { operatorId: 'OP-NORMALIZE', name: '归一化', category: '数据清洗', stage: '预处理', kind: 'BUILTIN', status: 'PUBLISHED', description: '统一单位、时间和数值尺度', beforeExample: '原始像素值', afterExample: '标准化张量', usageCount: 3120, pipelineCount: 21, errorRate: 0.012 },
  { operatorId: 'OP-FORMAT-CONVERT', name: '格式转换', category: '格式转换', stage: '输出', kind: 'BUILTIN', status: 'PUBLISHED', description: 'COCO/YOLO/CSV/JSONL 等格式标准化', beforeExample: '原始标注', afterExample: '标准训练格式', usageCount: 2470, pipelineCount: 14, errorRate: 0.018 },
  { operatorId: 'OP-HTTP-CUSTOM', name: 'HTTP 自定义算子', category: '自定义算子', stage: '扩展', kind: 'HTTP', status: 'SUBMITTED', description: '通过受控 HTTP Endpoint 扩展 Pipeline 能力', beforeExample: '待增强样本', afterExample: '外部 API 增强结果', usageCount: 320, pipelineCount: 3, errorRate: 0.05 },
];
const operatorList = { items: operatorItems, total: operatorItems.length, categories: [{ category: '数据输入', count: 1 }, { category: '图像处理', count: 1 }, { category: '数据清洗', count: 1 }, { category: '格式转换', count: 1 }, { category: '自定义算子', count: 1 }], stats: { total: operatorItems.length, builtin: 4, custom: 1, published: 4, submitted: 1 } };
const operatorDetail = (operatorId = 'OP-NORMALIZE') => { const op = operatorItems.find((item) => item.operatorId === operatorId) ?? operatorItems[2]; return { operator: op, parameterSchemaJson: '{"type":"object","required":["profile"],"properties":{"profile":{"type":"string"}}}', inputSchemaJson: '{"dataset":"ANY"}', outputSchemaJson: '{"dataset":"PREPROCESSED"}', endpointMasked: op.kind === 'HTTP' ? 'TODO_CONFIRM_OPERATOR_HTTP_ENDPOINT' : null, credentialRefMasked: op.kind === 'HTTP' ? 'secret://TODO_CONFIRM_OPERATOR_SECRET' : null, timeoutSeconds: op.kind === 'HTTP' ? 30 : null, concurrencyLimit: op.kind === 'HTTP' ? 2 : null, reviews: op.status === 'SUBMITTED' ? [{ reviewId: 'OREV-E2E', operatorId: op.operatorId, submitterId: 'USR-ADMIN', reviewerId: null, status: 'SUBMITTED', reason: '等待安全评审', submittedAt: '2026-05-18T00:00:00Z', reviewedAt: null }] : [] }; };
const pipelineDetail = { pipeline: { pipelineId: 'PIPE-IMG-PREP', name: '图像预处理 Pipeline', tenantId: 'TENANT-CABIN', projectId: null, status: 'VALIDATED', currentVersionId: 'PVER-IMG-PREP-001', ownerId: 'USR-ADMIN', ownerName: '平台管理员', nodeCount: 4, runCount: 0, description: '焊缝缺陷检测图像预处理 Pipeline', updatedAt: '2026-05-18T00:00:00Z' }, nodes: [{ nodeId: 'read', operatorId: 'OP-READ-DATASET', operatorName: '数据集读取', label: '读取焊缝数据集', positionX: 80, positionY: 150, configJson: '{"datasetId":"DATASET-WELD-DEFECT"}', status: 'READY' }, { nodeId: 'resize', operatorId: 'OP-IMAGE-RESIZE', operatorName: '图像缩放', label: '图像缩放', positionX: 300, positionY: 150, configJson: '{"width":1024,"height":1024}', status: 'READY' }, { nodeId: 'normalize', operatorId: 'OP-NORMALIZE', operatorName: '归一化', label: '归一化', positionX: 520, positionY: 150, configJson: '{"profile":"INDUSTRIAL_VISUAL_STANDARD"}', status: 'READY' }, { nodeId: 'format', operatorId: 'OP-FORMAT-CONVERT', operatorName: '格式转换', label: '格式转换', positionX: 740, positionY: 150, configJson: '{"targetFormat":"COCO"}', status: 'READY' }], edges: [{ edgeId: 'EDGE-read-resize', sourceNodeId: 'read', targetNodeId: 'resize', edgeType: 'DATA' }, { edgeId: 'EDGE-resize-normalize', sourceNodeId: 'resize', targetNodeId: 'normalize', edgeType: 'DATA' }, { edgeId: 'EDGE-normalize-format', sourceNodeId: 'normalize', targetNodeId: 'format', edgeType: 'DATA' }], variables: [{ name: 'batch_size', valueType: 'INT', valueKind: 'LITERAL', valueMasked: '32', required: true }, { name: 'output_bucket', valueType: 'STRING', valueKind: 'ENV_REF', valueMasked: 'TODO_CONFIRM_PIPELINE_OUTPUT_BUCKET', required: true }, { name: 'operator_secret', valueType: 'STRING', valueKind: 'SECRET_REF', valueMasked: 'secret://TODO_CONFIRM_PIPELINE_OPERATOR_SECRET', required: false }], versions: [{ versionId: 'PVER-IMG-PREP-001', pipelineId: 'PIPE-IMG-PREP', versionName: 'v1.0', note: '原型 Pipeline', dagJson: '{"nodes":4}', createdBy: 'USR-ADMIN', createdAt: '2026-05-18T00:00:00Z' }], runs: [], validation: { valid: true, diagnosticCode: 'OK', diagnosticMessage: 'DAG 校验通过', errors: [], warnings: ['TODO_CONFIRM_PIPELINE_SCHEDULER_TARGET'] } };
const pipelineRun = { run: { runId: 'PRUN-E2E', pipelineId: 'PIPE-IMG-PREP', versionId: 'PVER-IMG-PREP-001', status: 'SUCCEEDED', triggerMode: 'MANUAL', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX_PIPELINE_RUN_SUCCEEDED', outputDatasetId: 'DATASET-PIPE-E2E', durationMs: 48000, startedAt: '2026-05-18T00:00:00Z', endedAt: '2026-05-18T00:00:48Z' }, nodeRuns: [{ nodeRunId: 'PNRUN-E2E-1', runId: 'PRUN-E2E', nodeId: 'read', operatorName: '数据集读取', status: 'SUCCEEDED', durationMs: 800, logSummary: '读取完成', errorCode: null }] };

const annotationTask = { taskId: 'ANN-WELD-Q2', name: '焊缝缺陷检测标注任务', scene: 'OBJECT_DETECTION', sceneLabel: '目标检测', sourceDatasetId: 'DATASET-WELD-DEFECT', sourceDatasetName: '焊缝缺陷检测数据集', templateId: 'LT-WELD-BBOX', templateName: '焊缝 BBox 模板', tenantId: 'TENANT-CABIN', status: 'IN_PROGRESS', reviewEnabled: true, prelabelEnabled: true, labelStudioEnabled: true, totalCount: 6, annotatedCount: 4, reviewedCount: 2, qualityScore: null, assignees: [{ userId: 'USR-ANNOTATOR', displayName: '标注工程师', role: 'ANNOTATOR' }, { userId: 'USR-BU-CABIN', displayName: '座舱审核员', role: 'REVIEWER' }], deadline: '2026-06-02T00:00:00Z', updatedAt: '2026-05-19T00:00:00Z' };
const annotationTemplate = { templateId: 'LT-WELD-BBOX', name: '焊缝 BBox 模板', scene: 'OBJECT_DETECTION', labelType: 'BOUNDING_BOX', labelSchemaJson: '{"labels":["裂纹","气孔"]}', labelStudioConfigXml: '<View><Image name="image" value="$image"/></View>', status: 'PUBLISHED', tenantId: 'TENANT-CABIN', createdBy: 'USR-ADMIN', updatedAt: '2026-05-19T00:00:00Z' };
const annotationBinding = { bindingId: 'AEXT-WELD-Q2', taskId: 'ANN-WELD-Q2', provider: 'LABEL_STUDIO', externalProjectId: null, externalUrl: 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL', externalTaskId: null, externalTaskUrl: null, configStatus: 'UNCONFIGURED', lastSyncStatus: 'UNCONFIGURED', diagnosticCode: 'LABEL_STUDIO_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL;TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET', launchUrl: null, retryable: false, lastSyncAt: null };
const annotationProjectBinding = { ...annotationBinding, externalProjectId: '123', externalUrl: 'http://localhost:8083/projects/123', configStatus: 'CONFIGURED', lastSyncStatus: 'PROJECT_SYNCED', diagnosticCode: 'LABEL_STUDIO_PROJECT_SYNCED', diagnosticMessage: 'Label Studio project 已同步', launchUrl: 'http://localhost:8083/projects/123', lastSyncAt: '2026-05-19T00:00:00Z' };
const annotationTaskBinding = { ...annotationProjectBinding, externalTaskId: '456', externalTaskUrl: 'http://localhost:8083/projects/123/data?task=456', lastSyncStatus: 'TASK_SYNCED', diagnosticCode: 'LABEL_STUDIO_TASK_SYNCED', diagnosticMessage: 'Label Studio task 已同步', launchUrl: 'http://localhost:8083/projects/123/data?task=456' };
const annotationImportedBinding = { ...annotationTaskBinding, lastSyncStatus: 'RESULT_IMPORTED', diagnosticCode: 'LABEL_STUDIO_RESULTS_IMPORTED', diagnosticMessage: '已导入 1 条 Label Studio 标注结果' };
const annotationWorkItems = [{ workItemId: 'AWI-WELD-001', taskId: 'ANN-WELD-Q2', sampleKey: 'weld/0001.jpg', sampleFileId: 'FILE-DATASET-WELD-001', annotatorId: 'USR-ANNOTATOR', annotatorName: '标注工程师', status: 'DRAFT', predictionJson: '{"boxes":[{"label":"裂纹"}]}', annotationJson: null, submittedAt: null, updatedAt: '2026-05-19T00:00:00Z' }];
const annotationReviewItems = [{ reviewItemId: 'ARV-WELD-001', workItemId: 'AWI-WELD-002', taskId: 'ANN-WELD-Q2', taskName: '焊缝缺陷检测标注任务', annotatorId: 'USR-ANNOTATOR', annotatorName: '标注工程师', reviewerId: 'USR-BU-CABIN', reviewerName: '座舱审核员', status: 'REVIEW_PENDING', reviewComment: null, reviewedAt: null }];
const annotationPublication = { publicationId: 'APUB-WELD-Q2', taskId: 'ANN-WELD-Q2', qualityStatus: 'PASSED', coverageRate: 1, formatStatus: 'COCO_READY', diagnosticCode: 'ANNOTATION_QUALITY_PASSED', diagnosticMessage: 'DAT-010 quality passed', outputDatasetId: 'DATASET-WELD-ANNOTATED', outputVersionId: 'DVER-WELD-ANN-001', publishedAt: '2026-05-19T00:00:00Z' };
const annotationOverview = { stats: { total: 1, inProgress: 1, pendingReview: 1, completed: 0, templates: 1 }, tasks: [annotationTask], templates: [annotationTemplate] };
const annotationDetail = { task: annotationTask, assignments: [], workItems: annotationWorkItems, reviewItems: annotationReviewItems, publications: [], externalBinding: annotationBinding };

const paiStatus = { status: 'UNCONFIGURED', configured: false, enabled: false, regionId: 'TODO_CONFIRM_PAI_REGION', endpoint: 'TODO_CONFIRM_PAI_ENDPOINT', workspaceId: 'TODO_CONFIRM_PAI_WORKSPACE_ID', quotaId: 'TODO_CONFIRM_PAI_QUOTA_ID', resourceGroupId: 'TODO_CONFIRM_PAI_RESOURCE_GROUP_ID', credentialMode: 'RAM_ROLE', credentialRefMasked: 'TODO_CONFIRM_PAI_RAM_ROLE_ARN', diagnosticCode: 'PAI_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_PAI_REGION;TODO_CONFIRM_PAI_WORKSPACE_ID;TODO_CONFIRM_PAI_QUOTA_ID', lastSyncAt: null, stale: false };
const paiOverview = { status: 'READY', scopeType: 'BU', scopeId: 'TENANT-CABIN', bindingId: 'PAI-BIND-CABIN', workspaceId: 'pai-ws-cabin-sandbox', quotaId: 'quota-cabin-sandbox', resourceGroupId: 'rg-cabin-general', lastSyncAt: '2026-05-17T00:00:00Z', stale: false, diagnosticCode: 'OK', diagnosticMessage: 'PAI resource sandbox snapshot synchronized', updatedFrom: 'PAI_SNAPSHOT', cards: [{ key: 'gpu', label: 'GPU 总量', used: 36, total: 48, unit: '卡', percent: 75, status: 'WARNING' }, { key: 'npu', label: 'NPU 算力', used: 6, total: 16, unit: '卡', percent: 38, status: 'READY' }, { key: 'cpu', label: 'CPU 核心', used: 128, total: 192, unit: '核', percent: 67, status: 'READY' }, { key: 'storage', label: 'PAI/OSS 存储', used: 145408, total: 204800, unit: 'GB', percent: 71, status: 'READY' }] };
const paiWorkspaces = { items: [{ bindingId: 'PAI-BIND-CABIN', organizationId: 'TENANT-CABIN', organizationName: '智能座舱事业部', scopeType: 'BU', workspaceId: 'pai-ws-cabin-sandbox', workspaceName: 'PAI-CABIN-SANDBOX', quotaId: 'quota-cabin-sandbox', quotaName: '训练资源配额 Sandbox', resourceGroupId: 'rg-cabin-general', status: 'ACTIVE', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX_PAI_BINDING_FOR_CONTRACT_TEST_ONLY', lastSyncAt: '2026-05-17T00:00:00Z' }], total: 1, page: 1, pageSize: 1 };
const paiNodes = { items: [{ nodeId: 'pai-node-a100-01', sourceType: 'PAI_QUOTA_NODE', hostOrZone: 'cn-shanghai-a', gpuSpec: '8×A100 80G', cpuCores: 96, memoryGb: 768, gpuTotal: 8, gpuUsed: 6, gpuUtilizationPercent: 75, status: 'READY', diagnostic: 'from PAI quota sandbox snapshot' }], total: 1, page: 1, pageSize: 1 };
const paiPools = { items: [{ poolId: 'quota-cabin-sandbox', poolName: '训练资源配额 Sandbox', sourceType: 'PAI_RESOURCE_QUOTA', bindingId: 'PAI-BIND-CABIN', quotaId: 'quota-cabin-sandbox', workspaceId: 'pai-ws-cabin-sandbox', gpuUsed: 21, gpuTotal: 24, cpuUsed: 240, cpuTotal: 384, memoryUsedGb: 1024, memoryTotalGb: 1536, userCount: 12, status: 'READY' }], total: 1, page: 1, pageSize: 1 };
const paiStorage = { items: [{ storageId: 'oss-pai-workspace-cabin', name: 'PAI Workspace OSS', sourceType: 'PAI_WORKSPACE_STORAGE', capacityGb: 204800, usedGb: 145408, percent: 71, status: 'READY', diagnostic: 'workspace storage sandbox summary' }], total: 1, page: 1, pageSize: 1 };

export async function mockPlatformApis(page: Page) {
  await page.route('**/api/v1/foundation/status', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { service: 'smp-backend', status: 'READY', domains: ['DATA', 'MODEL', 'INFERENCE', 'RESOURCE', 'PLATFORM'], enabledCapabilities: ['identity', 'permission', 'audit'] } } });
  });
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { accessToken: 'token-f006', refreshToken: 'refresh-f006', tokenType: 'Bearer', expiresInSeconds: 3600, user: e2eUser } } });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: e2eUser } });
  });
  await page.route('**/api/v1/platform/users', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { items: [{ id: 'USR-001', username: 'admin', displayName: '平台管理员', email: 'admin@yf.local', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', authType: 'LOCAL', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], lastLoginAt: null, failedLoginCount: 0, lockedUntil: null, sessionVersion: 1 }], total: 1, page: 1, pageSize: 1 } } });
  });
  await page.route('**/api/v1/platform/roles', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: [{ code: 'SUPER_ADMIN', name: '超级管理员', description: '全平台所有权限', scope: 'GLOBAL', preset: true, userCount: 1 }, { code: 'BU_ADMIN', name: 'BU子管理员', description: 'BU 范围管理', scope: 'TENANT', preset: true, userCount: 1 }] } });
  });
  await page.route('**/api/v1/platform/permissions/matrix', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { roles: [{ code: 'SUPER_ADMIN', name: '超级管理员', description: '全平台所有权限', scope: 'GLOBAL', preset: true, userCount: 1 }, { code: 'BU_ADMIN', name: 'BU子管理员', description: 'BU 范围管理', scope: 'TENANT', preset: true, userCount: 1 }], modules: [{ name: '平台管理', permissions: [] }], rows: [{ module: '平台管理', permissionCode: 'platform:user:read', permissionName: '查询用户', allowedRoles: ['SUPER_ADMIN', 'BU_ADMIN'] }] } } });
  });

  await page.route('**/api/v1/platform/organizations/tree', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: organizationTree } });
  });
  await page.route('**/api/v1/platform/organizations/members', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: organizationMembers } });
  });
  await page.route('**/api/v1/platform/configs**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: platformConfigs } });
  });
  await page.route('**/api/v1/platform/files**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: fileObjects } });
  });
  await page.route('**/api/v1/platform/notification-channels/*/test', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { channelId: 'NC-GLOBAL-EMAIL', result: 'UNCONFIGURED', diagnostic: 'TODO_CONFIRM_SMTP_HOST', testedAt: '2026-05-17T00:00:00Z' } } });
  });
  await page.route('**/api/v1/platform/notification-channels', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: notificationChannels } });
  });
  await page.route('**/api/v1/platform/api-keys/*/revoke', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...apiKeys[0], status: 'REVOKED', revokedAt: '2026-05-17T00:00:00Z' } } });
  });
  await page.route('**/api/v1/platform/api-keys', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...apiKeys[0], id: 'AK-NEW', name: 'E2E Key', plainTextKey: 'smp_live_new_plaintext_once' } } });
      return;
    }
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: apiKeys } });
  });


  await page.route('**/api/v1/data-sources', async (route) => {
    if (route.request().method() === 'POST') { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...dataSources[1], sourceId: 'DSRC-NEW', name: '新建数据源' } } }); return; }
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: dataSources } });
  });
  await page.route('**/api/v1/data-sources/*/test', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { sourceId: 'DSRC-CABIN-MINIO', result: 'SUCCESS', status: 'TESTED', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX OBJECT_STORAGE connector verified', latencyMs: 42, traceId: 'e2e', testedAt: '2026-05-18T00:00:00Z' } } }); });
  await page.route('**/api/v1/data-sources/*/activate', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...dataSources[0], status: 'ACTIVE' } } }); });
  await page.route('**/api/v1/data-sources/*/disable', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...dataSources[0], status: 'DISABLED' } } }); });
  await page.route('**/api/v1/data-source-sync-tasks', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: route.request().method() === 'POST' ? { ...syncTasks[0], taskId: 'DSYNC-NEW' } : syncTasks } }); });
  await page.route('**/api/v1/data-source-sync-tasks/*/run', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...syncTasks[0], status: 'SUCCEEDED', lastResult: 'SUCCESS', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX_RELATIONAL_DB_IMPORT_READY' } } }); });
  await page.route('**/api/v1/datasets', async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        message: 'success',
        traceId: 'e2e',
        timestamp: new Date().toISOString(),
        data: route.request().method() === 'POST'
          ? { ...buildDatasetDetail(), dataset: { ...datasets.items[0], name: '新建视觉数据集', status: 'DRAFT', currentVersionId: 'DVER-UPLOAD-E2E', currentVersionName: 'v1', versionCount: 1 }, selectedVersionId: 'DVER-UPLOAD-E2E', selectedVersion: { versionId: 'DVER-UPLOAD-E2E', datasetId: 'DATASET-UPLOAD-E2E', versionName: 'v1', status: 'DRAFT', isCurrent: true, sourceVersionId: null, recordCount: 0, fileCount: 0, sizeBytes: 0, contentSafetyStatus: 'UNCONFIGURED', diagnosticCode: 'OK', diagnosticMessage: 'TODO_CONFIRM_CONTENT_SAFETY_SERVICE', createdAt: '2026-05-18T00:00:00Z', publishedAt: null, mutable: true, deletable: false, deleteBlockedReason: 'DATASET_VERSION_LAST_ONE_FORBIDDEN' }, versions: [{ versionId: 'DVER-UPLOAD-E2E', datasetId: 'DATASET-UPLOAD-E2E', versionName: 'v1', status: 'DRAFT', isCurrent: true, sourceVersionId: null, recordCount: 0, fileCount: 0, sizeBytes: 0, contentSafetyStatus: 'UNCONFIGURED', diagnosticCode: 'OK', diagnosticMessage: 'TODO_CONFIRM_CONTENT_SAFETY_SERVICE', createdAt: '2026-05-18T00:00:00Z', publishedAt: null, mutable: true, deletable: false, deleteBlockedReason: 'DATASET_VERSION_LAST_ONE_FORBIDDEN' }], files: [] }
          : datasets,
      },
    });
  });
  await page.route('**/api/v1/datasets?**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: datasets } });
  });
  await page.route('**/api/v1/datasets/*/lineage', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: datasetDetail.lineage } }); });
  await page.route('**/api/v1/datasets/*/versions', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        json: {
          code: 0,
          message: 'success',
          traceId: 'e2e',
          timestamp: new Date().toISOString(),
          data: { versionId: 'DVER-WELD-003', datasetId: 'DATASET-WELD-DEFECT', versionName: 'v3', status: 'READY', isCurrent: true, sourceVersionId: 'DVER-WELD-002', recordCount: 31200, fileCount: 2, sizeBytes: 3072, contentSafetyStatus: 'PASSED', diagnosticCode: 'OK', diagnosticMessage: 'VERSION_READY', createdAt: '2026-05-18T02:00:00Z', publishedAt: null, mutable: true, deletable: true, deleteBlockedReason: null },
        },
      });
      return;
    }
    await route.fallback();
  });
  await page.route('**/api/v1/datasets/*/versions/*/files/*', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { datasetId: 'DATASET-WELD-DEFECT', versionId: 'DVER-WELD-002', bindingId: 'DF-WELD-003', fileId: 'FILE-DATASET-WELD-002', remainingFileCount: 1 } } });
  });
  await page.route('**/api/v1/datasets/*/versions/*/files', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: datasetFilesByVersion['DVER-WELD-002'][1] } });
  });
  await page.route('**/api/v1/datasets/*/versions/*', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { datasetId: 'DATASET-WELD-DEFECT', deletedVersionId: 'DVER-WELD-002', currentVersionId: 'DVER-WELD-001', currentVersionName: 'v1', versionCount: 1 } } });
  });
  await page.route('**/api/v1/datasets/*/archive', async (route) => {
    const archivedSummary = { ...datasets.items[0], status: 'ARCHIVED', mutable: false, archivedAt: '2026-05-18T03:00:00Z' };
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: archivedSummary } });
  });
  await page.route('**/api/v1/datasets/*', async (route) => {
    const url = new URL(route.request().url());
    const versionId = url.searchParams.get('versionId') ?? 'DVER-WELD-002';
    if (url.pathname.endsWith('/DATASET-UPLOAD-E2E')) {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: uploadDatasetDetail } });
      return;
    }
    if (url.pathname.endsWith('/DATASET-UPLOAD-RISK')) {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: riskDatasetDetail } });
      return;
    }
    if (route.request().method() === 'PUT') {
      const detail = buildDatasetDetail(versionId);
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...detail, dataset: { ...detail.dataset, name: '焊缝缺陷检测数据集-修订', accessLevel: 'TEAM', tags: ['焊接', '修订'], description: 'metadata updated' } } } });
      return;
    }
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: null } });
      return;
    }
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: buildDatasetDetail(versionId) } });
  });
  let uploadSessionPollCount = 0;
  let riskUploadSessionPollCount = 0;
  await page.route('**/api/v1/dataset-upload-sessions/*/files', async (route) => {
    const payload = route.request().postDataBuffer()?.toString('utf8') ?? '';
    const data = payload.includes('risk-photo.jpg') ? datasetUploadSessionRiskUploaded : payload.includes('append-1.jpg') ? datasetUploadSessionAppendUploaded : datasetUploadSessionUploaded;
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data } });
  });
  await page.route('**/api/v1/dataset-upload-sessions/*/commit', async (route) => {
    const url = route.request().url();
    const data = url.includes('DUS-E2E-RISK') ? datasetUploadSessionRiskProcessing : url.includes('DUS-E2E-APPEND') ? datasetUploadSessionAppendProcessing : datasetUploadSessionProcessing;
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data } });
  });
  await page.route('**/api/v1/dataset-upload-sessions/*', async (route) => {
    const url = route.request().url();
    if (url.includes('DUS-E2E-RISK')) {
      riskUploadSessionPollCount += 1;
      const data = riskUploadSessionPollCount === 1 ? datasetUploadSessionRiskProcessing : datasetUploadSessionRiskCommit;
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data } });
      return;
    }
    if (url.includes('DUS-E2E-001')) {
      uploadSessionPollCount += 1;
      const data = uploadSessionPollCount === 1 ? datasetUploadSessionProcessing : datasetUploadSessionReady;
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data } });
      return;
    }
    if (url.includes('DUS-E2E-APPEND')) {
      uploadSessionPollCount += 1;
      const data = uploadSessionPollCount === 1 ? datasetUploadSessionAppendProcessing : datasetUploadSessionAppendReady;
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data } });
      return;
    }
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: datasetUploadSession } });
  });
  await page.route('**/api/v1/dataset-upload-sessions', async (route) => {
    const payload = route.request().postData() ?? '';
    const data = payload.includes('APPEND_VERSION') ? datasetUploadSessionAppend : datasetUploadSession;
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data } });
  });
  await page.route('**/api/v1/dataset-references**', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { datasetId: 'DATASET-WELD-DEFECT', versionId: 'DVER-WELD-001', status: 'PUBLISHED', usable: true, diagnosticCode: 'OK', diagnosticMessage: 'usable' } } }); });

  await page.route('**/api/v1/pipelines', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { items: [pipelineDetail.pipeline], total: 1, page: 1, pageSize: 20 } } }); });
  await page.route('**/api/v1/pipelines/*/versions/*/restore', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...pipelineDetail, pipeline: { ...pipelineDetail.pipeline, status: 'DRAFT' } } } }); });
  await page.route('**/api/v1/pipelines/*/versions', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: route.request().method() === 'POST' ? { ...pipelineDetail.versions[0], versionId: 'PVER-E2E-NEW', versionName: 'v1.2' } : pipelineDetail.versions } }); });
  await page.route('**/api/v1/pipelines/*/runs', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: route.request().method() === 'POST' ? pipelineRun : [pipelineRun.run] } }); });
  await page.route('**/api/v1/pipeline-runs/*', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: pipelineRun } }); });
  await page.route('**/api/v1/pipelines/*/validate', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: pipelineDetail.validation } }); });
  await page.route('**/api/v1/pipelines/*', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: pipelineDetail } }); });
  await page.route('**/api/v1/operators/custom', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: operatorDetail('OP-HTTP-CUSTOM') } }); });
  await page.route('**/api/v1/operators/*/submit-review', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: operatorDetail('OP-HTTP-CUSTOM') } }); });
  await page.route('**/api/v1/operators/*/approve', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...operatorDetail('OP-HTTP-CUSTOM'), operator: { ...operatorDetail('OP-HTTP-CUSTOM').operator, status: 'PUBLISHED' }, reviews: [{ ...operatorDetail('OP-HTTP-CUSTOM').reviews[0], status: 'APPROVED', reason: 'E2E 审核通过' }] } } }); });
  await page.route('**/api/v1/operators/*/reject', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...operatorDetail('OP-HTTP-CUSTOM'), operator: { ...operatorDetail('OP-HTTP-CUSTOM').operator, status: 'REJECTED' } } } }); });
  await page.route('**/api/v1/operators/*', async (route) => { const id = route.request().url().split('/').pop() ?? 'OP-NORMALIZE'; await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: operatorDetail(id) } }); });
  await page.route('**/api/v1/operators', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: operatorList } }); });
  await page.route('**/api/v1/operators?**', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: operatorList } }); });
  await page.route('**/api/v1/data-standards/overview', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: standardOverview } }); });
  await page.route('**/api/v1/datasets/*/standard-profile', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: standardProfile } }); });
  await page.route('**/api/v1/data-standard-tasks', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: route.request().method() === 'POST' ? { ...standardTask, taskId: 'DSTD-NEW', name: '焊缝缺陷检测数据集 自动标准化' } : [standardTask] } }); });
  await page.route('**/api/v1/data-standard-tasks/*/run', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...standardTask, status: 'SUCCEEDED', outputDatasetId: 'DATASET-STANDARDIZED-001', outputDatasetName: '焊缝缺陷检测数据集 标准化结果', qualityScoreAfter: 96, diagnosticCode: 'OK', diagnosticMessage: 'DATA_STANDARDIZATION_PASSED: 已生成 PREPROCESSED 标准化数据集' } } }); });
  await page.route('**/api/v1/platform/pai-resources/status', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: paiStatus } });
  });
  await page.route('**/api/v1/platform/pai-resources/overview**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: paiOverview } });
  });
  await page.route('**/api/v1/platform/pai-resources/workspaces', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: paiWorkspaces } });
  });
  await page.route('**/api/v1/platform/pai-resources/nodes**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: paiNodes } });
  });
  await page.route('**/api/v1/platform/pai-resources/pools**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: paiPools } });
  });
  await page.route('**/api/v1/platform/pai-resources/storage**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: paiStorage } });
  });
  await page.route('**/api/v1/platform/pai-resources/sync', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { syncId: 'PAI-SYNC-E2E', bindingId: 'PAI-BIND-CABIN', result: 'FAILED', status: 'UNCONFIGURED', diagnosticCode: 'PAI_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_PAI_REGION', lastSyncAt: '2026-05-17T00:00:00Z', stale: true, paiRequestId: 'TODO_CONFIRM_PAI_REQUEST_ID_OR_SANDBOX' } } });
  });
  await page.route('**/api/v1/platform/pai-resources/connection', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...paiStatus, status: 'READY', configured: true, enabled: true, regionId: 'cn-shanghai', diagnosticCode: 'OK', diagnosticMessage: 'ready for e2e' } } });
  });

  await page.route(/\/api\/v1\/annotation\/review-items(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: annotationReviewItems } });
  });
  await page.route(/\/api\/v1\/annotation\/overview(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: annotationOverview } });
  });
  await page.route(/\/api\/v1\/annotation\/tasks\/[^/]+\/work-items(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: annotationWorkItems } });
  });
  await page.route(/\/api\/v1\/annotation\/tasks\/[^/]+\/label-studio\/status(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: annotationBinding } });
  });
  await page.route(/\/api\/v1\/annotation\/tasks\/[^/]+\/label-studio\/sync-project(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: annotationProjectBinding } });
  });
  await page.route(/\/api\/v1\/annotation\/tasks\/[^/]+\/label-studio\/import-results(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: annotationImportedBinding } });
  });
  await page.route(/\/api\/v1\/annotation\/tasks\/[^/]+\/quality-check(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: annotationPublication } });
  });
  await page.route(/\/api\/v1\/annotation\/tasks\/[^/]+\/publish-dataset(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: annotationPublication } });
  });
  await page.route(/\/api\/v1\/annotation\/tasks\/[^/?]+(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: annotationDetail } });
  });
  await page.route(/\/api\/v1\/annotation\/tasks(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: route.request().method() === 'POST' ? annotationDetail : { items: [annotationTask], total: 1, page: 1, pageSize: 20 } } });
  });
  await page.route(/\/api\/v1\/annotation\/label-templates\/[^/]+\/publish(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: annotationTemplate } });
  });
  await page.route(/\/api\/v1\/annotation\/label-templates(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: route.request().method() === 'POST' ? { ...annotationTemplate, templateId: 'LT-E2E-NEW' } : [annotationTemplate] } });
  });
  await page.route(/\/api\/v1\/annotation\/work-items\/[^/]+\/label-studio\/sync-task(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: annotationTaskBinding } });
  });
  await page.route(/\/api\/v1\/annotation\/work-items\/[^/]+\/(?:draft|submit)(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...annotationWorkItems[0], status: 'REVIEW_PENDING', annotationJson: '{"boxes":[{"label":"缺陷"}]}' } } });
  });
  await page.route(/\/api\/v1\/annotation\/review-items\/[^/]+\/approve(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...annotationReviewItems[0], status: 'APPROVED', reviewedAt: '2026-05-19T00:00:00Z' } } });
  });
  await page.route(/\/api\/v1\/annotation\/review-items\/[^/]+\/reject(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...annotationReviewItems[0], status: 'REJECTED', reviewComment: '需要补充' } } });
  });

  await page.route('**/api/v1/platform/audit-logs**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { items: [auditLog], total: 1, page: 1, pageSize: 1 } } });
  });
}

export async function seedAuthenticatedSession(page: Page) {
  await mockPlatformApis(page);
  await page.goto('/login');
  await page.getByLabel('密码').fill('Smp@123456');
  await page.getByRole('button', { name: /登\s*录/ }).click();
  await page.getByText('SMP 工业 AI 小模型平台').waitFor({ state: 'visible' });
}
