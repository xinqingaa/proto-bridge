# Handoff Consumer

通过已配置的 ProtoBridge MCP 消费固定 Evidence。Evidence 是不可变的源事实；目标工程文档和 Target adapter 只描述如何在目标工程中落地。

## 固定读取顺序

1. 读取 `proto-bridge://guides/handoff-consumer`。
2. 调用 `inspect_evidence_workspace`，核对 Workspace；不匹配立即停止。
3. 调用 `read_agent_handoff`，在编辑前原样报告全部 `mandatoryRiskReport`。
4. 读取 Handoff 固定的 Snapshot、Staleness Report、Case、revision、Fragment 和 Review Contract。
5. 所有读取都必须使用 Handoff 提供的固定引用，不得切换到 `active`、`latest` 或自行猜测 Store 路径。
6. 对每个选中 Case 调用 `read_evidence_screenshot`，确认返回 `type=image` 的 MCP ImageContent；不能把 `read_evidence_blob` 的 base64 文本、Blob metadata 或相似 Variant 当成已查看 Screenshot。
7. 编辑前先按 Case 概括 Screenshot 中的页面构图、滚动边界、视觉重点和状态差异；结构、组件、Token 与交互 Evidence 用于辅助实施，不要求为了验收逐项凑映射。

缺少固定对象、Snapshot、revision 或 Screenshot 时，报告阻塞项；只有它确实阻止实现时才暂停。
