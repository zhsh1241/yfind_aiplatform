# Bug Fix Report

## Bug Information

- ID: BUG-20260527-dataset-name-mojibake
- Title: 数据集列表/详情及关联接口仍显示乱码名称
- Severity: Major

## Analysis

- Root Cause: 前一次修复只覆盖视频抽帧新建输出数据集命名；历史数据与多个 API 边界仍直接返回 `dataset.name` / SQL join 得到的 `dataset_name`。
- Affected Files:
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/AnnotationService.java`
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java`
- Related Features: 数据集管理、数据标准化、标注候选/任务、数据集访问申请。

## Solution

- Approach: 在 API 响应边界检测不可读名称（空值、`乱码` 前缀、替换字符、常见 Latin-1 mojibake），对不可读名称按数据类型生成稳定兜底展示名。
- Changes Made:
  - `DataManagementService.java`: 列表/详情、标注候选、标准画像、标准任务、同步任务、访问申请统一使用可读数据集名。
  - `AnnotationService.java`: 标注源数据集、标注任务源数据集名、内联模板默认名统一使用可读数据集名。
  - `DataManagementControllerTest.java`: 新增乱码数据集回归测试，覆盖列表/详情/候选/标准画像/标准任务/访问申请/标注源与任务。

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
