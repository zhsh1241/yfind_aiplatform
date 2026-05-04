# Feature Contract: 数据资产 MVP

## Metadata
- Feature: F004-dataset-asset-mvp
- Version: v1
- Status: draft / frozen / implemented
- Owner: contract-architect
- Created: 2026-05-04
- Updated: 2026-05-04

## Requirement Summary
- User goal:
- Business value:

## Scope
### In Scope
- 

### Out of Scope
- 

## Reuse & Compatibility
- Reuse upstream service / DTO / component / permission / SQL contracts:
- New contract surface added only because existing contracts cannot be reused:
- Compatibility / migration notes:

## API Contract
### Endpoint
- Method:
- Path:
- Description:

### Request
```json
{
  "field": "value"
}
```

### Response
```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

### Errors
| Code | Scenario | Message |
|------|----------|---------|
| 400 | Validation error | Invalid parameter |
| 401 | Unauthorized | Unauthorized |
| 403 | Forbidden | Forbidden |
| 404 | Not found | Not found |
| 500 | Internal error | Internal error |

## Notes
- Freeze this contract before broad implementation starts.
