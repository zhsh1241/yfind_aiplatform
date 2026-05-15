# Task: 后端工程底座

## Metadata
- Feature: F003-backend-foundation
- ID: TASK-backend-foundation
- Status: implemented
- Owner: codex
- Created: 2026-05-15
- Updated: 2026-05-16
- 前置：同目录 plan.md 已标记 approved，用于本次工程底座恢复追溯。

## 1. 需求摘要

### User Story

作为后续参与 SMP 重建的后端工程师，我想要一个已验证的 Spring Boot 4 / Java 21 多模块工程底座，以便后续业务 feature 可以直接复用统一 API、错误、审计、迁移和测试基线。

### Business Value

- 恢复 backend 目录到可编译、可测试、可被 AI scaffold gate 管理的状态。
- 降低后续业务域重复搭建 envelope、traceId、Flyway、OpenAPI、安全配置的成本。
- 为 F006 及后续业务功能提供稳定后端入口。

### Source References

- Business docs: docs/business/api/01-API接口规范.md, docs/business/domain/00-领域模型索引.md, docs/business/rules/00-规则类型索引.md, docs/business/bizdocs/06-非功能性需求.md
- Prototype: 无专属页面；支撑 docs/prototype/SMP工业AI平台-原型v2.html 全部页面后续 API 接入
- Feature breakdown: docs/features/FEATURE_BREAKDOWN.md F003-C01～F003-C06

## 2. 范围

### In Scope

- [x] AC-01: `backend/` 包含 Java 21 / Spring Boot 4.0.x / Maven 多模块骨架。
- [x] AC-02: /api/v1/foundation/status 返回统一 ApiResponse envelope、五大业务域和能力清单。
- [x] AC-03: HTTP 响应透传或生成 X-Trace-Id，并在响应 envelope 中返回 traceId。
- [x] AC-04: 后端显式暴露 DATA、MODEL、INFERENCE、RESOURCE、PLATFORM 五大业务域边界。
- [x] AC-05: Flyway/JPA 初始 migration 与审计事实表示例可在 test profile 下验证。
- [x] AC-06: 后端 Dockerfile、README 与 AI scaffold backend gate 配置可用。

### Out of Scope

- 不实现业务登录、真实 RBAC/ABAC、组织用户管理或数据/模型业务 API。
- 不接入真实 PostgreSQL、LDAP、Kafka、MinIO、MLflow、KServe。
- 不复制旧后端实现。

## 3. 技术分析

### Backend

- Module/API: `backend/pom.xml`, smp-common, smp-platform, smp-app, /api/v1/foundation/status。
- Domain objects: PlatformDomainModules.DOMAINS, PlatformAuditEvent。
- Business rules: 当前提供统一错误码和异常处理 seam，具体 MUST 规则由后续业务 feature 实现。

### Frontend

- Prototype page key: 无专属页面；F004 前端状态卡会调用 /api/v1/foundation/status。
- Pages/components: 后续由 F004 与业务 feature 接入。
- States/interactions: 不涉及。

### AI Adapter / Integration

- Adapter endpoint: 不涉及。
- External system placeholders: TODO_CONFIRM_POSTGRES_*, TODO_CONFIRM_LDAP_* 后续确认。

### Database

- Tables: platform_audit_event。
- Migrations: `backend/smp-app/src/main/resources/db/migration/V1__foundation_schema.sql。

## Reuse Plan

- Existing reference seams to reuse: docs/business/api/01-API接口规范.md, docs/business/domain/, docs/business/rules/, docs/architecture/01-technology-stack-baseline.md。
- Existing service/scaffold seams to reuse: `tools/ai-scaffold/`, `ai-scaffold.config.json`, docs/features/FEATURE_BREAKDOWN.md。
- Existing test fixtures to reuse: Maven Surefire/JUnit 5, Spring Boot test profile, H2 PostgreSQL mode。
- New seams allowed only if existing seams cannot be reused, because: backend 目录已清空，必须新建 ApiResponse、TraceIdFilter、FoundationController、Flyway migration 作为后续复用底座。

## 5. Acceptance Criteria

- [x] AC-01: Maven 多模块 `backend/` 能在 Java 21 下完成 `verify -DskipITs=true`。
- [x] AC-02: /api/v1/foundation/status 返回 code=0, message=success, data.service=smp-backend。
- [x] AC-03: 请求 X-Trace-Id=trace-f003 时响应 header 与 body traceId 一致。
- [x] AC-04: 五大业务域按 DATA、MODEL、INFERENCE、RESOURCE、PLATFORM 顺序暴露。
- [x] AC-05: Flyway migration 创建 platform_audit_event，JPA validate 通过。
- [x] AC-06: AI scaffold backend enabled 后全仓 gate 能执行后端校验。

## 6. Definition of Done

- [x] plan.md 已批准。
- [x] contract.md 已实现态。
- [x] test-plan.md 引用全部 AC-xx。
- [x] 复用审查已完成。
- [x] 权限、审计和 MUST 规则有验证证据或明确留给后续 feature。
- [x] 质量门禁通过或记录等价 CI 证据。

## 7. 风险与问题

- 生产数据库和身份源仍需 F006/F017 继续收口。
- Spring Boot 4 相关测试/自动配置包已变化，后续新增测试优先验证当前依赖可用性。