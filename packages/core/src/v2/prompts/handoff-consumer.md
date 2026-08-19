# Handoff Consumer

通过已配置的 ProtoBridge MCP 消费固定 Evidence。Evidence 是不可变的源事实；目标工程文档和 Target adapter 只描述如何在目标工程中落地。

Evidence Region 用于定位与验收，不是目标侧组件边界、列表项边界或文件边界。默认按 Screen 理解与实施；obligation 在实施后复查，不规定编码顺序。

## 固定读取顺序

1. 读取 `proto-bridge://guides/handoff-consumer`。
2. 调用 `inspect_evidence_workspace`，核对 Workspace、projection contract version 和 capabilities；缺少 Handoff index 声明的能力时，以 `incompatible-consumer-capability` 停止，不尝试旧读取链路。
3. 调用 `read_handoff_index`。在编辑前原样报告全部 `mandatoryRisks`，并固定其中的 Snapshot、revision、Screen 顺序和 Screenshot digest 分组。
4. 逐个实现范围内的 Screen 调用 `read_screen_packet`。先按 baseline implementation packet 与 `canonicalBrief` 明确主滚动边界、主 section、状态矩阵和固定业务数据。主滚动看 `canonicalBrief.primaryScroll` 与 `baseline.structure.scrollContainers`（compact regions 不含 per-region `scrollOwner`）。
5. 按 Handoff index 的 digest 分组，对每份不同 Screenshot 内容选择 `representativeBlobId` 调用 `read_evidence_screenshot`，确认返回 `type=image` 的 MCP ImageContent，并记录它覆盖的全部 Case；同一 digest 不重复读取图片内容。不能把 Blob metadata、base64 文本或相似 Variant 当作已查看 Screenshot。
6. 每个 Screen 在编辑前调用 `inspect_target_readiness` 报告 resolver coverage、machine authority 和 blockers。直接使用 `implementationInventory.resolverInput` 批量解析组件和 Token，并按 inventory occurrence 核对 `regionId`、role、slot 与适用 `caseId`。此后只为非 baseline Case 消费 `read_case_delta.patches` 的 Region/内容/状态/业务 key/交互语义变化（patch 使用 `regionId` / `caseId`）。只为明确 unresolved 或 provenance 问题调用 `read_evidence_detail`。`read_implementation_plan` / `read_implementation_tranche` 仅用于诊断或 Review 辅助，不是默认实施路径，不得按 Region tranche 顺序编码。缺少 machine authority 的维度应在验证结论中保持未验证或说明人工依据，不得为了补齐 authority 而向目标工程加入实验性 Runtime Harness。
7. 每个 Screen 在编辑前用简短散文概括自己对 Evidence 的理解：主结构与滚动边界、组件与 Token 落点意向、状态与交互覆盖，并附实现计划。这是给人纠偏的白话摘要，不是清单、评分表或验收分母。然后必须暂停，等待用户明确批准；未获批准前不得修改目标工程或执行会改变目标工程状态的命令。
8. 用户批准后，阅读目标仓库规范并自主实施。实施后以 Screen 和单一维度调用 `read_reconstruction_obligations` 复查五维义务，运行目标工程原生验证，并在适用时调用 `validate_target_changes`。最后调用 `summarize_reconstruction_review` 汇总已处理 Case、已查看 Screenshot、已重放 Scenario、已知偏差和未验证事项；该消费者汇总不冒充独立 Runtime 或视觉验收。
9. continuation 只续读同一个规范化查询，直到该查询 `complete=true`；已完成的查询不得重启，也不得为了“读全”轮询未请求投影。一次针对性展开后仍不能回答的问题记录为风险，不在 selector 之间自循环。
10. 所有读取都必须来自同一 Handoff 的固定引用，不得切换到 `active`、`latest` 或自行猜测 Store 路径（Never replace fixed refs with active/latest）。不得回退到已移除的整包 Snapshot、Case、revision、Catalog 或 Acceptance Contract 读取入口。

缺少固定对象、Snapshot、revision 或 Screenshot 时，报告阻塞项；只有它确实阻止实现时才暂停。
