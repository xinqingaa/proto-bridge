# Implementation Discipline

- Screenshot 是最终可见结果的首要依据；Fragment、结构、组件和 Token Evidence 帮助解释 Screenshot 与选择目标工程实现方式。
- 不要凭经验补造 Evidence 未支持的容器、文案、状态或入口；目标工程允许的实现差异要记录依据。
- Evidence 未给出的布局敏感 prop，先对照 Screenshot；仍不确定时记录风险。
- 优先复用目标工程已声明或扫描确认的组件、Theme、路由和状态边界；只有确有需要时才扩展。
- 覆盖 Handoff 选中的 Case、variant 和 interaction；不能实现的范围及时披露。
- `read_screen_packet` 的 baseline Structure IR 是容器实现约束：逐节点 parent、scroll owner/member、positioning/pinning、sibling order 和 bbox relation 必须一起转译；不能把 owner 去重列表或 Screenshot 观感替代这些关系。
- baseline state 包含可见 Region、文案、keyed collection 和状态要求；`read_case_delta` 只携带紧凑 value/resolution patch，provenance 变化需要时再定向展开。
- Evidence 有 `componentId` 时优先复用目标工程公共组件；没有可靠映射时结合 Screenshot 和目标规范实现，并说明取舍。
- Token binding 用于优先命中目标 Theme/Token；不能可靠映射时仍需保证 Screenshot 所示的最终视觉，并记录已知差异。
- Authoritative Review 的 component/token claim 必须定位到实际 Dart 构造调用；Token 还必须声明 owner constructor 和 named-argument slot。不能用全仓存在、import 或另一个 occurrence 代替当前 obligation 的落点。
- 不要默认遍历全部 detail projection。每次查询都应对应一个明确的实现判断；同一查询 `complete=true` 后停止，避免以读取替代决策。
