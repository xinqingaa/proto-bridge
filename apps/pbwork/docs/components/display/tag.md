# Tag

> 组件 id：`tag` · 分类：`display`
> 实现：[Tag.vue](../../../src/design-system/components/display/Tag.vue)
> 契约：[tag.json](../../../src/design-system/components/contracts/tag.json)

紧凑只读分类或状态标签，不承担选择交互。

## 职责与边界

固定使用 `role=badge`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- tone 是有限语义，不能传颜色或 Token 重绑。
- 只读标签没有按钮角色或可点击样式；筛选使用 SegmentedControl 或 FilterBar。

## States

| id | label | kind |
| --- | --- | --- |
| `success` | 完成 | `variant` |
| `warning` | 提醒 | `variant` |

## 用法与反例

只读状态标签；可选筛选项使用 Chip，不给 Tag 塞入点击或关闭动作。

Props、Slots、Events、默认值与 Token 槽以 [Tag Contract](../../../src/design-system/components/contracts/tag.json) 为准。
