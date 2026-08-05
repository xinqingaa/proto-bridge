# Phase 5R：还原义务与系统性质量门禁

- 日期：2026-08-05
- 状态：in-progress
- 适用范围：任意 Prototype、Screen 和 Target；不包含 cold-chain 或 Flutter 专用规则

## 结论

两次独立实现使用同一份 Evidence，却分别遗漏不同的页面结构、组件、Token、交互和状态事实。这说明主要问题不是某一版代码写错，而是系统把 Acceptance facts 当成 Agent 可选择采用的提示，同时 Review 只核对 Screenshot/Scenario receipt 和 Agent 已主动报告的 finding。零 finding 因而可能表示“没有核验”，却被当成“没有问题”。

Phase 5R 将主链路调整为：

```text
Fixed Evidence
  -> canonical Reconstruction Obligations
  -> Screen implementation packet
  -> Target implementation claims
  -> semantic/runtime/visual verifiers
  -> authoritative Review gate
```

## 5R.1 已实现：固定验收分母

Core 会把五维 Acceptance Requirements 按 `dimension + screenId + kind + subject + canonical expected` 稳定去重，同时合并所有适用 `caseIds` 和 `evidenceRefs`。Obligation ID 只由规范化语义生成，不依赖数组位置、Agent、Target 技术栈或具体业务 ID。

Review Session 固定 obligation contract 和 required obligations，并用 append-only `obligations-assessed` event 保存逐项结论。相同 obligation 的后写 assessment 显式替代旧结论，以支持修复后复核。

Local Service 会从持久 Handoff 独立重算 obligations，并拒绝客户端删减或改写验收分母。MCP 只允许 Agent 写 `matched`、`deviation` 或 `unverified`；`not-applicable` 必须由 operator/human 附 Target basis 写入。

完成门禁现在同时检查：

- 所有 required Screenshot 已查看并有 Target render；
- 所有 required Scenario 已 replay；
- 所有 obligations 已 assessment；
- 不存在 `deviation` 或 `unverified` obligation；
- 不存在阻断或 unverified finding；
- 最终完成来自 operator/human confirmation event。

旧 Review event log 仍可读取，但缺少 obligation contract 的旧 Session 不能静默完成。

## 尚未解决的根因

5R.1-5R.4 已消除验收分母可删减、Source 结构难消费，以及 Structure/component/token/state/interaction 由 Agent 自证的问题。剩余问题集中在消费规模、Target 接入和推广：

1. **渐进读取载荷仍然偏大**：Screen packet 和 Case delta 已去除完整 provenance，但仍包含大量重复 expected、bbox、document order 和 scroll owner 字段；Agent 可能再次被机械 Fact 差异淹没。
2. **Target inspector 需要工程接入**：Structure/state/interaction verifier 不从 Flutter widget 名称或测试退出码猜语义；目标工程必须提供 deterministic `structureCommand`、`stateCommand` 和 `scenarioCommand`。未接入时系统会保持 `unverified`，不会静默通过。
3. **Target 映射声明仍可能不完整**：目标代码中实际存在的组件或 Token accessor，如果没有目标文档或机器 Contract 明确授权，resolver 仍只能返回 `candidate` 或 `unresolved`。这符合安全预期，但会阻止 authoritative Review 闭合。
4. **消费指南与构建产物需要同源校验**：Tool schema、仓库指南和 MCP 内置 guide 只要存在版本漂移，Agent 就可能遗漏新 verifier 或执行过时流程。
5. **跨技术栈与跨样本尚未推广**：Claim contract 与 Review authority 是 target-independent，但当前 occurrence/Structure adapter 仅实现 Flutter，仍需盲测和其他 Adapter 验证抽象是否稳定。

## 后续切片

### 5R.2 已实现：Screen Implementation Packet

- 输出 region tree、scroll owner/member、pinning、ordering 和 bbox-derived relations；
- baseline packet 包含可见 content/state，不只返回差异 Case；
- `read_case_delta` 改为紧凑 patch，不重复完整 Fact/provenance；
- 按 Screen/维度渐进读取 obligations，并记录稳定 continuation。

实现结果：

- Consumer projection 升级到 version 2，并声明 `screen-implementation-packet` 与 `reconstruction-obligations` capability；
- baseline Structure IR 逐 Region 输出 parent、ancestor、document order、scroll owner/member、positioning/pinning、bbox 和同级邻接；缺失字段保留为 unknown；
- target-independent comparator 可以识别 missing/extra Region、parent、scroll owner、positioning、sibling order 和 bbox relation mismatch；
- baseline/Case state snapshot 输出 visible Region/content、keyed collection 和 state requirements；
- Case delta 只保留 value/resolution/issue/provenance-change 标记，不重复完整 provenance；
- Evidence obligations 按 Handoff/Screen/维度分页，Review obligations 按 Screen/维度/assessment 状态分页；Review 摘要不再内嵌全部 expected；
- parent、scroll owner、positioning、sibling order 和 bbox relation mutation tests 已全部通过。

