# MonthCalendar

> 组件 id：`month-calendar` · 分类：`display`
> 实现：[MonthCalendar.vue](../../../src/design-system/components/display/MonthCalendar.vue)
> 契约：[month-calendar.json](../../../src/design-system/components/contracts/month-calendar.json)

按月选择日期，使用固定星期顺序与受控月份。

## 职责与边界

固定使用 `role=section`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 月份和日期来自 props，不使用系统当前时间；非法月份不渲染错误日历。
- 一周从周一开始，前后月切换正确跨年；禁用日期不可选。
- 方向键和 Home/End 在当前月可用日期间移动焦点，Enter/Space 选择。

## States

| id | label | kind |
| --- | --- | --- |
| `next-month` | 八月 | `content` |
| `empty-selection` | 未选择 | `content` |

## 用法与反例

调用方显式传 month 与 modelValue，处理两个更新事件；月份切换不自动改选中日期，组件不读取系统“今天”。不承诺完整日期范围选择器。

Props、Slots、Events、默认值与 Token 槽以 [MonthCalendar Contract](../../../src/design-system/components/contracts/month-calendar.json) 为准。

## 展示与组合

月份使用可读年月标题和 SVG 翻月按钮；七列保持 Flex 等分。today 由调用方提供确定日期，区别于选中与禁用，不读取系统当前日期。


## 日期单元扩展

`day` scoped slot 提供 `date`、`selected`、`today`、`disabled`，调用方可绘制业务标记；不在插槽内再放按钮或复制日期/键盘机制。`dayLabels` 按日期提供可访问说明，未提供时保留日期标签。默认插槽内容仍为日期数字。
