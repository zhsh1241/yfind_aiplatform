import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import type { ApiResponse } from './features/foundation/apiClient';
import type { CurrentUser } from './features/platform/platformApi';
import { useLocaleStore } from './features/platform/localeStore';
import { useSessionStore } from './features/platform/sessionStore';

beforeAll(() => {
  vi.setConfig({ testTimeout: 15000 });
});

const mockState = {
  token: null as string | null,
  user: null as CurrentUser | null,
};

const mockUsers = [
  { id: 'USR-001', username: 'admin', displayName: '平台管理员', email: 'admin@yf.local', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', authType: 'LOCAL', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], lastLoginAt: '2026-05-16T09:00:00+08:00', failedLoginCount: 0, lockedUntil: null, sessionVersion: 1 },
];

const mockRoles = [
  { code: 'SUPER_ADMIN', name: '超级管理员', description: '全平台所有权限', scope: 'GLOBAL', preset: true, parentRoleCode: null, userCount: 1 },
  { code: 'BU_ADMIN', name: 'BU子管理员', description: 'BU 范围管理', scope: 'TENANT', preset: true, parentRoleCode: null, userCount: 1 },
  { code: 'DATA_ANNOTATOR', name: '数据标注工程师', description: '标注任务执行', scope: 'TENANT', preset: true, parentRoleCode: null, userCount: 1 },
  { code: 'DATA_REVIEWER', name: '审核工程师', description: '标注审核', scope: 'TENANT', preset: true, parentRoleCode: null, userCount: 1 },
  { code: 'MODEL_TRAINER', name: '模型训练工程师', description: '模型训练', scope: 'TENANT', preset: true, parentRoleCode: null, userCount: 1 },
  { code: 'MODEL_OPS', name: '模型应用工程师', description: '推理运维', scope: 'TENANT', preset: true, parentRoleCode: null, userCount: 1 },
  { code: 'CABIN_DATA_MANAGER', name: '座舱数据管理员', description: 'BU 权限角色', scope: 'TENANT', preset: false, parentRoleCode: 'BU_ADMIN', userCount: 0 },
  { code: 'CABIN_ROLE_41194', name: 'Ã¥ÂºÂ§Ã¨Ë†Â±Ã¦â€¢Â°Ã¦ÂÂ®Ã§Â®Â¡Ã§Ââ€ Ã¥â€˜Ëœ', description: 'Ã¦Â™ÂºÃ¨Æ’Â½Ã¥ÂºÂ§Ã¨Ë†Â± BU Ã¦Â•Â°Ã¦ÂÂ®Ã§Â®Â¡Ã§Ââ€ Ã¦ÂÆ’Ã©â„¢ÂÃ¨Â§â€™Ã¨â€°Â²', scope: 'TENANT', preset: false, parentRoleCode: 'BU_ADMIN', userCount: 0 },
  { code: 'CABIN_ROLE_5522', name: 'Ã¥ÂºÂ§Ã¨Ë†Â±Ã¦Â â€¡Ã¦Â³Â¨Ã¥ÂÂÃ¨Â°Æ’Ã¥â€˜Ëœ', description: 'Ã¦Â™ÂºÃ¨Æ’Â½Ã¥ÂºÂ§Ã¨Ë†Â± BU Ã¦Â â€¡Ã¦Â³Â¨Ã¤Â»Â»Ã¥Å Â¡Ã¥ÂÂÃ¨Â°Æ’', scope: 'TENANT', preset: false, parentRoleCode: 'DATA_ANNOTATOR', userCount: 0 },
];

const mockMatrix = {
  roles: mockRoles,
  modules: [{ name: '平台管理', permissions: [] }],
  rows: [
    { module: '平台管理', permissionCode: 'platform:user:read', permissionName: '查询用户', allowedRoles: ['SUPER_ADMIN', 'BU_ADMIN', 'CABIN_DATA_MANAGER', 'CABIN_ROLE_41194'] },
    { module: '平台管理', permissionCode: 'platform:user:create', permissionName: '创建用户', allowedRoles: ['SUPER_ADMIN', 'BU_ADMIN'] },
  ],
};

const mockAuditLog = { id: 'AUD-001', eventId: 'EVT-UNIT', tenantId: 'TENANT-YF', operatorId: 'USR-001', operatorName: '平台管理员', operatorRole: 'SUPER_ADMIN', action: 'AUDIT_EXPORT_REQUESTED', resourceType: 'AuditLog', resourceId: 'EXPORT', result: 'SUCCESS', riskLevel: 'CRITICAL', beforeJson: null, afterJson: null, detailJson: 'TODO_CONFIRM_AUDIT_COLD_STORAGE', traceId: 't', signature: 'abcdef1234567890', occurredAt: '2026-05-16T08:00:00Z' };

const mockOrganizations = { nodes: [{ id: 'TENANT-YF', code: 'YF', name: '花叔工业智能', tenantType: 'CORP', parentId: null, path: '/TENANT-YF', status: 'ACTIVE', timezone: 'Asia/Shanghai', defaultLocale: 'zh-CN', quotaGpu: 200, quotaStorageTb: 2000, apiRateLimitPerDay: 50000, userCount: 1, usedGpu: 2, children: [{ id: 'TENANT-CABIN', code: 'CABIN', name: '智能座舱事业部', tenantType: 'BU', parentId: 'TENANT-YF', path: '/TENANT-YF/TENANT-CABIN', status: 'ACTIVE', timezone: 'Asia/Shanghai', defaultLocale: 'zh-CN', quotaGpu: 50, quotaStorageTb: 500, apiRateLimitPerDay: 10000, userCount: 2, usedGpu: 7, children: [{ id: 'TENANT-VISION', code: 'VISION', name: '视觉质检项目', tenantType: 'PROJECT', parentId: 'TENANT-CABIN', path: '/TENANT-YF/TENANT-CABIN/TENANT-VISION', status: 'ACTIVE', timezone: 'Asia/Shanghai', defaultLocale: 'zh-CN', quotaGpu: 8, quotaStorageTb: 5, apiRateLimitPerDay: 1000, userCount: 1, usedGpu: 2, children: [] }] }] }] };
const mockMembers = { items: [{ id: 'OM-001', organizationId: 'TENANT-CABIN', organizationName: '智能座舱事业部', userId: 'USR-001', username: 'admin', displayName: '平台管理员', roleCode: 'SUPER_ADMIN', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', status: 'ACTIVE', expiresAt: null }], total: 1, page: 1, pageSize: 1 };
const mockConfigs = [
  { key: 'platform.name', groupName: 'basic', displayName: '平台名称', valueType: 'STRING', scopeAllowed: ['GLOBAL', 'BU'], sensitive: false, defaultValue: '延锋 SMP 工业AI平台', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: '延锋 SMP 工业AI平台', effectiveValue: '延锋 SMP 工业AI平台', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'upload.maxFileSizeMb', groupName: 'storage', displayName: '最大上传文件', valueType: 'NUMBER', scopeAllowed: ['GLOBAL', 'BU', 'PROJECT'], sensitive: false, defaultValue: '200', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: '200', effectiveValue: '200', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'notification.smtpHost', groupName: 'notification', displayName: 'SMTP Host', valueType: 'STRING', scopeAllowed: ['GLOBAL', 'BU'], sensitive: true, defaultValue: 'TODO_CONFIRM_SMTP_HOST', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: 'TODO_CONFIRM_SMTP_HOST', effectiveValue: 'TODO_CONFIRM_SMTP_HOST', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'security.evalDatasetDownload', groupName: 'security', displayName: '评估集下载开关', valueType: 'BOOLEAN', scopeAllowed: ['GLOBAL', 'BU', 'PROJECT'], sensitive: false, defaultValue: 'true', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: 'true', effectiveValue: 'true', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'auth.ssoMetadataUrl', groupName: 'auth', displayName: 'IdP 元数据 URL', valueType: 'STRING', scopeAllowed: ['GLOBAL'], sensitive: true, defaultValue: 'TODO_CONFIRM_IDP_METADATA_URL', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: 'TODO_CONFIRM_IDP_METADATA_URL', effectiveValue: 'TODO_CONFIRM_IDP_METADATA_URL', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
  { key: 'tag.defaultScenario', groupName: 'tag', displayName: '默认业务标签', valueType: 'STRING', scopeAllowed: ['GLOBAL', 'BU'], sensitive: false, defaultValue: '质量检测', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', scopeValue: '质量检测', effectiveValue: '质量检测', inheritedFrom: 'GLOBAL:TENANT-YF', version: 1, status: 'ACTIVE' },
];
const mockFiles = { items: [{ fileId: 'FILE-001', assetType: 'DATASET', tenantId: 'TENANT-CABIN', projectId: 'TENANT-VISION', bucket: 'TODO_CONFIRM_MINIO_BUCKET', objectKey: 'TENANT-CABIN/DATASET/FILE-001.bin', expectedSha256: 'abc', sha256: 'abc', expectedSizeBytes: 1024, sizeBytes: 1024, contentType: 'application/octet-stream', storageTier: 'STANDARD', status: 'AVAILABLE', ownerId: 'USR-001', createdAt: '2026-05-17T00:00:00Z', updatedAt: '2026-05-17T00:00:00Z' }], total: 1, page: 1, pageSize: 1 };
const mockUploadFile = { ...mockFiles.items[0], fileId: 'FILE-UPLOAD-001', objectKey: 'TENANT-CABIN/DATASET/FILE-UPLOAD-001.bin', expectedSha256: 'sha256-upload-001', sha256: 'sha256-upload-001', expectedSizeBytes: 2048, sizeBytes: 2048, status: 'UPLOADED' };
const mockUploadedFile = { ...mockUploadFile, status: 'AVAILABLE' };
const mockChannels = [{ channelId: 'NC-GLOBAL-EMAIL', channelType: 'EMAIL', scopeType: 'GLOBAL', scopeId: 'TENANT-YF', name: '邮件通知', enabled: true, configMasked: 'host=TODO_CONFIRM_SMTP_HOST;sender=TODO_CONFIRM_SMTP_SENDER', status: 'UNCONFIGURED', diagnostic: 'TODO_CONFIRM_SMTP_HOST', lastTestAt: null }];

const mockDataSources = [{ sourceId: 'DSRC-CABIN-MINIO', name: '图像存储桶', sourceType: 'IMPORT', tenantId: 'TENANT-CABIN', projectId: null, endpoint: 'minio.sandbox.internal', port: 9000, databaseName: 'weld-images', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://TODO_CONFIRM_MINIO_DATASET', sharedScope: 'BU', description: '焊缝图像数据源 sandbox seam', status: 'ACTIVE', lastTestAt: '2026-05-18T00:00:00Z', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX connection verified', latencyMs: 38, updatedAt: '2026-05-18T00:00:00Z' }, { sourceId: 'DSRC-YF-API', name: '影音接口 API', sourceType: 'API', tenantId: 'TENANT-YF', projectId: null, endpoint: 'TODO_CONFIRM_WORKORDER_API_ENDPOINT', port: null, databaseName: 'workorder', credentialMode: 'SECRET_REF', secretRefMasked: 'secret://TODO_CONFIRM_WORKORDER_API', sharedScope: 'GLOBAL', description: '待确认工单 API', status: 'UNCONFIGURED', lastTestAt: null, diagnosticCode: 'DATA_SOURCE_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_WORKORDER_API_ENDPOINT', latencyMs: null, updatedAt: '2026-05-18T00:00:00Z' }];
const mockSyncTasks = [{ taskId: 'DSYNC-001', sourceId: 'DSRC-CABIN-MINIO', sourceName: '图像存储桶', targetDatasetId: 'DATASET-WELD-DEFECT', targetDatasetName: '焊缝缺陷检测数据集', name: '生产图像同步', scheduleMode: 'HOURLY', syncScope: 'prefix=/weld', status: 'PAUSED', lastRunAt: null, lastResult: 'UNCONFIGURED', diagnosticCode: 'DATA_SYNC_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_DATA_CONNECTOR_SCHEDULER' }];
const mockDatasets = { items: [{ datasetId: 'DATASET-WELD-DEFECT', name: '焊缝缺陷检测数据集', datasetType: 'RAW', dataType: 'IMAGE', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-WELD-001', currentVersionName: 'v1.0.0', status: 'ACTIVE', accessLevel: 'RESTRICTED', tags: ['焊接','质检'], recordCount: 31200, sizeBytes: 1024, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '焊缝缺陷图片样例数据集', updatedAt: '2026-05-18T00:00:00Z' }, { datasetId: 'DATASET-WELD-MASK', name: '焊缝分割训练数据集', datasetType: 'ANNOTATED', dataType: 'IMAGE', tenantId: 'TENANT-CABIN', projectId: null, currentVersionId: 'DVER-WELD-MASK-003', currentVersionName: 'v3.0.0', status: 'ACTIVE', accessLevel: 'INTERNAL', tags: ['分割','训练'], recordCount: 12800, sizeBytes: 2048, ownerId: 'USR-ADMIN', ownerName: '平台管理员', description: '焊缝分割样例数据集', updatedAt: '2026-05-20T00:00:00Z' }], total: 2, page: 1, pageSize: 20, stats: { total: 2, raw: 1, preprocessed: 0, annotated: 1, restricted: 1, totalSizeBytes: 3072 } };
const mockAccessRequests = [{ requestId: 'DAR-001', datasetId: 'DATASET-WELD-DEFECT', datasetName: '焊缝缺陷检测数据集', tenantId: 'TENANT-CABIN', requesterId: 'USR-ANNOTATOR', requesterName: '数据标注员', purpose: '训练焊缝缺陷模型', status: 'PENDING', createdAt: '2026-05-20T08:00:00Z', reviewedBy: null, reviewerName: null, reviewedAt: null }];
const mockAnnotationTask = { taskId: 'ANN-WELD-Q2', name: '焊缝缺陷检测标注任务', scene: 'IMAGE_TAGGING', sceneLabel: '图片打标', sourceDatasetId: 'DATASET-WELD-DEFECT', sourceDatasetName: '焊缝缺陷检测数据集', templateId: 'LT-WELD-BBOX', templateName: '焊缝图片打标模板', tenantId: 'TENANT-CABIN', status: 'IN_PROGRESS', reviewEnabled: true, prelabelEnabled: false, labelStudioEnabled: true, totalCount: 6, annotatedCount: 4, reviewedCount: 2, qualityScore: null, assignees: [{ userId: 'USR-ANNOTATOR', displayName: '标注工程师', role: 'ANNOTATOR' }, { userId: 'USR-BU-CABIN', displayName: '座舱审核员', role: 'REVIEWER' }], deadline: '2026-06-02T00:00:00Z', updatedAt: '2026-05-19T00:00:00Z' };
const mockAssignedAnnotationTask = { ...mockAnnotationTask, taskId: 'ANN-WELD-ASSIGNED', name: '焊缝缺陷待开始任务', status: 'ASSIGNED' };
const mockSegmentationAnnotationTask = { ...mockAnnotationTask, taskId: 'ANN-WELD-SEG', name: '焊缝缺陷图片分割任务', scene: 'IMAGE_SEGMENTATION', sceneLabel: '图片分割', templateId: 'LT-WELD-POLYGON', templateName: '焊缝图片分割模板' };
const mockAnnotationTemplate = { templateId: 'LT-WELD-BBOX', name: '焊缝图片打标模板', scene: 'IMAGE_TAGGING', labelType: 'BOUNDING_BOX', labelSchemaJson: '{"labels":["焊接气孔","裂纹","夹渣","未熔合"]}', labelStudioConfigXml: '<View><Image name="image" value="$image"/></View>', status: 'PUBLISHED', tenantId: 'TENANT-CABIN', createdBy: 'USR-ADMIN', updatedAt: '2026-05-19T00:00:00Z' };
const mockSegmentationTemplate = { templateId: 'LT-WELD-POLYGON', name: '焊缝图片分割模板', scene: 'IMAGE_SEGMENTATION', labelType: 'POLYGON', labelSchemaJson: '{"labels":["裂纹区域","气孔区域"]}', labelStudioConfigXml: '<View><Image name="image" value="$image"/><PolygonLabels name="label" toName="image"><Label value="裂纹区域"/><Label value="气孔区域"/></PolygonLabels></View>', status: 'PUBLISHED', tenantId: 'TENANT-CABIN', createdBy: 'USR-ADMIN', updatedAt: '2026-05-21T00:00:00Z' };
const mockAnnotationBinding = { bindingId: 'AEXT-WELD-Q2', taskId: 'ANN-WELD-Q2', provider: 'LABEL_STUDIO', externalProjectId: null, externalUrl: 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL', configStatus: 'UNCONFIGURED', lastSyncStatus: 'UNCONFIGURED', diagnosticCode: 'LABEL_STUDIO_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL;TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET', launchUrl: null, lastSyncAt: null };
const mockAnnotationWorkItems: Array<{ workItemId: string; taskId: string; sampleKey: string; sampleFileId: string | null; annotatorId: string; annotatorName: string; status: string; predictionJson: string | null; annotationJson: string | null; submittedAt: string | null; updatedAt: string }> = [{ workItemId: 'AWI-WELD-001', taskId: 'ANN-WELD-Q2', sampleKey: 'weld/0001.jpg', sampleFileId: 'FILE-DATASET-WELD-001', annotatorId: 'USR-ANNOTATOR', annotatorName: '标注工程师', status: 'DRAFT', predictionJson: null, annotationJson: null, submittedAt: null, updatedAt: '2026-05-19T00:00:00Z' }];
const mockSegmentationWorkItems = [{ workItemId: 'AWI-WELD-SEG-001', taskId: 'ANN-WELD-SEG', sampleKey: 'weld/0001.jpg', sampleFileId: 'FILE-DATASET-WELD-001', annotatorId: 'USR-ANNOTATOR', annotatorName: '标注工程师', status: 'DRAFT', predictionJson: null, annotationJson: '{"polygons":[{"id":"poly-crack-001","label":"裂纹区域","cls":1,"points":[{"x":146,"y":108},{"x":188,"y":92},{"x":238,"y":126},{"x":224,"y":178},{"x":162,"y":170}]}]}', submittedAt: null, updatedAt: '2026-05-21T00:00:00Z' }];
const mockAnnotationReviewItems = [{ reviewItemId: 'ARV-WELD-001', workItemId: 'AWI-WELD-002', taskId: 'ANN-WELD-Q2', taskName: '焊缝缺陷检测标注任务', annotatorId: 'USR-ANNOTATOR', annotatorName: '标注工程师', reviewerId: 'USR-BU-CABIN', reviewerName: '座舱审核员', status: 'REVIEW_PENDING', reviewComment: null, reviewedAt: null }];
const mockAnnotationPublication = { publicationId: 'APUB-WELD-Q2', taskId: 'ANN-WELD-Q2', qualityStatus: 'PASSED', coverageRate: 1, formatStatus: 'COCO_READY', diagnosticCode: 'ANNOTATION_QUALITY_PASSED', diagnosticMessage: 'DAT-010 quality passed', outputDatasetId: 'DATASET-WELD-ANNOTATED', outputVersionId: 'DVER-WELD-ANN-001', publishedAt: '2026-05-19T00:00:00Z' };
const mockAnnotationOverview = { stats: { total: 2, inProgress: 1, pendingReview: 1, completed: 0, templates: 1 }, tasks: [mockAssignedAnnotationTask, mockAnnotationTask], templates: [mockAnnotationTemplate] };
const mockAnnotationDetail = { task: mockAnnotationTask, assignments: [], workItems: mockAnnotationWorkItems, reviewItems: mockAnnotationReviewItems, publications: [], externalBinding: mockAnnotationBinding };
const mockSegmentationAnnotationDetail = { task: mockSegmentationAnnotationTask, assignments: [], workItems: mockSegmentationWorkItems, reviewItems: [], publications: [], externalBinding: mockAnnotationBinding };
const mockDatasetAnnotationCandidate = { datasetId: 'DATASET-WELD-DEFECT', datasetName: '焊缝缺陷检测数据集', currentVersionId: 'DVER-WELD-001', dataType: 'IMAGE', status: 'ACTIVE', eligible: true, diagnosticCode: 'OK', diagnosticMessage: '已满足创建标注任务条件', templates: [mockAnnotationTemplate, mockSegmentationTemplate], supportedFormats: ['COCO_DETECTION', 'YOLO_DETECTION', 'VOC_DETECTION', 'SEGMENTATION_MASK_MANIFEST'] };
const mockDatasetAnnotationTasks = [{ task: mockAnnotationTask, exports: [] }];
const mockAnnotationSourceDatasets = {
  items: [
    { datasetId: 'DATASET-WELD-DEFECT', name: '焊缝缺陷检测数据集', datasetType: 'RAW', dataType: 'IMAGE', currentVersionId: 'DVER-WELD-001', status: 'ACTIVE', annotationEligible: true, confirmed: true, sourceDatasetId: null, sourceDatasetName: null, blockReason: null },
    { datasetId: 'DATASET-WELD-MASK', name: '焊缝分割训练数据集', datasetType: 'ANNOTATED', dataType: 'IMAGE', currentVersionId: 'DVER-WELD-MASK-003', status: 'ACTIVE', annotationEligible: true, confirmed: true, sourceDatasetId: 'DATASET-WELD-DEFECT', sourceDatasetName: '焊缝缺陷检测数据集', blockReason: null },
    { datasetId: 'DATASET-WELD-FRAMES-001', name: '焊缝视频抽帧预处理结果', datasetType: 'PREPROCESSED', dataType: 'IMAGE', currentVersionId: 'DVER-WELD-FRAMES-001', status: 'ACTIVE', annotationEligible: true, confirmed: true, sourceDatasetId: 'DATASET-WELD-VIDEO-001', sourceDatasetName: '焊缝视频原始数据集', blockReason: null },
  ],
  total: 3,
  page: 1,
  pageSize: 100,
};

const mockDatasetDetail = { dataset: mockDatasets.items[0], versions: [{ versionId: 'DVER-WELD-001', datasetId: 'DATASET-WELD-DEFECT', versionName: 'v1.0.0', status: 'PUBLISHED', recordCount: 31200, sizeBytes: 1024, contentSafetyStatus: 'PASSED', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX_CONTENT_SAFETY_PASSED', createdAt: '2026-05-18T00:00:00Z', publishedAt: '2026-05-18T00:00:00Z' }], files: [{ id: 'DF-WELD-001', datasetId: 'DATASET-WELD-DEFECT', versionId: 'DVER-WELD-001', fileId: 'FILE-DATASET-WELD-001', fileRole: 'RAW', status: 'BOUND', objectKey: 'TENANT-CABIN/dataset/FILE-DATASET-WELD-001.csv', contentType: 'text/csv', sizeBytes: 1024, sha256: 'sha256-weld-001' }], grants: [], lineage: [{ lineageId: 'LIN-DSRC-WELD-001', sourceType: 'DATA_SOURCE', sourceId: 'DSRC-CABIN-MINIO', targetType: 'DATASET_VERSION', targetId: 'DVER-WELD-001', transformType: 'IMPORT', createdAt: '2026-05-18T00:00:00Z' }], previewStatus: 'UNSUPPORTED', previewDiagnostic: '非图片/不可预览文件显示元数据退化状态' };
const mockPaiStatus = { status: 'UNCONFIGURED', configured: false, enabled: false, regionId: 'TODO_CONFIRM_PAI_REGION', endpoint: 'TODO_CONFIRM_PAI_ENDPOINT', workspaceId: 'TODO_CONFIRM_PAI_WORKSPACE_ID', quotaId: 'TODO_CONFIRM_PAI_QUOTA_ID', resourceGroupId: 'TODO_CONFIRM_PAI_RESOURCE_GROUP_ID', credentialMode: 'RAM_ROLE', credentialRefMasked: 'TODO_CONFIRM_PAI_RAM_ROLE_ARN', diagnosticCode: 'PAI_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_PAI_REGION;TODO_CONFIRM_PAI_WORKSPACE_ID;TODO_CONFIRM_PAI_QUOTA_ID', lastSyncAt: null, stale: false };
const mockPaiOverview = { status: 'READY', scopeType: 'BU', scopeId: 'TENANT-CABIN', bindingId: 'PAI-BIND-CABIN', workspaceId: 'pai-ws-cabin-sandbox', quotaId: 'quota-cabin-sandbox', resourceGroupId: 'rg-cabin-general', lastSyncAt: '2026-05-17T00:00:00Z', stale: false, diagnosticCode: 'OK', diagnosticMessage: 'PAI resource sandbox snapshot synchronized', updatedFrom: 'PAI_SNAPSHOT', cards: [{ key: 'gpu', label: 'GPU 总量', used: 36, total: 48, unit: '卡', percent: 75, status: 'WARNING' }, { key: 'npu', label: 'NPU 算力', used: 6, total: 16, unit: '卡', percent: 38, status: 'READY' }, { key: 'cpu', label: 'CPU 核心', used: 128, total: 192, unit: '核', percent: 67, status: 'READY' }, { key: 'storage', label: 'PAI/OSS 存储', used: 145408, total: 204800, unit: 'GB', percent: 71, status: 'READY' }] };
const mockPaiWorkspaces = { items: [{ bindingId: 'PAI-BIND-CABIN', organizationId: 'TENANT-CABIN', organizationName: '智能座舱事业部', scopeType: 'BU', workspaceId: 'pai-ws-cabin-sandbox', workspaceName: 'PAI-CABIN-SANDBOX', quotaId: 'quota-cabin-sandbox', quotaName: '训练资源配额 Sandbox', resourceGroupId: 'rg-cabin-general', status: 'ACTIVE', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX_PAI_BINDING_FOR_CONTRACT_TEST_ONLY', lastSyncAt: '2026-05-17T00:00:00Z' }], total: 1, page: 1, pageSize: 1 };
const mockPaiNodes = { items: [{ nodeId: 'pai-node-a100-01', sourceType: 'PAI_QUOTA_NODE', hostOrZone: 'cn-shanghai-a', gpuSpec: '8×A100 80G', cpuCores: 96, memoryGb: 768, gpuTotal: 8, gpuUsed: 6, gpuUtilizationPercent: 75, status: 'READY', diagnostic: 'from PAI quota sandbox snapshot' }], total: 1, page: 1, pageSize: 1 };
const mockPaiPools = { items: [{ poolId: 'quota-cabin-sandbox', poolName: '训练资源配额 Sandbox', sourceType: 'PAI_RESOURCE_QUOTA', bindingId: 'PAI-BIND-CABIN', quotaId: 'quota-cabin-sandbox', workspaceId: 'pai-ws-cabin-sandbox', gpuUsed: 21, gpuTotal: 24, cpuUsed: 240, cpuTotal: 384, memoryUsedGb: 1024, memoryTotalGb: 1536, userCount: 12, status: 'READY' }], total: 1, page: 1, pageSize: 1 };
const mockPaiStorage = { items: [{ storageId: 'oss-pai-workspace-cabin', name: 'PAI Workspace OSS', sourceType: 'PAI_WORKSPACE_STORAGE', capacityGb: 204800, usedGb: 145408, percent: 71, status: 'READY', diagnostic: 'workspace storage sandbox summary' }], total: 1, page: 1, pageSize: 1 };
const mockApiKeys = [{ id: 'AK-001', name: 'CI/CD 集成 Key', prefix: 'smp_live_abcd', maskedKey: 'smp_live_abcd********c91e', plainTextKey: null, scopeType: 'BU', scopeId: 'TENANT-CABIN', permissions: ['INFERENCE_READ'], status: 'ACTIVE', expiresAt: '2026-08-15T00:00:00Z', revokedAt: null, createdAt: '2026-05-17T00:00:00Z', lastUsedAt: null }];

vi.mock('./features/foundation/apiClient', () => ({
  apiClient: {
    get: vi.fn((url: string) => {
      if (url.includes('/api/v1/data-sources/') && url.includes('/test')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { sourceId: 'DSRC-CABIN-MINIO', result: 'SUCCESS', status: 'TESTED', diagnosticCode: 'OK', diagnosticMessage: 'SANDBOX connection verified', latencyMs: 42, traceId: 't', testedAt: '2026-05-18T00:00:00Z' } } });
      if (url.includes('/api/v1/annotation/review-items')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockAnnotationReviewItems } });
      if (url.includes('/api/v1/annotation/overview')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockAnnotationOverview } });
      if (url.includes('/api/v1/annotation/source-datasets')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockAnnotationSourceDatasets } });
      if (url.includes('/api/v1/annotation/tasks/') && url.includes('/work-items')) {
        const items = url.includes('/api/v1/annotation/tasks/ANN-WELD-SEG') ? mockSegmentationWorkItems : mockAnnotationWorkItems;
        return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { items, total: items.length, page: 1, pageSize: 50 } } });
      }
      if (url.includes('/api/v1/annotation/tasks/') && url.includes('/label-studio/status')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockAnnotationBinding } });
      if (url.includes('/api/v1/annotation/tasks/ANN-WELD-SEG')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockSegmentationAnnotationDetail } });
      if (url.includes('/api/v1/annotation/tasks/')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockAnnotationDetail } });
      if (url.includes('/api/v1/annotation/tasks')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { items: [mockAssignedAnnotationTask, mockAnnotationTask], total: 2, page: 1, pageSize: 20 } } });
      if (url.includes('/api/v1/annotation/tags')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: [{ tagId: 'ATAG-CRACK', name: '裂纹', color: '#E02020', description: '独立标签', status: 'ACTIVE', tenantId: 'TENANT-CABIN', createdBy: 'USR-001', updatedAt: '2026-05-26T00:00:00Z' }, { tagId: 'ATAG-PORE', name: '气孔', color: '#F59E0B', description: '独立标签', status: 'ACTIVE', tenantId: 'TENANT-CABIN', createdBy: 'USR-001', updatedAt: '2026-05-26T00:00:00Z' }] } });
      if (url.includes('/api/v1/annotation/label-templates')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: [mockAnnotationTemplate, mockSegmentationTemplate] } });
      if (url.includes('/api/v1/data-sources')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockDataSources } });
      if (url.includes('/api/v1/data-source-sync-tasks')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockSyncTasks } });
      if (url.includes('/api/v1/dataset-access-requests')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockAccessRequests } });
      if (url.includes('/api/v1/datasets/') && url.includes('/annotation-candidates')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockDatasetAnnotationCandidate } });
      if (url.includes('/api/v1/datasets/') && url.includes('/annotation-tasks')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockDatasetAnnotationTasks } });
      if (url.includes('/api/v1/datasets/') && url.includes('/lineage')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockDatasetDetail.lineage } });
      if (url.includes('/api/v1/datasets/')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockDatasetDetail } });
      if (url.includes('/api/v1/datasets')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockDatasets } });
      if (url.includes('/api/v1/dataset-references')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { datasetId: 'DATASET-WELD-DEFECT', versionId: 'DVER-WELD-001', status: 'PUBLISHED', usable: true, diagnosticCode: 'OK', diagnosticMessage: 'usable' } } });
      if (url.includes('/auth/me')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockState.user } });
      if (url.includes('/platform/users')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { items: mockUsers, total: 1, page: 1, pageSize: 1 } } });
      if (url.includes('/platform/roles')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockRoles } });
      if (url.includes('/platform/permissions/matrix')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockMatrix } });
      if (url.includes('/platform/organizations/tree')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockOrganizations } });
      if (url.includes('/platform/organizations/members')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockMembers } });
      if (url.includes('/platform/configs')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockConfigs } });
      if (url.includes('/platform/files')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockFiles } });
      if (url.includes('/platform/notification-channels')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockChannels } });
      if (url.includes('/platform/pai-resources/sync')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { syncId: 'PAI-SYNC-UNIT', bindingId: 'PAI-BIND-CABIN', result: 'FAILED', status: 'UNCONFIGURED', diagnosticCode: 'PAI_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_PAI_REGION', lastSyncAt: '2026-05-17T00:00:00Z', stale: true, paiRequestId: 'TODO_CONFIRM_PAI_REQUEST_ID_OR_SANDBOX' } } });
      if (url.includes('/platform/api-keys')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockApiKeys } });
      if (url.includes('/platform/pai-resources/status')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiStatus } });
      if (url.includes('/platform/pai-resources/overview')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiOverview } });
      if (url.includes('/platform/pai-resources/workspaces')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiWorkspaces } });
      if (url.includes('/platform/pai-resources/nodes')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiNodes } });
      if (url.includes('/platform/pai-resources/pools')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiPools } });
      if (url.includes('/platform/pai-resources/storage')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiStorage } });
      if (url.includes('/platform/audit-logs')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { items: [mockAuditLog], total: 1, page: 1, pageSize: 1 } } });
      return Promise.reject(new Error('backend not running in frontend unit test'));
    }),
    put: vi.fn((url: string) => {
      if (url.includes('/api/v1/dataset-access-requests/') && url.includes('/approve')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { grantId: 'DAG-001', datasetId: 'DATASET-WELD-DEFECT', versionId: 'DVER-WELD-001', userId: 'USR-ANNOTATOR', userName: '数据标注员', grantedBy: 'USR-001', expiresAt: '2026-06-20T00:00:00Z', status: 'ACTIVE' } } });
      if (url.includes('/api/v1/dataset-access-requests/') && url.includes('/reject')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { ...mockAccessRequests[0], status: 'REJECTED' } } });
      if (url.includes('/platform/users/') && url.endsWith('/roles')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: {} } });
      if (url.includes('/platform/users/')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { ...mockUsers[0], displayName: '平台管理员-已编辑', email: 'admin-edited@yf.local' } } });
      if (url.includes('/platform/roles/') && url.endsWith('/permissions')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { code: 'CABIN_DATA_MANAGER', name: '座舱数据管理员', description: 'BU 权限角色', scope: 'TENANT', preset: false, parentRoleCode: 'BU_ADMIN', userCount: 0 } } });
      if (url.includes('/platform/pai-resources/bindings')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockPaiWorkspaces.items[0] } });
      if (url.includes('/platform/pai-resources/connection')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { ...mockPaiStatus, status: 'READY', configured: true, enabled: true, regionId: 'cn-shanghai', diagnosticCode: 'OK', diagnosticMessage: 'ready for test' } } });
      return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockConfigs[0] } });
    }),
    patch: vi.fn(() => Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockOrganizations.nodes[0] } })),
    post: vi.fn((url: string) => {
      if (url.includes('/auth/login')) {
        mockState.token = 'token-f006';
        mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource', 'menu:datasrc', 'menu:ds', 'menu:portal', 'menu:lineage', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt'], menuPermissions: ['dash', 'usermgmt', 'perm', 'org', 'sys', 'resource', 'datasrc', 'ds', 'portal', 'lineage', 'ann', 'annwork', 'annreview', 'tagmgmt'], sessionVersion: 1 };
        return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { accessToken: 'token-f006', refreshToken: 'refresh', tokenType: 'Bearer', expiresInSeconds: 3600, user: mockState.user } } });
      }
      if (url.includes('/auth/refresh')) {
        mockState.token = 'token-refreshed';
        mockState.user = mockState.user ?? { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt'], menuPermissions: ['dash', 'usermgmt'], sessionVersion: 1 };
        return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { accessToken: 'token-refreshed', refreshToken: 'refresh-new', tokenType: 'Bearer', expiresInSeconds: 3600, user: mockState.user } } });
      }
      if (url.includes('/auth/logout')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: null } });
      if (url.includes('/platform/users/') && url.endsWith('/unlock')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: {} } });
      if (url.includes('/api/v1/datasets/') && url.includes('/access-requests')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { ...mockAccessRequests[0], requestId: 'DAR-NEW' } } });
      if (url.includes('/platform/roles')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { code: 'CABIN_DATA_MANAGER', name: '座舱数据管理员', description: 'BU 权限角色', scope: 'TENANT', preset: false, parentRoleCode: 'BU_ADMIN', userCount: 0 } } });
      if (url.includes('/platform/users')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { ...mockUsers[0], id: 'USR-NEW' } } });
      if (url.includes('/api/v1/annotation/tasks/') && url.includes('/quality-check')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockAnnotationPublication } });
      if (url.includes('/api/v1/annotation/tasks/') && url.includes('/publish-dataset')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockAnnotationPublication } });
      if (url.includes('/api/v1/annotation/tasks/') && url.includes('/label-studio')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockAnnotationBinding } });
      if (url.includes('/api/v1/annotation/tasks/') && url.endsWith('/start')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { ...mockAssignedAnnotationTask, status: 'IN_PROGRESS' } } });
      if (url.includes('/api/v1/annotation/tasks')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockAnnotationDetail } });
      if (url.includes('/api/v1/annotation/work-items/') && url.includes('/label-studio')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockAnnotationBinding } });
      if (url.includes('/api/v1/annotation/work-items/')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { ...mockAnnotationWorkItems[0], status: 'REVIEW_PENDING', annotationJson: '{"boxes":[{"label":"缺陷"}]}' } } });
      if (url.includes('/api/v1/annotation/review-items/') && url.includes('/approve')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { ...mockAnnotationReviewItems[0], status: 'APPROVED', reviewedAt: '2026-05-19T00:00:00Z' } } });
      if (url.includes('/api/v1/annotation/review-items/') && url.includes('/reject')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { ...mockAnnotationReviewItems[0], status: 'REJECTED', reviewComment: '需要补充' } } });
      if (url.includes('/api/v1/annotation/label-templates/') && url.includes('/publish')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockAnnotationTemplate } });
      if (url.includes('/api/v1/annotation/label-templates')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { ...mockAnnotationTemplate, templateId: 'LT-NEW' } } });
      if (url.includes('/api/v1/annotation/tags')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { tagId: 'ATAG-NEW', name: '独立存在标签', color: '#1677ff', description: '新增', status: 'ACTIVE', tenantId: 'TENANT-CABIN', createdBy: 'USR-001', updatedAt: '2026-05-26T00:00:00Z' } } });
      if (url.includes('/platform/files/init')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockUploadFile } });
      if (url.includes('/platform/files/') && url.includes('/content')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockUploadFile } });
      if (url.includes('/platform/files/') && url.includes('/complete')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockUploadedFile } });
      if (url.includes('/api/v1/datasets/') && url.includes('/versions/') && url.includes('/files')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockDatasetDetail.files[0] } });
      if (url.includes('/platform/pai-resources/sync')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { syncId: 'PAI-SYNC-UNIT', bindingId: 'PAI-BIND-CABIN', result: 'FAILED', status: 'UNCONFIGURED', diagnosticCode: 'PAI_UNCONFIGURED', diagnosticMessage: 'TODO_CONFIRM_PAI_REGION', lastSyncAt: '2026-05-17T00:00:00Z', stale: true, paiRequestId: 'TODO_CONFIRM_PAI_REQUEST_ID_OR_SANDBOX' } } });
      if (url.includes('/platform/api-keys')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { ...mockApiKeys[0], id: 'AK-NEW', plainTextKey: 'smp_live_new_plaintext_once' } } });
      if (url.includes('/platform/notification-channels')) return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: { channelId: 'NC-GLOBAL-EMAIL', result: 'UNCONFIGURED', diagnostic: 'TODO_CONFIRM_SMTP_HOST', testedAt: '2026-05-17T00:00:00Z' } } });
      return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: {} } });
    }),
    interceptors: { request: { use: vi.fn() } },
  },
}));

