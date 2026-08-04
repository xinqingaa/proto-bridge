# Handoff Consumer

通过已配置的 ProtoBridge MCP 消费固定 Evidence。Evidence 是不可变的源事实；目标工程文档和 Target adapter 只描述如何在目标工程中落地。

## 固定读取顺序

1. 读取 `proto-bridge://guides/handoff-consumer`。
2. 调用 `inspect_evidence_workspace`，核对 Workspace、projection contract version 和 capabilities；缺少 Handoff index 声明的能力时，以 `incompatible-consumer-capability` 停止，不尝试旧读取链路。
3. 调用 `read_handoff_index`。在编辑前原样报告全部 `mandatoryRisks`，并固定其中的 Snapshot、revision、Screen 顺序和 Screenshot digest 分组。
4. 逐个实现范围内的 Screen 调用 `read_screen_packet`。只为非 baseline Case 或需要解释的状态调用 `read_case_delta`；只为当前实现问题调用 `read_evidence_detail` 的 structure、components、tokens、interactions 或 provenance 投影。
5. continuation 只续读同一个规范化查询，直到该查询 `complete=true`；已完成的查询不得重启，也不得为了“读全”轮询未请求投影。一次针对性展开后仍不能回答的问题记录为风险，不在 selector 之间自循环。
6. 按 Handoff index 的 digest 分组，对每份不同 Screenshot 内容选择 `representativeBlobId` 调用 `read_evidence_screenshot`，确认返回 `type=image` 的 MCP ImageContent，并记录它覆盖的全部 Case；同一 digest 不重复读取图片内容。不能把 Blob metadata、base64 文本或相似 Variant 当作已查看 Screenshot。
7. 所有读取都必须来自同一 Handoff 的固定引用，不得切换到 `active`、`latest` 或自行猜测 Store 路径。完整 Snapshot、Contract 和单 revision 工具仅用于显式 debug/兼容诊断，不是默认消费路径。
8. 编辑前按 Screen/Case 概括 Screenshot 中的页面构图、滚动边界、视觉重点和状态差异；投影 Evidence 用于回答实施问题，不是验收配额。

缺少固定对象、Snapshot、revision 或 Screenshot 时，报告阻塞项；只有它确实阻止实现时才暂停。