本切片提供 Source comparator；5R.3 已把它接到 Target inspector。目标工程未提供 inspector 时，真实滚动结构仍会被明确标为 `unverified`，不能宣称已自动验证。

### 5R.3 已实现：Target Claims 与 occurrence-level verifier

实现结果：

- 新增 target-independent `TargetImplementationClaim` 和 `ReviewVerifierReceipt`，receipt 绑定 obligation、Target revision、Target HEAD、worktree content digest 与 verifier result；同一 Review 的分批 receipt 不能跨 Target 内容状态；
- `verify_target_claims` 只接受 obligation ID 和 Target locator，expected、componentId、tokenId 均从固定 Review/Handoff 读取，Agent 不能重写 Source 预期；
- Structure claim 运行目标工程 `launcher.structureCommand`，校验输出的同构 Structure IR，再复用 5R.2 comparator；缺少 command、Case 或完整字段时返回 `unverified`；
- component claim 重新执行 resolver，并验证 `lib/**/*.dart` 中指定行的 constructor invocation，可选验证 owner constructor 与 named-argument slot；
- token claim 重新执行 resolver，并验证指定 owner constructor 的具体 named-argument slot 使用了 resolved accessor；
- 注释、字符串、import、无关文件和其他 occurrence 不计为命中；locator 越界、重复 obligation claim 和 Target HEAD 漂移会确定性失败；
- Review event log 新增 `target-claims-verified` runner event；新 Session 的 `matched` assessment 必须引用同一 obligation 的成功 receipt，receipt digest 不匹配会拒绝恢复；
- Review 摘要只返回 verifier receipt/result 计数，不重复完整 claims/results。

退出条件已由 mutation tests 覆盖：正确组件只出现在无关位置、只 import、不在 claimed occurrence 使用、Token 位于错误 slot，以及 Structure scroll owner 错误均不能通过。

本切片当时不把 state/interaction 自然语言 assessment 升格为机器事实；该缺口已由 5R.4 补齐。

### 5R.4 已实现：State 与 Interaction verifier

实现结果：

- Source Evidence read model 提升 runtime `props`，Acceptance 与 Screen packet 生成 typed keyed state snapshot，包括 state shell、visible Region、业务 key collection、selected/default 标量值和 semantic coverage；
- Target-independent claim 新增 `states` 与 `interactions`，仍只提交 obligation ID 与适用 Case，expected 从固定 Review 读取；
- Flutter contract 新增 `launcher.stateCommand`/Case `stateArguments`；输出必须包含 identity、shell、visible Region、keyed collection、values、`complete` 和 `unknownKeys`；
- `scenarioCommand` 从“退出 0 + stdout hash”升级为严格 JSON transition，记录 pre-state、实际 action ID/kind/target/input、post-state、checkpoint 和 visible result；
- verifier 逐义务验证 action target、action sequence、initial/post shell、required/forbidden visibility、expected state values 和 collection keys；缺命令、Schema/identity 不符或 incomplete/unknown 时为 `unverified`；
- state/interaction verifier result 自动物化为带 receipt 的 assessment；`deviation`/`unverified` 直接进入 Review 完成门禁；
- Core contract 不含 Prototype Screen ID、Flutter Widget 映射或项目 Token ID，绝对视觉值仍不作为状态/交互命中条件。

退出条件已由 mutation tests 覆盖：默认选中值错误、操作更新错误对象、交互记录存在但 post-state 未变化均返回 `deviation`，不能通过。

### 5R.5 跨样本推广

- 使用至少两个不同 Prototype 和两个独立实现 Agent 做盲测；
- 统计 obligation coverage、verifier authority、unknown/deviation、上下文字符数和调用次数；
- 只有结构、组件、Token、状态和交互五类 mutation 都被系统捕获，且消费量没有退回全量读取级别，才允许 Promote。

## 2026-08-05 固定 Handoff 只读验证结论

验证使用以下不可变引用：

- Workspace：`pbwork-local`；
- Handoff：`handoff-2026-08-05t144830231-7c176926`；
- Bundle：`bundle-2026-08-05t144807352-64c6e471`；
- Snapshot：`snapshot-2026-08-05t144826204-480957ce`；
- Target：`apps/flutter_pb_app`，revision `11ad24e9a6bd40ac9172f4e31261a846b4b6dbb3`；
- Handoff 原始 `mandatoryRisks`：`[]`；
- 范围：3 Screens、24 Cases、7 Scenarios、16 份不同 Screenshot 内容。

