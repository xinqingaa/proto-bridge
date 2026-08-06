# 产品工作流

ProtoBridge 的闭环分为原型生产、证据生产和目标实现三个阶段。PBWork 连接前两个阶段，MCP 连接后两个阶段。

```text
PBWork Design Foundation / Components
  → Contract-compliant Prototype Runtime
  → Selection Draft
  → Preflight + confirmed Case Matrix
  → isolated Capture Job
  → immutable Run + Evidence revisions + Snapshot
  → Evidence Review + Staleness
  → Deliver (Handoff + human/debug artifacts + agent-prompt)
  → MCP fixed progressive projections
  → Agent implementation + target validation
  → canonical Reconstruction Obligations + authoritative Target Review
```

## 1. 制作可采集原型

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

## 2. 创建 Selection

PBWork 支持四种入口：

- 当前 Screen；
- Inspector 选中的稳定 Fragment；
- 用户选择的自定义 Screen/Variant/Scenario 范围；
- 整个 Prototype。

四种入口只负责产生不同的 `SelectionDraft`。Draft 包含 Prototype、Screen、Variant、Theme、Device、Fixture、Scenario 和 Capture Scope 等意图，不直接启动浏览器，也不创建 Store 对象。

CLI 通过 JSON Selection 文件表达相同语义。入口差异在进入 Core 后消失。

## 3. Preflight 与 Case Matrix

Preflight 从 Runtime 读取 authored manifest，校验：

- Screen、Variant、Action、Scenario 和 Fragment 引用；
- Runtime capability 与协议版本；
- 输入维度和 Capture Scope；
- required boundary；
- Case 数量限制和组合风险；
- warning 是否逐项确认。

Preflight 产生稳定 Case Matrix。用户必须在 PBWork 或 CLI 中看到实际 Case 数量、风险和范围；未确认的 warning 会阻止执行。确认不会改变风险事实，只允许任务继续。

## 4. Capture Job

每个 Case 在隔离浏览器上下文中执行：

1. 固定 viewport、device scale、theme、Variant 和 fixture；
2. 调用 Runtime `prepare`；
3. 等待 readiness 与语义标记稳定；
4. 执行 Scenario Action；
5. 在 Checkpoint 读取 required Fragment；
6. 同一 Case 内采集语义 Facts、provenance、截图和诊断信息；
7. 调用 reset 或关闭隔离上下文。

Case 失败不会回写或降级已有 active Evidence。Job 的进度、取消、失败和重试由 Core JobHost 统一管理。

## 5. Store 与 Review

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

## 6. Deliver 与 Agent Handoff

产品主路径是 Deliver（PBWork「交付到 Agent」或 CLI `deliver`）：在同一流程内完成 Capture（或续跑已有 Snapshot）、创建 Handoff，并写入 `.proto-bridge/deliveries/`（收据、供人工/debug 查看用的 Evidence Brief 与 Review、按图片内容去重的 Screenshot、Agent 提示词）。完全相同的 Screenshot 只输出一份 PNG，但保留全部 Case 和 Blob 引用。Agent 提示词不嵌入 Brief 或完整 Contract；deliveries 只是 Store 索引，默认消费通过 MCP 的固定 Handoff 投影完成。

Handoff 固定：

- Workspace；
- Bundle 与 Snapshot；
- Staleness Report；
- 实现范围；
- 具体 Case、revision 和 Fragment；
- `mandatoryRiskReport`。

Handoff 是 Evidence 索引，不是实现计划。Prompt 先要求 Agent 通过渐进投影只读核对 Screenshot、Case 差异与目标工程，输出实施计划并等待用户确认；确认后才进入实现。PBWork 与 CLI 共用同一 Core 能力。

## 7. MCP 与目标实现

默认消费与实施顺序（Consumer projection version 4）：

```text
inspect_evidence_workspace
  → read_handoff_index
  → read_screen_packet（含 canonicalBrief）
  → read_evidence_screenshot
  → inspect_target_readiness + resolve
  → 按需 read_case_delta / read_evidence_detail
  → 编辑前按 Screen 白话理解摘要
  → Agent 自主实施
  → 实施后 obligations / verify / Review
```

Agent 通过 MCP：

1. 用 `inspect_evidence_workspace` 确认 Workspace、契约版本与能力；
2. 用 `read_handoff_index` 固定范围并在编辑前报告全部 mandatory risks；
3. 每个 Screen 读取 `read_screen_packet`：用 `canonicalBrief`、baseline Structure（parent、scroll owner/member、pinning、ordering）与 inventory 理解主滚动、主 section、状态矩阵和固定业务数据；Evidence Region 用于定位与验收，不是目标侧组件/文件边界；
4. 查看每个不同 digest 的 Screenshot；编辑前调用 `inspect_target_readiness`，并用 inventory 的 `regionId`/`caseId` 批量 resolve 组件与 Token；
5. 非 baseline 状态读取紧凑 `read_case_delta`；只有明确来源问题才展开 `read_evidence_detail`；
6. 每个 Screen 在编码前用简短散文概括 Evidence 理解（结构与滚动、组件/Token 落点意向、状态与交互）；这不是评分表，也不是验收分母；
7. 阅读目标仓库自身规范与既有代码后自主组织实现；`read_implementation_plan` / `read_implementation_tranche` 仅诊断或 Review 辅助，不是默认实施路径；
8. 实现并运行目标原生测试；实施后按 Screen/维度分页读取 Reconstruction Obligations，再调用 Target validation 与 authoritative Review。

实现后的 authoritative Target Review 从固定 Handoff 的五维 Acceptance Contract 编译稳定、去重的 Reconstruction Obligations。Local Service 会独立重算并固定这组义务，客户端不能删减验收分母。Screenshot viewed、target render、artifact compare 和 Scenario replay 只证明所需 artifact 已覆盖；每项 structure、component、Token、state 和 interaction 义务仍需 `matched`、`deviation` 或 `unverified` assessment。五维 `matched` 都必须引用同一 obligation 的 verifier receipt；state/interaction verifier 会从 structured proof 自动写入 assessment，失败立即成为完成门禁。

完成门禁要求全部义务已核验，且不存在 `deviation`、`unverified`、阻断 finding 或缺失 artifact receipt。`not-applicable` 只能由 operator/human 基于明确 Target 依据确认。旧 Review 日志可以读取，但没有 obligation contract 的旧 Session 不能继续完成。

Target 查询与 Capture Evidence 互相隔离。目标仓库的既有组件和约定可以指导实现，但不能覆盖原型 Evidence 中的 unknown 或 conflict。只有 resolver 返回 `resolved` 的映射才可视为已验证落点；`candidate`/`stale`/`conflict`/`unresolved` 必须披露，不能升格为已确认。

Evidence 层面允许任意 Target；当前内置 Target query/validation 只支持 Flutter。新增 Kotlin、Swift、React Native 或其它 Adapter 时必须复用相同 Handoff 和 Evidence 读取纪律。

详细对象关系见 [Evidence 模型](../architecture/evidence-model.md)，操作指南见 [PBWork 与 PB](../guides/pbwork-and-pb.md)和 [Agent 消费指南](../guides/agent-consumption.md)。
