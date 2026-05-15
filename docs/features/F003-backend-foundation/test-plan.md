# Test Plan: 后端工程底座

## 1. Test Scope

- Feature: F003-backend-foundation
- Contract version: v1
- Business references: docs/business/api/01-API接口规范.md, docs/business/domain/00-领域模型索引.md, docs/business/rules/00-规则类型索引.md
- Prototype references: 无专属页面；后续前端全局 API 接入复用

## 2. P0 - Blocking

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-01 | 后端多模块可验证 | 执行 mvn -f backend/pom.xml verify -DskipITs=true | Reactor build success |
| T-P0-02 | AC-02, AC-03 | foundation status 返回 envelope 与 traceId | 测试请求 /api/v1/foundation/status 并传入 X-Trace-Id=trace-f003 | HTTP 200；body code=0；header/body traceId 一致 |
| T-P0-03 | AC-05 | Flyway 与 JPA validate | test profile 启动 Spring Boot context | migration 成功，JPA validate 不报缺表 |

## 3. P1 - Important

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-04 | 五大业务域边界稳定 | 检查 PlatformDomainModules.DOMAINS | 顺序为 DATA、MODEL、INFERENCE、RESOURCE、PLATFORM |
| T-P1-02 | AC-06 | 部署入口存在 | 检查 `backend/`Dockerfile 和 README | 文件存在且说明 Java 21/Maven 验证命令 |

## 4. P2 - Nice to Have

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-06 | AI scaffold backend gate | 执行 `node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration` | 后端阶段进入 Maven verify |
ode tools/ai-scaffold/dist/cli.js gate --skip-backend-integration | 后端阶段进入 Maven verify |

## 5. Cross-cutting Verification

- Permission: foundation endpoint 当前 permitAll；真实鉴权/授权由 F006 验证。
- Audit: migration 创建 platform_audit_event；审计事件写入由 F006 验证。
- Business rules: 统一错误码与 BusinessException 作为后续 MUST 规则失败返回 seam。
- NFR: 健康检查、traceId、OpenAPI、profile 配置作为可观测和运维基线。
- Frontend visual/prototype parity: 不涉及页面视觉。

## 6. Traceability

- AC-01 -> T-P0-01
- AC-02 -> T-P0-02
- AC-03 -> T-P0-02
- AC-04 -> T-P1-01
- AC-05 -> T-P0-03
- AC-06 -> T-P1-02, T-P2-01
