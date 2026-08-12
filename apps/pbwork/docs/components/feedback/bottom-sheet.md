# Bottom Sheet

> 组件 id：`bottom-sheet` · 分类：`feedback`
> 实现：[BottomSheet.vue](../../../src/design-system/components/feedback/BottomSheet.vue)
> 契约：[bottom-sheet.json](../../../src/design-system/components/contracts/bottom-sheet.json)

从底部覆盖当前页面的半屏操作容器。

## 职责与边界

- 固定使用 `role=sheet`，保持独立 scrim、Sheet surface、关闭入口和焦点边界。
- 内容高度受统一上限约束；标题区与内容区由同一 Sheet 滚动边界承载。
- 默认 slot 完全拥有业务内容；连续多步流程使用 Flow Sheet。
- scrim 位于页面内容之上、Sheet surface 之下，surface 使用顶部圆角和 raised elevation。

## 行为要点

- 打开时挂载 scrim、dialog 可访问语义和顶部关闭入口。
- 关闭只更新 `modelValue` 并恢复下层交互，不替业务内容决定取消、提交或路由。
- 点击 scrim、关闭按钮和键盘关闭路径遵循同一受控关闭边界。

## States

| id | label | kind |
| --- | --- | --- |
| `open` | 打开 | `content` |
| `closed` | 关闭 | `content` |

## 用法与反例

- 用于半屏操作、选择或短内容；多步确认/执行/结果使用 Flow Sheet。
- 不在业务页面复制 scrim、焦点管理、顶部圆角或关闭手势。
- Props、Slots、Events、默认值与 Token 槽以 [Bottom Sheet Contract](../../../src/design-system/components/contracts/bottom-sheet.json) 为准。
