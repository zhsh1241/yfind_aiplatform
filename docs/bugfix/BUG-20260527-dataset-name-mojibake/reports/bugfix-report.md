# Bug Fix Report

## Bug Information

- ID: BUG-20260527-dataset-name-mojibake
- Title: 数据集详情仍显示问号替代型乱码
- Severity: Major

## Analysis

- Root Cause: 前一次 API 边界兜底只覆盖 `乱码` 前缀、替换字符与常见 Latin-1 mojibake，未识别数据库中已经被替换为 `????` 的不可逆乱码；同时详情响应仍直接返回原始 `tags` / `description`。
- Affected Files:
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/AnnotationService.java`
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java`
- Related Features: 数据集管理、数据集详情、数据标准化、标注候选/任务、数据集访问申请。

## Solution

- Approach: 在 API 响应边界将高占比或高数量 `?` 识别为不可读文本；继续保留原始入库值，只对展示响应做兜底，避免引入数据迁移风险。
- Changes Made:
  - `DataManagementService.java`: 扩展不可读文本检测；列表/详情继续兜底名称；详情响应新增 `tags` 过滤与 `description` 兜底。
  - `AnnotationService.java`: 同步扩展不可读文本检测，确保标注相关接口不透出问号替代型乱码名称。
  - `DataManagementControllerTest.java`: 回归用例改为 `???????????`、`????` 标签和问号描述，覆盖列表、详情、候选、标准画像、标准任务、访问申请、标注源与任务。

## Testing

- [x] 复现测试已添加
- [x] 单元/集成测试通过
- [x] 回归测试通过
- [x] Scaffold gate 通过

## Contract Change

- [x] 不涉及契约变更：字段名与响应结构不变，仅修正不可读展示值。

## Verification

- [x] Bug 已修复
- [x] 无已知副作用
- [x] 文档已更新

## Remaining Risk

- 历史数据库中仍可能保存原始坏值；本修复仅保证 API 边界不继续展示不可读内容，后续如需彻底清理需单独设计数据修复脚本。
