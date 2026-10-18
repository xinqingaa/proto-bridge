# DurationPicker

> 组件 id：`duration-picker` · 分类：`input`
> 实现：[DurationPicker.vue](../../../src/design-system/components/input/DurationPicker.vue)
> 契约：[duration-picker.json](../../../src/design-system/components/contracts/duration-picker.json)

小时与分钟双滚轮，值为总分钟数。

## 职责与边界

固定使用 `role=field`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 范围为 0 至 23 小时 59 分钟，分钟按 minuteStep 向下对齐。
- 使用原生纵滚与 scroll snap，不复制横滑或拖动仲裁；点击、上下键与 Home/End 等价。
- 外部更新会同步滚轮位置；禁用时阻止滚动提交与点击提交。

## States

| id | label | kind |
| --- | --- | --- |
| `short` | 短时长 | `content` |
| `disabled` | 禁用 | `interaction` |

## 用法与反例

用于 0–23 小时的时长，不是一天中的时间；minuteStep 为 1 / 5 / 15 / 30，外部值显示到下方可用分钟档，交互后发出合法总分钟数。使用原生纵滚与 scroll-snap，不复制指针仲裁或时钟。

Props、Slots、Events、默认值与 Token 槽以 [DurationPicker Contract](../../../src/design-system/components/contracts/duration-picker.json) 为准。

## 展示与组合

小时与分钟共享中央选中带，单位在中心行固定，边缘通过遮罩衰减；滚动条隐藏但滚动/键盘仍可用。遮罩来自不可覆盖的实现常量。
