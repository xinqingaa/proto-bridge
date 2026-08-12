# Confirm

> 组件 id：`confirm` · 分类：`feedback`
> 实现：[ConfirmDialog.vue](../../../src/design-system/components/feedback/ConfirmDialog.vue)
> 契约：[confirm.json](../../../src/design-system/components/contracts/confirm.json)

确认类模态对话框，要求用户显式确认或关闭。

## 职责与边界

- 固定使用 `role=dialog`，用于短确认，不承担底栏流程或多步任务。
- 对话框在视口居中并受统一最大宽度约束，正文与操作区保持稳定纵向次序。
- 固定结构是 scrim → raised dialog surface → 标题/正文 → 确认操作。

## 行为要点

- 默认关闭，由明确触发打开；确认先发出 `confirm`，再关闭自身。
- 调用方决定确认后的业务动作、异步处理和导航。
- 关闭恢复下层焦点与交互，不隐藏未处理风险。

## States

| id | label | kind |
| --- | --- | --- |
| `open` | 打开 | `content` |

## 用法与反例

- 用于删除、覆盖、提交等短确认；半屏内容使用 Bottom Sheet，多步流程使用 Flow Sheet。
- 不在页面复制 scrim/dialog，也不让 Confirm 自行执行领域操作。
- Props、Slots、Events、默认值与 Token 槽以 [Confirm Contract](../../../src/design-system/components/contracts/confirm.json) 为准。
