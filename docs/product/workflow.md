# 产品工作流

ProtoBridge 的闭环分为原型设计、正式原型生产、证据生产和目标实现四个阶段。PBWork 连接前三个阶段，MCP 连接后两个阶段。

```text
Product Design + Visual Exploration
  → approved prototypes/{id}/docs/design.md
  → PBWork Promotion Gate
  → Design Foundation / Components
  → Contract-compliant Prototype Runtime
  → Selection Draft
  → Preflight + confirmed Case Matrix
  → isolated Capture Job
  → immutable Run + Evidence revisions + Snapshot
  → Evidence Review + Staleness
  → Deliver (Handoff + human/debug artifacts + agent-prompt)
  → MCP fixed progressive projections
  → Agent implementation + target validation
  → canonical Reconstruction Obligations + Target validation + consumer summary
```

## 1. 设计并晋级原型

新业务原型、结构性产品改动和视觉语言改变先按 [PBWork 原型设计工作流](../pbwork/prototypes/design-workflow.md)完成产品设计、按需视觉探索、用户确认和 Promotion Gate。正式原型使用 `prototypes/{id}/docs/design.md` 作为唯一产品与体验基线；只有 `status: approved` 才进入结构性 Authoring。

视觉探索草稿位于 `apps/pbwork/src/drafts/{prototypeId}`，不进入 Prototype Registry、Capture 或 Handoff。草稿中的硬编码构图、自定义控制和动画不能直接升格为可交付事实；必须分别映射到现有 DS、通用 DS 缺口、Token 驱动的业务 UI、外部资产契约或降级项。

## 2. 制作可采集原型

原型作者只能从 PBWork 的 Token、Theme、基础组件、复杂组件和共享手势中组装页面。没有对口组件时可以实现业务局部 UI，但设计量仍必须使用现有 Token，且不得复制已有组件职责。

所有作者角色均通过 Coding Agent 修改同一套代码资产。DS 组件用业务 `inspectId` 进入 Evidence；需要独立实现或验收的业务局部节点必须显式提供 `data-pb-id`、`data-pb-role`、按需 `data-pb-key` 和 `data-pb-token-*`。只在 CSS 中使用 `--pb-*` 不会形成 Token binding Fact。

每个进入 Evidence 闭环的 Screen 必须：

- 在唯一 Registry 中声明稳定身份、路径、默认 Variant 和关键 Variant；
- 为 strict Screen 的 default Variant 声明 `requiredFragments`；
- 用稳定 `data-pb-id`、可选 `data-pb-key` 和合法 `data-pb-role` 标记语义节点；
- 为业务局部证据节点显式声明实现所需 Token binding；
- 为关键交互声明 Action、Scenario 和 Checkpoint；
- 能由 Runtime 确定性执行 describe、prepare、readiness、semantic snapshot 和 reset。

完整规则见 [原型 Authoring Contract](../reference/prototype-authoring.md)。
节点判定与阻断等级见[语义标记与证据门禁](../reference/semantic-authoring.md)。

## 3. 创建 Selection

PBWork 支持四种入口：

- 当前 Screen；
- Inspector 选中的稳定 Fragment；
- 用户选择的自定义 Screen/Variant/Scenario 范围；
- 整个 Prototype。

四种入口只负责产生不同的 `SelectionDraft`。Draft 包含 Prototype、Screen、Variant、Theme、Device、Fixture、Scenario 和 Capture Scope 等意图，不直接启动浏览器，也不创建 Store 对象。

CLI 通过 JSON Selection 文件表达相同语义。入口差异在进入 Core 后消失。

## 4. Preflight 与 Case Matrix

Preflight 从 Runtime 读取 authored manifest，校验：

- Screen、Variant、Action、Scenario 和 Fragment 引用；
- Runtime capability 与协议版本；
- 输入维度和 Capture Scope；
- required boundary；
- Case 数量限制和组合风险；
- warning 是否逐项确认。

Preflight 产生稳定 Case Matrix。用户必须在 PBWork 或 CLI 中看到实际 Case 数量、风险和范围；未确认的 warning 会阻止执行。确认不会改变风险事实，只允许任务继续。

## 5. Capture Job

每个 Case 在隔离浏览器上下文中执行：

1. 固定 viewport、device scale、theme、Variant 和 fixture；
2. 调用 Runtime `prepare`；
3. 等待 readiness 与语义标记稳定；
4. 执行 Scenario Action；
5. 在 Checkpoint 读取 required Fragment；
6. 同一 Case 内采集语义 Facts、provenance、截图和诊断信息；
7. 调用 reset 或关闭隔离上下文。

Case 失败不会回写或降级已有 active Evidence。Job 的进度、取消、失败和重试由 Core JobHost 统一管理。

## 6. Store 与 Review

一次已终结 Selection 形成不可变 Run。每个成功 Case 产生 Evidence revision，Snapshot 固定本次提交后的 active Evidence、latest Attempt 和 Coverage。

