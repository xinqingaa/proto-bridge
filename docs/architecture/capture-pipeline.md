# 采集链路

Capture Pipeline 把 authored Runtime Contract 转换为不可变 Evidence。PBWork 和 CLI 进入同一 Pipeline。

## 1. Runtime Manifest

Runtime `describe` 返回：

- protocol version（当前 3）、input version、主题身份与声明时钟；
- capabilities；
- Prototype 和 Screen；
- Variant 标签、打开该状态所需的 authored route query 和 required Fragments；
- Action；
- Scenario、Action sequence 和 Checkpoint。

Core 使用浏览器安全 Schema 校验响应。缺字段、未知引用、重复身份或不受支持的协议会阻止 Preflight。身份字段失败时，错误必须给出 Screen/Variant/Fragment 身份和实际值，而不是原始 Zod JSON。Registry validation 在采集前拦截非法 `pbId` / `pbKey`。

读取 Runtime 前运行 PBWork authoring lint：确定性违反 Contract 的结果直接 Block，只能启发式判断的 CSS-only 疑似遗漏形成 Warning。精确等级见[语义标记与证据门禁](../reference/semantic-authoring.md)。

## 2. Selection Draft

Draft 表达用户意图，不表达执行结果。状态和场景均使用 authored ID 的显式集合；GUI/CLI 的“全部”只在入口展开，不进入持久 Draft。Core 对输入归一化并拒绝：

- 未知 Screen/Variant/Scenario；
- 非稳定 Fragment；
- 互相冲突的维度；
- 空或越界 Scope；
- 超过容量的组合（默认 `capture.maxCases` 为 200）；
- 未逐项接受的 warning。

## 3. Preflight

Preflight 固定 manifest/input version、规范化 Selection、warning、risk 和 Case Matrix。Preflight 有有效期；Runtime 输入变化或过期后必须重新执行。

