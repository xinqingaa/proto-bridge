# Implementation Discipline

- Screenshot 是最终可见结果的首要依据；Fragment、结构、组件和 Token Evidence 帮助解释 Screenshot 与选择目标工程实现方式。
- 不要凭经验补造 Evidence 未支持的容器、文案、状态或入口；目标工程允许的实现差异要记录依据。
- Evidence 未给出的布局敏感 prop，先对照 Screenshot；仍不确定时记录风险。
- 优先复用目标工程已声明或扫描确认的组件、Theme、路由和状态边界；只有确有需要时才扩展。
- 覆盖 Handoff 选中的 Case、variant 和 interaction；不能实现的范围及时披露。
- `read_screen_packet` 的 baseline Structure 与 `canonicalBrief` 约束主滚动所有者、成员 section 和关键邻接关系；必须转译这些页面语义，但不能把 Evidence Region 一一映射为目标侧组件、列表项或类/文件边界。用目标工程自然的组件组合表达同一滚动与层级关系。
- baseline state 与 canonical 业务数据包含状态壳层、可见内容、keyed collection、选项和 selected/default 标量值；优先原样复用，禁止近似发明 mock。业务 identity/key 必须原样落到 Target，不能以列表位置代替。
- Evidence 有 `componentId` 时优先复用目标工程公共组件；没有可靠映射时结合 Screenshot 和目标规范实现，并说明取舍。
- Token binding 用于优先命中目标 Theme/Token；不能可靠映射时仍需保证 Screenshot 所示的最终视觉，并记录已知差异。
- Authoritative Review 的 component/token claim 必须定位到目标工程中实际采用的构造/调用 occurrence；Token 还必须声明 owner 与 named slot（具体形态由 Target adapter/contract 决定）。不能用全仓存在、import 或另一个 occurrence 代替当前 obligation 的落点。
- Authoritative Review 的 state/interaction claim 只提交适用 Case；Source expected 由固定 obligation 读取。Target Scenario driver 必须记录实际动作目标和前后 typed state，不能由 Agent 自填“预期结果”充当运行结果。
- Flutter Target 的 Runtime/Visual Review 以目标工程声明的 `review.version: 3` 为前置。Harness 只能在用户批准实施计划后加入：它必须提供 `operator-dtd-uri` attach 和 debug-only identity/control/case-input/prepare/ready/observation Driver Bridge，启用 Flutter Driver extension，为固定 Handoff Case/Scenario 提供稳定 finder 与 typed State/Structure observation，并把运行 App 的 build/Target identity 绑定到同一 Review；不得用固定设备、UDID、target launcher 或 stdout JSON 代替。
- obligation 分母用于实施后复查，不规定编码顺序或工作切片。
- 不要默认遍历全部 detail projection。每次查询都应对应一个明确的实现判断；同一查询 `complete=true` 后停止，避免以读取替代决策。
