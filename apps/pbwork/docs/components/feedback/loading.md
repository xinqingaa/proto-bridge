# Loading

> 组件 id：`loading` · 分类：`feedback`
> 实现：[Loading.vue](../../../src/design-system/components/feedback/Loading.vue)
> 契约：[loading.json](../../../src/design-system/components/contracts/loading.json)

带 scrim 的阻断式蒙层加载。

## 职责与边界

- 固定使用 `role=loading-state`，覆盖目标容器或视口的完整交互区域并阻断下层操作。
- scrim 位于内容之上，Spinner 与可选标签位于 scrim 之上。
- 局部不阻断忙态使用 Spinner；确定进度使用 Progress。

## 行为要点

- 打开时展示 scrim 与居中指示并拦截点击；关闭后恢复下层交互。
- 标签只说明当前阻断任务，不由组件拥有异步生命周期或成功/失败状态。
- 覆盖范围、层级、scrim、指示器尺寸和排版只消费 Contract Token。

## States

| id | label | kind |
| --- | --- | --- |
| `open` | 打开 | `content` |

## 用法与反例

- 用于提交、切换关键上下文等需要阻断重复操作的短流程。
- 不用 Loading 代替局部 Spinner，也不在业务页自造遮罩层或固定 z-index。
- Props、Slots、Events、默认值与 Token 槽以 [Loading Contract](../../../src/design-system/components/contracts/loading.json) 为准。
