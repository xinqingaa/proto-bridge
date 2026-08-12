# Menu

> 组件 id：`menu` · 分类：`input`
> 实现：[Menu.vue](../../../src/design-system/components/input/Menu.vue)
> 契约：[menu.json](../../../src/design-system/components/contracts/menu.json)

从有限业务选项中选择；组件 id 描述输入职责，不与目标平台 Overlay 目录绑定。

## 职责与边界

- 固定使用 `role=field`，拥有触发字段、有限选项面板和选择结果。
- 选项面板与字段对齐并受统一最大高度约束；复杂自定义菜单行为不属于该字段组件。
- Target 可以翻译为 Flutter Select、Popup 或其它平台实现，但不得改变有限选择语义。

## 行为要点

- open 是受控内容状态，选择后更新值并按 Contract 关闭面板。
- loading 表示选项正在准备，保留可读忙碌反馈，不得与 disabled 共用语义或外观。
- error 展示字段级反馈；disabled 阻止打开和选择，并使用 `opacity.disabled`。
- 标签、字段表面、状态提示和浮动面板保持独立结构层级。

## States

| id | label | kind |
| --- | --- | --- |
| `open` | 展开菜单 | `content` |
| `loading` | 加载 | `interaction` |
| `error` | 错误 | `content` |
| `disabled` | 禁用 | `interaction` |

## 用法与反例

- 用于服务类型、负责人等有限选项；选项结构由受控数据或 `item` slot 提供。
- 不把任意命令菜单、树形选择或远程自由搜索静默塞进本 Contract。
- Props、Slots、Events、默认值与 Token 槽以 [Menu Contract](../../../src/design-system/components/contracts/menu.json) 为准。
