# Icon Button

> 组件 id：`icon-button` · 分类：`action`
> 实现：[IconButton.vue](../../../src/design-system/components/action/IconButton.vue)
> 契约：[icon-button.json](../../../src/design-system/components/contracts/icon-button.json)

紧凑的单一图标操作，用于工具栏、顶栏和局部快捷入口。

## 职责与边界

- 固定语义为 `role=button`，必须具有可读的操作名称；图形不能承担唯一语义。
- 图标来自统一 Lucide 策展清单；带文字的提交或确认操作使用 Button。
- 尺寸、颜色、阴影和状态透明度均由 Contract Token 槽决定。

## 行为要点

- `ariaLabel` 始终说明操作目的。
- loading 阻止重复触发，但保持操作强调度，不降为禁用视觉。
- disabled 阻止激活并使用 `opacity.disabled`。
- 点击提供受控按压反馈，不由业务页面复制手势或动画。

## States

| id | label | kind |
| --- | --- | --- |
| `primary` | 主色 | `variant` |
| `loading` | 加载 | `interaction` |
| `disabled` | 禁用 | `interaction` |
| `glass` | 玻璃材质 | `variant` |
| `glass-loading` | 玻璃加载 | `interaction` |
| `glass-disabled` | 玻璃禁用 | `interaction` |
| `glass-primary` | 主色玻璃 | `variant` |


## 用法与反例

- Playground 使用 gallery 并置默认、强调、loading 与 disabled 状态。
- 不用 Icon Button 承载长文案，也不在业务页直接给 Icon 绑定点击。
- Props、Slots、Events、默认值与 Token 槽以 [Icon Button Contract](../../../src/design-system/components/contracts/icon-button.json) 为准。

## 玻璃材质

`material="glass"` 是可选材质，默认 `solid` 保持原有外观；与操作类型、尺寸、加载和禁用状态独立。适用于悬浮操作和丰富背景上的按钮。复用 GlassMaterial，前景独立合成保持清晰；降低透明度或不支持滤镜时回退实色，主要操作仍保留强调度。玻璃加载、禁用状态在同一手机预览中展示。
