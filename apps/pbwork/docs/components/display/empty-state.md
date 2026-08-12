# Empty State

> 组件 id：`empty-state` · 分类：`display`
> 实现：[EmptyState.vue](../../../src/design-system/components/display/EmptyState.vue)
> 契约：[empty-state.json](../../../src/design-system/components/contracts/empty-state.json)

没有可展示数据或尚未配置时的完整空态。

## 职责与边界

- 固定使用 `role=empty-state`，解释“为什么为空”以及可选下一步。
- 空态不是通用错误页；失败、权限和离线状态应使用对应业务错误结构。
- 可选操作只有一个恢复入口，复杂多操作由页面另行组织。

## 行为要点

- 标题与说明必须解释当前为空的原因或下一步，不使用模糊占位文案。
- `actionLabel` 为空时不渲染操作；存在时通过 `action` 事件交给页面处理。
- 组件不自行请求数据、跳转路由或决定恢复策略。

## States

| id | label | kind |
| --- | --- | --- |
| `without-action` | 无操作 | `content` |

## 用法与反例

- 用于无结果、尚未创建或尚未配置；整页 loading 使用 Loading/Spinner 组合。
- 不用 Empty State 隐藏真实错误、unknown 或权限风险。
- Props、Slots、Events、默认值与 Token 槽以 [Empty State Contract](../../../src/design-system/components/contracts/empty-state.json) 为准。
