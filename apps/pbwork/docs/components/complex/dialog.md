# Dialog

> 组件 id：`dialog` · 分类：`complex`  
> 实现：`apps/pbwork/src/design-system/components/complex/DialogPanel.vue`  
> 契约：`apps/pbwork/src/design-system/components/contracts/dialog.json`

需要确认或知悉的打断式说明，如完成工单、离线提示。

## 职责

- **做什么**：破坏性/确认操作。
- **边界**：确认/阻断对话；轻提示用 Snackbar。宜与主滚动列**兄弟挂载**（见 recipes R4），打开态注册 Variant。
- **不要用于**：多步流程（用 FlowSheet）或非阻断操作面板（用 BottomSheet）。

## 行为要点

- 默认关闭；Playground 与产品页通过触发打开。
- `confirm` 发出后由调用方关闭；组件不擅自导航。
- Props、Token 槽以 Contract 为准。

## States

| id | label | kind |
| --- | --- | --- |
| `open` | 打开 | content |

Playground：`presentation: trigger`。

## 用法要点

1. 从 `@/design-system/components/complex/DialogPanel.vue` 引入。
2. 业务原型传稳定 `inspectId`；打开态进 Variant。
