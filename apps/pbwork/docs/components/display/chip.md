# Chip

> 组件 id：`chip` · 分类：`display`
> 实现：[Chip.vue](../../../src/design-system/components/display/Chip.vue)
> 契约：[chip.json](../../../src/design-system/components/contracts/chip.json)

紧凑标签或轻量短选项表面。

## 职责与边界

- 固定使用 `role=chip`，表达紧凑标签或显式选择项；只读严重度优先使用 Badge。
- tone 与 elevated 只改变受控外观，不隐式增加业务状态。
- 标准一排筛选优先使用 Filter Bar；自定义 Chip 行必须遵守父级横滑仲裁。

## 行为要点

- 需要选择交互时，调用方必须提供可观察的选中状态、可访问名称和明确操作语义。
- 只读 Chip 不响应点击，也不伪装成 Button。
- 外观只消费 Contract Token，不允许实例自由换绑。

## States

当前 Contract 不声明命名状态；tone、elevated 与内容值仍受 Props Contract 限定，不能由文档另建枚举。

## 用法与反例

- 用于紧凑标签或有限轻量选择；标准数据筛选使用 Filter Bar。
- 不用 Chip 替代 Badge、Button 或拥有内容视图区的 Tab。
- Props、Slots、Events、默认值与 Token 槽以 [Chip Contract](../../../src/design-system/components/contracts/chip.json) 为准。
