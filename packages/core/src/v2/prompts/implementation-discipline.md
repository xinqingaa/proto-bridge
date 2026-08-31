# Implementation Discipline

- Screenshot 是最终可见结果的首要依据；Fragment、结构、组件和 Token Evidence 帮助解释 Screenshot 与选择目标工程实现方式。
- 不要凭经验补造 Evidence 未支持的容器、文案、状态或入口；目标工程允许的实现差异要记录依据。
- Evidence 未给出的布局敏感 prop，先对照 Screenshot；仍不确定时记录风险。
- 优先复用目标工程已声明或扫描确认的组件、Theme、路由和状态边界；只有确有需要时才扩展。
- 只覆盖 Handoff 选中的 Case、variant 和 interaction；不得把未选中的状态扩展成本次范围，不能实现的选中范围及时披露。
- `read_screen_packet` 的 baseline Structure 与 `canonicalBrief` 约束主滚动所有者、成员 section 和关键邻接关系；必须转译这些页面语义，但不能把 Evidence Region 一一映射为目标侧组件、列表项或类/文件边界。用目标工程自然的组件组合表达同一滚动与层级关系。
- baseline state 与 canonical 业务数据包含状态壳层、可见内容、keyed collection、选项和 selected/default 标量值；Evidence 明确证明完整时原样复用，partial、unknown 或 conflict 时禁止猜测补全。业务 identity/key 必须原样落到 Target，不能以列表位置代替。
- Evidence 有 `componentId` 时优先复用目标工程公共组件；没有可靠映射时结合 Screenshot 和目标规范实现，并说明取舍。
- Token binding 用于优先命中目标 Theme/Token；不能可靠映射时仍需保证 Screenshot 所示的最终视觉，并记录已知差异。
- Target validation 必须核对实际采用的组件与 Token 落点；不能用全仓某处存在 symbol、accessor 或 import 代替当前实现中的真实使用。
- State 与 interaction 复查只覆盖适用 Case，并以固定 Source expected、目标代码和实际测试结果为依据；不能由 Agent 自填“预期结果”充当已经执行的验证。
- obligation 分母用于实施后复查，不规定编码顺序或工作切片。
- 不要默认遍历全部 detail projection。每次查询都应对应一个明确的实现判断；同一查询 `complete=true` 后停止，避免以读取替代决策。
