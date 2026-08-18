---
prototypeId: cold-chain-ops
---

# 冷链原型实现说明

本批次完成于 2026-08-18。

## 本次调整

本次调整保持冷链异常发现、货运详情和处置提交的业务闭环不变，收敛页面层级、Card 内容边界和严重度筛选状态，服务于 PBWork 五维验收。

## Promotion Mapping

| 视觉元素 | 分类 | 实现说明 |
| --- | --- | --- |
| PrimaryTabs、Card、SearchBar、DataList、Button、Sheet、Dialog、Toast | 现有 PBWork DS | 直接使用公开组件；不修改共享 Card Contract |
| Card 标题区、指标组、温度图、事件时间线、表单分组 | Prototype-local UI | 使用现有 Token，并保留独立 Evidence 节点 |
| 严重度 Tab 与摘要快捷入口 | 现有 PBWork DS + Prototype-local 状态 | Tab 和快捷按钮写入同一 Variant，避免两套筛选状态 |
| 图片、复杂动效、外部动画 | 放弃或降级 | 当前冷链验收不需要外部资产 |

## 页面交付状态

| 页面 | 交付内容 | Experience review |
| --- | --- | --- |
| 异常队列 | 一级严重度 Tab、Card 内容 padding、全宽严重入口、无结果文案 | accepted |
| 货运详情 | 三个 Card 的标题区与内容 padding、窄屏收缩 | accepted |
| 处置表单 | 分组标题与 Token Evidence、统一内容边界 | accepted |

## 验收重点

- Registry 的 `show-critical` Action 仍可复现，但目标结果是严重度 Tab 的 `critical` 项。
- `warning-only` 和 `attention-only` 作为独立 Variant，确保四个严重度视图都可通过 URL/Variant 确定性打开。
- 已完成正式 Runtime 的 Focused Experience Gate：检查默认队列、严重 Tab、390px 窄屏队列、窄屏运输详情和审批错误表单；Card 边界、全宽按钮、Tab 反馈、文字换行和错误状态均通过。
