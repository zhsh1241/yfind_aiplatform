import { expect, type Page, type Request } from '@playwright/test';

function readPostDataJson<T extends object = Record<string, unknown>>(request: Request): T {
  const payload = request.postData();
  if (!payload) {
    return {} as T;
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    return {} as T;
  }
}

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
const modelFileObjects = { items: [{ fileId: 'FILE-MODEL-001', assetType: 'MODEL', tenantId: 'TENANT-CABIN', projectId: null, bucket: 'smp-models', objectKey: 'TENANT-CABIN/models/MODEL-YOLO-001/v1.0/weld-yolo-v1.onnx', expectedSha256: 'sha256-model-001', sha256: 'sha256-model-001', expectedSizeBytes: 104857600, sizeBytes: 104857600, contentType: 'application/octet-stream', storageTier: 'STANDARD', status: 'AVAILABLE', ownerId: 'USR-ADMIN', createdAt: '2026-06-03T00:00:00Z', updatedAt: '2026-06-03T00:00:00Z' }] };
const notificationChannels = [{ channelId: 'NC-GLOBAL-EMAIL', channelType: 'EMAIL', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', name: '邮件通知', enabled: true, configMasked: 'host=TODO_CONFIRM_SMTP_HOST;sender=TODO_CONFIRM_SMTP_SENDER', status: 'UNCONFIGURED', diagnostic: 'TODO_CONFIRM_SMTP_HOST', lastTestAt: null }];
const apiKeys = [{ id: 'AK-001', name: 'CI/CD 集成 Key', prefix: 'smp_live_abcd', maskedKey: 'smp_live_abcd********c91e', plainTextKey: null, scopeType: 'BU', scopeId: 'TENANT-CABIN', permissions: ['INFERENCE_READ'], status: 'ACTIVE', expiresAt: '2026-08-15T00:00:00Z', revokedAt: null, createdAt: '2026-05-17T00:00:00Z', lastUsedAt: null }];

const auditLog = { id: 'AUD-001', eventId: 'EVT-E2E', tenantId: 'TENANT-YF', operatorId: 'USR-ADMIN', operatorName: '平台管理员', operatorRole: 'SUPER_ADMIN', action: 'AUDIT_EXPORT_REQUESTED', resourceType: 'AuditLog', resourceId: 'EXPORT', result: 'SUCCESS', riskLevel: 'CRITICAL', beforeJson: null, afterJson: null, detailJson: 'TODO_CONFIRM_AUDIT_COLD_STORAGE', traceId: 'e2e', signature: 'abcdef1234567890', occurredAt: '2026-05-16T08:00:00Z' };

const dataSources = [
  { sourceId: 'DSRC-CABIN-MINIO', name: 'Image bucket', sourceType: 'OBJECT_STORAGE', tenantId: 'TENANT-CABIN', projectId: null, endpoint: 'minio.sandbox.internal', port: 9000, databaseName: 'weld-images', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://TODO_CONFIRM_MINIO_DATASET', sharedScope: 'BU', description: 'object storage sandbox seam', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX OBJECT_STORAGE connector verified', latencyMs: 38, updatedAt: '2026-05-18T00:00:00Z' },
  { sourceId: 'DSRC-CABIN-DB', name: 'MES relational db', sourceType: 'RELATIONAL_DB', tenantId: 'TENANT-CABIN', projectId: null, endpoint: 'postgres.sandbox.internal', port: 5432, databaseName: 'mes_order', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://sandbox/db', sharedScope: 'BU', description: 'relational db sandbox connector', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX RELATIONAL_DB connector verified', latencyMs: 41, updatedAt: '2026-05-18T00:00:00Z' },
  { sourceId: 'DSRC-CABIN-STREAM', name: 'Weld event stream', sourceType: 'STREAM', tenantId: 'TENANT-CABIN', projectId: null, endpoint: 'kafka.sandbox.internal', port: 9092, databaseName: 'weld-events', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://sandbox/stream', sharedScope: 'BU', description: 'stream sandbox connector', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX STREAM connector verified', latencyMs: 39, updatedAt: '2026-05-18T00:00:00Z' },
  { sourceId: 'DSRC-CABIN-TS', name: 'Equipment time-series', sourceType: 'TIME_SERIES', tenantId: 'TENANT-CABIN', projectId: null, endpoint: 'influx.sandbox.internal', port: 8086, databaseName: 'equipment_metrics', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://sandbox/timeseries', sharedScope: 'BU', description: 'time-series sandbox connector', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX TIME_SERIES connector verified', latencyMs: 37, updatedAt: '2026-05-18T00:00:00Z' },
  { sourceId: 'DSRC-CABIN-OPC', name: 'Weld OPC-UA', sourceType: 'INDUSTRIAL_PROTOCOL', tenantId: 'TENANT-CABIN', projectId: null, endpoint: 'opcua.sandbox.internal', port: 4840, databaseName: 'ns=2;s=weld', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://sandbox/opcua', sharedScope: 'BU', description: 'industrial protocol sandbox connector', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX INDUSTRIAL_PROTOCOL connector verified', latencyMs: 45, updatedAt: '2026-05-18T00:00:00Z' },
  { sourceId: 'DSRC-YF-API', name: 'Workorder API', sourceType: 'API', tenantId: 'TENANT-YF', projectId: null, endpoint: 'api.sandbox.internal', port: null, databaseName: 'workorder', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://TODO_CONFIRM_WORKORDER_API', sharedScope: 'GLOBAL', description: 'api sandbox connector', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX API connector verified', latencyMs: 42, updatedAt: '2026-05-18T00:00:00Z' },
  { sourceId: 'DSRC-CABIN-RTSP', name: '焊缝 RTSP 视频流', sourceType: 'RTSP_STREAM', tenantId: 'TENANT-CABIN', projectId: null, endpoint: 'rtsp://camera.sandbox.internal/live/weld', port: 554, databaseName: 'camera-line-01', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://sandbox/rtsp-camera', sharedScope: 'BU', description: 'TASK-rtsp-video-stream-input sandbox RTSP connector', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX RTSP_STREAM connector verified', latencyMs: 44, updatedAt: '2026-05-18T00:00:00Z' },
];
const syncTasks = [
  { taskId: 'DSYNC-001', sourceId: 'DSRC-CABIN-MINIO', sourceName: '图像存储桶', targetDatasetId: 'DATASET-WELD-DEFECT', targetDatasetName: '焊缝缺陷检测数据集', name: '生产图像同步', scheduleMode: 'HOURLY', syncScope: 'prefix=/weld', status: 'PAUSED', lastRunAt: null, lastResult: 'UNCONFIGURED', diagnosticCode: 'DATA_SYNC_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_DATA_CONNECTOR_SCHEDULER' },
  { taskId: 'DSYNC-RTSP-001', sourceId: 'DSRC-CABIN-RTSP', sourceName: '焊缝 RTSP 视频流', targetDatasetId: 'DATASET-RTSP-SAMPLE-E2E', targetDatasetName: 'F018 RTSP 采样视频数据集', name: 'F018 RTSP 手动采样', scheduleMode: 'MANUAL', syncScope: 'durationSeconds=10;sampleName=weld-line', status: 'PAUSED', lastRunAt: null, lastResult: 'UNCONFIGURED', diagnosticCode: 'RTSP_SAMPLE_READY', diagnosticMessage: 'TODO_CONFIRM_RTSP_CAPTURE_ADAPTER; manual sample task ready' },
];
const datasets = { items: [{ datasetId: 'DATASET-WELD-DEFECT', name: '焊缝缺陷检测数据集', datasetType: 'RAW', dataType: 'IMAGE', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-WELD-002', currentVersionName: 'v2', status: 'ACTIVE', accessLevel: 'RESTRICTED', tags: ['焊接','质检','目标检测'], versionCount: 2, recordCount: 31200, sizeBytes: 3072, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '焊缝缺陷图片样例数据集', archivedAt: null, updatedAt: '2026-05-18T00:00:00Z', mutable: true, hardDeletable: false }, { datasetId: 'DATASET-WELD-VIDEO-001', name: '焊缝视频原始数据集', datasetType: 'RAW', dataType: 'AUDIO_VIDEO', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-WELD-VIDEO-001', currentVersionName: 'v1', status: 'ACTIVE', accessLevel: 'TEAM', tags: ['焊接','视频','抽帧'], versionCount: 1, recordCount: 480, sizeBytes: 8192, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '焊缝视频抽帧样例数据集', archivedAt: null, updatedAt: '2026-05-18T00:00:00Z', mutable: true, hardDeletable: false }, { datasetId: 'DATASET-WELD-FRAMES-001', name: '焊缝视频抽帧预处理结果', datasetType: 'PREPROCESSED', dataType: 'IMAGE', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-WELD-FRAMES-001', currentVersionName: 'v1', status: 'ACTIVE', accessLevel: 'TEAM', tags: ['预处理','抽帧','标注可用'], versionCount: 1, recordCount: 2400, sizeBytes: 4096, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '由视觉预处理 Pipeline 生成并已激活', archivedAt: null, updatedAt: '2026-05-18T00:00:00Z', mutable: false, hardDeletable: false }, { datasetId: 'DATASET-RTSP-SAMPLE-E2E', name: 'F018 RTSP 采样视频数据集', datasetType: 'RAW', dataType: 'AUDIO_VIDEO', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-RTSP-SAMPLE-E2E', currentVersionName: 'v1', status: 'ACTIVE', accessLevel: 'TEAM', tags: ['RTSP','视频','采样'], versionCount: 1, recordCount: 1, sizeBytes: 8192, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: 'TASK-rtsp-video-stream-input RTSP sandbox sampling dataset', archivedAt: null, updatedAt: '2026-05-18T03:00:00Z', mutable: true, hardDeletable: false }, { datasetId: 'DATASET-WORKORDER-TEXT', name: '工单文本分类语料库', datasetType: 'RAW', dataType: 'TEXT', tenantId: 'TENANT-YF', projectId: null, currentVersionId: 'DVER-TEXT-001', currentVersionName: 'v1', status: 'ARCHIVED', accessLevel: 'PUBLIC', tags: ['工单','NLP'], versionCount: 1, recordCount: 125600, sizeBytes: 2048, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '工单文本公开样例数据集', archivedAt: '2026-05-18T01:00:00Z', updatedAt: '2026-05-18T01:00:00Z', mutable: false, hardDeletable: true }], total: 5, page: 1, pageSize: 20, stats: { total: 5, raw: 4, preprocessed: 1, annotated: 0, restricted: 1, totalSizeBytes: 25600 } };
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
  'DVER-WELD-FRAMES-001': [
    { bindingId: 'DF-WELD-FRAME-001', datasetId: 'DATASET-WELD-FRAMES-001', versionId: 'DVER-WELD-FRAMES-001', fileId: 'FILE-DATASET-WELD-FRAME-001', fileRole: 'RAW', status: 'BOUND', objectKey: 'TENANT-CABIN/frames/weld-frame-0001.jpg', contentType: 'image/jpeg', sizeBytes: 2048, sha256: 'sha256-weld-frame-001' },
  ],
};
const buildDatasetDetail = (versionId = 'DVER-WELD-002') => ({ dataset: datasets.items[0], selectedVersionId: versionId, selectedVersion: datasetVersions.find((item) => item.versionId === versionId), versions: datasetVersions, files: datasetFilesByVersion[versionId as keyof typeof datasetFilesByVersion] ?? [], grants: [], lineage: [{ lineageId: 'LIN-DSRC-WELD-001', sourceType: 'DATA_SOURCE', sourceId: 'DSRC-CABIN-MINIO', targetType: 'DATASET_VERSION', targetId: versionId, transformType: 'IMPORT', createdAt: '2026-05-18T00:00:00Z' }], previewStatus: versionId === 'DVER-WELD-002' ? 'PREVIEWABLE' : 'UNSUPPORTED', previewDiagnostic: versionId === 'DVER-WELD-002' ? '样例可预览' : '非图片/不可预览文件显示元数据退化状态' });
const datasetDetail = buildDatasetDetail();
const frameDatasetSummary = datasets.items.find((item) => item.datasetId === 'DATASET-WELD-FRAMES-001')!;
const frameDatasetVersion = { versionId: 'DVER-WELD-FRAMES-001', datasetId: 'DATASET-WELD-FRAMES-001', versionName: 'v1', status: 'READY', isCurrent: true, sourceVersionId: 'DVER-WELD-VIDEO-001', recordCount: 2400, fileCount: 1, sizeBytes: 4096, contentSafetyStatus: 'PASSED', diagnosticCode: 'OK', diagnosticMessage: 'FRAME_EXTRACTION_READY', createdAt: '2026-05-18T00:02:00Z', publishedAt: null, mutable: false, deletable: false, deleteBlockedReason: 'PREPROCESSED_OUTPUT_IMMUTABLE' };
const frameDatasetDetail = { dataset: frameDatasetSummary, selectedVersionId: 'DVER-WELD-FRAMES-001', selectedVersion: frameDatasetVersion, versions: [frameDatasetVersion], files: datasetFilesByVersion['DVER-WELD-FRAMES-001'], grants: [], lineage: [{ lineageId: 'LIN-PIPE-FRAMES-001', sourceType: 'PIPELINE_RUN', sourceId: 'PRUN-E2E', targetType: 'DATASET_VERSION', targetId: 'DVER-WELD-FRAMES-001', transformType: 'FRAME_EXTRACTION', createdAt: '2026-05-18T00:02:00Z' }], previewStatus: 'PREVIEWABLE', previewDiagnostic: '抽帧图片样例可预览' };
const uploadDatasetSummary = { datasetId: 'DATASET-UPLOAD-E2E', name: 'F015 本地上传数据集', datasetType: 'RAW', dataType: 'IMAGE', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-UPLOAD-E2E', currentVersionName: 'v1', status: 'ACTIVE', accessLevel: 'TEAM', tags: [], versionCount: 1, recordCount: 1, sizeBytes: 1024, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '本地上传创建', archivedAt: null, updatedAt: '2026-05-18T02:00:00Z', mutable: true, hardDeletable: false };
const uploadDatasetVersion = { versionId: 'DVER-UPLOAD-E2E', datasetId: 'DATASET-UPLOAD-E2E', versionName: 'v1', status: 'READY', isCurrent: true, sourceVersionId: null, recordCount: 1, fileCount: 1, sizeBytes: 1024, contentSafetyStatus: 'PASSED', diagnosticCode: 'OK', diagnosticMessage: 'VERSION_READY', createdAt: '2026-05-18T02:00:00Z', publishedAt: null, mutable: true, deletable: false, deleteBlockedReason: 'DATASET_VERSION_LAST_ONE_FORBIDDEN' };
const uploadDatasetDetail = { dataset: uploadDatasetSummary, selectedVersionId: 'DVER-UPLOAD-E2E', selectedVersion: uploadDatasetVersion, versions: [uploadDatasetVersion], files: [{ bindingId: 'DF-UPLOAD-001', datasetId: 'DATASET-UPLOAD-E2E', versionId: 'DVER-UPLOAD-E2E', fileId: 'FILE-UPLOAD-001', fileRole: 'RAW', status: 'BOUND', objectKey: 'TENANT-CABIN/upload/FILE-UPLOAD-001.jpg', contentType: 'image/jpeg', sizeBytes: 1024, sha256: 'sha256-upload-001' }], grants: [], lineage: [], previewStatus: 'PREVIEWABLE', previewDiagnostic: '样例可预览' };
const uploadVideoDatasetSummary = { datasetId: 'DATASET-UPLOAD-VIDEO-E2E', name: 'F015 本地上传视频数据集', datasetType: 'RAW', dataType: 'AUDIO_VIDEO', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-UPLOAD-VIDEO-E2E', currentVersionName: 'v1', status: 'ACTIVE', accessLevel: 'TEAM', tags: ['视频'], versionCount: 1, recordCount: 1, sizeBytes: 4096, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '本地上传视频创建', archivedAt: null, updatedAt: '2026-05-18T02:00:00Z', mutable: true, hardDeletable: false };
const uploadVideoDatasetVersion = { versionId: 'DVER-UPLOAD-VIDEO-E2E', datasetId: 'DATASET-UPLOAD-VIDEO-E2E', versionName: 'v1', status: 'READY', isCurrent: true, sourceVersionId: null, recordCount: 1, fileCount: 1, sizeBytes: 4096, contentSafetyStatus: 'PASSED', diagnosticCode: 'OK', diagnosticMessage: 'VERSION_READY', createdAt: '2026-05-18T02:00:00Z', publishedAt: null, mutable: true, deletable: false, deleteBlockedReason: 'DATASET_VERSION_LAST_ONE_FORBIDDEN' };
const uploadVideoDatasetDetail = { dataset: uploadVideoDatasetSummary, selectedVersionId: 'DVER-UPLOAD-VIDEO-E2E', selectedVersion: uploadVideoDatasetVersion, versions: [uploadVideoDatasetVersion], files: [{ bindingId: 'DF-UPLOAD-VIDEO-001', datasetId: 'DATASET-UPLOAD-VIDEO-E2E', versionId: 'DVER-UPLOAD-VIDEO-E2E', fileId: 'FILE-UPLOAD-VIDEO-001', fileRole: 'RAW', status: 'BOUND', objectKey: 'TENANT-CABIN/upload/FILE-UPLOAD-VIDEO-001.mp4', contentType: 'video/mp4', sizeBytes: 4096, sha256: 'sha256-upload-video-001' }], grants: [], lineage: [], previewStatus: 'UNSUPPORTED', previewDiagnostic: '非图片/不可预览文件显示元数据退化状态' };
const rtspDatasetSummary = { datasetId: 'DATASET-RTSP-SAMPLE-E2E', name: 'F018 RTSP 采样视频数据集', datasetType: 'RAW', dataType: 'AUDIO_VIDEO', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-RTSP-SAMPLE-E2E', currentVersionName: 'v1', status: 'ACTIVE', accessLevel: 'TEAM', tags: ['RTSP','视频','采样'], versionCount: 1, recordCount: 1, sizeBytes: 8192, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: 'TASK-rtsp-video-stream-input RTSP sandbox sampling dataset', archivedAt: null, updatedAt: '2026-05-18T03:00:00Z', mutable: true, hardDeletable: false };
const rtspDatasetVersion = { versionId: 'DVER-RTSP-SAMPLE-E2E', datasetId: 'DATASET-RTSP-SAMPLE-E2E', versionName: 'v1', status: 'READY', isCurrent: true, sourceVersionId: null, recordCount: 1, fileCount: 1, sizeBytes: 8192, contentSafetyStatus: 'PASSED', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX_RTSP_STREAM_SAMPLE_READY', createdAt: '2026-05-18T03:00:00Z', publishedAt: null, mutable: true, deletable: false, deleteBlockedReason: 'DATASET_VERSION_LAST_ONE_FORBIDDEN' };
const rtspDatasetDetail = { dataset: rtspDatasetSummary, selectedVersionId: 'DVER-RTSP-SAMPLE-E2E', selectedVersion: rtspDatasetVersion, versions: [rtspDatasetVersion], files: [{ bindingId: 'DF-RTSP-SAMPLE-001', datasetId: 'DATASET-RTSP-SAMPLE-E2E', versionId: 'DVER-RTSP-SAMPLE-E2E', fileId: 'FILE-RTSP-SAMPLE-001', fileRole: 'RAW', status: 'BOUND', objectKey: 'TENANT-CABIN/rtsp/FILE-RTSP-SAMPLE-001.mp4', contentType: 'video/mp4', sizeBytes: 8192, sha256: 'sha256-rtsp-sample-001' }], grants: [], lineage: [{ lineageId: 'LIN-RTSP-SAMPLE-001', sourceType: 'RTSP_STREAM', sourceId: 'DSRC-CABIN-RTSP', targetType: 'DATASET_VERSION', targetId: 'DVER-RTSP-SAMPLE-E2E', transformType: 'CAPTURE_SAMPLE', createdAt: '2026-05-18T03:00:00Z' }], previewStatus: 'UNSUPPORTED', previewDiagnostic: 'RTSP 采样视频需先抽帧为 IMAGE 数据集后再标注' };
const riskDatasetDetail = { dataset: { datasetId: 'DATASET-UPLOAD-RISK', name: 'F015 高风险内容', datasetType: 'RAW', dataType: 'IMAGE', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-UPLOAD-RISK', currentVersionName: 'v1', status: 'SECURITY_PENDING', accessLevel: 'TEAM', tags: [], versionCount: 1, recordCount: 0, sizeBytes: 2048, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '高风险内容待处理', archivedAt: null, updatedAt: '2026-05-18T02:00:00Z', mutable: true, hardDeletable: false }, selectedVersionId: 'DVER-UPLOAD-RISK', selectedVersion: { versionId: 'DVER-UPLOAD-RISK', datasetId: 'DATASET-UPLOAD-RISK', versionName: 'v1', status: 'SECURITY_PENDING', isCurrent: true, sourceVersionId: null, recordCount: 0, fileCount: 0, sizeBytes: 2048, contentSafetyStatus: 'BLOCKED', diagnosticCode: 'DATASET_UPLOAD_SECURITY_BLOCKED', diagnosticMessage: 'SECURITY_BLOCKED', createdAt: '2026-05-18T02:00:00Z', publishedAt: null, mutable: false, deletable: false, deleteBlockedReason: 'DATASET_VERSION_IMMUTABLE' }, versions: [{ versionId: 'DVER-UPLOAD-RISK', datasetId: 'DATASET-UPLOAD-RISK', versionName: 'v1', status: 'SECURITY_PENDING', isCurrent: true, sourceVersionId: null, recordCount: 0, fileCount: 0, sizeBytes: 2048, contentSafetyStatus: 'BLOCKED', diagnosticCode: 'DATASET_UPLOAD_SECURITY_BLOCKED', diagnosticMessage: 'SECURITY_BLOCKED', createdAt: '2026-05-18T02:00:00Z', publishedAt: null, mutable: false, deletable: false, deleteBlockedReason: 'DATASET_VERSION_IMMUTABLE' }], files: [], grants: [], lineage: [], previewStatus: 'UNSUPPORTED', previewDiagnostic: '高风险内容未进入可用版本' };
const datasetUploadSession = { sessionId: 'DUS-E2E-001', datasetId: 'DATASET-UPLOAD-E2E', versionId: 'DVER-UPLOAD-E2E', status: 'PENDING_UPLOAD', creationMode: 'LOCAL_UPLOAD', targetAction: 'CREATE_DATASET', targetDatasetId: null, targetVersionId: null, progress: { phase: 'PENDING_UPLOAD', percent: 0 }, summary: { totalFiles: 0, acceptedFiles: 0, rejectedFiles: 0 }, datasetStatus: 'DRAFT', versionStatus: 'DRAFT', diagnosticCode: 'OK', diagnosticMessage: 'SESSION_CREATED', files: [] };
const datasetUploadSessionUploaded = { ...datasetUploadSession, status: 'UPLOADING', progress: { phase: 'UPLOADING_FILES', percent: 45 }, summary: { totalFiles: 2, acceptedFiles: 1, rejectedFiles: 1 }, diagnosticMessage: 'UPLOAD_SUMMARY_UPDATED', files: [{ fileName: 'weld-1.jpg', fileId: 'FILE-UPLOAD-001', status: 'UPLOADED', sizeBytes: 1024, contentType: 'image/jpeg', diagnosticCode: 'OK', diagnosticMessage: 'FILE_ACCEPTED' }, { fileName: 'bad.txt', fileId: null, status: 'REJECTED', sizeBytes: 20, contentType: 'application/octet-stream', diagnosticCode: 'DATASET_UPLOAD_FILE_TYPE_UNSUPPORTED', diagnosticMessage: '仅支持图片文件与 zip 包' }] };
const datasetUploadSessionReady = { ...datasetUploadSessionUploaded, status: 'READY', progress: { phase: 'READY', percent: 100 }, datasetStatus: 'ACTIVE', versionStatus: 'READY', diagnosticCode: 'DATASET_UPLOAD_READY', diagnosticMessage: '本地上传数据集已完成文件绑定，可进入后续流程' };
const datasetUploadSessionProcessing = { ...datasetUploadSessionUploaded, datasetId: 'DATASET-UPLOAD-E2E', versionId: 'DVER-UPLOAD-E2E', status: 'PROCESSING', progress: { phase: 'SECURITY_SCAN', percent: 70 }, datasetStatus: 'DRAFT', versionStatus: 'DRAFT', diagnosticCode: 'OK', diagnosticMessage: 'SECURITY_SCAN' };
const datasetUploadVideoSession = { ...datasetUploadSession, sessionId: 'DUS-E2E-VIDEO', datasetId: 'DATASET-UPLOAD-VIDEO-E2E', versionId: 'DVER-UPLOAD-VIDEO-E2E', diagnosticMessage: 'SESSION_CREATED' };
const datasetUploadVideoSessionUploaded = { ...datasetUploadVideoSession, status: 'UPLOADING', progress: { phase: 'UPLOADING_FILES', percent: 45 }, summary: { totalFiles: 1, acceptedFiles: 1, rejectedFiles: 0 }, diagnosticMessage: 'UPLOAD_SUMMARY_UPDATED', files: [{ fileName: 'weld-line.mp4', fileId: 'FILE-UPLOAD-VIDEO-001', status: 'UPLOADED', sizeBytes: 4096, contentType: 'video/mp4', diagnosticCode: 'OK', diagnosticMessage: 'FILE_ACCEPTED' }] };
const datasetUploadVideoSessionProcessing = { ...datasetUploadVideoSessionUploaded, status: 'PROCESSING', progress: { phase: 'SECURITY_SCAN', percent: 70 }, datasetStatus: 'DRAFT', versionStatus: 'DRAFT', diagnosticCode: 'OK', diagnosticMessage: 'SECURITY_SCAN' };
const datasetUploadVideoSessionReady = { ...datasetUploadVideoSessionUploaded, status: 'READY', progress: { phase: 'READY', percent: 100 }, datasetStatus: 'ACTIVE', versionStatus: 'READY', diagnosticCode: 'DATASET_UPLOAD_READY', diagnosticMessage: '本地上传视频数据集已完成文件绑定，可进入后续流程' };
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
  { operatorId: 'OP-IMG-WATERMARK', name: '图片加水印', categoryGroup: 'VISUAL_PREPROCESS', category: 'IMAGE_PROCESSING', subCategory: 'WATERMARK', dataType: 'IMAGE', stage: '预处理', kind: 'BUILTIN', status: 'PUBLISHED', supportsPreview: true, enhancementMode: null, defaultOutputDatasetDataType: 'IMAGE', annotationRiskLevel: 'MEDIUM', description: '支持预览水印与产物水印分离配置', beforeExample: '原始焊缝图片', afterExample: '叠加预览水印图片', usageCount: 4210, pipelineCount: 31, errorRate: 0.01 },
  { operatorId: 'OP-IMG-ENHANCE', name: '图片质量提高', categoryGroup: 'VISUAL_PREPROCESS', category: 'IMAGE_PROCESSING', subCategory: 'QUALITY_ENHANCEMENT', dataType: 'IMAGE', stage: '预处理', kind: 'BUILTIN', status: 'PUBLISHED', supportsPreview: true, enhancementMode: 'TRADITIONAL_ONLY', defaultOutputDatasetDataType: 'IMAGE', annotationRiskLevel: 'LOW', description: '一期固定传统增强：锐化、去噪、亮度/对比度优化', beforeExample: '低亮度焊缝样本', afterExample: '传统增强后样本', usageCount: 3890, pipelineCount: 24, errorRate: 0.01 },
  { operatorId: 'OP-IMG-SHARPEN', name: '去噪/锐化', categoryGroup: 'VISUAL_PREPROCESS', category: 'IMAGE_PROCESSING', subCategory: 'QUALITY_ENHANCEMENT', dataType: 'IMAGE', stage: '预处理', kind: 'BUILTIN', status: 'PUBLISHED', supportsPreview: true, enhancementMode: 'TRADITIONAL_ONLY', defaultOutputDatasetDataType: 'IMAGE', annotationRiskLevel: 'LOW', description: '增强边缘细节并抑制噪点', beforeExample: '模糊图片', afterExample: '锐化后图片', usageCount: 3120, pipelineCount: 21, errorRate: 0.012 },
  { operatorId: 'OP-VIDEO-FRAME-EXTRACT', name: '视频抽帧', categoryGroup: 'VISUAL_PREPROCESS', category: 'VIDEO_PROCESSING', subCategory: 'FRAME_EXTRACTION', dataType: 'AUDIO_VIDEO', stage: '预处理', kind: 'BUILTIN', status: 'PUBLISHED', supportsPreview: true, enhancementMode: null, defaultOutputDatasetDataType: 'IMAGE', annotationRiskLevel: 'LOW', description: '按固定间隔抽帧，默认输出图片型结果集', beforeExample: '焊缝视频片段', afterExample: '抽帧图片序列', usageCount: 2470, pipelineCount: 14, errorRate: 0.018 },
  { operatorId: 'OP-VIDEO-FPS-EXTRACT', name: '固定帧率抽帧', categoryGroup: 'VISUAL_PREPROCESS', category: 'VIDEO_PROCESSING', subCategory: 'FRAME_EXTRACTION', dataType: 'AUDIO_VIDEO', stage: '预处理', kind: 'BUILTIN', status: 'PUBLISHED', supportsPreview: true, enhancementMode: null, defaultOutputDatasetDataType: 'IMAGE', annotationRiskLevel: 'LOW', description: '按固定 FPS 抽取图像帧', beforeExample: '视频输入', afterExample: '固定 FPS 输出', usageCount: 1980, pipelineCount: 9, errorRate: 0.016 },
  { operatorId: 'OP-HTTP-CUSTOM', name: 'HTTP 自定义算子', categoryGroup: 'VISUAL_PREPROCESS', category: 'IMAGE_PROCESSING', subCategory: 'QUALITY_ENHANCEMENT', dataType: 'IMAGE', stage: '扩展', kind: 'HTTP', status: 'SUBMITTED', supportsPreview: true, enhancementMode: null, defaultOutputDatasetDataType: 'IMAGE', annotationRiskLevel: 'MEDIUM', description: '通过受控 HTTP Endpoint 扩展视觉预处理能力', beforeExample: '待增强样本', afterExample: '外部 API 增强结果', usageCount: 320, pipelineCount: 3, errorRate: 0.05 },
];
const operatorList = { items: operatorItems, total: operatorItems.length, categories: [{ category: 'IMAGE_PROCESSING', count: 4 }, { category: 'VIDEO_PROCESSING', count: 2 }], stats: { total: operatorItems.length, builtin: 5, custom: 1, published: 5, submitted: 1 } };
const operatorDetail = (operatorId = 'OP-IMG-ENHANCE') => { const op = operatorItems.find((item) => item.operatorId === operatorId) ?? operatorItems[1]; return { operator: op, parameterSchemaJson: op.operatorId === 'OP-IMG-WATERMARK' ? '{"type":"object","properties":{"previewWatermarkEnabled":{"type":"boolean","default":true},"artifactWatermarkEnabled":{"type":"boolean","default":false},"watermarkText":{"type":"string"}}}' : op.operatorId.startsWith('OP-VIDEO-') ? '{"type":"object","properties":{"mode":{"type":"string","enum":["FIXED_INTERVAL","FIXED_FPS"]},"intervalSeconds":{"type":"number"},"fps":{"type":"number"}}}' : '{"type":"object","required":["mode"],"properties":{"mode":{"type":"string","enum":["DENOISE","SHARPEN","BRIGHTNESS_CONTRAST"]}}}', inputSchemaJson: '{"dataset":"ANY"}', outputSchemaJson: '{"dataset":"PREPROCESSED"}', endpointMasked: op.kind === 'HTTP' ? 'TODO_CONFIRM_OPERATOR_HTTP_ENDPOINT' : null, credentialRefMasked: op.kind === 'HTTP' ? 'secret://TODO_CONFIRM_OPERATOR_SECRET' : null, timeoutSeconds: op.kind === 'HTTP' ? 30 : null, concurrencyLimit: op.kind === 'HTTP' ? 2 : null, frozenDefaults: op.operatorId === 'OP-IMG-WATERMARK' ? { previewWatermarkEnabled: true, artifactWatermarkEnabled: false, annotationEligibleWhenArtifactWatermarked: false } : null, annotationRiskNotice: op.operatorId === 'OP-IMG-WATERMARK' ? '带不可逆产物水印的结果默认不可进入标注链路' : op.operatorId === 'OP-IMG-ENHANCE' ? '图片质量提高一期仅支持传统增强，不支持 AI 超分' : null, reviews: op.status === 'SUBMITTED' ? [{ reviewId: 'OREV-E2E', operatorId: op.operatorId, submitterId: 'USR-ADMIN', reviewerId: null, status: 'SUBMITTED', reason: '等待安全评审', submittedAt: '2026-05-18T00:00:00Z', reviewedAt: null }] : [] }; };
const pipelineDetail = { pipeline: { pipelineId: 'PIPE-VIDEO-PREP', name: '焊缝视频抽帧预处理 Pipeline', tenantId: 'TENANT-CABIN', projectId: null, status: 'VALIDATED', currentVersionId: 'PVER-VIDEO-PREP-001', ownerId: 'USR-ADMIN', ownerName: '平台管理员', nodeCount: 3, runCount: 1, description: '视频抽帧并输出标注前预处理图片集', templateCode: 'VIDEO_FRAME_TO_IMAGE_PREPROCESS', sourceDatasetId: 'DATASET-WELD-VIDEO-001', sourceVersionId: 'DVER-WELD-VIDEO-001', sourceDatasetDataType: 'AUDIO_VIDEO', updatedAt: '2026-05-18T00:00:00Z' }, nodes: [{ nodeId: 'extract', operatorId: 'OP-VIDEO-FRAME-EXTRACT', operatorName: '视频抽帧', label: '固定间隔抽帧', positionX: 80, positionY: 150, configJson: '{"mode":"FIXED_INTERVAL","intervalSeconds":2,"outputImageFormat":"JPG"}', status: 'READY' }, { nodeId: 'enhance', operatorId: 'OP-IMG-ENHANCE', operatorName: '图片质量提高', label: '传统增强', positionX: 320, positionY: 150, configJson: '{"mode":"DENOISE"}', status: 'READY' }, { nodeId: 'watermark', operatorId: 'OP-IMG-WATERMARK', operatorName: '图片加水印', label: '预览水印', positionX: 560, positionY: 150, configJson: '{"previewWatermarkEnabled":true,"artifactWatermarkEnabled":false}', status: 'READY' }], edges: [{ edgeId: 'EDGE-extract-enhance', sourceNodeId: 'extract', targetNodeId: 'enhance', edgeType: 'DATA' }, { edgeId: 'EDGE-enhance-watermark', sourceNodeId: 'enhance', targetNodeId: 'watermark', edgeType: 'DATA' }], variables: [{ name: 'batch_size', valueType: 'INT', valueKind: 'LITERAL', valueMasked: '32', required: true }, { name: 'output_bucket', valueType: 'STRING', valueKind: 'ENV_REF', valueMasked: 'TODO_CONFIRM_PIPELINE_OUTPUT_BUCKET', required: true }, { name: 'operator_secret', valueType: 'STRING', valueKind: 'SECRET_REF', valueMasked: 'secret://TODO_CONFIRM_PIPELINE_OPERATOR_SECRET', required: false }], versions: [{ versionId: 'PVER-VIDEO-PREP-001', pipelineId: 'PIPE-VIDEO-PREP', versionName: 'v1.0', note: '视频抽帧模板', dagJson: '{"nodes":3}', createdBy: 'USR-ADMIN', createdAt: '2026-05-18T00:00:00Z' }], runs: [{ runId: 'PRUN-E2E', pipelineId: 'PIPE-VIDEO-PREP', versionId: 'PVER-VIDEO-PREP-001', status: 'SUCCEEDED', triggerMode: 'MANUAL', diagnosticCode: 'OK', diagnosticMessage: 'VISUAL_PREPROCESS_RUN_SUCCEEDED', outputDatasetId: 'DATASET-WELD-FRAMES-001', resultDatasetStatus: 'ACTIVE', durationMs: 48000, totalCount: 2400, successCount: 2380, skippedCount: 15, failedCount: 5, startedAt: '2026-05-18T00:00:00Z', endedAt: '2026-05-18T00:00:48Z' }], validation: { valid: true, diagnosticCode: 'OK', diagnosticMessage: '视觉预处理 DAG 校验通过', errors: [], warnings: ['视频抽帧默认输出图片型 PREPROCESSED 数据集', '图片质量提高一期仅支持传统增强'] } };
const pipelineRun = { run: { runId: 'PRUN-E2E', pipelineId: 'PIPE-VIDEO-PREP', versionId: 'PVER-VIDEO-PREP-001', status: 'SUCCEEDED', triggerMode: 'MANUAL', diagnosticCode: 'OK', diagnosticMessage: 'VISUAL_PREPROCESS_RUN_SUCCEEDED', outputDatasetId: 'DATASET-WELD-FRAMES-001', resultDatasetStatus: 'PENDING_CONFIRMATION', durationMs: 48000, totalCount: 2400, successCount: 2380, skippedCount: 15, failedCount: 5, startedAt: '2026-05-18T00:00:00Z', endedAt: '2026-05-18T00:00:48Z' }, nodeRuns: [{ nodeRunId: 'PNRUN-E2E-1', runId: 'PRUN-E2E', nodeId: 'extract', operatorName: '视频抽帧', status: 'SUCCEEDED', durationMs: 800, logSummary: '抽帧完成', errorCode: null }, { nodeRunId: 'PNRUN-E2E-2', runId: 'PRUN-E2E', nodeId: 'enhance', operatorName: '图片质量提高', status: 'SUCCEEDED', durationMs: 1200, logSummary: '传统增强完成', errorCode: null }], preview: { datasetId: 'DATASET-WELD-FRAMES-001', runId: 'PRUN-E2E', pipelineId: 'PIPE-VIDEO-PREP', sourceDatasetId: 'DATASET-WELD-VIDEO-001', sourceVersionId: 'DVER-WELD-VIDEO-001', status: 'PENDING_CONFIRMATION', datasetDataType: 'IMAGE', previewWatermarkApplied: true, artifactWatermarkApplied: false, artifactWatermarkBlocksAnnotation: false, enhancementMode: null, frameExtractionMode: 'FIXED_INTERVAL', totalCount: 2400, successCount: 2380, skippedCount: 15, failedCount: 5, samplePairs: [{ beforeExample: '原始视频片段#001', afterExample: '抽帧样本#001', label: '抽帧样本' }], warnings: ['视频抽帧默认输出图片型 PREPROCESSED 数据集'], failedReasons: ['少量帧解码失败'], skippedReasons: ['黑屏片段跳过'], processParamsJson: '{"runId":"PRUN-E2E","sourceDatasetId":"DATASET-WELD-VIDEO-001","sourceVersionId":"DVER-WELD-VIDEO-001","templateCode":"VIDEO_FRAME_TO_IMAGE_PREPROCESS","enhancementMode":"N/A"}', operatorChainJson: '["OP-VIDEO-FRAME-EXTRACT","OP-IMG-ENHANCE","OP-IMG-WATERMARK"]' }, activation: { datasetId: 'DATASET-WELD-FRAMES-001', status: 'PENDING_CONFIRMATION', confirmed: false, annotationEligible: true, blockReason: null, targetVersionId: 'DVER-WELD-FRAMES-001', confirmedAt: null, activatedAt: null } };
const annotationSourceDatasets = { items: [{ datasetId: 'DATASET-WELD-DEFECT', name: '焊缝缺陷检测数据集', datasetType: 'RAW', dataType: 'IMAGE', currentVersionId: 'DVER-WELD-002', status: 'ACTIVE', annotationEligible: true, confirmed: true, sourceDatasetId: null, sourceDatasetName: null, blockReason: null }, { datasetId: 'DATASET-WELD-FRAMES-001', name: '焊缝视频抽帧预处理结果', datasetType: 'PREPROCESSED', dataType: 'IMAGE', currentVersionId: 'DVER-WELD-FRAMES-001', status: 'ACTIVE', annotationEligible: true, confirmed: true, sourceDatasetId: 'DATASET-WELD-VIDEO-001', sourceDatasetName: '焊缝视频原始数据集', blockReason: null }], total: 2, page: 1, pageSize: 20 };
const blockedAnnotationSourceDatasets = { items: [{ datasetId: 'DATASET-WELD-DEFECT', name: '焊缝缺陷检测数据集', datasetType: 'RAW', dataType: 'IMAGE', currentVersionId: 'DVER-WELD-002', status: 'ACTIVE', annotationEligible: true, confirmed: true, sourceDatasetId: null, sourceDatasetName: null, blockReason: null }], total: 1, page: 1, pageSize: 20 };

const annotationTask = { taskId: 'ANN-WELD-Q2', name: '焊缝缺陷检测标注任务', scene: 'IMAGE_TAGGING', sceneLabel: '图片打标', sourceDatasetId: 'DATASET-WELD-FRAMES-001', sourceDatasetName: '焊缝视频抽帧预处理结果', templateId: 'LT-WELD-BBOX', templateName: '焊缝 BBox 模板', tenantId: 'TENANT-CABIN', status: 'IN_PROGRESS', reviewEnabled: true, prelabelEnabled: true, labelStudioEnabled: false, totalCount: 6, annotatedCount: 4, reviewedCount: 2, qualityScore: null, assignees: [{ userId: 'USR-ANNOTATOR', displayName: '标注工程师', role: 'ANNOTATOR' }, { userId: 'USR-BU-CABIN', displayName: '座舱审核员', role: 'REVIEWER' }], deadline: '2026-06-02T00:00:00Z', updatedAt: '2026-05-19T00:00:00Z' };
const annotationTemplate = { templateId: 'LT-WELD-BBOX', name: '焊缝 BBox 模板', scene: 'IMAGE_TAGGING', labelType: 'BOUNDING_BOX', labelSchemaJson: '{"labels":["焊接气孔","裂纹","夹渣","未熔合"]}', labelStudioConfigXml: '<View><Image name="image" value="$image"/></View>', status: 'PUBLISHED', tenantId: 'TENANT-CABIN', createdBy: 'USR-ADMIN', updatedAt: '2026-05-19T00:00:00Z' };
const annotationTags = [
  { tagId: 'TAG-WELD-POROSITY', name: '焊接气孔', color: '#faad14', status: 'ACTIVE', tenantId: 'TENANT-CABIN', description: '焊缝气孔缺陷' },
  { tagId: 'TAG-WELD-CRACK', name: '裂纹', color: '#f5222d', status: 'ACTIVE', tenantId: 'TENANT-CABIN', description: '焊缝裂纹缺陷' },
  { tagId: 'TAG-WELD-SLAG', name: '夹渣', color: '#722ed1', status: 'ACTIVE', tenantId: 'TENANT-CABIN', description: '焊缝夹渣缺陷' },
  { tagId: 'TAG-WELD-FUSION', name: '未熔合', color: '#1677ff', status: 'ACTIVE', tenantId: 'TENANT-CABIN', description: '焊缝未熔合缺陷' },
];
const annotationBinding = { bindingId: 'AEXT-WELD-Q2', taskId: 'ANN-WELD-Q2', provider: 'LABEL_STUDIO', externalProjectId: null, externalUrl: 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL', externalTaskId: null, externalTaskUrl: null, configStatus: 'UNCONFIGURED', lastSyncStatus: 'UNCONFIGURED', diagnosticCode: 'LABEL_STUDIO_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL;TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET', launchUrl: null, retryable: false, lastSyncAt: null };
const annotationProjectBinding = { ...annotationBinding, externalProjectId: '123', externalUrl: 'http://localhost:8083/projects/123', configStatus: 'CONFIGURED', lastSyncStatus: 'PROJECT_SYNCED', diagnosticCode: 'LABEL_STUDIO_PROJECT_SYNCED', diagnosticMessage: '外部同步已停用', launchUrl: 'http://localhost:8083/projects/123', lastSyncAt: '2026-05-19T00:00:00Z' };
const annotationTaskBinding = { ...annotationProjectBinding, externalTaskId: '456', externalTaskUrl: 'http://localhost:8083/projects/123/data?task=456', lastSyncStatus: 'TASK_SYNCED', diagnosticCode: 'LABEL_STUDIO_TASK_SYNCED', diagnosticMessage: '外部同步已停用', launchUrl: 'http://localhost:8083/projects/123/data?task=456' };
const annotationImportedBinding = { ...annotationTaskBinding, lastSyncStatus: 'RESULT_IMPORTED', diagnosticCode: 'LABEL_STUDIO_RESULTS_IMPORTED', diagnosticMessage: '外部导入已停用' };
const annotationWorkItems = [{ workItemId: 'AWI-WELD-001', taskId: 'ANN-WELD-Q2', sampleKey: 'weld/0001.jpg', sampleFileId: 'FILE-DATASET-WELD-001', sampleImageUrl: '/industrial-samples/tig-welding.jpg', annotatorId: 'USR-ANNOTATOR', annotatorName: '标注工程师', status: 'DRAFT', predictionJson: '{"boxes":[{"id":"ai-suggestion-crack-001","label":"焊接气孔","cls":0,"shape":"rect","x":52,"y":42,"w":68,"h":52,"source":"ai","confidence":0.93},{"id":"ai-suggestion-fusion-001","label":"未熔合","cls":3,"shape":"rect","x":170,"y":60,"w":72,"h":58,"source":"ai","confidence":0.88},{"id":"box-crack-001","label":"裂纹","cls":1,"shape":"rect","x":240,"y":110,"w":86,"h":48},{"id":"box-slag-001","label":"夹渣","cls":2,"shape":"rect","x":108,"y":156,"w":64,"h":56},{"id":"box-porosity-001","label":"焊接气孔","cls":0,"shape":"ellipse","x":312,"y":82,"w":58,"h":58},{"id":"box-fusion-002","label":"未熔合","cls":3,"shape":"rect","x":378,"y":152,"w":74,"h":62},{"id":"box-crack-002","label":"裂纹","cls":1,"shape":"polygon","x":418,"y":58,"w":52,"h":44}]}', annotationJson: '{"boxes":[{"id":"ai-suggestion-crack-001","label":"焊接气孔","cls":0,"shape":"rect","x":52,"y":42,"w":68,"h":52,"source":"ai","confidence":0.93},{"id":"ai-suggestion-fusion-001","label":"未熔合","cls":3,"shape":"rect","x":170,"y":60,"w":72,"h":58,"source":"ai","confidence":0.88},{"id":"box-crack-001","label":"裂纹","cls":1,"shape":"rect","x":240,"y":110,"w":86,"h":48},{"id":"box-slag-001","label":"夹渣","cls":2,"shape":"rect","x":108,"y":156,"w":64,"h":56},{"id":"box-porosity-001","label":"焊接气孔","cls":0,"shape":"ellipse","x":312,"y":82,"w":58,"h":58},{"id":"box-fusion-002","label":"未熔合","cls":3,"shape":"rect","x":378,"y":152,"w":74,"h":62},{"id":"box-crack-002","label":"裂纹","cls":1,"shape":"polygon","x":418,"y":58,"w":52,"h":44}]}', submittedAt: null, updatedAt: '2026-05-19T00:00:00Z' }];
const annotationReviewItems = [{ reviewItemId: 'ARV-WELD-001', workItemId: 'AWI-WELD-002', taskId: 'ANN-WELD-Q2', taskName: '焊缝缺陷检测标注任务', annotatorId: 'USR-ANNOTATOR', annotatorName: '标注工程师', reviewerId: 'USR-BU-CABIN', reviewerName: '座舱审核员', status: 'REVIEW_PENDING', reviewComment: null, reviewedAt: null }];
const annotationPublication = { publicationId: 'APUB-WELD-Q2', taskId: 'ANN-WELD-Q2', qualityStatus: 'PASSED', coverageRate: 1, formatStatus: 'COCO_READY', diagnosticCode: 'ANNOTATION_QUALITY_PASSED', diagnosticMessage: 'DAT-010 quality passed', outputDatasetId: 'DATASET-WELD-ANNOTATED', outputVersionId: 'DVER-WELD-ANN-001', annotationArtifactFileId: 'FILE-ANN-WELD-Q2', annotationArtifactRole: 'ANNOTATION_RESULT', publishedAt: '2026-05-19T00:00:00Z' };
const annotationOverview = { stats: { total: 1, inProgress: 1, pendingReview: 1, completed: 0, templates: 1 }, tasks: [annotationTask], templates: [annotationTemplate] };
const annotationDetail = { task: annotationTask, assignments: [], workItems: annotationWorkItems, reviewItems: annotationReviewItems, publications: [annotationPublication], externalBinding: annotationBinding };
const datasetAnnotationCreateDetail = { ...annotationDetail, task: { ...annotationTask, sourceDatasetId: 'DATASET-WELD-DEFECT', sourceDatasetName: '焊缝缺陷检测数据集' } };
const annotationExport = { exportId: 'AEXP-WELD-Q2-SMP', taskId: 'ANN-WELD-Q2', format: 'SMP_JSONL', formatVersion: 'v1', status: 'AVAILABLE', diagnosticCode: 'AUTHENTICATED_CONTENT_ENDPOINT_READY', diagnosticMessage: '训练包可通过平台鉴权接口下载', fileId: 'FILE-AEXP-WELD-Q2-SMP', downloadUrl: null, sizeBytes: 1048576, asyncRequired: false, packageIncludesImages: true, requestedAt: '2026-05-19T00:00:00Z', generatedAt: '2026-05-19T00:05:00Z', expiresAt: '2026-08-19T00:00:00Z' };

const modelRegistryList = {
  items: [
    {
      modelId: 'MODEL-YOLO-001',
      name: '焊缝缺陷检测 YOLOv8',
      description: '用于焊缝表面缺陷检测',
      framework: 'PYTORCH',
      taskType: 'OBJECT_DETECTION',
      inputFormat: 'image:640x640 RGB',
      outputFormat: 'bbox[class,score,x1,y1,x2,y2]',
      tags: ['焊缝', '缺陷检测', '预训练'],
      scope: 'PLATFORM',
      source: 'PLATFORM_BUILT_IN',
      ownerUserId: 'USER-SYSTEM',
      ownerOrgId: 'TENANT-YF',
      tenantId: 'TENANT-YF',
      currentVersionId: 'MVER-YOLO-001-V1',
      currentVersionNo: 'v1.0',
      currentVersionStatus: 'PRODUCTION',
      evaluationStatus: 'IMPORTED_PROOF',
      permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: true, canEditModel: true, canCreateVersion: true, canDeleteVersion: true, canApproveAccess: true },
      createdAt: '2026-06-03T00:00:00Z',
      updatedAt: '2026-06-03T00:00:00Z',
    },
    {
      modelId: 'MODEL-BERT-003',
      name: '工单文本分类 BERT',
      description: '用于工单文本分类',
      framework: 'ONNX',
      taskType: 'NLP_TEXT_CLASSIFICATION',
      inputFormat: 'text:utf-8',
      outputFormat: 'label[class,score]',
      tags: ['NLP', '预训练'],
      scope: 'PLATFORM',
      source: 'EXTERNAL_IMPORT',
      ownerUserId: 'USER-SYSTEM',
      ownerOrgId: 'TENANT-YF',
      tenantId: 'TENANT-YF',
      currentVersionId: 'MVER-BERT-003-V3',
      currentVersionNo: 'v3.0',
      currentVersionStatus: 'DEPRECATED',
      evaluationStatus: 'PASSED',
      permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: false, canEditModel: false, canCreateVersion: false, canDeleteVersion: false, canApproveAccess: false },
      createdAt: '2026-06-02T00:00:00Z',
      updatedAt: '2026-06-03T00:00:00Z',
    },
    {
      modelId: 'MODEL-SEG-002',
      name: '缺陷分割实验模型',
      description: '测试版本只限 BU',
      framework: 'ONNX',
      taskType: 'SEMANTIC_SEGMENTATION',
      inputFormat: 'image:1024x1024 RGB',
      outputFormat: 'mask[class]',
      tags: ['分割'],
      scope: 'BU',
      source: 'LOCAL_UPLOAD',
      ownerUserId: 'USER-TRAINER',
      ownerOrgId: 'TENANT-CABIN',
      tenantId: 'TENANT-CABIN',
      currentVersionId: 'MVER-SEG-002-V1',
      currentVersionNo: 'v1.2',
      currentVersionStatus: 'DEPRECATED',
      evaluationStatus: 'NONE',
      permissionSummary: { canView: true, canDownload: false, canUseForTraining: false, canDeploy: false, canManage: false, canEditModel: false, canCreateVersion: false, canDeleteVersion: false, canApproveAccess: false },
      createdAt: '2026-06-03T00:00:00Z',
      updatedAt: '2026-06-03T00:00:00Z',
    },
  ],
  total: 3,
  page: 1,
  pageSize: 20,
};

const modelRegistryDetail = {
  modelId: 'MODEL-YOLO-001',
  name: '焊缝缺陷检测 YOLOv8',
  description: '用于焊缝表面缺陷检测',
  framework: 'PYTORCH',
  taskType: 'OBJECT_DETECTION',
  inputFormat: 'image:640x640 RGB',
  outputFormat: 'bbox[class,score,x1,y1,x2,y2]',
  runtimeRequirements: '{"python":"3.10"}',
  tags: ['焊缝', '缺陷检测', '预训练'],
  scope: 'PLATFORM',
  source: 'PLATFORM_BUILT_IN',
  ownerUserId: 'USER-SYSTEM',
  ownerOrgId: 'TENANT-YF',
  tenantId: 'TENANT-YF',
  currentVersionId: 'MVER-YOLO-001-V1',
  permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: true, canEditModel: true, canCreateVersion: true, canDeleteVersion: true, canApproveAccess: true },
  versions: [
    {
      versionId: 'MVER-YOLO-001-V1',
      modelId: 'MODEL-YOLO-001',
      versionNo: 'v1.0',
      fileObjectId: 'FILE-MODEL-001',
      fileName: 'weld-yolo-v1.onnx',
      fileExtension: '.onnx',
      fileSizeBytes: 104857600,
      checksum: 'sha256...',
      storageBucket: 'smp-models',
      storageKey: 'TENANT-CABIN/models/MODEL-YOLO-001/v1.0/weld-yolo-v1.onnx',
      runtimeRequirements: '{"python":"3.10"}',
      metricsSummary: { mAP50: 0.91, latencyMs: 18 },
      securityScanStatus: 'PENDING',
      evaluationStatus: 'IMPORTED_PROOF',
      evaluationRecordId: 'EXT-EVAL-001',
      evaluationProof: '外部评估报告 EXT-EVAL-001，管理员导入',
      status: 'PRODUCTION',
      activeDeploymentCount: 0,
      activeReferences: [],
      permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: true, canEditModel: true, canCreateVersion: true, canDeleteVersion: true, canApproveAccess: true },
      downloadAvailable: true,
      transitionActions: ['DEPRECATED'],
      createdBy: 'USER-TRAINER',
      createdAt: '2026-06-03T00:00:00Z',
    },
    {
      versionId: 'MVER-YOLO-001-V2',
      modelId: 'MODEL-YOLO-001',
      versionNo: 'v2.0',
      fileObjectId: 'FILE-MODEL-002',
      fileName: 'weld-yolo-v2.onnx',
      fileExtension: '.onnx',
      fileSizeBytes: 114857600,
      checksum: 'sha256-v2',
      storageBucket: 'smp-models',
      storageKey: 'TENANT-CABIN/models/MODEL-YOLO-001/v2.0/weld-yolo-v2.onnx',
      runtimeRequirements: '{"python":"3.10"}',
      metricsSummary: { mAP50: 0.94, latencyMs: 16 },
      securityScanStatus: 'PENDING',
      evaluationStatus: 'NONE',
      evaluationRecordId: null,
      evaluationProof: null,
      status: 'TESTING',
      activeDeploymentCount: 1,
      activeReferences: [{ serviceId: 'INF-SVC-001', serviceName: '焊缝在线检测', status: 'RUNNING' }],
      permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: true, canEditModel: true, canCreateVersion: true, canDeleteVersion: true, canApproveAccess: true },
      downloadAvailable: true,
      transitionActions: ['PRODUCTION', 'DEPRECATED'],
      createdBy: 'USER-TRAINER',
      createdAt: '2026-06-04T00:00:00Z',
    },
  ],
  auditEvents: [
    { eventId: 'AUD-1', action: 'MODEL_CREATED', operatorName: '模型训练工程师', occurredAt: '2026-06-03T00:00:00Z', result: 'SUCCESS' },
    { eventId: 'AUD-2', action: 'MODEL_VERSION_PUBLISH_BLOCKED', operatorName: '模型训练工程师', occurredAt: '2026-06-04T00:00:00Z', result: 'BLOCKED' },
  ],
  createdAt: '2026-06-03T00:00:00Z',
  updatedAt: '2026-06-04T00:00:00Z',
};

const paiStatus = { status: 'UNCONFIGURED', configured: false, enabled: false, regionId: 'TODO_CONFIRM_PAI_REGION', endpoint: 'TODO_CONFIRM_PAI_ENDPOINT', workspaceId: 'TODO_CONFIRM_PAI_WORKSPACE_ID', quotaId: 'TODO_CONFIRM_PAI_QUOTA_ID', resourceGroupId: 'TODO_CONFIRM_PAI_RESOURCE_GROUP_ID', credentialMode: 'RAM_ROLE', credentialRefMasked: 'TODO_CONFIRM_PAI_RAM_ROLE_ARN', diagnosticCode: 'PAI_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_PAI_REGION;TODO_CONFIRM_PAI_WORKSPACE_ID;TODO_CONFIRM_PAI_QUOTA_ID', lastSyncAt: null, stale: false };
const paiOverview = { status: 'READY', scopeType: 'BU', scopeId: 'TENANT-CABIN', bindingId: 'PAI-BIND-CABIN', workspaceId: 'pai-ws-cabin-sandbox', quotaId: 'quota-cabin-sandbox', resourceGroupId: 'rg-cabin-general', lastSyncAt: '2026-05-17T00:00:00Z', stale: false, diagnosticCode: 'OK', diagnosticMessage: 'PAI resource sandbox snapshot synchronized', updatedFrom: 'PAI_SNAPSHOT', cards: [{ key: 'gpu', label: 'GPU 总量', used: 36, total: 48, unit: '卡', percent: 75, status: 'WARNING' }, { key: 'npu', label: 'NPU 算力', used: 6, total: 16, unit: '卡', percent: 38, status: 'READY' }, { key: 'cpu', label: 'CPU 核心', used: 128, total: 192, unit: '核', percent: 67, status: 'READY' }, { key: 'storage', label: 'PAI/OSS 存储', used: 145408, total: 204800, unit: 'GB', percent: 71, status: 'READY' }] };
const paiWorkspaces = { items: [{ bindingId: 'PAI-BIND-CABIN', organizationId: 'TENANT-CABIN', organizationName: '智能座舱事业部', scopeType: 'BU', workspaceId: 'pai-ws-cabin-sandbox', workspaceName: 'PAI-CABIN-SANDBOX', quotaId: 'quota-cabin-sandbox', quotaName: '训练资源配额 Sandbox', resourceGroupId: 'rg-cabin-general', status: 'ACTIVE', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX_PAI_BINDING_FOR_CONTRACT_TEST_ONLY', lastSyncAt: '2026-05-17T00:00:00Z' }], total: 1, page: 1, pageSize: 1 };
const paiNodes = { items: [{ nodeId: 'pai-node-a100-01', sourceType: 'PAI_QUOTA_NODE', hostOrZone: 'cn-shanghai-a', gpuSpec: '8×A100 80G', cpuCores: 96, memoryGb: 768, gpuTotal: 8, gpuUsed: 6, gpuUtilizationPercent: 75, status: 'READY', diagnostic: 'from PAI quota sandbox snapshot' }], total: 1, page: 1, pageSize: 1 };
const paiPools = { items: [{ poolId: 'quota-cabin-sandbox', poolName: '训练资源配额 Sandbox', sourceType: 'PAI_RESOURCE_QUOTA', bindingId: 'PAI-BIND-CABIN', quotaId: 'quota-cabin-sandbox', workspaceId: 'pai-ws-cabin-sandbox', gpuUsed: 21, gpuTotal: 24, cpuUsed: 240, cpuTotal: 384, memoryUsedGb: 1024, memoryTotalGb: 1536, userCount: 12, status: 'READY' }], total: 1, page: 1, pageSize: 1 };
const paiStorage = { items: [{ storageId: 'oss-pai-workspace-cabin', name: 'PAI Workspace OSS', sourceType: 'PAI_WORKSPACE_STORAGE', capacityGb: 204800, usedGb: 145408, percent: 71, status: 'READY', diagnostic: 'workspace storage sandbox summary' }], total: 1, page: 1, pageSize: 1 };

export async function mockPlatformApis(page: Page) {
  let trainingExportState = annotationExport;
  let modelRegistryState = structuredClone(modelRegistryDetail);
  let modelAccessRequests = [] as Array<Record<string, unknown>>;
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
  await page.route(/\/api\/v1\/platform\/files\/[^/]+\/download-url(?:\?.*)?$/, async (route) => {
    const fileId = route.request().url().match(/\/api\/v1\/platform\/files\/([^/]+)\/download-url/)?.[1] ?? 'FILE-001';
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { fileId, status: 'READY', downloadUrl: `/api/v1/platform/files/${fileId}/content`, diagnostic: 'AUTHENTICATED_CONTENT_ENDPOINT_READY' } } });
  });
  await page.route(/\/api\/v1\/platform\/files\/[^/]+\/content(?:\?.*)?$/, async (route) => {
    const auth = route.request().headers().authorization ?? '';
    const fileId = route.request().url().match(/\/api\/v1\/platform\/files\/([^/]+)\/content/)?.[1] ?? 'FILE-001';
    const isTrainingPackage = fileId.startsWith('FILE-AEXP-');
    const filename = isTrainingPackage ? `${fileId}.zip` : fileId === 'FILE-RTSP-SAMPLE-001' ? 'FILE-RTSP-SAMPLE-001.mp4' : `${fileId}.bin`;
    await route.fulfill({
      status: auth.startsWith('Bearer ') ? 200 : 401,
      headers: { 'Content-Type': isTrainingPackage ? 'application/zip' : 'video/mp4', 'Content-Disposition': `attachment; filename="${filename}"` },
      body: auth.startsWith('Bearer ') ? Buffer.from(isTrainingPackage ? 'mock yolo training zip bytes' : 'F018 sandbox mp4 sample e2e') : Buffer.from('unauthorized'),
    });
  });
  await page.route('**/api/v1/platform/files**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...fileObjects, items: [...fileObjects.items, ...modelFileObjects.items], total: fileObjects.total + modelFileObjects.total } } });
  });
  await page.route(/\/api\/v1\/models(?:\?.*)?$/, async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      const body = readPostDataJson(route.request());
      await route.fulfill({
        json: {
          code: 0,
          message: 'success',
          traceId: 'e2e',
          timestamp: new Date().toISOString(),
          data: {
            ...modelRegistryList.items[0],
            modelId: 'MODEL-NEW-001',
            name: String(body?.name ?? '新建模型'),
            currentVersionId: null,
            currentVersionNo: null,
            currentVersionStatus: null,
          },
        },
      });
      return;
    }
    const url = new URL(route.request().url());
    const keyword = url.searchParams.get('keyword')?.trim().toLowerCase();
    const tag = url.searchParams.get('tag')?.trim();
    const ownerOrgId = url.searchParams.get('ownerOrgId')?.trim();
    const framework = url.searchParams.get('framework')?.trim();
    const taskType = url.searchParams.get('taskType')?.trim();
    const scope = url.searchParams.get('scope')?.trim();
    const status = url.searchParams.get('status')?.trim();
    const items = modelRegistryList.items.filter((item) => {
      const matchesKeyword = !keyword || [item.name, item.description ?? '', ...item.tags].some((value) => String(value).toLowerCase().includes(keyword));
      return matchesKeyword
        && (!tag || item.tags.includes(tag))
        && (!ownerOrgId || item.ownerOrgId === ownerOrgId)
        && (!framework || item.framework === framework)
        && (!taskType || item.taskType === taskType)
        && (!scope || item.scope === scope)
        && (!status || item.currentVersionStatus === status);
    });
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...modelRegistryList, items, total: items.length } } });
  });
  await page.route(/\/api\/v1\/models\/MODEL-BERT-003\/versions(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        message: 'success',
        traceId: 'e2e',
        timestamp: new Date().toISOString(),
        data: [
          {
            ...modelRegistryState.versions[0],
            versionId: 'MVER-BERT-003-V2',
            modelId: 'MODEL-BERT-003',
            versionNo: 'v2.1',
            fileObjectId: 'FILE-MODEL-BERT-002',
            fileName: 'ticket-bert-v2.onnx',
            fileExtension: '.onnx',
            status: 'PRODUCTION',
            permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: false, canEditModel: false, canCreateVersion: false, canDeleteVersion: false, canApproveAccess: false },
          },
          {
            ...modelRegistryState.versions[0],
            versionId: 'MVER-BERT-003-V3',
            modelId: 'MODEL-BERT-003',
            versionNo: 'v3.0',
            fileObjectId: 'FILE-MODEL-BERT-003',
            fileName: 'ticket-bert-v3.onnx',
            fileExtension: '.onnx',
            status: 'DEPRECATED',
            permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: false, canEditModel: false, canCreateVersion: false, canDeleteVersion: false, canApproveAccess: false },
          },
        ],
      },
    });
  });
  await page.route(/\/api\/v1\/models\/MODEL-SEG-002\/versions(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        message: 'success',
        traceId: 'e2e',
        timestamp: new Date().toISOString(),
        data: [
          {
            ...modelRegistryState.versions[0],
            versionId: 'MVER-SEG-002-V1',
            modelId: 'MODEL-SEG-002',
            versionNo: 'v1.2',
            fileObjectId: 'FILE-MODEL-SEG-001',
            fileName: 'defect-seg-v1.onnx',
            status: 'DEPRECATED',
            permissionSummary: { canView: true, canDownload: false, canUseForTraining: false, canDeploy: false, canManage: false, canEditModel: false, canCreateVersion: false, canDeleteVersion: false, canApproveAccess: false },
          },
        ],
      },
    });
  });
  await page.route(/\/api\/v1\/models\/[^/]+$/, async (route) => {
    const method = route.request().method();
    if (method === 'PATCH') {
      const body = readPostDataJson(route.request());
      await route.fulfill({
        json: {
          code: 0,
          message: 'success',
          traceId: 'e2e',
          timestamp: new Date().toISOString(),
          data: { ...modelRegistryList.items[0], name: String(body?.name ?? modelRegistryList.items[0].name) },
        },
      });
      return;
    }
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: modelRegistryState } });
  });
  await page.route(/\/api\/v1\/models\/[^/]+\/versions(?:\?.*)?$/, async (route) => {
    if (route.request().method() === 'POST') {
      const body = readPostDataJson(route.request());
      const createdVersion = {
        versionId: 'MVER-YOLO-001-V3',
        modelId: 'MODEL-YOLO-001',
        versionNo: String(body?.versionNo ?? 'v3.0'),
        fileObjectId: String(body?.fileObjectId ?? 'FILE-MODEL-001'),
        fileName: 'weld-yolo-v3.onnx',
        fileExtension: '.onnx',
        fileSizeBytes: 124857600,
        checksum: 'sha256-v3',
        storageBucket: 'smp-models',
        storageKey: 'TENANT-CABIN/models/MODEL-YOLO-001/v3.0/weld-yolo-v3.onnx',
        runtimeRequirements: String(body?.runtimeRequirements ?? '{"python":"3.10"}'),
        metricsSummary: { mAP50: 0.95, latencyMs: 15 },
        securityScanStatus: 'PENDING',
        evaluationStatus: String(body?.evaluationStatus ?? 'NONE'),
        evaluationRecordId: null,
        evaluationProof: body?.evaluationProof ? String(body.evaluationProof) : null,
        status: 'DEVELOPMENT',
        activeDeploymentCount: 0,
        activeReferences: [],
        permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: true, canEditModel: true, canCreateVersion: true, canDeleteVersion: true, canApproveAccess: true },
        downloadAvailable: true,
        transitionActions: ['TESTING'],
        createdBy: 'USER-TRAINER',
        createdAt: '2026-06-05T00:00:00Z',
      };
      modelRegistryState = { ...modelRegistryState, versions: [...modelRegistryState.versions, createdVersion] };
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: createdVersion } });
      return;
    }
    const modelId = route.request().url().match(/\/api\/v1\/models\/([^/]+)\/versions/)?.[1] ?? 'MODEL-YOLO-001';
    const versions = modelId === 'MODEL-BERT-003'
      ? [
          {
            ...modelRegistryState.versions[0],
            versionId: 'MVER-BERT-003-V2',
            modelId: 'MODEL-BERT-003',
            versionNo: 'v2.1',
            fileObjectId: 'FILE-MODEL-BERT-002',
            fileName: 'ticket-bert-v2.onnx',
            fileExtension: '.onnx',
            status: 'PRODUCTION',
            permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: false, canEditModel: false, canCreateVersion: false, canDeleteVersion: false, canApproveAccess: false },
          },
          {
            ...modelRegistryState.versions[0],
            versionId: 'MVER-BERT-003-V3',
            modelId: 'MODEL-BERT-003',
            versionNo: 'v3.0',
            fileObjectId: 'FILE-MODEL-BERT-003',
            fileName: 'ticket-bert-v3.onnx',
            fileExtension: '.onnx',
            status: 'DEPRECATED',
            permissionSummary: { canView: true, canDownload: true, canUseForTraining: true, canDeploy: false, canManage: false, canEditModel: false, canCreateVersion: false, canDeleteVersion: false, canApproveAccess: false },
          },
        ]
      : modelId === 'MODEL-SEG-002'
        ? [
            {
              ...modelRegistryState.versions[0],
              versionId: 'MVER-SEG-002-V1',
              modelId: 'MODEL-SEG-002',
              versionNo: 'v1.2',
              fileObjectId: 'FILE-MODEL-SEG-001',
              fileName: 'defect-seg-v1.onnx',
              status: 'DEPRECATED',
              permissionSummary: { canView: true, canDownload: false, canUseForTraining: false, canDeploy: false, canManage: false, canEditModel: false, canCreateVersion: false, canDeleteVersion: false, canApproveAccess: false },
            },
          ]
        : modelRegistryState.versions;
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: versions } });
  });
  await page.route(/\/api\/v1\/models\/[^/]+\/versions\/[^/]+\/transition(?:\?.*)?$/, async (route) => {
    const body = readPostDataJson(route.request());
    const versionId = route.request().url().match(/\/versions\/([^/]+)\/transition/)?.[1] ?? 'MVER-YOLO-001-V2';
    const version = modelRegistryState.versions.find((item) => item.versionId === versionId) ?? modelRegistryState.versions[0];
    if (versionId === 'MVER-YOLO-001-V2' && body?.targetStatus === 'PRODUCTION') {
      await route.fulfill({
        json: {
          code: 422,
          message: '该模型版本尚未通过评估，请先执行模型评估或导入评估证明',
          traceId: 'e2e',
          timestamp: new Date().toISOString(),
          data: null,
        },
      });
      return;
    }
    const transitioned = { ...version, status: String(body?.targetStatus ?? version.status) };
    modelRegistryState = { ...modelRegistryState, versions: modelRegistryState.versions.map((item) => (item.versionId === versionId ? transitioned : item)) };
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: transitioned } });
  });
  await page.route(/\/api\/v1\/models\/[^/]+\/versions\/[^/]+\/download-url(?:\?.*)?$/, async (route) => {
    const versionId = route.request().url().match(/\/versions\/([^/]+)\/download-url/)?.[1] ?? 'MVER-YOLO-001-V1';
    await route.fulfill({
      json: {
        code: 0,
        message: 'success',
        traceId: 'e2e',
        timestamp: new Date().toISOString(),
        data: {
          modelId: 'MODEL-YOLO-001',
          versionId,
          fileObjectId: 'FILE-MODEL-001',
          downloadUrl: 'http://127.0.0.1:9000/smp-models/model.onnx?X-Amz-Expires=600',
          expiresInSeconds: 600,
          diagnostic: 'PRESIGNED_URL_READY',
        },
      },
    });
  });
  await page.route(/\/api\/v1\/models\/[^/]+\/versions\/[^/]+$/, async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 409,
        json: {
          code: 40932,
          message: '该模型版本当前被推理服务引用，请先下线相关服务',
          traceId: 'e2e',
          timestamp: new Date().toISOString(),
          data: {
            versionId: 'MVER-YOLO-001-V2',
            deleted: false,
            blocked: true,
            activeReferences: [{ serviceId: 'INF-SVC-001', serviceName: '焊缝在线检测', status: 'RUNNING' }],
          },
        },
      });
      return;
    }
    const versionId = route.request().url().match(/\/versions\/([^/]+)$/)?.[1] ?? 'MVER-YOLO-001-V1';
    const version = modelRegistryState.versions.find((item) => item.versionId === versionId) ?? modelRegistryState.versions[0];
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: version } });
  });
  await page.route(/\/api\/v1\/models\/[^/]+\/access-requests(?:\?.*)?$/, async (route) => {
    if (route.request().method() === 'GET') {
      const status = new URL(route.request().url()).searchParams.get('status');
      const data = status ? modelAccessRequests.filter((item) => item.status === status) : modelAccessRequests;
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data } });
      return;
    }
    const body = readPostDataJson(route.request());
    const created = {
      requestId: 'MACC-001',
      modelId: 'MODEL-YOLO-001',
      versionId: String(body?.versionId ?? 'MVER-YOLO-001-V1'),
      requesterUserId: 'USER-QE',
      requesterOrgId: 'TENANT-QE',
      ownerOrgId: 'TENANT-CABIN',
      permission: String(body?.permission ?? 'USE_FOR_TRAINING'),
      reason: String(body?.reason ?? '用于座舱缺陷检测训练对比'),
      status: 'PENDING',
      reviewComment: null,
      reviewedBy: null,
      reviewedAt: null,
      expiresAt: String(body?.expiresAt ?? '2026-12-31T23:59:59Z'),
    };
    modelAccessRequests = [created, ...modelAccessRequests.filter((item) => item.requestId !== created.requestId)];
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: created } });
  });
  await page.route(/\/api\/v1\/model-access-requests\/[^/]+\/(?:approve|reject)(?:\?.*)?$/, async (route) => {
    const requestId = route.request().url().match(/\/model-access-requests\/([^/]+)\//)?.[1] ?? 'MACC-001';
    const approved = route.request().url().includes('/approve');
    const reviewed = {
      requestId,
      modelId: 'MODEL-YOLO-001',
      versionId: 'MVER-YOLO-001-V1',
      requesterUserId: 'USER-QE',
      requesterOrgId: 'TENANT-QE',
      ownerOrgId: 'TENANT-CABIN',
      permission: 'USE_FOR_TRAINING',
      reason: '用于座舱缺陷检测训练对比',
      status: approved ? 'APPROVED' : 'REJECTED',
      reviewComment: approved ? '页面审批通过' : '页面审批拒绝',
      reviewedBy: 'USR-ADMIN',
      reviewedAt: '2026-06-03T01:00:00Z',
      expiresAt: '2026-12-31T23:59:59Z',
    };
    modelAccessRequests = modelAccessRequests.map((item) => item.requestId === requestId ? reviewed : item);
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: reviewed } });
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
    if (route.request().method() === 'POST') {
      const body = readPostDataJson(route.request());
      const rtsp = body?.sourceType === 'RTSP_STREAM';
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: rtsp ? { ...dataSources[dataSources.length - 1], sourceId: 'DSRC-NEW-RTSP', name: body.name ?? '新建 RTSP 视频流', endpoint: body.endpoint ?? 'rtsp://camera.sandbox.internal/live/weld' } : { ...dataSources[1], sourceId: 'DSRC-NEW', name: '新建数据源' } } });
      return;
    }
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: dataSources } });
  });
  await page.route('**/api/v1/data-sources/*/test', async (route) => {
    const isRtsp = route.request().url().includes('DSRC-CABIN-RTSP') || route.request().url().includes('DSRC-NEW-RTSP');
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { sourceId: isRtsp ? 'DSRC-CABIN-RTSP' : 'DSRC-CABIN-MINIO', result: 'SUCCESS', status: 'TESTED', diagnosticCode: 'OK', diagnosticMessage: isRtsp ? 'SANDBOX RTSP_STREAM connector verified' : 'SANDBOX OBJECT_STORAGE connector verified', latencyMs: 42, traceId: 'e2e', testedAt: '2026-05-18T00:00:00Z' } } });
  });
  await page.route('**/api/v1/data-sources/*/activate', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...dataSources[0], status: 'ACTIVE' } } }); });
  await page.route('**/api/v1/data-sources/*/disable', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { ...dataSources[0], status: 'DISABLED' } } }); });
  await page.route('**/api/v1/data-source-sync-tasks', async (route) => {
    if (route.request().method() === 'POST') {
      const body = readPostDataJson(route.request());
      const rtsp = body?.sourceId === 'DSRC-CABIN-RTSP';
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: rtsp ? { ...syncTasks[1], taskId: 'DSYNC-NEW-RTSP', name: body.name ?? syncTasks[1].name, syncScope: body.syncScope ?? syncTasks[1].syncScope } : { ...syncTasks[0], taskId: 'DSYNC-NEW' } } });
      return;
    }
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: syncTasks } });
  });
  await page.route('**/api/v1/data-source-sync-tasks/*/run', async (route) => {
    const isRtsp = route.request().url().includes('DSYNC-RTSP') || route.request().url().includes('DSYNC-NEW-RTSP');
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: isRtsp ? { ...syncTasks[1], status: 'SUCCEEDED', lastResult: 'SUCCESS', targetDatasetId: 'DATASET-RTSP-SAMPLE-E2E', targetDatasetName: 'F018 RTSP 采样视频数据集', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX_RTSP_STREAM_SAMPLE_READY' } : { ...syncTasks[0], status: 'SUCCEEDED', lastResult: 'SUCCESS', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX_RELATIONAL_DB_IMPORT_READY' } } });
  });
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
    if (url.pathname.endsWith('/DATASET-UPLOAD-VIDEO-E2E')) {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: uploadVideoDatasetDetail } });
      return;
    }
    if (url.pathname.endsWith('/DATASET-RTSP-SAMPLE-E2E')) {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: rtspDatasetDetail } });
      return;
    }
    if (url.pathname.endsWith('/DATASET-WELD-FRAMES-001')) {
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: frameDatasetDetail } });
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
    const data = payload.includes('weld-line.mp4') ? datasetUploadVideoSessionUploaded : payload.includes('risk-photo.jpg') ? datasetUploadSessionRiskUploaded : payload.includes('append-1.jpg') ? datasetUploadSessionAppendUploaded : datasetUploadSessionUploaded;
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data } });
  });
  await page.route('**/api/v1/dataset-upload-sessions/*/commit', async (route) => {
    const url = route.request().url();
    const data = url.includes('DUS-E2E-VIDEO') ? datasetUploadVideoSessionProcessing : url.includes('DUS-E2E-RISK') ? datasetUploadSessionRiskProcessing : url.includes('DUS-E2E-APPEND') ? datasetUploadSessionAppendProcessing : datasetUploadSessionProcessing;
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data } });
  });
  await page.route('**/api/v1/dataset-upload-sessions/*', async (route) => {
    const url = route.request().url();
    if (url.includes('DUS-E2E-VIDEO')) {
      uploadSessionPollCount += 1;
      const data = uploadSessionPollCount === 1 ? datasetUploadVideoSessionProcessing : datasetUploadVideoSessionReady;
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data } });
      return;
    }
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
    const data = payload.includes('AUDIO_VIDEO') ? datasetUploadVideoSession : payload.includes('APPEND_VERSION') ? datasetUploadSessionAppend : datasetUploadSession;
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
  await page.route('**/api/v1/preprocessed-datasets/*/preview', async (route) => { await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: pipelineRun.preview } }); });
  await page.route('**/api/v1/preprocessed-datasets/*/confirm', async (route) => {
    const data = { ...pipelineRun.activation, status: 'CONFIRMED', confirmed: true, confirmedAt: '2026-05-18T00:01:00Z' };
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data } });
  });
  await page.route('**/api/v1/preprocessed-datasets/*/activate', async (route) => {
    const data = { ...pipelineRun.activation, status: 'ACTIVE', confirmed: true, activatedAt: '2026-05-18T00:02:00Z' };
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data } });
  });
  await page.route('**/api/v1/pipeline-processing-tasks**', async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: { items: [], total: 0, page: 1, pageSize: 100 } } });
  });
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
  await page.route(/\/api\/v1\/annotation\/source-datasets(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const blocked = url.searchParams.get('sourceType') === 'BLOCKED_ONLY';
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: blocked ? blockedAnnotationSourceDatasets : annotationSourceDatasets } });
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
  await page.route(/\/api\/v1\/annotation\/tasks\/[^/]+\/exports(?:\?.*)?$/, async (route) => {
    if (route.request().method() === 'POST') {
      const format = (route.request().postDataJSON() as { format?: string } | null)?.format ?? annotationExport.format;
      trainingExportState = { ...annotationExport, format, exportId: 'AEXP-WELD-Q2-SMP' };
      await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: trainingExportState } });
      return;
    }
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: [trainingExportState] } });
  });
  await page.route(/\/api\/v1\/annotation\/exports\/[^/]+\/download-url(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: trainingExportState } });
  });
  await page.route(/\/api\/v1\/datasets\/[^/]+\/annotation-candidates(?:\?.*)?$/, async (route) => {
    const url = route.request().url();
    const data = url.includes('DATASET-UPLOAD-RISK')
      ? { datasetId: 'DATASET-UPLOAD-RISK', datasetName: 'F015 高风险内容', currentVersionId: 'DVER-UPLOAD-RISK', dataType: 'IMAGE', status: 'SECURITY_PENDING', eligible: false, diagnosticCode: 'DATASET_UPLOAD_SECURITY_BLOCKED', diagnosticMessage: 'SECURITY_BLOCKED', templates: [annotationTemplate], supportedFormats: ['SMP_JSONL', 'COCO'] }
      : url.includes('DATASET-RTSP-SAMPLE-E2E')
        ? { datasetId: 'DATASET-RTSP-SAMPLE-E2E', datasetName: 'F018 RTSP 采样视频数据集', currentVersionId: 'DVER-RTSP-SAMPLE-E2E', dataType: 'AUDIO_VIDEO', status: 'ACTIVE', eligible: false, diagnosticCode: 'ANNOTATION_DATASET_TYPE_UNSUPPORTED', diagnosticMessage: 'RTSP_STREAM 采样生成的视频原始数据集需先经过抽帧预处理生成 IMAGE 数据集后再标注', templates: [annotationTemplate], supportedFormats: ['SMP_JSONL', 'COCO'] }
      : url.includes('DATASET-UPLOAD-VIDEO-E2E')
        ? { datasetId: 'DATASET-UPLOAD-VIDEO-E2E', datasetName: 'F015 本地上传视频数据集', currentVersionId: 'DVER-UPLOAD-VIDEO-E2E', dataType: 'AUDIO_VIDEO', status: 'ACTIVE', eligible: false, diagnosticCode: 'ANNOTATION_DATASET_TYPE_UNSUPPORTED', diagnosticMessage: '视频原始数据集需先经过抽帧预处理生成 IMAGE 数据集后再标注', templates: [annotationTemplate], supportedFormats: ['SMP_JSONL', 'COCO'] }
      : url.includes('DATASET-UPLOAD-E2E')
        ? { datasetId: 'DATASET-UPLOAD-E2E', datasetName: 'F015 本地上传数据集', currentVersionId: 'DVER-UPLOAD-E2E', dataType: 'IMAGE', status: 'ACTIVE', eligible: true, diagnosticCode: 'OK', diagnosticMessage: '候选检查通过', templates: [annotationTemplate], supportedFormats: ['SMP_JSONL', 'COCO'] }
      : url.includes('DATASET-WELD-FRAMES-001')
        ? { datasetId: 'DATASET-WELD-FRAMES-001', datasetName: '焊缝视频抽帧预处理结果', currentVersionId: 'DVER-WELD-FRAMES-001', dataType: 'IMAGE', status: 'ACTIVE', eligible: true, diagnosticCode: 'OK', diagnosticMessage: '候选检查通过', templates: [annotationTemplate], supportedFormats: ['SMP_JSONL', 'COCO', 'YOLO_DETECTION'] }
        : { datasetId: 'DATASET-WELD-DEFECT', datasetName: '焊缝缺陷检测数据集', currentVersionId: 'DVER-WELD-002', dataType: 'IMAGE', status: 'ACTIVE', eligible: true, diagnosticCode: 'OK', diagnosticMessage: '候选检查通过', templates: [annotationTemplate], supportedFormats: ['SMP_JSONL', 'COCO'] };
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data } });
  });
  await page.route(/\/api\/v1\/datasets\/[^/]+\/annotation-tasks(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: route.request().method() === 'POST' ? datasetAnnotationCreateDetail : [{ task: annotationTask, exports: [trainingExportState] }] } });
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
  await page.route(/\/api\/v1\/annotation\/tags(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: { code: 0, message: 'success', traceId: 'e2e', timestamp: new Date().toISOString(), data: annotationTags } });
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

export async function openNav(page: Page, name: string | RegExp) {
  await page.getByRole('menuitem', { name }).last().click();
  await expect(page.getByRole('banner').getByText('SMP 工业 AI 小模型平台')).toBeVisible();
}

export async function selectAnnotationTags(page: Page, names: string[]) {
  const selector = page.getByLabel('选择标签');
  for (const name of names) {
    await selector.click();
    await page.keyboard.type(name);
    await page.keyboard.press('Enter');
  }
}
