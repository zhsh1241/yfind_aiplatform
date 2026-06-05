# 前端控制台页面风格规范

> 状态：已采用  
> 基准页面：`frontend/src/features/model-registry/ModelRegistryPage.tsx`（模型中心）  
> 样式入口：`frontend/src/styles/global.css`

## 1. 目标

后续所有业务控制台页面默认参照“模型中心”的视觉与交互结构，避免每个页面使用不同标题、卡片、筛选区和表格风格。除非 feature plan 明确批准新的视觉体系，否则新增页面必须复用本规范中的语义类。

## 2. 标准页面骨架

页面顶层使用：

```tsx
<div className="content-page">
  <div className="page-hero console-hero">...</div>
  <div className="console-summary-grid">...</div>
  <Card className="page-card console-panel-card">...</Card>
  <Card className="page-card console-catalog-card">...</Card>
</div>
```

对应语义：

- `content-page`：控制台页面根容器。
- `page-hero console-hero`：页面头图，包含业务标签、标题、说明、关键指标和主操作。
- `console-summary-grid` + `console-summary-card`：4 张以内关键指标卡。
- `console-panel-card`：说明型、选择器型或流程提示型卡片。
- `console-catalog-card`：表格/列表主卡片。
- `console-filter-toolbar`：表格筛选区，统一浅灰背景、圆角和间距。

## 3. Hero 规则

Hero 左侧：

- 使用 `console-hero-kickers` 展示 2~3 个业务标签。
- 标题使用 `Typography.Title level={3}`。
- 说明使用 `Typography.Text type="secondary"`，一句话说明页面价值。
- 关键指标使用 `console-hero-metrics`，格式：`<span>指标 <strong>{value}</strong></span>`。

Hero 右侧：

- 使用 `console-hero-actions`。
- 主按钮只保留 1 个，使用 `type="primary"`。
- 次级按钮不超过 2 个。
- feature/task 标签可以放在主操作旁，但不能替代页面标题。

## 4. 指标卡规则

- 使用 `console-summary-grid`。
- 单卡使用：`console-summary-card console-summary-card-{accent}`。
- `accent` 仅使用：`blue`、`green`、`purple`、`gold`。
- 卡片内结构：图标、标题、`Statistic`、一句 hint。
- 避免直接使用裸 `Row/Col + Card + Statistic`，除非是已有页面渐进改造前的临时状态。

## 5. 表格与筛选规则

- 表格卡统一 `className="page-card console-catalog-card"`。
- 筛选控件放入 `console-filter-toolbar`，不要散落在 Card extra 中。
- 表格 hover、thead 背景由全局样式控制。
- 详情统一优先使用右侧 `Drawer`，详情中用 `Descriptions`、`Card size="small"`、`Timeline`。

## 6. 兼容说明

模型中心已有类名 `model-registry-hero`、`model-summary-grid`、`model-filter-toolbar`、`model-catalog-card` 继续保留；全局 CSS 已提供等价 `console-*` 通用类。新页面应使用 `console-*`，不要新增业务私有的一套 hero/summary/filter/table 样式。

## 7. 当前已对齐页面

- `模型中心`：原始基准页面。
- `边端管理 / F021`：已改造为 `console-*` 风格。
