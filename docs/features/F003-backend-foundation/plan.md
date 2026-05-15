---
feature: F003-backend-foundation
title: 后端工程底座
plan_status: approved
approved_at: 2026-05-16
owner: codex
created_at: 2026-05-15
updated_at: 2026-05-16
---

# Plan: 后端工程底座

## 1. 背景与目标

旧版后端已清空，本功能恢复可验证的生产级最小后端骨架，后续 DATA、MODEL、INFERENCE、RESOURCE、PLATFORM 五大业务域均在该底座上按正式 feature 扩展。

- 业务来源：docs/business/api/01-API接口规范.md、docs/business/domain/00-领域模型索引.md、docs/business/rules/00-规则类型索引.md、docs/business/bizdocs/06-非功能性需求.md
- 原型来源：后端底座无专属页面；服务于 docs/prototype/SMP工业AI平台-原型v2.html 的 25 个主导航页面后续 API 接入
- 技术来源：docs/architecture/01-technology-stack-baseline.md、docs/features/FEATURE_BREAKDOWN.md F003
- 目标结果：建立 Java 21 / Spring Boot 4.0.x 多模块工程、统一响应 envelope、traceId、错误码、Flyway/JPA 基线、OpenAPI 与健康检查。

## 2. 范围

### In Scope

- 创建 `backend/` Maven 父工程与 smp-common、smp-platform、smp-app 模块。
- 提供 /api/v1/foundation/status 骨架状态接口，验证统一 envelope 与 traceId。
- 建立五大业务域模块边界常量：DATA、MODEL、INFERENCE、RESOURCE、PLATFORM。
- 提供 Spring Security、OpenAPI、全局异常处理、Flyway migration、JPA 实体示例和测试 profile。
- 提供后端 Dockerfile 与 README。

### Out of Scope

- 不实现具体业务域 CRUD、登录、权限矩阵、真实审计查询或外部系统集成。
- 不确认 PostgreSQL、LDAP、Kafka、MinIO、MLOps 等生产连接参数。
- 不复用已删除旧后端实现。

## Reuse Strategy

### Must Reuse

- 业务资料：docs/business/api/01-API接口规范.md、docs/business/domain/、docs/business/rules/。
- 技术栈基线：docs/architecture/01-technology-stack-baseline.md。
- 功能拆解：docs/features/FEATURE_BREAKDOWN.md 中 F003-C01～F003-C06。
- AI 脚手架：`tools/ai-scaffold/` 的 backend gate 配置与 `ai-scaffold.config.json`。

### Duplication Rejected

- 不复制旧已删除 backend 实现作为事实来源。
- 不创建与 docs/business/domain/ 冲突的业务领域模型。
- 不在本功能中平行实现身份权限；权限底座留给 F006。

### Approved New Seams

- 新增 /api/v1/foundation/status 作为工程骨架健康/能力探针。
- 新增 PlatformAuditEvent 与 V1__foundation_schema.sql 作为后续审计事实表约定起点。
- 新增 TraceIdFilter、ApiResponse、ErrorCode，作为后续所有 API 复用的横切 seam。

## 4. 交付方案

1. 搭建 Maven 多模块与 Spring Boot 应用。
2. 落地统一 envelope、traceId、异常处理和 foundation status API。
3. 增加 Flyway/JPA 测试 migration 与 H2 PostgreSQL mode 验证。
4. 增加 Dockerfile、README 与 AI scaffold backend 启用配置。
5. 运行 Maven verify 与全仓 gate。

## 5. 数据、权限与审计

- 领域对象：PlatformAuditEvent 仅作为审计事实表骨架示例；业务实体后续 feature 定义。
- MUST 规则：本功能不承载具体业务 MUST 规则，但提供后续规则校验和异常返回基线。
- 权限：SecurityConfig 仅放行健康检查、OpenAPI 与 foundation status；真实认证/授权由 F006 实现。
- 审计事件：不产生业务审计事件；保留 platform_audit_event 初始表结构。

## 6. 风险与未决问题

- 生产 PostgreSQL/LDAP/Kafka/对象存储参数仍为 TODO_CONFIRM_*。
- Spring Boot 4 测试包结构与旧 MockMvc 自动配置不同，本功能采用随机端口 HTTP 测试验证 API。
- H2 仅用于本地测试 profile，不代表生产数据库兼容性最终结论。

## 7. 审批记录

- Reviewer: codex 自主工程底座规划
- Decision: approved，用于恢复可验证后端骨架并重新启用 backend gate。