# Toast

> 组件 id：`toast` · 分类：`feedback`
> 实现：[Toast.vue](../../../src/design-system/components/feedback/Toast.vue)
> 契约：[toast.json](../../../src/design-system/components/contracts/toast.json)

轻量短提示。可以只显示文本，也可以在同一条提示上放一个动作，例如撤销。到时自动关闭，不阻断页面。

## 职责与边界

- 固定使用 `role=toast`，悬浮于内容上方，不占页面流也不阻断下层交互。
- 视觉是反色表面加文本。有 `actionLabel` 时末尾是一个紧凑文字操作，与正文同行高，不设独立按钮内边距或最小高度；保留原生 button 的键盘与禁用语义。不包含 tone 色条、图标或标题。
- 内容内边距使用垂直 `toast.gap`、水平 `spacing.md`（基础主题为 10px / 16px），不叠加底层 Snackbar 内边距或最小高度留白。
- 需要确认或持续处理的反馈分别使用 Confirm、Bottom Sheet/Flow Sheet 或页面内状态。

## 行为要点

- 打开后按 `toast.duration` 自动关闭。
- 无动作时只展示 message。有动作时，每次打开最多触发一次 `undo`，事件先于关闭；数据恢复由业务处理。
- 关闭只更新可见状态，不决定业务导航或重试。

## States

| id | label | kind |
| --- | --- | --- |
| `visible` | 显示 | `content` |
| `hidden` | 隐藏 | `content` |

## 用法与反例

- 用于短暂成功、复制完成等非阻断提示。
- 不添加色条、图标、关闭按钮或长操作；需要用户决策时使用 Confirm。
- Props、Slots、Events、默认值与 Token 槽以 [Toast Contract](../../../src/design-system/components/contracts/toast.json) 为准。
