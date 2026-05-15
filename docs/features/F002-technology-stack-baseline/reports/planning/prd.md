# PRD Archive: 技术栈基线确认

## Problem

项目重建阶段需要统一技术栈，否则后续 feature 可能沿用旧 backend/frontend 口径或重复争论选型。

## Goals

- 形成 `docs/architecture/01-technology-stack-baseline.md`。
- 根文档与 agent brief 同步。
- AI scaffold 能展示技术栈摘要。
- 保持当前 backend/frontend disabled、ai-adapter enabled 的重建状态。

## Non-goals

- 不实现业务 API。
- 不部署基础设施。
- 不填充 TODO_CONFIRM 外部参数。
