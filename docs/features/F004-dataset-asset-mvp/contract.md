# Feature Contract: 数据资产 MVP

## Metadata
- Feature: F004-dataset-asset-mvp
- Version: v1
- Status: implemented
- Owner: contract-architect
- Created: 2026-05-04
- Updated: 2026-05-04

## Requirement Summary
- User goal: 为平台提供统一的数据资产中心，支持上传、版本、预览、申请审批与受控下载。
- Business value: 让后续标注、训练、模型与推理能力围绕统一数据集版本开展工作。

## Scope
### In Scope
- 数据集列表、搜索、筛选、详情。
- 本地上传、元数据登记、版本管理。
- 图片样例预览。
- 数据集级查看与版本级下载授权状态。
- 申请、审批、处理任务状态。

### Out of Scope
- 外部系统同步。
- 对象存储引用。
- 数据源连接测试。
- 非图片文件深度预览。

## Reuse & Compatibility
- Reuse upstream service / DTO / component / permission / SQL contracts:
  - 复用 `backend/` Spring Boot 单体与 `PermissionService` / `PlatformPermission`
  - 复用 `frontend/src/App.tsx` 现有数据资产模块入口与测试基座
  - 复用 `dataset:read`、`dataset:manage` 权限键
- New contract surface added only because existing contracts cannot be reused:
  - 当前无正式数据集、版本、文件、申请审批与处理任务契约，必须新增
- Compatibility / migration notes:
  - 首版以内存数据为主，不承诺数据库兼容迁移；SQL 仅记录设计说明

## API Contract

### Endpoint
- Method: GET
- Path: /api/datasets
- Description: 查询数据集列表，支持 `query` 与 `status` 筛选。

### Response
```json
{
  "items": [
    {
      "key": "motor-thermal",
      "name": "电机温升异常图像集",
      "owner": "算法组",
      "status": "ACTIVE",
      "sampleCount": 12840,
      "versionCount": 3,
      "previewType": "IMAGE",
      "canView": true,
      "canManage": true
    }
  ],
  "featureTrace": "TASK-dataset-asset-mvp"
}
```

### Endpoint
- Method: GET
- Path: /api/datasets/{datasetKey}
- Description: 查询数据集详情、版本、文件样例、申请与处理状态。

### Endpoint
- Method: POST
- Path: /api/datasets/upload
- Description: 创建数据集上传任务并生成新版本。

### Request
```json
{
  "datasetName": "电机温升异常图像集",
  "owner": "算法组",
  "tags": ["图片", "温升"],
  "files": [
    {
      "name": "sample-001.jpg",
      "contentType": "image/jpeg",
      "sizeBytes": 204800,
      "sha256": "sha256:sample-001"
    }
  ]
}
```

### Response
```json
{
  "datasetKey": "motor-thermal",
  "versionKey": "motor-thermal-v4",
  "dedupStrategy": "SKIP_DUPLICATE",
  "jobStatus": "QUEUED",
  "featureTrace": "TASK-dataset-asset-mvp"
}
```

### Endpoint
- Method: POST
- Path: /api/datasets/{datasetKey}/access-requests
- Description: 发起数据集访问申请。

### Endpoint
- Method: POST
- Path: /api/datasets/access-requests/{requestId}/approve
- Description: 审批通过申请并授予版本下载权限。

### Errors
| Code | Scenario | Message |
|------|----------|---------|
| 400 | Validation error | Invalid dataset upload request |
| 401 | Unauthorized | Unauthorized |
| 403 | Forbidden | Forbidden |
| 404 | Not found | Dataset or request not found |
| 500 | Internal error | Internal error |

## Notes
- 首版 contract 已以实际实现状态落地，后续若引入数据库或对象存储需更新版本。
