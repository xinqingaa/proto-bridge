# Button

> 组件 id：`button` · 分类：`action`
> 实现：[Button.vue](../../../src/design-system/components/action/Button.vue)
> 契约：[button.json](../../../src/design-system/components/contracts/button.json)

表单与决策区操作。提供中性主要、次要、描边，以及品牌强调、危险和轻量操作。loading 保留文案，disabled 使用禁用透明度。

## 职责与边界

- 用于提交、确认、保存和空态 CTA；纯图标操作使用 Icon Button。
- 固定语义为 `role=button`，业务实例仍需提供稳定 `inspectId`。
- 页面只选择 `kind`，不传色槽、不组合 Token 配色。

## 类型

| 类型     | `kind`            | 场景                                                     | 禁止                               |
| -------- | ----------------- | -------------------------------------------------------- | ---------------------------------- |
| 主要类型 | `primary`（默认） | 中性主要决策；两颗时的确认、提交、保存、继续 | 同一行两颗主要类型                 |
| 次要类型 | `secondary`       | 只与主要类型成对：取消、保存草稿、稍后                   | 单独出现；充当关闭或返回           |
| 描边类型 | `outlined` | 卡片内查看、了解更多等轻量动作 | Confirm、Sheet、FlowSheet 的决策区 |
| 品牌强调 | `accent` | 开始、保存等使用主题品牌色的主要动作 | 与另一颗主要动作竞争 |
| 危险操作 | `danger` | 删除、重置等危险确认 | 普通提交 |
| 轻量操作 | `quiet` | 跳过、辅助取消 | 图标关闭、导航目的地 |

决策区（Confirm / Bottom Sheet / Flow Sheet 操作行）布局：

```text
一颗：  [            主要类型（占满）            ]
两颗：  [     次要类型     ] [     主要类型     ]
```

双按钮等分撑满容器；左右文案尽量等长（如「取消」「确认」）。品牌主操作可将主要类型替换为accent，危险确认使用danger；一行只设一个主要决策。

## 行为要点

- 各类型的色外观由组件内部绑定，不向调用方开放 `bgColor` / `borderColor` / `textColor`。
- loading 时阻止重复触发，spinner 与文案同时可见，并保持操作强调度。
- disabled 才使用 `opacity.disabled`；loading 不得伪装成 disabled。

## States

| id | label | kind |
| --- | --- | --- |
| `pill` | 胶囊 | `variant` |
| `loading` | 加载 | `interaction` |
| `disabled` | 禁用 | `interaction` |
| `glass` | 玻璃材质 | `variant` |
| `glass-loading` | 玻璃加载 | `interaction` |
| `glass-disabled` | 玻璃禁用 | `interaction` |
| `accent` | 开始专注 | `variant` |
| `danger` | 删除记录 | `variant` |
| `quiet` | 暂时跳过 | `variant` |


## 用法与反例

- 需要关闭或返回时使用 Sheet 顶栏 Icon Button，不用 Button 冒充。
- 不用 Button 模拟 Icon Button、Tab、Chip 或导航目的地。
- Props、Slots、Events、默认值与 Token 槽以 [Button Contract](../../../src/design-system/components/contracts/button.json) 为准。

## 玻璃材质

`material="glass"` 是可选材质，默认 `solid` 保持原有外观；与操作类型、尺寸、加载和禁用状态独立。适用于悬浮操作和丰富背景上的按钮。复用 GlassMaterial，前景独立合成保持清晰；降低透明度或不支持滤镜时回退实色，主要操作仍保留强调度。玻璃加载、禁用状态在同一手机预览中展示。

品牌强调使用color.primary/on-primary，危险使用color.error，轻量使用color.on-surface-muted。字距来自tracking.label，accent最小宽度来自size.action-min-inline；调用方不得换绑颜色。玻璃accent保留足够的品牌染色和对应前景，danger保留危险轮廓；quiet通常使用实色材质并让背景透明。

`shape="rounded"`保留默认控件圆角；`shape="pill"`用于胶囊操作，绑定`radius.pill`。形状与kind、size和material独立，加载及禁用行为相同。
