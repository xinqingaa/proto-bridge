# App Bar

> 组件 id：`app-bar` · 分类：`navigation`
> 实现：[AppBar.vue](../../../src/design-system/components/navigation/AppBar.vue)
> 契约：[app-bar.json](../../../src/design-system/components/contracts/app-bar.json)

页面或栈级顶部栏，统一承载标题、返回动作和一个可选尾部操作。

## 职责与边界

- 固定使用 `role=app-bar`，只负责顶部结构与事件，不自行决定路由。
- `showBack` 只控制返回入口；根目的地是否显示 App Bar 由页面组合决定。
- 尾部仅承载一个明确操作；复杂工具栏由页面另行组织。

## 行为要点

- 返回入口触发 `back` 事件，调用方通过统一导航辅助决定 pop、replace 或其它行为。
- 标题为空时不渲染标题节点，供内容区已经承担大标题的栈页使用。
- 尾部操作必须有可访问名称，并通过 `action` 事件交给页面处理。
- 标题、图标、触控尺寸、边框和表面只消费 Contract Token。

## States

| id | label | kind |
| --- | --- | --- |
| `no-back` | 无返回 | `content` |

## 用法与反例

- 栈页通常使用返回入口；根页只有在需要统一标题/全局操作时才添加。
- 不在 App Bar 内塞入多行表单、Tabs 或业务列表，也不让组件读取 Router。
- Props、Slots、Events、默认值与 Token 槽以 [App Bar Contract](../../../src/design-system/components/contracts/app-bar.json) 为准。
