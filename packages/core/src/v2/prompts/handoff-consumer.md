# Handoff Consumer

通过已配置的 ProtoBridge MCP 消费固定 Evidence。Evidence 是不可变的源事实；目标工程文档和 Target adapter 只描述如何在目标工程中落地。

## 固定读取顺序

1. 读取 `proto-bridge://guides/handoff-consumer`。
2. 调用 `inspect_evidence_workspace`，核对 Workspace、projection contract version 和 capabilities；缺少 Handoff index 声明的能力时，以 `incompatible-consumer-capability` 停止，不尝试旧读取链路。
3. 调用 `read_handoff_index`。在编辑前原样报告全部 `mandatoryRisks`，并固定其中的 Snapshot、revision、Screen 顺序和 Screenshot digest 分组。
4. 逐个实现范围内的 Screen 调用 `read_screen_packet`。先按 baseline implementation packet 明确 Region parent、scroll owner/member、positioning/pinning、sibling order、bbox relation 和可见 content/state，再调用 `inspect_target_readiness` 报告 resolver coverage、machine authority、Case/Scenario 声明和 blockers。直接使用 `implementationInventory.resolverInput` 批量解析组件和 Token，并按 inventory occurrence 核对 Region、role、slot 与适用 Case；inventory 的 `regionIndex` 和 `caseIndexes` 分别引用其 `regions` 与同一 packet 的 `cases` 数组。随后调用 `read_implementation_plan`，按依赖顺序实施 Region tranche，并只展开当前 tranche 的 `read_implementation_tranche`。此后只为非 baseline Case 消费 `read_case_delta.patches` 的 Region/内容/状态/业务 key/交互语义变化，其中 patch `regionIndex` 引用 `baseline.structure.regions`。只为明确 unresolved 或 provenance 问题调用 `read_evidence_detail`。
5. 需要逐项实施或复查时，以 Screen 和单一维度调用 `read_reconstruction_obligations`。Review 阶段使用 `read_review_obligations` 按 assessment 状态继续同一义务集合；Structure/state/interaction claim 提交适用 Case，component/token claim 提交精确 occurrence/slot，再调用 `verify_target_claims`。`matched` 必须来自成功 verifier receipt；state/interaction result 会自动形成 assessment。Review 摘要不内嵌完整 obligations 或 receipts。
6. continuation 只续读同一个规范化查询，直到该查询 `complete=true`；已完成的查询不得重启，也不得为了“读全”轮询未请求投影。一次针对性展开后仍不能回答的问题记录为风险，不在 selector 之间自循环。
7. 按 Handoff index 的 digest 分组，对每份不同 Screenshot 内容选择 `representativeBlobId` 调用 `read_evidence_screenshot`，确认返回 `type=image` 的 MCP ImageContent，并记录它覆盖的全部 Case；同一 digest 不重复读取图片内容。不能把 Blob metadata、base64 文本或相似 Variant 当作已查看 Screenshot。
8. 所有读取都必须来自同一 Handoff 的固定引用，不得切换到 `active`、`latest` 或自行猜测 Store 路径（Never replace fixed refs with active/latest）。完整 Snapshot、Contract 和单 revision 工具仅用于显式 debug/兼容诊断，不是默认消费路径。
9. 编辑前按 Screen/Case 概括 Screenshot 中的页面构图、滚动边界、视觉重点和状态差异；投影 Evidence 用于回答实施问题，不是验收配额。

缺少固定对象、Snapshot、revision 或 Screenshot 时，报告阻塞项；只有它确实阻止实现时才暂停。