当前 MCP 为 package `0.4.0`、projection version 2，`screen-implementation-packet`、typed state、keyed collection，以及 structure/component/token/state/interaction verifier 均已在当前进程可见。本次验证没有切换到 `active`、`latest` 或旧读取链路，并实际查看了全部 16 份去重 Screenshot。

### 决策：Revise，暂不 Promote

Source Evidence 已足以确定三个 Screen 的页面构图和滚动边界：app bar 固定在 viewport，主体各自只有一个纵向 scroll owner；summary、search、filter、列表、表单 section、详情 card 和 timeline 都是该主体的成员，Dialog、Bottom Sheet 和 Snackbar 是覆盖层。因此后续实现若再次产生错误 scroll owner，根因不再是 Source Evidence 缺失，而是 Target 实现或 Review gate 没有执行到位。

本次读取同时确认以下改进已经生效：

- 固定引用、capability handshake、Handoff index 和 Screenshot digest 去重有效；
- baseline Structure IR 已明确 parent、order、scroll owner/member 和 positioning；
- typed state、keyed collection 和 Scenario checkpoint 已进入 packet/delta；
- verifier schema 已覆盖五个维度，Agent 不能再通过空 finding 或自然语言声明完成。

但当前仍不满足 Promote 条件：

- 三个 Screen packet 合计约 48k token 并发生输出截断；21 个非 baseline Case delta 仍约 20k token，单 Variant 可包含数百条机械 Fact 差异；
- 为提取约 57 个唯一 Token ID，三个 Screen 的 token detail 在 `pageSize=100` 下累计 28 页，说明 detail 尚未按语义去重到合适工作集；
- MCP 内置 `handoff-consumer` guide 未同步说明 state/interaction typed verifier，而仓库指南已经更新；这是构建资源内容漂移，不是旧 MCP 进程；
- Flutter Target 尚未声明 `structureCommand`、`stateCommand` 和 `scenarioCommand`，所以动态和结构义务仍只能保持 `unverified`；
- 19 个 Evidence component ID 中有 17 个 resolved，`spinner` 和 `switch` 仍为 candidate；约 40 个 Token resolved，但 `color.scrim`、`border.hairline`、motion、部分 elevation/radius/sizing/typography 映射仍为 candidate 或 unresolved；
- 当前 `cold_chain_ops` 实现虽然顶层单滚动方向基本正确，但仍存在 `form-section` 被 `CommonCard` 替代、empty 分支绕过 `CommonScrollableDataList`、timeline 缺少稳定业务 key、7 个 Scenario 未完整重放等问题。

### 下一步修复顺序

1. 压缩 Source projection：Screen packet 去除 state 与 requirement expected 的重复；Case delta 按 Region 和语义变化聚合 add/remove/reparent/scroll-owner/order/state patch，不再逐字段展开机械 bbox Fact。
2. 为 Screen packet 增加稳定、去重的 component/token inventory，避免 Agent 为批量 Target resolver 再遍历完整 detail；增加响应字符数、item 数和重复率预算测试。
3. 让 MCP 内置 guide、仓库指南、capability 和 Tool schema 从同一来源生成或交叉校验，构建时阻止 state/interaction 能力与文案漂移。
4. 补齐 Flutter Target 自有映射声明；已有 accessor 只补目标文档/Contract，真正缺失的 `border.hairline`、standard easing 等再扩展 Theme API，不在 feature 中写裸值。
5. 为 Flutter Target 接入 deterministic structure/state/scenario launcher；Structure 输出真实 parent/scroll owner/order，State 输出 visible Regions、keyed collections 和 selected/default values，Scenario 输出 pre/action/post/checkpoint/visible result。
6. 修正 cold-chain Target 仅作为验证样本，不把业务 ID 写入 Core：复用真实 `CommonFormSection`、统一单滚动组件、补稳定业务 key，并完整重放 7 个 Scenario。
7. 完成 authoritative Review 后再执行 5R.5：至少两个不同 Prototype、两个独立 Agent 和一个非当前项目映射范围；只有五维 mutation 均被捕获且消费量未退回全量级别，才重新评估 Promote。

## 非目标

- 不引入还原度综合分数或维度权重；
- 不把 cold-chain Screen、Flutter widget 或项目 Token ID 写入 Core；
- 不用 Pixel diff 代替结构、状态或交互验证；
- 不通过增加 Prompt 文案假设 Agent 会稳定遵守；
- 不重新全量注入 Acceptance Contract 来换取覆盖率。
