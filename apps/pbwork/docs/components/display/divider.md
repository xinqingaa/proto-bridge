# Divider

> 组件 id：`divider` · 分类：`display`
> 实现：[Divider.vue](../../../src/design-system/components/display/Divider.vue)
> 契约：[divider.json](../../../src/design-system/components/contracts/divider.json)

装饰性内容分隔线，可选展示居中短文案。

## 职责与边界

- semantic policy 为 decorative，默认不写业务 identity/role，也不形成独立 Evidence 节点。
- 无 label 时只绘制分隔线；有 label 时仍属于同一分隔结构。
- inset 只改变受控缩进，不赋予交互、分组或业务状态语义。

## 行为要点

- Divider 只表达视觉分隔，不替代语义化 `section`、标题或列表结构。
- 若业务确实需要独立验收分隔含义，应由调用方建立真实语义节点，而不是给装饰线伪造 role。
- 线宽、颜色、间距和排版只消费 Contract Token。

## States

| id | label | kind |
| --- | --- | --- |
| `plain` | 无文案 | `content` |
| `inset` | 缩进 | `variant` |

## 用法与反例

- 用于同一内容区内部的视觉分隔；真正的内容分组使用语义化容器。
- 不把 Divider 放入 required Fragment，也不通过它表达业务状态。
- Props、Slots、Events、默认值与 Token 槽以 [Divider Contract](../../../src/design-system/components/contracts/divider.json) 为准。
