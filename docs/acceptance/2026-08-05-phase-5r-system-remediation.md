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

5R.1 消除了“事实可被静默忽略”的协议漏洞，但 assessment 仍主要是 Agent 声明，尚不能单独证明实现正确。以下问题必须按类别处理，不能继续按单页面补丁修复：

1. **Target Structure claim 尚未生成**：Source Structure IR 和 comparator 已可执行，但 Target adapter 还不能从目标实现/运行时产生同构 IR，因此真实滚动容器错误尚不能自动进入 assessment。
2. **Target binding 只验证全局存在**：当前 component/token validation 证明 symbol/accessor 在某个 Dart 文件出现，不证明目标 occurrence 的正确 slot 使用了它。
3. **状态语义仍需加强**：baseline 和 Case 已有 visible content、keyed collection 与 state requirements；selected/default value 仍需 typed state claim，不能只依赖通用 expected 对象。
4. **交互没有完整 transition contract**：action、input/dataflow、pre-state 和 post-state 需要绑定为一个可 replay、可断言的 transition。
5. **Verifier authority 不足**：`matched` 需要绑定 occurrence-level static claim、runtime semantic receipt 或 visual region receipt；不能长期依赖自然语言 detail。

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

本切片的 comparator 已堵住结构错误的通用比较逻辑，但 Target 实际 IR/claim 的采集属于 5R.3；在该适配完成前，不能声称真实 Flutter 滚动 mutation 已自动阻断。

### 5R.3 Target Claims 与 occurrence-level verifier

- Agent 提交 `obligationId -> target occurrence/slot/symbol/accessor` claim；
- Adapter 验证 occurrence 所在文件、语法节点、组件参数和 Token slot，而不是全仓字符串存在；
- matched assessment 必须引用 verifier receipt；无法验证时自动保持 `unverified`。

退出条件：在无关文件使用正确 component/token、在错误 occurrence 使用正确 accessor、只 import 不使用的 mutation 均不能通过。

### 5R.4 State 与 Interaction verifier

- 生成 keyed state snapshot，包括 visible collection、selected/default values 和状态壳层；
- Scenario receipt 记录 pre-state、action/input、post-state 和可见结果；
- required transition 未执行或 post-state 不匹配时自动产生 blocking assessment/finding。

退出条件：默认选中值错误、操作更新错误对象、交互发生但页面状态未变化的 mutation 均不能通过。

### 5R.5 跨样本推广

- 使用至少两个不同 Prototype 和两个独立实现 Agent 做盲测；
- 统计 obligation coverage、verifier authority、unknown/deviation、上下文字符数和调用次数；
- 只有结构、组件、Token、状态和交互五类 mutation 都被系统捕获，且消费量没有退回全量读取级别，才允许 Promote。

## 非目标

- 不引入还原度综合分数或维度权重；
- 不把 cold-chain Screen、Flutter widget 或项目 Token ID 写入 Core；
- 不用 Pixel diff 代替结构、状态或交互验证；
- 不通过增加 Prompt 文案假设 Agent 会稳定遵守；
- 不重新全量注入 Acceptance Contract 来换取覆盖率。
