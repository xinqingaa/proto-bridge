# ADR 0002：完整性由 authored Runtime Contract 声明

- 状态：Accepted

## 决策

Screen/Variant 的语义完整性由原型作者通过 `requiredFragments`、Action、Scenario 和 Checkpoint 声明。采集器只能验证该边界，不能通过 DOM 数量、截图面积、源码命名或启发式规则猜测页面已经完整。

## 理由

浏览器只能看到实际 DOM，却不知道哪些区域对产品任务是必需的。例如页面可能渲染了标题和空容器，但关键列表仍未加载；像素截图看似完整，也不能证明隐藏状态、操作路径或语义身份。

只有原型作者知道：

- 哪些区域缺失会使页面不可实现；
- 哪些 Variant 属于关键业务状态；
- 哪些交互结果需要检查；
- 页面何时完成了可采集状态准备。

## 结果

- default 与 critical Variant 必须声明 required boundary。
- required Fragment 必须稳定、唯一、可见且 bbox 非零。
- Runtime 提供 prepare、readiness、semantic snapshot、scenario 和 reset。
- 未满足边界的 Case 不能声明 semantic completeness。
- Source 或 Target 启发式不能补齐 required Fact。

