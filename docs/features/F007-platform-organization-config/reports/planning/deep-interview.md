> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-platform-organization-config.md`
> Interview transcript: `.omx/interviews/platform-organization-config-20260517T031653Z.md`

﻿# Deep Interview Spec: F007 platform-organization-config

## Metadata

- Feature: F007-platform-organization-config
- Slug: $slug
- Profile: standard
- Context type: brownfield
- Final ambiguity: 0.18
- Threshold: 0.20
- Context snapshot: $contextPath
- Interview transcript: $interviewPath

## Intent

在 F006 身份、权限与审计底座之上建立组织树、BU/项目隔离、系统配置、通知配置与文件元数据公共能力，为后续数据域、模型域、资源域提供统一的组织上下文、配置读取、文件对象 key 与审计基础，避免各业务 feature 重复实现租户/配置/文件元数据模型。

## Desired Outcome

F007 完成后，平台应支持：

1. org 页面真实接入集团/BU/项目组织树、租户列表、部门/成员管理、新建租户、添加成员、编辑配额、BU 个性化配置。
2. sys 页面真实接入基础设置、存储配置、通知设置、API Key、数据安全、认证集成、标签管理等系统配置分组；外部参数以 TODO_CONFIRM_* 表达。
3. 后端提供可复用的配置注册/版本/作用域覆盖服务和文件元数据/object key 服务。
4. 所有组织、配置、文件、通知测试、API Key 高危操作复用 F006 的认证、RBAC/ABAC、tenant/BU 边界和审计日志。

## In Scope

- 组织树：集团 CORP → BU → 项目三级结构，节点增删改查、唯一编码、父子关系、状态变更、删除前引用检查 seam。
- 租户/BU 配置：基础配置、配额上限、通知默认偏好、数据下载/上传安全开关、密码策略、门户展示配置等 scoped config。
- 组织成员：用户绑定 BU/项目、角色作用域、跨 BU 用户绑定与身份切换契约，复用 F006 用户/角色/权限。
- 系统配置：sys 页面分组配置、配置版本、配置校验、配置继承链、配置导出/读取 API。
- API Key 管理最小能力：创建、一次性展示、列表脱敏、撤销、有效期和审计；推理侧完整 API Key 调用鉴权留给 F019。
- 文件元数据：文件 ID、assetType、bucket/key、hash、size、contentType、storageTier、owner/tenant/project、状态、审计关联；对象 key 分配与上传完成登记。
- 通知配置测试：邮件/IM/Webhook 渠道配置校验、测试发送结果状态、失败诊断与审计；通知中心完整收件箱与运营统计不在本 feature。
- 前端：org 与 sys 两个页面按原型信息架构接入真实 API。

## Out-of-Scope / Non-goals

- F008 的集群、节点、GPU/NPU、资源池真实库存采集与调度配额执行。
- F009 的数据源连接测试、数据集上传向导与数据集版本业务状态机。
- F011 的数据资产门户访问申请/审批闭环。
- F016 的告警中心、报表中心、完整通知中心、运营看板。
- F017 的生产级可观测、安全扫描、审计冷存储、KMS/密钥托管落地。
- 真实 LDAP/SSO/SAML/OAuth2、SMTP、企业微信、钉钉、MinIO/S3/KMS 参数猜测。

## Decision Boundaries

- 可新增 organization、config、ile、
otification、pikey 等平台子模块，但必须位于 platform 领域下并复用 F006 的 Principal/permission/audit seam。
- 可扩展现有 platform_tenant，不得建立平行 organization_* 租户事实源。
- 可新增配置 schema/registry 和 version 表；配置值必须支持 scope：GLOBAL/BU/PROJECT。
- 可规划 API Key 本地哈希存储和一次性明文展示；外部网关/API Key 签名算法参数保留 TODO_CONFIRM_API_GATEWAY_*。
- 可为对象存储写入 bucket/key/hash 元数据；实际大文件字节流与 S3 连接参数用 TODO_CONFIRM_MINIO_*。

## Constraints

- 所有写操作必须认证、授权、tenant/BU/project 边界校验、状态机校验、审计。
- API 使用 /api/v1 与统一 envelope/traceId。
- 原型 org、sys 页面结构不得随意裁剪；如某 Tab 不完全落地，必须提供真实后端 seam 和明确空态/待配置状态。
- 未确认外部系统参数不得替换为猜测。
- 本阶段不得编写业务实现代码。

## Exception Scenarios

- 删除组织节点时存在子节点、用户、项目、文件元数据或未来业务引用：阻断或进入 DISABLED，不物理删除。
- BU 管理员修改其他 BU/集团配置：403 + WARNING/CRITICAL 审计。
- BU 级配置试图放宽集团上限：422/业务规则失败 + 审计。
- 通知渠道未配置或测试失败：返回 UNCONFIGURED/FAILED，记录失败原因，不伪造成功。
- 文件 hash 不匹配、重复完成上传、越权下载、软删除后访问：阻断并审计。
- API Key 明文关闭后再次查看：只展示脱敏值，不可恢复明文。

## Testable Acceptance Criteria Draft

- AC-01 组织树支持 CORP/BU/PROJECT 查询、新增、重命名、禁用/删除前检查，编码唯一。
- AC-02 BU/项目成员支持用户绑定、角色作用域和跨 BU 边界校验，复用 F006 用户角色。
- AC-03 系统配置支持 GLOBAL/BU/PROJECT 作用域、继承链、版本记录、校验和审计。
- AC-04 BU 配置不能突破集团上限，配置变更立即可被读取。
- AC-05 文件元数据支持 object key 分配、上传完成登记、hash/size 校验、软删除和权限校验。
- AC-06 通知渠道配置测试返回真实状态并记录审计；未配置外部参数时使用 TODO_CONFIRM 状态。
- AC-07 API Key 创建仅一次展示明文，列表脱敏，撤销后不可用并记录 CRITICAL 审计。
- AC-08 org、sys 页面保持原型信息架构并接入真实 API。
