# Implementation Discipline

- Screenshot 与 Fragment 的结构、token、文案、状态和交互约束可观察结果；按目标工程规范选择实现方式。
- 不要凭经验补造 Evidence 未支持的容器、文案、状态或入口；目标工程允许的实现差异要记录依据。
- Evidence 未给出的布局敏感 prop，先对照 Screenshot；仍不确定时记录风险。
- 优先复用目标工程已声明或扫描确认的组件、Theme、路由和状态边界；只有确有需要时才扩展。
- 覆盖 Handoff 选中的 Case、variant 和 interaction；不能实现的范围及时披露。
- Acceptance Contract 中的 parent、order、scroll owner、shell policy 和 positioning 是硬结构约束；不得按平台常见模板重新解释。
- Evidence 有 `componentId` 时必须映射到目标工程已存在的公共组件；无可靠目标组件时标为 unverified，不得静默手写后计为命中。
- 每个 Token binding 必须落到同一语义节点的目标 Theme/Token；仅视觉近似或 raw value 不计为 Token 命中。
