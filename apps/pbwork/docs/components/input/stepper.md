# Stepper

> 组件 id：`stepper` · 分类：`input`
> 实现：[Stepper.vue](../../../src/design-system/components/input/Stepper.vue)
> 契约：[stepper.json](../../../src/design-system/components/contracts/stepper.json)

有限范围内增减数值，按钮与数值输入使用同一边界。

## 职责与边界

固定使用 `role=field`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 输入和增减统一钳制 min/max，并按 step 对齐；非有限输入恢复原值。
- 到达边界或整体禁用时阻止相应操作；原生数字输入提供键盘路径。

## States

| id | label | kind |
| --- | --- | --- |
| `minimum` | 最小值 | `content` |
| `maximum` | 最大值 | `content` |
| `disabled` | 禁用 | `interaction` |

## 用法与反例

适合次数、数量等有限步进输入；调用方提供合法 min ≤ max 与正 step，保持受控值回写，不用它编辑无限精度测量。

Props、Slots、Events、默认值与 Token 槽以 [Stepper Contract](../../../src/design-system/components/contracts/stepper.json) 为准。

## 展示与组合

减/加与可编辑数值组成整体容器；数值突出，范围边界、步长与禁用行为一致。保留原生 number 语义，隐藏浏览器装饰性步进箭头。
