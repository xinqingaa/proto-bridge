# Icon Button

> 组件 id：`icon-button` · 契约：`contracts/icon-button.json`

紧凑的单一图标操作，用于工具栏、顶栏和局部快捷入口。

## 职责与边界

- 必须有可读的操作名称；图形本身不能承担唯一语义。
- 图标来自统一 Lucide 策展清单；缺项先扩共享清单，不复制页内图标。
- 不用于带文字的提交或确认操作，后者使用 Button。

## 交互状态

- 点击有按压反馈。
- loading 阻止重复触发，但不降为禁用视觉。
- disabled 阻止激活并统一使用 `opacity.disabled`（0.38）。

`primary` 是强调外观状态；`loading` 是忙碌交互状态；`disabled` 是不可用交互状态。Playground 使用 `gallery`：默认、强调、loading、disabled 并置，方便比较紧凑操作的状态而不占用右侧调参栏。
