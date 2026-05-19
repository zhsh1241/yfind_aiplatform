---
contract_status: frozen
feature: F010-data-standardization-pipeline
---

# Contract: F010 数据标准化

## Contract Metadata

- Version: v1
- Status: frozen
- Owner: contract-architect
- Created: 2026-05-18
- Feature: F010-data-standardization-pipeline


## API

- `GET /api/v1/data-standards/overview`
- `GET /api/v1/datasets/{id}/standard-profile`
- `GET /api/v1/data-standard-tasks`
- `POST /api/v1/data-standard-tasks`
- `POST /api/v1/data-standard-tasks/{id}/run`

## 权限

- `data:standard:read`
- `data:standard:write`
- `data:standard:run`
- `menu:pipeline`
- `menu:opmarket`

## 状态

- Task: `READY`、`SUCCEEDED`、`FAILED`
- Output dataset: `PREPROCESSED` / `ACTIVE`
- Lineage transform: `STANDARDIZATION`
