# Flow Sheet

> 组件 id：`flow-sheet` · 分类：`feedback`
> 实现：[FlowSheet.vue](../../../src/design-system/components/feedback/FlowSheet.vue)
> 契约：[flow-sheet.json](../../../src/design-system/components/contracts/flow-sheet.json)

在同一张底部 Sheet 内承载连续多步操作。

## 职责与边界

- 精确身份是 `componentId=flow-sheet`，通用产品职责固定为 `role=sheet`；不为组件创建同名 role。
- Sheet 内只有一个裁剪视口，各步骤等宽横排，当前 step 以整页宽度进入视口。
- 复用 Bottom Sheet 的 scrim 与 raised surface，内部增加标题、步骤指示、步骤视口和操作区。
- 关闭、提交、取消和路由仍由业务流程决定。

## 行为要点

- `step` 是受控零基索引，切换通过 `update:step` 回传。
- swipe 开启时允许横向切步，但相邻步骤不得从视口边缘泄漏。
- 关闭只更新 `modelValue`，不替业务流程提交、取消或跳转。
- Overlay 宿主保留顶部 `radius.lg`；步骤视口零内边距并裁剪横向轨道。

## States

| id | label | kind |
| --- | --- | --- |
| `step-one` | 第一步 | `content` |
| `step-two` | 第二步 | `content` |

## 用法与反例

- 用于确认 → 执行 → 结果等连续步骤；单一半屏内容使用 Bottom Sheet。
- 不把每一步变成独立路由，也不新增 `flow-sheet` role 或复制横滑仲裁。
- Props、Slots、Events、默认值与 Token 槽以 [Flow Sheet Contract](../../../src/design-system/components/contracts/flow-sheet.json) 为准。