Matrix 展开顺序必须稳定。Case ID 与 Scope key 在 PBWork 和 CLI 间一致，不能包含数组位置、生成时间或 authored route query；route query 是执行 baseline 输入，不是新的 Case identity 维度。矩阵只展开清单的默认模式；`CaseKey.themeId` 是该模式。Selection 必须携带与清单默认主题一致的 `themePack`。主题包摘要、键目录摘要和声明时钟进入 `inputVersion`。取值表、探针与时钟的当前规则见[主题包解析模型](./theme-packs.md#原型绑定与-capture-边界)。

## 4. 浏览器隔离

Playwright Driver 为每个 Case 建立隔离上下文，固定：

- Runtime URL；
- viewport 与 device scale factor；
- 模式对应的 color scheme，以及清单声明的时区与时钟；
- Variant；
- fixture；
- Scenario；
- Screenshot 参数。

网络、console、page errors 和 failed requests 进入 diagnostics。Case 间不能共享会改变结果的页面状态。

## 5. Prepare 与 Readiness

`prepare` 使用 Manifest 中的 authored route query 导航到精确 Screen/Variant/Theme/Fixture，并保存 reset baseline。Runtime 必须返回实际 dimensions；任一维度不匹配都失败。

`readiness` 只在页面完成状态准备、语义标记稳定且 required Fragment 可解析时成功。Core 会重复观察稳定签名，防止把中间渲染状态当成最终页面。

## 6. Semantic Snapshot

Runtime 读取 `[data-pb-role][data-pb-id]` 节点：

- 验证 role；
- 构造 `screenId + pbId + optional pbKey`；
- 重复 `pbId` 要求每个实例都有稳定 `pbKey`；
- 验证 required Fragment 唯一、可见并具有非零 bbox；
- 拒绝 required Fragment 的 `unknown` role、业务 `ds.*` identity 和缺失的必要 Token Evidence；
- 提取文本、状态、可访问性和几何事实；
- 保留实际 DOM 观测来源。

required Fragment 的可见性、bbox、非 `unknown` role、业务 identity 和 Token Evidence 是由 Runtime/Core 执行的当前 Contract；任一检查失败都会阻止该 Case 形成 active revision。

Semantic snapshot 与 Screenshot 必须在同一固定 Case 中采集。

## 7. Scenario

Scenario 从 declared initial Variant 开始，按稳定 Action ID 执行。每个 Action：

- 指向稳定 Fragment target；
- 具有受支持的 kind；
- 执行后验证实际 Screen/Variant；
- 在 Checkpoint 重新检查 required boundary。

初始 readiness 只检查第一步 Action 的 target；后续 target 可能由前一步打开的 Sheet 或状态切换渲染。Runtime 在执行**每一步**前检查该步 target 的身份、role、可见性和遮挡，不能把后续 target 缺失提前判为初始态不完整。

导致 document 卸载且无法维持协议连续性的导航必须报告 unsupported，不能假装完成。

## 8. Attempt 与 Revision

Case 执行总会形成 Attempt。只有通过 Schema、完整性和激活规则的结果才能形成可激活 Evidence revision。

常见非成功结果：

- Runtime 不可达或协议不匹配；
- required Fragment 缺失、重复或不可见；
- 页面 dimensions 与 Case 不一致；
- Action/Checkpoint 失败；
- Screenshot/Blob 写入失败；
- 用户取消；
- Store 容量或 writer lock 阻塞。

每个 Case 终结（captured、failed、reused、cancelled）后，Core 先把该 Attempt 写入 Store root 下的 Job staging（`job-staging/<jobId>/`：`catalogs.json`、`cases/<序号>-<attemptId>.json`、`blobs/<hex>.bin`），captured Case 同时暂存 Revision 与 Blob 字节，之后才写 journal `case-finished`。staging 是 Job 内部的待提交区，不属于公共 Contract，也不会被 Snapshot 或 MCP 到达；Job finalize 后删除，Store 初始化时清理已终结或缺失 Job 的遗留 staging。

Blob 写入失败按必要性区分：

- 可选二进制（非 Screenshot）暂存失败：该 Case 去掉这些二进制后重试，journal 记录 `blob-write-failed`；
- 必需 Screenshot Blob 写不进去：该 Case 成为 `failed` Attempt，原因为 `Required screenshot Blob could not be written: …`，在 Coverage 中计为失败并进入失败 Case 分组。

## 9. Run 与 Snapshot Commit

所有 Case 终结后，Core 构建 Run、Coverage、Issue、revision 和 Snapshot。Store 在同一次 Bundle 级提交锁内先写 Issue 与 staging 中的 Blob，再写不可变 Run/revision/Snapshot，最后原子更新 active pointer。

Issue 按内容摘要追加保存，同逻辑 ID 的不同内容并存、相同内容去重；Store 在新 revision 写入前将 Fact 的 `issueRef` 固定到具体摘要，后续 Run 不会改变历史 revision 的解释。精确引用格式见 [Evidence 模型](./evidence-model.md#issue-与-coverage)。

提交失败（例如 Issue 写入 IO 错误）时：

- journal 记录 `commit-failed`，Job 为 failed；
- 一致性 Issue 保留；
- 不能返回成功 Snapshot；
- 旧 active pointer 不变。

提交之外的执行错误记录 `execution-failed`，Job 同样为 failed。

### Job 调度

同一 Workspace writer（同一 Store 实例）同一时间只运行一个 Capture Job。后续被接受的 Job 仍会持久化并以 `queued` 状态可见，直到前面的 Job 终结后依次执行。取消 `queued` Job 会直接终结为 `cancelled`，不执行任何 Case。

### Orphan 恢复

Store 初始化时对非终结的 orphan Job 执行 `finalizeOrphanJobs`：

- 有已暂存 Case：这些 Attempt 作为 Run 提交，termination reason 为 `interrupted`；被选中但没有暂存 Attempt 的 Case 形成 `interrupted` Attempt，原因为 `The writer stopped before this Case finished.`；已暂存的 captured Case 缺 Blob 时降为 `failed`。Coverage 为 partial，Job 终结为 `interrupted`，journal 记录 `finalized-orphan`；
- 无已暂存 Case：沿用零 Attempt 的终结行为，journal 中的 Case 结果仅在 Run 没有 Attempt 时作为失败 Case 报告的后备；
- Bundle 不可写（例如已移入回收站）时跳过提交。

## 10. Handoff

Handoff 创建前评估：

- Coverage 是否覆盖实现范围；
- active Evidence 是否 stale；
- required unknown/conflict；
- Evidence Level；
- 是否存在手工提升或接受风险。

所有 mandatory risks 固定进入 Handoff。

PBWork 定稿的 `awaiting-risks` 阶段由 Local Service 每秒 reconciliation 推进。该 tick 复用按 Bundle/Snapshot 缓存的风险评估，只在以下情况重新执行 Preflight：没有缓存、用户确认风险（进入 `building-prompt`）、构建 Handoff，或该原型之后的 Preflight 观察到不同的 `inputVersion` / `manifestDigest`。Staleness Report 只在构建 Handoff 以及显式 `POST /api/v2/staleness` 时持久化；`POST /api/v2/handoffs/preview` 只预览，不写报告。Consumer 读取顺序见 [Agent 消费指南](../guides/agent-consumption.md)。
