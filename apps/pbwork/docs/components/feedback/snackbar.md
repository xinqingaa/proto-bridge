# Snackbar

> 组件 id：`snackbar` · 分类：`feedback`
> 实现：[Snackbar.vue](../../../src/design-system/components/feedback/Snackbar.vue)
> 契约：[snackbar.json](../../../src/design-system/components/contracts/snackbar.json)

可撤销的短提示，撤销语义由业务处理。

## 职责与边界

固定使用 `role=toast`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 复用 Vuetify snackbar 的超时和 Overlay 机制；不阻断页面操作。
- 每次打开最多撤销一次，撤销事件先于关闭事件；真实数据恢复由业务处理。

## States

| id | label | kind |
| --- | --- | --- |
| `visible` | 可撤销 | `content` |
| `hidden` | 已关闭 | `content` |

## 用法与反例

适用于可恢复的删除等操作；监听 undo 执行真实恢复并回写 modelValue。组件每次打开最多发出一次 undo，取消或超时不等于撤销；无动作提示用 Toast。

Props、Slots、Events、默认值与 Token 槽以 [Snackbar Contract](../../../src/design-system/components/contracts/snackbar.json) 为准。
