# Spinner

> 组件 id：`spinner` · 分类：`display`
> 实现：[Spinner.vue](../../../src/design-system/components/display/Spinner.vue)
> 契约：[spinner.json](../../../src/design-system/components/contracts/spinner.json)

局部、不阻断的忙碌指示。

## 职责与边界

- 固定使用 `role=loading-state`，不创建 scrim、不拦截下层点击，也不拥有异步任务生命周期。
- 蒙层阻断流程必须使用 Loading；确定比例反馈使用 Progress。
- 可选 label 只说明正在处理的内容，尺寸只使用受控语义档位。

## 行为要点

- Spinner 始终保持局部非阻断；业务逻辑决定相关操作是否另行禁用。
- `sm`、`md`、`lg` 只改变受控尺寸，不接受固定数字。
- 颜色、描边与旋转动效只消费 Contract Token。

## States

| id | label | kind |
| --- | --- | --- |
| `small` | 小尺寸 | `variant` |
| `large` | 大尺寸 | `variant` |

## 用法与反例

- 用于列表局部刷新、按钮内忙态或小区域异步反馈。
- 不用 Spinner 自造全屏遮罩，也不把“不可点击”误写成 Spinner 自身职责。
- Props、Slots、Events、默认值与 Token 槽以 [Spinner Contract](../../../src/design-system/components/contracts/spinner.json) 为准。
