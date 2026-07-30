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
  → Agent Handoff
  → MCP fixed read
  → Agent implementation + target validation
```

## 1. 制作可采集原型

原型作者只能从 PBWork 的 Token、Theme、基础组件、复杂组件和共享手势中组装页面。没有对口组件时可以实现业务局部 UI，但设计量仍必须使用现有 Token，且不得复制已有组件职责。

每个进入 Evidence 闭环的 Screen 必须：

- 在唯一 Registry 中声明稳定身份、路径、默认 Variant 和关键 Variant；
- 为 default 与 critical Variant 声明 `requiredFragments`；
- 用稳定 `data-pb-id`、可选 `data-pb-key` 和合法 `data-pb-role` 标记语义节点；
- 为关键交互声明 Action、Scenario 和 Checkpoint；
- 能由 Runtime 确定性执行 describe、prepare、readiness、semantic snapshot 和 reset。

完整规则见 [原型 Authoring Contract](../reference/prototype-authoring.md)。

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

## 6. Agent Handoff

Handoff 固定：

- Workspace；
- Bundle 与 Snapshot；
- Staleness Report；
- 实现范围；
- 具体 Case、revision 和 Fragment；
- `mandatoryRiskReport`。

Handoff 是 Evidence 索引，不是实现计划。PBWork 可以创建和导出 Handoff；CLI 提供同一能力。

## 7. MCP 与目标实现

Agent 通过 MCP：

1. 确认 MCP 绑定的 Workspace；
2. 读取 Handoff；
3. 在编辑前报告全部 mandatory risks；
4. 读取固定 Snapshot、Coverage、Staleness Report 和 revision；
5. 按需读取 Fragment、Screenshot 和 Issue；
6. 阅读目标仓库自身规范与既有代码；
7. 实现并运行目标原生测试；
8. 调用 Target validation 工具核对变更范围和结果。

Target 查询与 Capture Evidence 互相隔离。目标仓库的既有组件和约定可以指导实现，但不能覆盖原型 Evidence 中的 unknown 或 conflict。

详细对象关系见 [Evidence 模型](../architecture/evidence-model.md)，操作指南见 [PBWork 与 PB](../guides/pbwork-and-pb.md)和 [Agent 消费指南](../guides/agent-consumption.md)。

