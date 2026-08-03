# ADR 0007：高保真重建使用独立 Acceptance Contract

- 状态：Accepted

## 决策

Evidence coverage、reconstruction readiness 与 target fidelity 是三个独立结果：

- `requiredFragments` 继续表示作者声明的最小采集完整性边界；
- Runtime 额外记录 semantic parent、ancestor path、document order、scroll owner 与 positioning；
- Screen/Variant/Checkpoint 使用独立 structure/shell contract 表达父子、顺序、滚动归属和状态壳层；
- 每个 Handoff 派生固定的五维 Reconstruction Acceptance Contract；
- 最终验收按结构、组件、Token、状态、交互计算，目标 90、最低 85，任一维度不得低于 80；
- critical requirement 的 `fail` 或 `unverified` 都不能通过 hard gate。

## 理由

平铺 Fragment、bbox、componentId 与 Token bindings 能描述单个节点，却不能唯一约束页面构图。不同 Agent 可能在相同节点事实下选择相反的父子关系、滚动范围或状态壳层，并且都通过文本与行为测试。

将完整页面树塞入 `requiredFragments` 会破坏 ADR 0002 的最小完整性语义，因此构图与验收必须有独立合同。

## Screenshot 规则

Screenshot Blob 的权威内容保存在 Store `.bin` 中。MCP Consumer 必须通过 `read_evidence_screenshot` 接收真正的 ImageContent；Blob metadata、base64 文本和相似 Variant 不构成已查看的视觉证据。

Delivery 复制全部 Handoff Screenshot 为带 `.png` 扩展名的 review 资产，并用 manifest 的 Blob ID 与 digest 绑定。Review copy 不取代 Store Evidence。

## 时间规则

Store 对象时间和逻辑 ID 继续使用 UTC。人类可见的 Delivery 目录使用配置的 IANA 时区，默认 `Asia/Shanghai`，同时在 receipt 中保留 UTC 与本地 ISO 时间。

## 结果

- `coverageStatus=complete` 不再等价于“足以达到高保真重建”；
- 缺少 topology、shell contract、可渲染 Screenshot 或五维验证时必须报告 reconstruction readiness 风险；
- Agent 不得自行删减验收分母、修改权重或把 unverified 计为 pass；
- 协议同时支持整页滚动、固定头部列表、整页状态替换和继承壳层，不把单一原型构图写死为通用规则。
