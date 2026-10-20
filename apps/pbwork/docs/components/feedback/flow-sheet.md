# Flow Sheet

> 组件 id：`flow-sheet` · 分类：`feedback`
> 实现：[FlowSheet.vue](../../../src/design-system/components/feedback/FlowSheet.vue)
> 契约：[flow-sheet.json](../../../src/design-system/components/contracts/flow-sheet.json)

在同一张底部 Sheet 内承载连续多步操作。

## 职责与边界

- 精确身份是 `componentId=flow-sheet`，通用产品职责固定为 `role=sheet`；不为组件创建同名 role。
- Sheet 内只有一个横向裁剪视口，使用不可滚动的裁剪层隔离主体纵向滚动；各步骤等宽横排，当前 step 以整页宽度进入视口。键盘聚焦滚轮不得让主体横向滚动或使步骤错位。
- 顶栏是通用结构：左侧返回、中间标题、右侧关闭；顶栏与主体之间无分割线。返回只在第一页之外出现；关闭始终关闭整张 Sheet。
- 步骤指示器固定在可滚动内容下方、操作区上方；没有操作区时仍位于面板底部，不随内容滚动。
- 决策按钮放在 `actions` 槽，走 Button 类型规范。

## 行为要点

- `step` 是受控零基索引，切换通过 `update:step` 回传。
- swipe 开启时允许横向切步并跟手预览；松手后当前步骤以整页宽度平移进入视口。
- 返回只更新 `step`；关闭只更新 `modelValue`。页面不得再自造返回或关闭。
- 操作区一颗按钮时使用主要类型并占满；两颗时左侧次要、右侧主要，等分撑满。

材质默认 `solid`；`material=glass` 使用共享 GlassMaterial 及实色降级，不改变焦点、关闭、滚动或导航。ActionSheet 将材质传给公共 BottomSheet shell，内容不再叠套玻璃。

## States

| id | label | kind |
| --- | --- | --- |
| `step-one` | 第一步 | `content` |
| `step-two` | 第二步 | `content` |
| `glass` | 玻璃面板 | `variant` |

## 用法与反例

- 用于确认 → 执行 → 结果等连续步骤；单一半屏内容使用 Bottom Sheet。
- 不把每一步变成独立路由，也不在步骤内容或操作区复制返回/关闭。
- Props、Slots、Events、默认值与 Token 槽以 [Flow Sheet Contract](../../../src/design-system/components/contracts/flow-sheet.json) 为准。
