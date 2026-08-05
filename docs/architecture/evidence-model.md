# Evidence 模型

Evidence 模型把长期身份、单次执行、可用结果和消费引用分开。正式对象由 `@proto-bridge/core/v2` 的可执行 Schema 定义；本文说明对象关系和不变量。

## 对象关系

```text
Workspace
└─ Bundle (one prototype evidence lineage)
   ├─ Catalog revisions
   ├─ Runs
   │  ├─ Selection + stable Cases
   │  ├─ Attempts
   │  ├─ Evidence revisions
   │  ├─ Issues
   │  └─ Coverage
   ├─ Snapshots
   │  └─ active Case/Scope slots → Evidence revisions
   ├─ Staleness Reports
   ├─ Agent Handoffs
   └─ Blobs
```

## Workspace 与 Bundle

Workspace 是 Store 的逻辑身份和隔离边界。所有持久 ID 都属于一个 Workspace；MCP 在启动时固定 Workspace。

Bundle 是一个 Prototype 的长期 Evidence 容器。Bundle 可以 fork、archive 和 clean，但历史对象不可原地重写。归档阻止新的生产操作，不影响固定历史读取。

## Selection、Case 与 Scope

Selection 描述一次采集意图。每个 Selected Case 由稳定维度组成：

- Prototype/Screen；
- Variant；
- Theme；
- Device/Viewport；
- Fixture；
- Scenario；
- Capture Scope。

Case identity 只由规范化维度决定，不包含 Run ID、时间、Attempt 或截图路径。相同输入必须产生相同 Case ID。

Capture Scope 可以是 Screen 或稳定 Fragment 集合。Scope key 是可复算身份；Fragment 只接受 `screenId + pbId + optional pbKey`。

## Job、Run 与 Attempt

Job 是可恢复的执行控制对象，可以 queued、running、cancelling 或终结。Job journal 支持进程恢复，但不是 Evidence 成功证明。

Run 是一次已终结 Selection 的不可变记录。可信 Run 即使零成功也会形成 Coverage 和新 Snapshot；Store 提交失败则不能宣称 Run/Snapshot 已更新。

Attempt 是某 Case 在本 Run 中的实际执行结果。失败 Attempt 与 active successful Evidence 分开保存，防止一次失败抹掉上次可用结果。

## Evidence revision

Evidence revision 是 Case/Scope 的不可变观测结果，包含：

- Evidence Level；
- Facts；
- provenance；
- required/observed 完整性；
- unknown 和 conflict；
- Screenshot/Blob refs；
- diagnostics；
- 输入摘要和 Capture dimensions。

revision 不包含目标工程实现建议。事实冲突必须并存并带来源，不能用优先级静默覆盖。

节点 Token binding 必须区分 component contract、runtime registration 和 `data-pb` 来源；CSS 使用本身不是 binding Fact。语义节点规范见[语义标记与证据门禁](../reference/semantic-authoring.md)。

## Snapshot

Snapshot 固定 Bundle 在一次提交后的读取视图：

- active successful Evidence slots；
- latest Attempt refs；
- Coverage；
- Catalog ref；
- 相关 Issue；
- 创建该状态的 Run。

active slot 的激活遵循防降级规则：失败、取消、低 Evidence Level 或 required boundary 不完整不能覆盖已有更可信 revision。零成功 Run 可以提交一个 carry-forward Snapshot，使 latest Attempt 和 Coverage 可追溯，同时保持旧 active Evidence。

收敛版本中，正式 Handoff 所需的 Prototype、Screen、Component 和 Token Catalog 必须由 Snapshot 固定；缺少交付范围所需 Catalog 时不得把组件/Token 事实声明为完整。

## Catalog

Catalog revision 固定 Prototype、Screen、Variant、Component、Token、Action 和 Scenario 等目录事实。Catalog 与页面 Evidence 分开版本化，避免目录变化重写历史 revision。

## Issue 与 Coverage

Issue 持久说明：

- required unknown；
- unresolved conflict；
- unsupported capability；
- Capture/Store 失败；
- stale 输入；
- Evidence Level 限制；
- 建议 next action。

Coverage 说明 Selection 中哪些 Case 成功、失败、取消、跳过或不支持。Coverage 不能用“有一张截图”替代完整 Case 计数。

## Staleness

Staleness Report 是“指定 Snapshot 相对指定当前输入”的一次不可变判断。它不修改 Snapshot。

Stale 依赖至少包括 authored manifest/input version、Runtime dimensions、Fixture、Scenario、Source/Catalog 输入和 Capture 配置。依赖无关的 Case 可以复用；依赖变化的 Case 必须重采或报告 stale。

## Agent Handoff

Handoff 固定：

- Workspace、Bundle、Snapshot；
- Staleness Report；
- 实现范围；
- Case/revision/Fragment refs；
- Evidence Level；
- `mandatoryRiskReport`；
- 推荐读取资源。

Handoff 创建前可以要求用户逐项确认风险，但确认不会修改风险或 Evidence。

每个 Handoff 还可确定性派生 Reconstruction Acceptance Contract。该合同不修改 Evidence，而是把固定 revision 中的 topology、componentId、Token binding、Variant/Checkpoint、Scenario 与 Screenshot 组织成五维要求。Authoritative Review 再将等价的 per-Case requirements 编译为稳定、去重的 Reconstruction Obligations；全部 obligation 都必须有明确 assessment，artifact coverage 不能替代该验收分母。

## Blob

Blob 保存 Screenshot、调试数据或目录附件。Blob 必须具有 owner ref，并能从请求的 Snapshot 或 Catalog 到达。Debug/Trace 需要显式许可；MCP 不按文件路径读取 Blob。

## 事实与来源

每个 Fact 必须说明来源，例如 authored Contract、Runtime observation、Screenshot 或用户附加输入。PB 遵循：

- authored Contract 可以声明 required boundary；
- Runtime observation 可以证明实际可见状态；
- Screenshot 可以证明像素结果，但不能单独证明隐藏语义；
- Target scan 只指导实现，不属于 Evidence；
- unknown 是合法结果，不能用低置信推断消除；
- conflict 必须保留所有相关来源。

## 读取规则

- 历史读取使用明确逻辑 ID；
- revision 必须由固定 Snapshot 到达；
- Blob 必须由 Snapshot 或 Catalog 到达；
- Workspace 不匹配确定性失败；
- Handoff 消费不回退 active/latest；
- Store 文件布局不属于公共 Contract。
