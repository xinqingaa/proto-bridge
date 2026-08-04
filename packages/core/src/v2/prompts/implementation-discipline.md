# Implementation Discipline

- Screenshot 是最终可见结果的首要依据；Fragment、结构、组件和 Token Evidence 帮助解释 Screenshot 与选择目标工程实现方式。
- 不要凭经验补造 Evidence 未支持的容器、文案、状态或入口；目标工程允许的实现差异要记录依据。
- Evidence 未给出的布局敏感 prop，先对照 Screenshot；仍不确定时记录风险。
- 优先复用目标工程已声明或扫描确认的组件、Theme、路由和状态边界；只有确有需要时才扩展。
- 覆盖 Handoff 选中的 Case、variant 和 interaction；不能实现的范围及时披露。
- `read_screen_packet` 的壳层与滚动摘要，以及按需 structure detail 中的 parent、order、scroll owner 和 positioning，用于避免误解页面构图；无法确认时如实披露。
- Evidence 有 `componentId` 时优先复用目标工程公共组件；没有可靠映射时结合 Screenshot 和目标规范实现，并说明取舍。
- Token binding 用于优先命中目标 Theme/Token；不能可靠映射时仍需保证 Screenshot 所示的最终视觉，并记录已知差异。
- 不要默认遍历全部 detail projection。每次查询都应对应一个明确的实现判断；同一查询 `complete=true` 后停止，避免以读取替代决策。
