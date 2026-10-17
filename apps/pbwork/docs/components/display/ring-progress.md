# RingProgress

> 组件 id：`ring-progress` · 分类：`display`
> 实现：[RingProgress.vue](../../../src/design-system/components/display/RingProgress.vue)
> 契约：[ring-progress.json](../../../src/design-system/components/contracts/ring-progress.json)

确定进度环，展示完成比例与可访问数值。

## 职责与边界

固定使用 `role=status`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 比例钳制在 0 与 max 之间；max 无效时按空进度处理。
- SVG 坐标系来自常量表，圆环描边来自主题；不宣称不确定进度。

## States

| id | label | kind |
| --- | --- | --- |
| `empty` | 未开始 | `content` |
| `complete` | 已完成 | `content` |

## 用法与反例

用于确定进度，value / max 映射至完整圆环；未知进度使用 Spinner，不以此伪装倒计时时钟。

Props、Slots、Events、默认值与 Token 槽以 [RingProgress Contract](../../../src/design-system/components/contracts/ring-progress.json) 为准。
