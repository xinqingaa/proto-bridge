# Button

> 组件 id：`button` · 分类：`action`
> 实现：[Button.vue](../../../src/design-system/components/action/Button.vue)
> 契约：[button.json](../../../src/design-system/components/contracts/button.json)

表单与决策区操作。公开三种类型：主要、次要、描边。loading 保留文案，disabled 使用禁用透明度。

## 职责与边界

- 用于提交、确认、保存和空态 CTA；纯图标操作使用 Icon Button。
- 固定语义为 `role=button`，业务实例仍需提供稳定 `inspectId`。
- 页面只选择 `kind`，不传色槽、不组合 Token 配色。

## 类型

| 类型 | `kind` | 场景 | 禁止 |
| --- | --- | --- | --- |
| 主要类型 | `primary`（默认） | 一行只有一颗按钮时必须用；两颗时的确认、提交、保存、继续 | 同一行两颗主要类型 |
| 次要类型 | `secondary` | 只与主要类型成对：取消、保存草稿、稍后 | 单独出现；充当关闭或返回 |
| 描边类型 | `outlined` | 最弱档；卡片内查看、了解更多等轻量动作 | Confirm、Sheet、FlowSheet 的决策区 |

决策区（Confirm / Bottom Sheet / Flow Sheet 操作行）布局：

```text
一颗：  [            主要类型（占满）            ]
两颗：  [     次要类型     ] [     主要类型     ]
```

双按钮等分撑满容器；左右文案尽量等长（如「取消」「确认」）。

## 行为要点

- 三种类型的色外观由组件内部绑定，不向调用方开放 `bgColor` / `borderColor` / `textColor`。
- loading 时阻止重复触发，spinner 与文案同时可见，并保持操作强调度。
- disabled 才使用 `opacity.disabled`；loading 不得伪装成 disabled。

## States

| id | label | kind |
| --- | --- | --- |
| `loading` | 加载 | `interaction` |
| `disabled` | 禁用 | `interaction` |

## 用法与反例

- 需要关闭或返回时使用 Sheet 顶栏 Icon Button，不用 Button 冒充。
- 不用 Button 模拟 Icon Button、Tab、Chip 或导航目的地。
- Props、Slots、Events、默认值与 Token 槽以 [Button Contract](../../../src/design-system/components/contracts/button.json) 为准。