function renderApp(initialEntries = ['/login']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function seedWorkbenchSession() {
  mockState.token = 'token-f014';
  mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt', 'menu:ds', 'data:annotation:read', 'data:annotation:write', 'data:annotation:submit', 'data:annotation:review', 'data:annotation:publish'], menuPermissions: ['dash', 'ann', 'annwork', 'annreview', 'tagmgmt', 'ds'], sessionVersion: 1 };
  useSessionStore.setState({ token: 'token-f014', user: mockState.user, initialized: true });
}

describe('F006 platform identity frontend', () => {
  // TASK-platform-organization-config AC-08
  beforeEach(() => {
    // TASK-platform-identity-audit AC-01 AC-08 AC-09
    mockState.token = null;
    mockState.user = null;
    window.localStorage.clear();
    useSessionStore.setState({ token: null, user: null, initialized: false });
    useLocaleStore.setState({ language: 'zh-CN' });
    document.documentElement.lang = 'zh-CN';
  });

  it('restores session from localStorage after page refresh', async () => {
    mockState.token = 'token-f006';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm'], menuPermissions: ['dash', 'usermgmt', 'perm'], sessionVersion: 1 };
    window.localStorage.setItem('smp.session.v1', JSON.stringify({ accessToken: 'token-f006', refreshToken: 'refresh', expiresAt: Date.now() + 3600_000 }));

    renderApp(['/usermgmt']);

    expect(await screen.findByText('SMP 工业 AI 小模型平台')).toBeInTheDocument();
    expect(await screen.findByText(/平台管理员.*延锋汽车内饰系统/)).toBeInTheDocument();
    expect(screen.queryByText('账号登录')).not.toBeInTheDocument();
  });

  it('refreshes an expiring stored session before rendering protected pages', async () => {
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt'], menuPermissions: ['dash', 'usermgmt'], sessionVersion: 1 };
    window.localStorage.setItem('smp.session.v1', JSON.stringify({ accessToken: 'token-expiring', refreshToken: 'refresh', expiresAt: Date.now() + 1000 }));

    renderApp(['/usermgmt']);

    expect(await screen.findByText('SMP 工业 AI 小模型平台')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('smp.session.v1') ?? '{}').accessToken).toBe('token-refreshed');
    expect(screen.queryByText('账号登录')).not.toBeInTheDocument();
  });


  it('shows avatar menu, can switch language and logout', async () => {
    mockState.token = 'token-f006';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm'], menuPermissions: ['dash', 'usermgmt', 'perm'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f006', user: mockState.user, initialized: true });

    const user = userEvent.setup();
    renderApp(['/usermgmt']);

    expect(await screen.findByText('SMP 工业 AI 小模型平台')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'user-menu' }));
    expect(await screen.findByText('切换语言')).toBeInTheDocument();
    await user.click(screen.getByText('English'));
    expect(await screen.findByText('SMP Industrial AI Platform')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'user-menu' }));
    await user.click(await screen.findByText('Sign out'));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument());
    expect(useSessionStore.getState().token).toBeNull();
  });

  it('renders navigation-consistent login and navigates after API login', async () => {
    renderApp(['/login']);

    expect(screen.getByText('⚙ SMP')).toBeInTheDocument();
    expect(screen.getByText('工业 AI 平台')).toBeInTheDocument();
    expect(screen.getByText('账号登录')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('密码'), 'Smp@123456');
    await userEvent.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => expect(screen.getByText('YFI SMP')).toBeInTheDocument());
    expect(await screen.findByText('用户管理')).toBeInTheDocument();
    expect(await screen.findByText('权限管理')).toBeInTheDocument();
  });

  it('keeps usermgmt tabs, table, role cards and permission matrix API-driven', async () => {
    mockState.token = 'token-f006';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource', 'menu:datasrc', 'menu:ds', 'menu:portal', 'menu:lineage', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt'], menuPermissions: ['dash', 'usermgmt', 'perm', 'org', 'sys', 'resource', 'datasrc', 'ds', 'portal', 'lineage', 'ann', 'annwork', 'annreview', 'tagmgmt'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f006', user: mockState.user, initialized: true });
    renderApp(['/usermgmt']);

    expect(await screen.findByText('账号管理 · 角色分配 · GPU 用量统计')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '用户列表' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '角色管理' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '权限矩阵' })).toBeInTheDocument();
    expect(await screen.findByText('平台管理员')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: '角色管理' }));
    expect((await screen.findAllByText('SUPER_ADMIN')).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('tab', { name: '权限矩阵' }));
    expect(await screen.findByText('查询用户')).toBeInTheDocument();
    const cabinCreateCheckboxes = await screen.findAllByLabelText('座舱数据管理员-platform:user:create');
    expect(cabinCreateCheckboxes.length).toBeGreaterThan(0);
    await userEvent.click(cabinCreateCheckboxes[0]);
  });

  it('allows editing users and creating roles so BU permissions stay role-driven', async () => {
    mockState.token = 'token-f006';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm'], menuPermissions: ['dash', 'usermgmt', 'perm'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f006', user: mockState.user, initialized: true });
    renderApp(['/usermgmt']);

    expect(await screen.findByText('平台管理员')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    expect(await screen.findByText('BU 权限跟随角色权限矩阵生效，不在用户资料中直接维护。')).toBeInTheDocument();
    expect(screen.getByLabelText('临时授权到期时间')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('姓名'));
    await userEvent.type(screen.getByLabelText('姓名'), '平台管理员-已编辑');
    await userEvent.click(screen.getByRole('button', { name: '保存用户与角色' }));

    await userEvent.click(screen.getByRole('tab', { name: '角色管理' }));
    expect(await screen.findByText('角色管理是 BU 权限的归属入口')).toBeInTheDocument();
    await userEvent.click((await screen.findAllByRole('button', { name: '查看权限' }))[0]);
    expect(await screen.findByText('查看角色权限：超级管理员')).toBeInTheDocument();
    expect(screen.getByText('预设角色权限仅支持查看，不可在页面直接修改。')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '关闭' }));
    await userEvent.click((await screen.findAllByRole('button', { name: /新增角色/ })).at(-1)!);
    expect((await screen.findAllByText('新增角色')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('父角色权限上限')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('角色编码'), 'CABIN_DATA_MANAGER');
    await userEvent.type(screen.getByLabelText('角色名称'), '座舱数据管理员');
    await userEvent.click(screen.getByRole('button', { name: '创建角色并写入权限矩阵' }));
    expect((await screen.findAllByText('座舱数据管理员')).length).toBeGreaterThan(0);
    await userEvent.click((await screen.findAllByRole('button', { name: '编辑权限' }))[0]);
    expect(await screen.findByText('编辑角色权限：座舱数据管理员')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '保存角色权限' }));
  }, 15000);

  it('keeps perm page title, tabs, request and approval workflow API-driven', async () => {
    mockState.token = 'token-f006';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource', 'menu:datasrc', 'menu:ds', 'menu:portal', 'menu:lineage', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt'], menuPermissions: ['dash', 'usermgmt', 'perm', 'org', 'sys', 'resource', 'datasrc', 'ds', 'portal', 'lineage', 'ann', 'annwork', 'annreview', 'tagmgmt'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f006', user: mockState.user, initialized: true });
    renderApp(['/perm']);

    expect(await screen.findByText('RBAC 角色权限矩阵 · 6 个预设角色')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '当前权限概览' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '权限申请' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '审批工作台' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '申请历史' })).toBeInTheDocument();
    expect(await screen.findByText('角色权限维护')).toBeInTheDocument();
    expect((await screen.findAllByText('座舱数据管理员')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('座舱标注协调员')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Ã|Â|�/)).not.toBeInTheDocument();
    await userEvent.click((await screen.findAllByRole('button', { name: '查看权限' }))[0]);
    expect(await screen.findByText('查看角色权限：超级管理员')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '关闭' }));
    const permCabinCreateCheckboxes = await screen.findAllByLabelText('座舱数据管理员-platform:user:create');
    expect(permCabinCreateCheckboxes.length).toBeGreaterThan(0);
    await userEvent.click(permCabinCreateCheckboxes[0]);
    await userEvent.click((await screen.findAllByRole('button', { name: '编辑权限' }))[0]);
    expect(await screen.findByText('编辑角色权限：座舱数据管理员')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '保存角色权限' }));
    await userEvent.click(screen.getByRole('tab', { name: '权限申请' }));
    expect(await screen.findByText('提交数据集访问申请')).toBeInTheDocument();
    expect(await screen.findByText('焊缝缺陷检测数据集')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '提交申请' }));
    expect(await screen.findByText('申请数据集')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('tab', { name: '审批工作台' }));
    expect((await screen.findAllByText('训练焊缝缺陷模型')).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /审\s*批/ }));
    expect(await screen.findByText('审批数据集访问申请')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /批\s*准/ }));
    expect((await screen.findAllByText('待审批')).length).toBeGreaterThan(0);
  });

  it('renders org page with module tabs and real organization APIs', async () => {
    mockState.token = 'token-f007';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource', 'menu:datasrc', 'menu:ds', 'menu:portal', 'menu:lineage', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt'], menuPermissions: ['dash', 'usermgmt', 'perm', 'org', 'sys', 'resource', 'datasrc', 'ds', 'portal', 'lineage', 'ann', 'annwork', 'annreview', 'tagmgmt'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f007', user: mockState.user, initialized: true });
    renderApp(['/org']);

    expect(await screen.findByText('花叔工业智能 · 组织架构管理')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '组织架构' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '部门管理' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '成员管理' })).toBeInTheDocument();
    expect((await screen.findAllByText('智能座舱事业部')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '＋ 新建租户' })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: '编辑配额' })[0]);
    expect((await screen.findAllByText(/编辑配额/)).length).toBeGreaterThan(0);
    await userEvent.keyboard('{Escape}');
    await userEvent.click((await screen.findAllByRole('button', { name: '权限跳转' }))[0]);
    expect(await screen.findByRole('heading', { name: '权限管理' })).toBeInTheDocument();
  });



  it('keeps all module menus visible for super admin even when session lacks new menu grants', async () => {
    mockState.token = 'token-super-admin-menu-fallback';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash'], menuPermissions: ['dash'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-super-admin-menu-fallback', user: mockState.user, initialized: true });
    renderApp(['/dash']);

    expect(await screen.findByRole('menuitem', { name: /标签管理/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /算子广场/ })).toBeInTheDocument();
  });

  it('renders tag management as first-class data menu and page', async () => {
    mockState.token = 'token-tagmgmt';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:tagmgmt', 'menu:ds'], menuPermissions: ['dash', 'tagmgmt', 'ds'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-tagmgmt', user: mockState.user, initialized: true });
    renderApp(['/tagmgmt']);

    expect(await screen.findByRole('heading', { name: '标签字典' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /标签管理/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '独立标签目录' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '数据集标签' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '标注标签模板' })).toBeInTheDocument();
  });

  it('renders sys page with config, notification and one-time API key paths', async () => {
    mockState.token = 'token-f007';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource', 'menu:datasrc', 'menu:ds', 'menu:portal', 'menu:lineage', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt'], menuPermissions: ['dash', 'usermgmt', 'perm', 'org', 'sys', 'resource', 'datasrc', 'ds', 'portal', 'lineage', 'ann', 'annwork', 'annreview', 'tagmgmt'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f007', user: mockState.user, initialized: true });
    renderApp(['/sys']);

    expect(await screen.findByText('基础设置 · 存储配置 · 通知设置 · API 密钥 · 数据安全 · 认证集成 · 标签管理')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '基础设置' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '通知设置' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'API 密钥' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: '通知设置' }));
    expect(await screen.findByText('host=通知渠道待配置;sender=通知渠道待配置')).toBeInTheDocument();
    expect(screen.getByText('UNCONFIGURED')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'API 密钥' }));
    expect(await screen.findByText('CI/CD 集成 Key')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '＋ 新建 API Key' }));
    expect(await screen.findByText('新建 API Key')).toBeInTheDocument();
  });

  it('renders resource page with PAI unconfigured guidance and module tabs', async () => {
    // TASK-pai-resource-integration AC-01 AC-02 AC-05 AC-06
    mockState.token = 'token-f008';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:usermgmt', 'menu:perm', 'menu:org', 'menu:sys', 'menu:resource', 'menu:datasrc', 'menu:ds', 'menu:portal', 'menu:lineage', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt'], menuPermissions: ['dash', 'usermgmt', 'perm', 'org', 'sys', 'resource', 'datasrc', 'ds', 'portal', 'lineage', 'ann', 'annwork', 'annreview', 'tagmgmt'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f008', user: mockState.user, initialized: true });
    renderApp(['/resource']);

    expect(await screen.findByRole('heading', { name: '资源管理' })).toBeInTheDocument();
    expect(screen.getByText(/阿里云 PAI Workspace/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '集群总览' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'GPU 节点' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '资源池' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '存储' })).toBeInTheDocument();
    expect(await screen.findByText('PAI 连接尚未配置')).toBeInTheDocument();
    expect(screen.getAllByText(/待配置/).length).toBeGreaterThan(0);
    expect(screen.getByText('GPU 总量')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '手动同步 PAI' }));
    expect(await screen.findByText(/PAI 同步返回 UNCONFIGURED/)).toBeInTheDocument();
  });


  it('renders F012 annotation task, workbench and review pages from APIs', async () => {
    // TASK-annotation-integration AC-01 AC-02 AC-03 AC-04 AC-05 AC-06 AC-07
    mockState.token = 'token-f012';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt', 'menu:ds', 'data:annotation:read', 'data:annotation:write', 'data:annotation:submit', 'data:annotation:review', 'data:annotation:publish'], menuPermissions: ['dash', 'ann', 'annwork', 'annreview', 'tagmgmt', 'ds'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f012', user: mockState.user, initialized: true });
    const renderRoute = (initialEntries: string[]) => (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={initialEntries}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const { unmount } = renderApp(['/ann']);
    expect(await screen.findByRole('heading', { name: '标注任务管理' })).toBeInTheDocument();
    expect(await screen.findByText('焊缝缺陷检测标注任务')).toBeInTheDocument();
    expect(await screen.findByText(/外部标注工具 \/ Label Studio/)).toBeInTheDocument();
    unmount();

    const workbench = render(renderRoute(['/annwork']));
    expect(await screen.findByRole('heading', { name: '标注工作台' })).toBeInTheDocument();
    expect(screen.getByText('样本队列')).toBeInTheDocument();
    expect(await screen.findByText('weld/0001.jpg')).toBeInTheDocument();
    workbench.unmount();

    render(renderRoute(['/annreview']));
    expect(await screen.findByRole('heading', { name: '标注审核' })).toBeInTheDocument();
    expect(screen.getByText(/DAT-004/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '质量检查' })).toBeInTheDocument();
  });

  it('allows entering annotation workbench from dataset detail existing tasks', async () => {
    mockState.token = 'token-f014';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt', 'menu:ds', 'data:annotation:read', 'data:annotation:write', 'data:annotation:submit', 'data:annotation:review', 'data:annotation:publish'], menuPermissions: ['dash', 'ann', 'annwork', 'annreview', 'tagmgmt', 'ds'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f014', user: mockState.user, initialized: true });

    renderApp(['/dsdetail']);

    expect(await screen.findByRole('heading', { name: '焊缝缺陷检测数据集' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: '标注任务/训练导出' }));
    const enterButtons = await screen.findAllByRole('button', { name: '进入标注' });
    expect(enterButtons.length).toBeGreaterThan(0);

    await userEvent.click(enterButtons[0]);

    expect(await screen.findByRole('heading', { name: '标注工作台' })).toBeInTheDocument();
    expect(await screen.findByText('焊缝缺陷检测标注任务')).toBeInTheDocument();
    expect(await screen.findByText('样本队列')).toBeInTheDocument();
  });

  it('filters dataset detail templates by selected annotation scene', async () => {
    mockState.token = 'token-f014';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt', 'menu:ds', 'data:annotation:read', 'data:annotation:write', 'data:annotation:submit', 'data:annotation:review', 'data:annotation:publish'], menuPermissions: ['dash', 'ann', 'annwork', 'annreview', 'tagmgmt', 'ds'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f014', user: mockState.user, initialized: true });

    renderApp(['/dsdetail']);

    expect(await screen.findByRole('heading', { name: '焊缝缺陷检测数据集' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '创建标注任务' }));

    const sceneSelect = screen.getByLabelText('标注场景', { selector: 'input' });
    await userEvent.click(sceneSelect);
    await userEvent.click(await screen.findByText('图片分割'));

    await userEvent.click(screen.getByLabelText('标签来源'));
    await userEvent.click((await screen.findAllByText('选择已发布模板'))[0]);
    const templateSelect = await screen.findByLabelText('标签模板');
    await userEvent.click(templateSelect);

    expect((await screen.findAllByText('焊缝图片分割模板')).length).toBeGreaterThan(0);
    expect(screen.queryByText('焊缝图片打标模板')).not.toBeInTheDocument();
  }, 15000);

  it('defaults annotation task creation to inline labels on dataset detail page', async () => {
    mockState.token = 'token-f014';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt', 'menu:ds', 'data:annotation:read', 'data:annotation:write', 'data:annotation:submit', 'data:annotation:review', 'data:annotation:publish'], menuPermissions: ['dash', 'ann', 'annwork', 'annreview', 'tagmgmt', 'ds'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f014', user: mockState.user, initialized: true });

    renderApp(['/dsdetail']);

    expect(await screen.findByRole('heading', { name: '焊缝缺陷检测数据集' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '创建标注任务' }));

    expect(await screen.findByText('选择标签并自动建模板')).toBeInTheDocument();
    expect(screen.getByLabelText('选择标签')).toBeInTheDocument();
    expect(screen.getByLabelText('补充标签')).toBeInTheDocument();
  }, 15000);

  it('requires explicit dataset selection when creating annotation task from annotation page', async () => {
    mockState.token = 'token-f014';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt', 'menu:ds', 'data:annotation:read', 'data:annotation:write', 'data:annotation:submit', 'data:annotation:review', 'data:annotation:publish'], menuPermissions: ['dash', 'ann', 'annwork', 'annreview', 'tagmgmt', 'ds'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f014', user: mockState.user, initialized: true });

    renderApp(['/ann']);

    expect(await screen.findByRole('heading', { name: '标注任务管理' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '＋ 新建标注任务' }));

    expect(await screen.findByText('数据集范围说明')).toBeInTheDocument();
    const createButton = screen.getByRole('button', { name: '创建任务' });
    expect(createButton).toBeEnabled();
    expect(screen.getByText('选择标签并自动建模板')).toBeInTheDocument();
    expect(screen.getByLabelText('选择标签')).toBeInTheDocument();
    expect(screen.getByLabelText('补充标签')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('源数据集（仅 ACTIVE 且可标注图片数据集）'));
    expect((await screen.findAllByText(/焊缝缺陷检测数据集（DATASET-WELD-DEFECT）/)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/焊缝分割训练数据集（DATASET-WELD-MASK）/)).length).toBeGreaterThan(0);
    await userEvent.click((await screen.findAllByText(/焊缝分割训练数据集（DATASET-WELD-MASK）/))[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue('DVER-WELD-MASK-003')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('标签来源'));
    await userEvent.click((await screen.findAllByText('选择已发布模板'))[0]);
    await userEvent.click(screen.getByLabelText('标签模板（按场景过滤，必须 PUBLISHED）'));
    expect((await screen.findAllByText('焊缝图片打标模板 · IMAGE_TAGGING')).length).toBeGreaterThan(0);
    await userEvent.click((await screen.findAllByText('焊缝图片打标模板 · IMAGE_TAGGING'))[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '创建任务' })).toBeEnabled();
    });
  });

  it('uses authenticated blob preview instead of unauthorized direct file url in workbench', async () => {
    mockState.token = 'token-f014';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt', 'menu:ds', 'data:annotation:read', 'data:annotation:write', 'data:annotation:submit', 'data:annotation:review', 'data:annotation:publish'], menuPermissions: ['dash', 'ann', 'annwork', 'annreview', 'tagmgmt', 'ds'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f014', user: mockState.user, initialized: true });

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['image-bytes'], { type: 'image/jpeg' }) });
    const originalFetch = globalThis.fetch;
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-image');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      renderApp(['/annwork']);

      expect(await screen.findByRole('heading', { name: '标注工作台' })).toBeInTheDocument();
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/platform/files/FILE-DATASET-WELD-001/content', expect.objectContaining({ headers: { Authorization: 'Bearer token-f014' } }));
      expect(createObjectUrl).toHaveBeenCalled();
      expect(screen.getByTestId('annotation-sample-caption')).toHaveTextContent('weld/0001.jpg');
    } finally {
      globalThis.fetch = originalFetch;
      createObjectUrl.mockRestore();
      revokeObjectUrl.mockRestore();
    }
  });

  it('normalizes legacy array work-item payloads in annotation workbench', async () => {
    seedWorkbenchSession();

    const getMock = vi.mocked((await import('./features/foundation/apiClient')).apiClient.get);
    type MockApiGet = (url: string, ...args: unknown[]) => Promise<{ data: ApiResponse<unknown> }>;
    const originalImpl = getMock.getMockImplementation() as MockApiGet | undefined;
    getMock.mockImplementation((url: string, ...args: unknown[]) => {
      if (url.includes('/api/v1/annotation/tasks/') && url.includes('/work-items')) {
        return Promise.resolve({ data: { code: 0, message: 'success', traceId: 't', timestamp: '', data: mockAnnotationWorkItems } });
      }
      return originalImpl ? originalImpl(url, ...args) : Promise.reject(new Error('missing mock implementation'));
    });

    try {
      renderApp(['/annwork']);

      expect(await screen.findByRole('heading', { name: '标注工作台' })).toBeInTheDocument();
      expect(await screen.findByText('weld/0001.jpg')).toBeInTheDocument();
      expect(screen.getByText('样本队列')).toBeInTheDocument();
    } finally {
      if (originalImpl) getMock.mockImplementation(originalImpl);
    }
  });

  it('allows entering annotation workbench from annotation task list', async () => {
    seedWorkbenchSession();

    renderApp(['/ann']);

    expect(await screen.findByRole('heading', { name: '标注任务管理' })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: '进入标注' }));

    expect(await screen.findByRole('heading', { name: '标注工作台' })).toBeInTheDocument();
    expect(await screen.findByText('样本队列')).toBeInTheDocument();
    expect(await screen.findByText('焊缝缺陷检测标注任务')).toBeInTheDocument();
  });

  it('auto starts assigned annotation task before entering workbench', async () => {
    seedWorkbenchSession();
    const { apiClient } = await import('./features/foundation/apiClient');
    const postMock = vi.mocked(apiClient.post);
    postMock.mockClear();

    renderApp(['/ann']);

    expect(await screen.findByRole('heading', { name: '标注任务管理' })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: '开始并进入标注' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/v1/annotation/tasks/ANN-WELD-ASSIGNED/start');
    });
  });

  it('renders segmentation workbench as polygon regions instead of boxes', async () => {
    seedWorkbenchSession();

    renderApp([`/annwork?taskId=${mockSegmentationAnnotationTask.taskId}`]);

    expect(await screen.findByRole('heading', { name: '标注工作台' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '开始多边形 P' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '完成多边形 Enter' })).toBeDisabled();
    expect(await screen.findByText('当前分割区域属性')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /裂纹区域\s+1/ })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /气孔区域\s+2/ })).toBeInTheDocument();
    expect(await screen.findByTestId('annotation-polygon-count')).toHaveTextContent('1');
    expect(screen.getByTestId('annotation-current-label')).toHaveTextContent('裂纹区域');
    expect(screen.queryByTestId('annotation-box-count')).not.toBeInTheDocument();
  }, 15000);

  it('supports selecting and deleting a polygon vertex in segmentation workbench', async () => {
    seedWorkbenchSession();

    renderApp([`/annwork?taskId=${mockSegmentationAnnotationTask.taskId}`]);

    const vertex = await screen.findByTestId('annotation-polygon-vertex-poly-crack-001-0');
    await userEvent.click(vertex);

    expect(await screen.findByTestId('annotation-selected-polygon-point')).toHaveTextContent('#1');
    expect(await screen.findByTestId('annotation-polygon-point-count')).toHaveTextContent('5');

    await userEvent.click(screen.getByRole('button', { name: '删除顶点 Delete' }));

    expect(await screen.findByTestId('annotation-polygon-point-count')).toHaveTextContent('4');
    expect(await screen.findByTestId('annotation-selected-polygon-point')).toHaveTextContent('#1');
  });

  it('prevents deleting polygon vertex when only three points remain', async () => {
    seedWorkbenchSession();

    renderApp([`/annwork?taskId=${mockSegmentationAnnotationTask.taskId}`]);

    const deleteButton = await screen.findByRole('button', { name: '删除顶点 Delete' });
    await userEvent.click(await screen.findByTestId('annotation-polygon-vertex-poly-crack-001-0'));
    await userEvent.click(deleteButton);
    expect(await screen.findByTestId('annotation-polygon-point-count')).toHaveTextContent('4');

    await userEvent.click(await screen.findByTestId('annotation-polygon-vertex-poly-crack-001-0'));
    await userEvent.click(deleteButton);
    expect(await screen.findByTestId('annotation-polygon-point-count')).toHaveTextContent('3');

    await userEvent.click(await screen.findByTestId('annotation-polygon-vertex-poly-crack-001-0'));
    expect(deleteButton).not.toBeDisabled();
    await userEvent.click(deleteButton);

    expect(await screen.findByTestId('annotation-polygon-point-count')).toHaveTextContent('3');
  });

  it('supports adding a new vertex by double clicking a polygon edge in segmentation workbench', async () => {
    seedWorkbenchSession();

    renderApp([`/annwork?taskId=${mockSegmentationAnnotationTask.taskId}`]);

    expect(await screen.findByTestId('annotation-polygon-point-count')).toHaveTextContent('5');

    await userEvent.dblClick(await screen.findByTestId('annotation-polygon-edge-poly-crack-001-0'));

    expect(await screen.findByTestId('annotation-polygon-point-count')).toHaveTextContent('6');
    expect(await screen.findByTestId('annotation-selected-polygon-point')).toHaveTextContent('#2');
  });

  it('supports selecting and dragging a polygon edge in segmentation workbench', async () => {
    seedWorkbenchSession();

    renderApp([`/annwork?taskId=${mockSegmentationAnnotationTask.taskId}`]);

    const edge = await screen.findByTestId('annotation-polygon-edge-poly-crack-001-0');
    await userEvent.pointer([
      { target: edge, keys: '[MouseLeft>]' },
      { target: edge, coords: { clientX: 20, clientY: 18 } },
      { target: edge, keys: '[/MouseLeft]' },
    ]);

    expect(await screen.findByTestId('annotation-selected-polygon-edge')).toHaveTextContent('#1');
  }, 15000);

  it('supports workbench keyboard shortcuts for drawing, undo redo and deleting without mutating existing labels', async () => {
    seedWorkbenchSession();
    const user = userEvent.setup();

    renderApp(['/annwork']);

    expect(await screen.findByRole('heading', { name: '标注工作台' })).toBeInTheDocument();

    await user.keyboard('w');
    expect(await screen.findByTestId('annotation-box-count')).toHaveTextContent('1');
    expect(screen.getByTestId('annotation-current-shape')).toHaveTextContent('矩形');
    expect(screen.getByTestId('annotation-current-label')).toHaveTextContent('焊接气孔');

    await user.keyboard('2');
    expect(screen.getByRole('button', { name: /裂纹\s+2/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('annotation-current-label')).toHaveTextContent('焊接气孔');

    await user.keyboard('e');
    expect(await screen.findByTestId('annotation-box-count')).toHaveTextContent('2');
    expect(screen.getByTestId('annotation-current-shape')).toHaveTextContent('椭圆');
    expect(screen.getByTestId('annotation-current-label')).toHaveTextContent('裂纹');

    await user.keyboard('{Control>}z{/Control}');
    expect(await screen.findByTestId('annotation-box-count')).toHaveTextContent('1');
    expect(screen.getByTestId('annotation-current-shape')).toHaveTextContent('矩形');
    expect(screen.getByTestId('annotation-current-label')).toHaveTextContent('焊接气孔');

    await user.keyboard('{Control>}y{/Control}');
    expect(await screen.findByTestId('annotation-box-count')).toHaveTextContent('2');
    expect(screen.getByTestId('annotation-current-shape')).toHaveTextContent('椭圆');
    expect(screen.getByTestId('annotation-current-label')).toHaveTextContent('裂纹');

    await user.keyboard('p');
    expect(await screen.findByTestId('annotation-box-count')).toHaveTextContent('3');
    expect(screen.getByTestId('annotation-current-shape')).toHaveTextContent('多边形');
    expect(screen.getByTestId('annotation-current-label')).toHaveTextContent('裂纹');

    await user.keyboard('{Delete}');
    expect(await screen.findByTestId('annotation-box-count')).toHaveTextContent('2');

    await user.keyboard('p');
    expect(await screen.findByTestId('annotation-box-count')).toHaveTextContent('3');
    await user.keyboard('d');
    expect(await screen.findByTestId('annotation-box-count')).toHaveTextContent('2');
  }, 15000);

  it('finalizes segmentation polygon with Enter shortcut', async () => {
    seedWorkbenchSession();
    const user = userEvent.setup();

    renderApp([`/annwork?taskId=${mockSegmentationAnnotationTask.taskId}`]);

    expect(await screen.findByTestId('annotation-polygon-count')).toHaveTextContent('1');
    const drawLayer = screen.getByTestId('annotation-draw-layer');
    await user.pointer([
      { target: drawLayer, coords: { clientX: 80, clientY: 80 }, keys: '[MouseLeft]' },
      { target: drawLayer, coords: { clientX: 140, clientY: 84 }, keys: '[MouseLeft]' },
      { target: drawLayer, coords: { clientX: 128, clientY: 140 }, keys: '[MouseLeft]' },
    ]);

    await user.keyboard('{Enter}');

    expect(await screen.findByTestId('annotation-polygon-count')).toHaveTextContent('2');
    expect(screen.getByTestId('annotation-current-label')).toHaveTextContent('气孔区域');
  });

  it('loads segmentation labels from template instead of default detection labels', async () => {
    seedWorkbenchSession();
    const user = userEvent.setup();

    renderApp([`/annwork?taskId=${mockSegmentationAnnotationTask.taskId}`]);

    expect(await screen.findByRole('button', { name: /裂纹区域\s+1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /气孔区域\s+2/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /焊接气孔\s+1/ })).not.toBeInTheDocument();

    await user.keyboard('1');
    const drawLayer = screen.getByTestId('annotation-draw-layer');
    await user.pointer([
      { target: drawLayer, coords: { clientX: 84, clientY: 80 }, keys: '[MouseLeft]' },
      { target: drawLayer, coords: { clientX: 136, clientY: 88 }, keys: '[MouseLeft]' },
      { target: drawLayer, coords: { clientX: 126, clientY: 142 }, keys: '[MouseLeft]' },
    ]);
    await user.keyboard('{Enter}');

    expect(await screen.findByTestId('annotation-polygon-count')).toHaveTextContent('2');
    expect(screen.getByTestId('annotation-current-label')).toHaveTextContent('裂纹区域');
  });

  it('finalizes segmentation polygon by clicking the first point close target', async () => {
    seedWorkbenchSession();
    const user = userEvent.setup();

    renderApp([`/annwork?taskId=${mockSegmentationAnnotationTask.taskId}`]);

    expect(await screen.findByTestId('annotation-polygon-count')).toHaveTextContent('1');
    const drawLayer = screen.getByTestId('annotation-draw-layer');
    await user.pointer([
      { target: drawLayer, coords: { clientX: 92, clientY: 88 }, keys: '[MouseLeft]' },
      { target: drawLayer, coords: { clientX: 156, clientY: 90 }, keys: '[MouseLeft]' },
      { target: drawLayer, coords: { clientX: 138, clientY: 146 }, keys: '[MouseLeft]' },
    ]);

    expect(screen.getByTestId('annotation-draft-polygon-close-target')).toBeInTheDocument();
    await user.click(screen.getByTestId('annotation-draft-polygon-close-target'));

    expect(await screen.findByTestId('annotation-polygon-count')).toHaveTextContent('2');
    expect(screen.queryByTestId('annotation-draft-polygon')).not.toBeInTheDocument();
  });

  it('auto saves before navigating by Space ArrowLeft ArrowRight and thumbnail click', async () => {
    seedWorkbenchSession();
    const user = userEvent.setup();
    const { apiClient } = await import('./features/foundation/apiClient');
    const postMock = vi.mocked(apiClient.post);
    const originalItems = [...mockAnnotationWorkItems];
    const customItems = [
      { ...mockAnnotationWorkItems[0], workItemId: 'AWI-WELD-001', sampleKey: 'weld/0001.jpg', sampleFileId: null, status: 'DRAFT', annotationJson: null },
      { ...mockAnnotationWorkItems[0], workItemId: 'AWI-WELD-002', sampleKey: 'TENANT-CABIN/weld/batch3/0002.jpg', sampleFileId: null, status: 'DRAFT', annotationJson: null },
    ];
    mockAnnotationWorkItems.splice(0, mockAnnotationWorkItems.length, ...customItems);

    try {
      renderApp(['/annwork']);

      expect(await screen.findByRole('heading', { name: '标注工作台' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /weld\/0001\.jpg/i })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /TENANT-CABIN\/weld\/batch3\/0002\.jpg/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /weld\/0001\.jpg/i })).toHaveClass('active');

      postMock.mockClear();
      await user.keyboard('w');
      fireEvent.keyDown(window, { code: 'Space', key: ' ' });
      await waitFor(() => {
        expect(postMock).toHaveBeenCalledWith('/api/v1/annotation/work-items/AWI-WELD-001/draft', expect.objectContaining({ annotationJson: expect.any(String) }));
      });
      expect(screen.getByRole('button', { name: /TENANT-CABIN\/weld\/batch3\/0002\.jpg/i })).toHaveClass('active');

      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(screen.getByRole('button', { name: /weld\/0001\.jpg/i })).toHaveClass('active');

      postMock.mockClear();
      await user.keyboard('w');
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(postMock).toHaveBeenCalledWith('/api/v1/annotation/work-items/AWI-WELD-001/draft', expect.objectContaining({ annotationJson: expect.any(String) }));
      });
      expect(screen.getByRole('button', { name: /TENANT-CABIN\/weld\/batch3\/0002\.jpg/i })).toHaveClass('active');

      postMock.mockClear();
      await user.keyboard('w');
      await user.click(screen.getByRole('button', { name: /weld\/0001\.jpg/i }));
      await waitFor(() => {
        expect(postMock).toHaveBeenCalledWith('/api/v1/annotation/work-items/AWI-WELD-002/draft', expect.objectContaining({ annotationJson: expect.any(String) }));
      });
      expect(screen.getByRole('button', { name: /weld\/0001\.jpg/i })).toHaveClass('active');
    } finally {
      mockAnnotationWorkItems.splice(0, mockAnnotationWorkItems.length, ...originalItems);
    }
  });

  it('opens annotation task wizard with dataset preselected when jumping from dataset page', async () => {
    mockState.token = 'token-f014';
    mockState.user = { id: 'USR-001', username: 'admin', displayName: '平台管理员', tenantId: 'TENANT-YF', tenantName: '延锋汽车内饰系统', buCode: 'YF', status: 'ACTIVE', roles: ['SUPER_ADMIN'], roleNames: ['超级管理员'], permissions: ['menu:dash', 'menu:ann', 'menu:annwork', 'menu:annreview', 'menu:tagmgmt', 'menu:ds', 'data:annotation:read', 'data:annotation:write', 'data:annotation:submit', 'data:annotation:review', 'data:annotation:publish'], menuPermissions: ['dash', 'ann', 'annwork', 'annreview', 'tagmgmt', 'ds'], sessionVersion: 1 };
    useSessionStore.setState({ token: 'token-f014', user: mockState.user, initialized: true });

    renderApp(['/ds']);

    expect(await screen.findByRole('heading', { name: '数据集管理' })).toBeInTheDocument();
    expect(await screen.findByText('焊缝缺陷检测数据集')).toBeInTheDocument();
    await userEvent.click((await screen.findAllByText('创建标注任务'))[0]);

    expect(await screen.findByRole('heading', { name: '标注任务管理' })).toBeInTheDocument();
    expect(await screen.findByRole('dialog', { name: '＋ 新建标注任务' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/焊缝缺陷检测数据集（DATASET-WELD-DEFECT）/)).toBeInTheDocument();
      expect(screen.getByDisplayValue('DVER-WELD-001')).toBeInTheDocument();
      expect(screen.getByText('选择标签并自动建模板')).toBeInTheDocument();
      expect(screen.getByLabelText('选择标签')).toBeInTheDocument();
    });
  });

});
