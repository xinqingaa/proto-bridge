# ListCell

> 组件 id：`list-cell` · 分类：`data`
> 实现：[ListCell.vue](../../../src/design-system/components/data/ListCell.vue)
> 契约：[list-cell.json](../../../src/design-system/components/contracts/list-cell.json)

列表单元：前置图标、主副标题、尾部值与导航或开关。

## 职责与边界

固定使用 `role=list-item`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 导航按钮与 Switch 是独立原生交互区域，不嵌套按钮；开关出现时不再显示导航按钮。
- 整行保持 list-item 身份；主副文案和尾部值各有证据节点，禁用状态阻止操作。

## States

| id | label | kind |
| --- | --- | --- |
| `compact` | 紧凑行距 | `variant` |
| `switch` | 开关单元 | `variant` |
| `disabled` | 禁用 | `interaction` |

## 用法与反例

放在列表容器内，leading 插槽或 icon 提供前置内容；modelValue 为 boolean 时使用开关，null 表示没有开关。开关与导航互斥，业务不要嵌套按钮。

Props、Slots、Events、默认值与 Token 槽以 [ListCell Contract](../../../src/design-system/components/contracts/list-cell.json) 为准。

`density="compact"`用于紧凑配置列表，ListCell内边距改为`spacing.xs`，保留`size.touch`热区；GroupedList将该公开选项传给行组件，默认regular不变。
