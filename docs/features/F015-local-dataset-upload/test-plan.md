# Test Plan: 本地图片/视频上传创建数据集

## 1. Test Scope
- Feature: F015-local-dataset-upload
- Contract version: v1.1
- Business references: `docs/business/bizdocs/02-01-业务流程-数据管理.md`、`docs/business/bizdocs/03-01-系统功能-数据管理.md`、`docs/business/rules/01-数据管理规则.md`
- Prototype references: `docs/prototype/SMP工业AI平台-原型v2.html` page key `up`、`ds`、`dsdetail`

## 2. P0 - Blocking
| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-01 | 无可用数据源时默认引导本地上传 | Mock data-sources=[]，进入上传向导 | 显示空态、`本地上传文件`、`直接上传文件` CTA |
| T-P0-02 | AC-02/AC-03 | 上传图片创建数据集 | 创建 IMAGE session，上传 jpg，commit | 生成 ACTIVE/READY 数据集版本、file binding、LOCAL_UPLOAD lineage |
| T-P0-03 | AC-02/AC-03 | 前端直接上传 mp4 创建视频数据集 | 在上传向导选择“视频（mp4/mov/avi）”，上传 mp4，commit | 生成 `RAW/AUDIO_VIDEO` 数据集，详情文件 contentType=`video/mp4`，标注入口被阻断 |
| T-P0-04 | AC-04 | 高风险文件不进入可用版本 | 内容安全返回 BLOCKED 后 commit | session/version 进入 SECURITY_PENDING，页面展示诊断，标注入口禁用 |

## 3. P1 - Important
| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-02 | 非法图片格式 | IMAGE session 上传 txt | 返回 `UPLOAD_FILE_FORMAT_NOT_ALLOWED`，accepted=0，空会话提交被拒绝 |
| T-P1-02 | AC-02 | 非法视频格式 | AUDIO_VIDEO/VIDEO session 上传 txt | 返回 `UPLOAD_FILE_FORMAT_NOT_ALLOWED`，诊断文案提示仅支持 mp4/mov/avi |
| T-P1-03 | AC-02 | mp4/mov/avi 后端 allowlist | AUDIO_VIDEO session 上传 mp4、mov、avi | 三类视频均被 accepted 并保留各自 contentType |
| T-P1-04 | AC-06 | 权限不足 | QE 角色创建/upload session | 返回 403/权限错误，写审计 |

## 4. P2 - Nice to Have
| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-02 | zip 混入非法图片 entry | IMAGE session 上传 zip | 合法图片继续处理，非法 entry 记录 rejected |
| T-P2-02 | AC-02 | 文件超限 | 上传超 100MB 单文件，或超 500MB zip | 返回 413 / `DATASET_UPLOAD_FILE_LIMIT_EXCEEDED` 或 `DATASET_UPLOAD_ZIP_SIZE_EXCEEDED` |
| T-P2-03 | AC-05 | 视频后续预处理引导 | 进入 AUDIO_VIDEO 详情 | 不允许直接标注，提示需抽帧生成 IMAGE 数据集 |

## 5. Cross-cutting Verification
- Permission: `data:dataset:write/read`、跨 BU 404/403。
- Audit: session 创建、文件 accepted/rejected、commit、安全阻断。
- Business rules: DAT-002、DAT-005、DAT-009、DAT-012。
- NFR: 单文件 100MB、zip 500MB 阈值由后端与 Spring multipart 配置兜底；前端仅作 accept 与文案引导。
- Frontend visual/prototype parity: 上传向导保持原型 stepper、dragger、进度、详情跳转。

## 6. Traceability
- AC-01 -> T-P0-01
- AC-02 -> T-P0-02, T-P0-03, T-P1-01, T-P1-02, T-P1-03, T-P2-01, T-P2-02
- AC-03 -> T-P0-02, T-P0-03
- AC-04 -> T-P0-04
- AC-05 -> T-P0-02, T-P0-03, T-P2-03
- AC-06 -> T-P0-02, T-P1-04
