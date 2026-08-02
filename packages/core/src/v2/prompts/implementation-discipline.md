# Implementation Discipline

- Screenshot 与 Fragment 的结构、token、文案、状态和交互约束可观察结果；按目标工程规范选择实现方式。
- 不要凭经验补造 Evidence 未支持的容器、文案、状态或入口；目标工程允许的实现差异要记录依据。
- Evidence 未给出的布局敏感 prop，先对照 Screenshot；仍不确定时记录风险。
- 优先复用目标工程已声明或扫描确认的组件、Theme、路由和状态边界；只有确有需要时才扩展。
- 覆盖 Handoff 选中的 Case、variant 和 interaction；不能实现的范围及时披露。
