# LaunchScreen

> 组件 id：`launch-screen` · 分类：`navigation`
> 实现：[LaunchScreen.vue](../../../src/design-system/components/navigation/LaunchScreen.vue)
> 契约：[launch-screen.json](../../../src/design-system/components/contracts/launch-screen.json)

启动与欢迎页的内容模式，进入行为由业务决定。

## 职责与边界

固定使用 `role=page`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 品牌、插画、内容和 actions 提供插槽，默认动作发出 start；不写路由或定时跳转。
- busy 由已有 Button 的 loading 行为处理，不伪装为 disabled。
- 原型可放入 PrototypeShell 的 launch 插槽；主题资源仅随 Token 解析变化。

## States

| id | label | kind |
| --- | --- | --- |
| `busy` | 准备中 | `interaction` |
| `welcome` | 欢迎 | `content` |

## 用法与反例

放入 PrototypeShell 的 launch 插槽，品牌、插画、正文、actions 可替换。组件只发 start；业务决定何时进入，使用共享导航与声明时钟，不内置定时跳转。

Props、Slots、Events、默认值与 Token 槽以 [LaunchScreen Contract](../../../src/design-system/components/contracts/launch-screen.json) 为准。
