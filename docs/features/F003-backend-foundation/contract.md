# Feature Contract: 后端工程底座

## Contract Metadata
- Version: v1
- Status: implemented
- Owner: contract-architect
- Created: 2026-05-15
- Updated: 2026-05-16
- Feature: F003-backend-foundation

## 1. Requirement Summary

- 用户目标：恢复可验证的 Java 21 / Spring Boot 4 后端工程底座。
- 业务价值：为后续 SMP 业务域开发提供统一 API、trace、错误、迁移、审计和安全基础。
- 业务资料：docs/business/api/01-API接口规范.md, docs/business/domain/, docs/business/rules/
- 原型页面：无专属页面；支撑 docs/prototype/SMP工业AI平台-原型v2.html 后续 API 接入。

## 2. API Contract

### Endpoint

- Method: GET
- Path: /api/v1/foundation/status
- Description: 返回后端工程底座状态、五大业务域与启用能力清单。
- Auth: 当前 foundation endpoint permitAll；真实认证在 F006 落地。
- Permission: 无业务权限要求。
- Audit Event: 无业务审计事件；仅作为健康/能力探针。

### Request Headers

| Header | Required | Description |
|---|---|---|
| X-Trace-Id | no | 调用方 traceId；缺省时服务端生成 UUID。 |

### Response Schema

`json
{
  "code": 0,
  "message": "success",
  "data": {
    "service": "smp-backend",
    "status": "READY",
    "domains": ["DATA", "MODEL", "INFERENCE", "RESOURCE", "PLATFORM"],
    "enabledCapabilities": ["api-envelope", "trace-id", "openapi", "flyway", "domain-modules"]
  },
  "traceId": "trace-f003",
  "timestamp": "2026-05-16T00:00:00+08:00"
}
`

### Errors

| HTTP | Business Code | Scenario | Rule |
|---|---:|---|---|
| 400 | 40001 | 参数错误 | 统一 INVALID_PARAM |
| 401 | 40100 | 未认证 | F006 后续启用 |
| 403 | 40300 | 权限不足 | F006 后续启用 |
| 409 | 40900 | 状态冲突 | 后续状态机复用 |
| 422 | 42200 | 业务规则失败 | 后续 MUST 规则复用 |
| 500 | 50000 | 未预期异常 | 统一 INTERNAL_ERROR |

## 3. Domain / State / Rules

- Domain objects: PlatformDomainModules, PlatformAuditEvent。
- State transitions: 本功能无业务状态机。
- MUST rules: 本功能不实现具体业务 MUST；后续 feature 必须引用 docs/business/rules/ 并复用 BusinessException / ErrorCode。

## 4. Persistence Contract

| Table | Purpose | Notes |
|---|---|---|
| platform_audit_event | 审计事实表骨架 | id, 	enant_id, ctor, ction, occurred_at；后续 F006 扩展审计字段与查询。 |

## 5. Compatibility

- Backward compatibility: 旧后端已删除，不提供旧 API 兼容。
- Versioning: 所有业务 API 默认 /api/v1；破坏性变更需在对应 feature contract 中记录。
- External parameters: PostgreSQL、LDAP、Kafka、对象存储等继续使用 TODO_CONFIRM_*。