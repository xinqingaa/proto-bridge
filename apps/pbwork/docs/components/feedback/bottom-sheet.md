# Bottom Sheet

> 组件 id：`bottom-sheet` · 分类：`feedback`
> 实现：[BottomSheet.vue](../../../src/design-system/components/feedback/BottomSheet.vue)
> 契约：[bottom-sheet.json](../../../src/design-system/components/contracts/bottom-sheet.json)

从底部覆盖当前页面的半屏操作容器。

## 职责与边界

- 固定使用 `role=sheet`，保持独立 scrim、Sheet surface、关闭入口和焦点边界。
- 顶栏与 Flow Sheet 共用：居中标题、右侧关闭 Icon Button；无返回。
- 内容高度受统一上限约束；决策按钮放在 `actions` 槽。
- 默认 slot 完全拥有业务内容；连续多步流程使用 Flow Sheet。

## 行为要点

- 打开时挂载 scrim、dialog 可访问语义和顶部关闭入口。
- 关闭只更新 `modelValue` 并恢复下层交互，不替业务内容决定取消、提交或路由。
- 操作区一颗按钮时使用主要类型并占满；两颗时左侧次要、右侧主要，等分撑满。

## States

| id | label | kind |
| --- | --- | --- |
| `open` | 打开 | `content` |
| `closed` | 关闭 | `content` |

## 用法与反例

- 用于半屏操作、选择或短内容；多步确认/执行/结果使用 Flow Sheet。
- 不在业务页面复制 scrim、焦点管理、顶部圆角、关闭或返回。
- Props、Slots、Events、默认值与 Token 槽以 [Bottom Sheet Contract](../../../src/design-system/components/contracts/bottom-sheet.json) 为准。
