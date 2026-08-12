# Progress

> 组件 id：`progress` · 分类：`display`
> 实现：[ProgressIndicator.vue](../../../src/design-system/components/display/ProgressIndicator.vue)
> 契约：[progress.json](../../../src/design-system/components/contracts/progress.json)

展示确定或不确定进度；只反馈状态，不阻断页面操作。

## 职责与边界

- 固定使用 `role=loading-state`，表达任务进度，不拥有任务生命周期。
- indeterminate 表示完成比例未知；确定模式才可以声明具体 value。
- 需要阻断下层操作时使用 Loading，局部旋转忙态使用 Spinner。

## 行为要点

- indeterminate 模式不能同时宣称精确百分比。
- 确定进度保持在 Contract 有效范围，并通过 label 提供可访问说明。
- 轨道、描边、颜色和动效只消费 Contract Token。

## States

| id | label | kind |
| --- | --- | --- |
| `indeterminate` | 加载中 | `interaction` |
| `complete` | 已完成 | `content` |

## 用法与反例

- 用于上传、同步、步骤完成度等可观察进度。
- 不用 Progress 代替按钮 loading、全屏阻断层或无法量化却标有精确百分比的状态。
- Props、Slots、Events、默认值与 Token 槽以 [Progress Contract](../../../src/design-system/components/contracts/progress.json) 为准。
