# Real Video Dataset Verification

## Environment
- Date: 2026-05-26
- Frontend: `http://127.0.0.1:5173`
- Backend: `http://localhost:8080`
- Account: `admin / YF`
- Source dataset: `DATASET-WELD-VIDEO-001`
- Source version: `DVER-WELD-VIDEO-001`
- Pipeline: `PIPE-VIDEO-PREP`

## API-level verification
1. 登录真实后端，读取 `PIPE-VIDEO-PREP` 当前 DAG。
2. 保存联调前快照：`PVER-AA25DA88D0 / bugfix-verify-20260526-201743`。
3. 删除 1 个画布节点后提交保存（本次实测删除节点：`resize / 图片缩放`）。
4. 使用真实视频数据集运行：
   - runId: `PRUN-573D670179`
   - outputDatasetId: `DATASET-PIPE-19409400`
5. 读取预览结果，确认状态为 `PENDING_CONFIRMATION`，输出类型为 `IMAGE`。
6. 执行确认：状态变为 `CONFIRMED`。
7. 执行激活：状态变为 `ACTIVE`，`annotationEligible=true`。
8. 查询标注来源列表，确认输出数据集已进入 PREPROCESSED 来源。
9. 联调结束后已手工 PUT 恢复 `PIPE-VIDEO-PREP` 为 3 节点、2 边的原始结构，避免污染现场。

## API verification result
```json
{
  "pipelineId": "PIPE-VIDEO-PREP",
  "sourceDatasetId": "DATASET-WELD-VIDEO-001",
  "sourceVersionId": "DVER-WELD-VIDEO-001",
  "removedNodeId": "resize",
  "removedNodeLabel": "图片缩放",
  "initialNodeCount": 3,
  "initialEdgeCount": 2,
  "updatedNodeCount": 2,
  "updatedEdgeCount": 1,
  "savedVersionId": "PVER-AA25DA88D0",
  "savedVersionName": "bugfix-verify-20260526-201743",
  "runId": "PRUN-573D670179",
  "outputDatasetId": "DATASET-PIPE-19409400",
  "previewStatus": "PENDING_CONFIRMATION",
  "previewType": "IMAGE",
  "previewWatermarkApplied": true,
  "artifactWatermarkApplied": false,
  "confirmedStatus": "CONFIRMED",
  "activatedStatus": "ACTIVE",
  "annotationEligible": true,
  "annotationSourceListed": true
}
```

## Real UI verification
使用真实前端（非 mock）+ 真实后端完成了一次浏览器链路：
- 登录成功
- 进入 `Pipeline编辑器`
- 选择 `图片缩放` 节点并删除
- 保存成功
- 运行视频预处理成功
- 确认预处理结果成功
- 激活为标注可用数据集成功

浏览器脚本输出：
```json
{
  "initialNodeText": "拖拽节点可重新排序 · 从左侧算子库拖入可添加新节点 · 当前节点 3 个",
  "afterDeleteNodeText": "拖拽节点可重新排序 · 从左侧算子库拖入可添加新节点 · 当前节点 2 个",
  "previewBanner": "下一步请先人工确认结果，再执行激活",
  "activated": true
}
```

## Notes
- 真实验证期间发现“恢复快照”接口返回的草稿结构与期望快照存在不一致风险，因此最终采用显式 PUT 恢复现场 DAG，确保当前 `PIPE-VIDEO-PREP` 仍为 3 节点版本。
- 该现象未阻塞本次前端删除功能交付，但建议后续单独跟踪 pipeline version restore 语义与实现一致性。