PBWork Evidence Review 按 Screen、Case 和语义区域展示：

- 实际 Facts 和来源；
- Screenshot；
- required Fragment 的完整性；
- unknown、conflict 和 Issue；
- active successful revision 与 latest Attempt 的差异；
- Staleness Report；
- 当前 Snapshot 是否适合 Handoff。

重新采集会创建新 Run 和新 Snapshot，历史 Snapshot 与 Handoff 保持可读。

## 7. Deliver 与 Agent Handoff

产品主路径是 Deliver（PBWork「交付到 Agent」或 CLI `deliver`）：在同一流程内完成 Capture（或续跑已有 Snapshot）、创建 Handoff，并写入 `.proto-bridge/deliveries/`（收据、供人工/debug 查看用的 Evidence Brief 与 Review、按图片内容去重的 Screenshot、Agent 提示词）。完全相同的 Screenshot 只输出一份 PNG，但保留全部 Case 和 Blob 引用。Agent 提示词不嵌入 Brief 或完整 Contract；deliveries 只是 Store 索引，默认消费通过 MCP 的固定 Handoff 投影完成。

Handoff 固定：

- Workspace；
- Bundle 与 Snapshot；
- Staleness Report；
- 实现范围；
- 具体 Case、revision 和 Fragment；
- `mandatoryRiskReport`。

Handoff 是 Evidence 索引，不是实现计划。Prompt 先要求 Agent 通过渐进投影只读核对 Screenshot、Case 差异与目标工程，输出实施计划并等待用户确认；确认后才进入实现。PBWork 与 CLI 共用同一 Core 能力。

## 8. MCP 与目标实现

默认消费与实施顺序（Consumer projection version 4）：

```text
inspect_evidence_workspace
  → read_handoff_index
  → read_screen_packet（含 canonicalBrief）
  → read_evidence_screenshot
  → inspect_target_readiness + resolve
  → 按需 read_case_delta / read_evidence_detail
  → 编辑前按 Screen 白话理解摘要与实现计划
  → 等待用户确认
  → Agent 自主实施
  → 实施后 obligations / Target validation / summary
```

Agent 通过 MCP：

1. 用 `inspect_evidence_workspace` 确认 Workspace、契约版本与能力；
2. 用 `read_handoff_index` 固定范围并在编辑前报告全部 mandatory risks；
3. 每个 Screen 读取 `read_screen_packet`：用 `canonicalBrief`、baseline Structure（parent、scroll owner/member、pinning、ordering）与 inventory 理解主滚动、主 section、状态矩阵和固定业务数据；Evidence Region 用于定位与验收，不是目标侧组件/文件边界；
4. 查看每个不同 digest 的 Screenshot；编辑前调用 `inspect_target_readiness`，并用 inventory 的 `regionId`/`caseId` 批量 resolve 组件与 Token；
5. 非 baseline 状态读取紧凑 `read_case_delta`；只有明确来源问题才展开 `read_evidence_detail`；
6. 每个 Screen 在编码前用简短散文概括 Evidence 理解（结构与滚动、组件/Token 落点意向、状态与交互）并附实现计划；这不是评分表，也不是验收分母；然后暂停等待用户明确批准；
7. 用户批准后，阅读目标仓库自身规范与既有代码并自主组织实现；`read_implementation_plan` / `read_implementation_tranche` 仅诊断或 Review 辅助，不是默认实施路径；
8. 实现并运行目标原生测试；实施后按 Screen/维度分页读取 Reconstruction Obligations，调用适用的 Target validation，并形成五维 Reconstruction Review summary。

实现后的五维复查从固定 Handoff 的 Acceptance Contract 编译稳定、跨 Case 去重的 Reconstruction Obligations。Agent 结合固定 Screenshot、Target mapping、实际代码和目标原生测试报告 `matched`、`deviation`、`unverified` 或有依据的 `not-applicable`，最后调用 `summarize_reconstruction_review` 汇总 Case、Screenshot、Scenario 和五维结论。该结果的 authority 明确是 `consumer-reported-review`，不替代独立 Runtime 或最终视觉验收。

Target 查询与 Capture Evidence 互相隔离。目标仓库的既有组件和约定可以指导实现，但不能覆盖原型 Evidence 中的 unknown 或 conflict。只有 resolver 返回 `resolved` 的映射才可视为已验证落点；`candidate`/`stale`/`conflict`/`unresolved` 必须披露，不能升格为已确认。

Evidence 层面允许任意 Target；当前内置 Target query/validation 只支持 Flutter。新增 Kotlin、Swift、React Native 或其它 Adapter 时必须复用相同 Handoff 和 Evidence 读取纪律。

详细对象关系见 [Evidence 模型](../architecture/evidence-model.md)，操作指南见 [PBWork 与 PB](../guides/pbwork-and-pb.md)和 [Agent 消费指南](../guides/agent-consumption.md)。
