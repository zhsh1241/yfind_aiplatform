# Feature Contract: {feature-name}

## Contract Metadata
- Version: v1
- Status: draft
- Owner: contract-architect
- Created: YYYY-MM-DD
- Feature: F{nnn}-{feature-slug}

## 1. Requirement Summary
- 用户目标：
- 业务价值：
- 业务资料：`docs/business/...`
- 原型页面：`docs/prototype/...`

## 2. API Contract

### Endpoint
- Method:
- Path: `/api/v1/...`
- Description:
- Auth:
- Permission:
- Audit Event:

### Request Schema
```json
{}
```

### Response Schema
```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "traceId": "uuid"
}
```

### Errors
| HTTP | Business Code | Scenario | Rule |
|---|---|---|---|
| 400 | INVALID_PARAM | 参数错误 | |
| 401 | UNAUTHORIZED | 未认证 | |
| 403 | FORBIDDEN | 权限不足 | |
| 409 | CONFLICT | 状态冲突 | |
| 422 | BUSINESS_RULE_FAILED | 业务规则失败 | |

## 3. Domain / State / Rules
- Domain objects:
- State transitions:
- MUST rules:

## 4. Compatibility
- Backward compatibility:
- Versioning:
