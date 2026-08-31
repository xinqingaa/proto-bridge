# 产品工作流

ProtoBridge 的闭环按时间走完：人确认关键节点，系统固定页面事实，编程助手按事实在目标工程里还原。PBWork 连接设计到交接；MCP 连接读取到实现。

![端到端：从原型到目标应用还原](../images/02-workflow.png)

阶段与两道人工门：

1. 把产品设计做完整并批准
2. 做成可交互、可采集的原型
3. **采集前确认**：人确认范围和风险，然后整份采集并封存当时的页面事实
4. 把封存结果交给编程助手
5. 助手先只读理解，写出还原计划
6. **改代码前确认**：人批准计划后，助手才在目标工程里实现
7. 对照验收

系统怎么接见 [系统架构](../architecture/overview.md)。助手怎么读、怎样算过关见 [Agent 消费指南](../guides/agent-consumption.md)。

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

## 3. 采集前确认、封存与交接

产品主路径是 PBWork「待确定 → 定稿并采集」：人逐项确认 warning 和 risk 后，系统采集整个原型并写出 Handoff。未确认的 warning 会阻止执行；确认不会改变风险事实，只允许任务继续。

### Selection

PBWork 正式定稿只采集整个 Prototype。Core 仍把入口归一为 `SelectionDraft`（Prototype、Screen、Variant、Theme、Device、Fixture、Scenario、Capture Scope）；Draft 不直接启动浏览器，也不创建 Store 对象。CLI 可通过 JSON Selection 表达相同语义，属于非正式诊断，不改变 PBWork 生命周期。入口差异在进入 Core 后消失。

### Preflight 与 Case Matrix

Preflight 从 Runtime 读取 authored manifest，校验 Screen、Variant、Action、Scenario、Fragment、协议版本、Capture Scope、required boundary、Case 容量和 warning 接受状态，并产生稳定 Case Matrix。用户必须看到实际 Case 数量、风险和范围。

### Capture Job

每个 Case 在隔离浏览器上下文中执行：固定 viewport、theme、Variant 和 fixture；调用 Runtime `prepare`；等待 readiness；执行 Scenario；在 Checkpoint 读取 required Fragment；同一 Case 内采集语义 Facts、provenance、截图和诊断信息；最后 reset 或关闭隔离上下文。

Case 失败不会回写或降级已有 active Evidence。Job 的进度、取消、失败和重试由 Core JobHost 统一管理。

### Store 与 Review

一次已终结 Selection 形成不可变 Run。每个成功 Case 产生 Evidence revision，Snapshot 固定本次提交后的 active Evidence、latest Attempt 和 Coverage。重新采集会创建新 Run 和新 Snapshot，历史 Snapshot 与 Handoff 保持可读。

PBWork Evidence Review 按 Screen、Case 和语义区域展示 Facts、Screenshot、required Fragment 完整性、unknown/conflict/Issue、active revision 与 latest Attempt 的差异、Staleness，以及当前 Snapshot 是否适合交接。

### Deliver 与 Agent Handoff

定稿成功后写入 `.proto-bridge/deliveries/`（收据、供人工/debug 查看用的 Evidence Brief 与 Review、按图片内容去重的 Screenshot、Agent 提示词）。完全相同的 Screenshot 只输出一份 PNG，但保留全部 Case 和 Blob 引用。Agent 提示词不嵌入 Brief 或完整 Contract；deliveries 只是 Store 索引。提示词中的目标路径来自 Workspace `delivery.targetRoot`，该字段不进入 Evidence。

CLI `deliver` 是非正式诊断入口，使用同一 Core 能力，但不改变 PBWork 生命周期。非交互使用必须 `--acknowledge-unofficial-capture`。

Handoff 固定 Workspace、Bundle、Snapshot、Staleness Report、实现范围、具体 Case/revision/Fragment 和 `mandatoryRiskReport`。Handoff 是 Evidence 索引，不是实现计划。

GUI 定稿操作见 [PBWork 与 PB](../guides/pbwork-and-pb.md)。对象关系见 [Evidence 模型](../architecture/evidence-model.md)。

## 4. 读取、实现与验收

消费从 MCP 开始：助手按固定 Handoff 只读理解，写出还原计划并等待人批准；批准后才改目标工程。实施和原生验证完成后，助手只对 Handoff 选中的 Case、Variant 和 Scenario 执行五维验收纪律，分别报告 Review completeness 与 matched/deviation/unverified/not-applicable findings，并生成人工复查清单。

默认读取顺序、MCP 工具、文档与技能分工见 [助手怎么读](../guides/agent-consumption.md)。采集完整、写完代码、Review complete 和助手自报都不等于最终视觉验收通过，完成判据见 [怎样算过关](../guides/agent-consumption.md#怎样算过关)。

Target 查询与 Capture Evidence 互相隔离。目标仓库的既有组件和约定可以指导实现，但不能覆盖原型 Evidence 中的 unknown 或 conflict。Evidence 层面允许任意 Target；当前内置 Target query/validation 只支持 Flutter。
