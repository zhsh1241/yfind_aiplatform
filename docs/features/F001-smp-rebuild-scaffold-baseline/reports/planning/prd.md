# PRD Archive

## Problem

仓库旧实现已清空，但项目说明、脚手架配置和门禁仍部分指向旧 backend/frontend/deploy 与旧 feature 资料，容易误导后续 agent。

## Goal

把仓库改造为 SMP 重建基线：资料/原型为权威输入，ai-adapter 继续可验证，backend/frontend 显式禁用，正式 feature/bugfix 文档面恢复。

## Success Metrics

- AI scaffold 自测通过。
- 当前 gate 通过。
- ai-adapter 测试通过。
- 工作项绑定检查通过。
