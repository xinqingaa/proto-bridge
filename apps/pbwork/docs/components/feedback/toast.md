# Toast

> 组件 id：`toast` · 分类：`feedback`
> 实现：[Toast.vue](../../../src/design-system/components/feedback/Toast.vue)
> 契约：[toast.json](../../../src/design-system/components/contracts/toast.json)

轻量短提示；半透明黑底纯文本，自动关闭且不阻断页面操作。

## 职责与边界

- 固定使用 `role=toast`，悬浮于内容上方，不占页面流也不阻断下层交互。
- 视觉只有单层半透明黑色 surface 和纯文本，不包含 tone 色条、图标、标题或关闭按钮。
- 需要确认或持续处理的反馈分别使用 Confirm、Bottom Sheet/Flow Sheet 或页面内状态。

## 行为要点

- visible 后按 `motion.duration-toast` 自动关闭。
- 只展示 message；成功/失败含义由文案与业务上下文说明，不创建多套 tone 外观。
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
