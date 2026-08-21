# 词汇表

| 术语 | 含义 |
| --- | --- |
| PB / ProtoBridge | 原型 Evidence 的采集、持久化、交接和消费基础设施 |
| PBWork | PB 的图形工作台、原型生产环境和 instrumented Runtime |
| Workbench | PBWork 中面向人的管理界面 |
| Runtime | 可由 URL 确定性打开并暴露 Capture Protocol 的原型页面 |
| Prototype | 一组具有共同产品身份、设计基础和 Screen 的原型 |
| Screen | 可寻址、可复现、可声明 Variant 的页面身份 |
| Variant | Screen 的稳定业务状态；Theme 不是 Variant |
| Fragment | `screenId + pbId + optional pbKey` 标识的语义区域 |
| Evidence-bearing node | 需要 Agent 独立实现、消费或验收，因而必须显式进入 Fragment/Fact 的节点 |
| Action | Runtime 可确定性执行的原子交互 |
| Scenario | 初始 Variant、Action 顺序和 Checkpoint 的组合 |
| Checkpoint | Scenario 中要验证的实际 Screen/Variant 与 required Fragment |
| Selection Draft | 用户希望采集的范围和维度 |
| Preflight | 执行前对 Contract、风险、容量和 Matrix 的固定检查 |
| Case | Screen、Variant、Theme、Device、Fixture、Scenario、Scope 的稳定组合 |
| Capture Scope | 一个 Screen 或稳定 Fragment 集合 |
| Job | 可查询、取消和恢复的执行控制对象 |
| Run | 一次已终结 Selection 的不可变执行记录 |
| Attempt | 某个 Case 在一次 Run 中的实际执行结果 |
| Evidence revision | 某个 Case/Scope 的不可变 Facts、provenance 和 Blob refs |
| Snapshot | Bundle 某一时刻的固定 active Evidence、latest Attempts 和 Coverage |
| Bundle | 一个 Prototype 的长期 Evidence 容器 |
| Catalog revision | Prototype、Screen、Component、Token 等固定目录证据 |
| Coverage | Selection 中每个 Case 的终结结果与覆盖范围 |
| Issue | unknown、conflict、失败、限制和 next action |
| Staleness Report | 指定 Snapshot 相对明确输入的一次 freshness 判断 |
| Agent Handoff | 固定 Workspace、Snapshot、revision、范围和风险的消费索引 |
| Blob | 由 Snapshot/Catalog owner ref 管理的截图或调试数据 |
| Evidence Level | Evidence 输入和可证明能力的等级 |
| Target | Agent 要修改的独立目标仓库 |
| Authoring lint | 对原型源码中的稳定身份、role、Token binding 和疑似遗漏执行的静态检查 |
| provenance | Fact 的具体来源、采集方式和上下文 |
| unknown | Evidence 没有证明的事实 |
| conflict | 多个来源不能一致解释的事实 |
| active Evidence | 当前可用的成功 revision |
| latest Attempt | 最近一次实际执行，可能失败且不等于 active Evidence |

## GUI 对照

PBWork 工作台主文案用中文；产品词可作次要标注。验收与指南应对照下表，避免只写英文术语。

| 产品词 | GUI 主文案 |
| --- | --- |
| Finalization | 定稿并采集 |
| Deliver / Deliver FlowSheet | 非正式采集（诊断入口，不改变生命周期） |
| Selection / Draft | 采集范围 |
| Preflight | 范围检查 |
| Case Matrix | 将采集 N 项 / 将执行的采集项 |
| Case | 采集项 / 视图 |
| Variant | 页面状态 |
| Scenario | 交互场景 |
| warning | 需要确认的事项（勾选「我已了解并继续」） |
| Job / 任务中心 | 采集任务（后台历史） |
| Evidence Viewer | 采集结果（按需详情） |
| Fragment | 页面区域 / 验收元素 |
| Coverage | 覆盖情况（如「N/N 个视图采集成功」） |
| Issue | 检查说明 |
| Agent Handoff | Agent 交接（交付流程内生成） |
| Agent prompt / deliveries | Agent 提示词 / `.proto-bridge/deliveries/` |
| mandatory risk | 必须确认的风险 / 风险提醒 |
| Staleness / freshness | 新鲜 / 已过期 |

状态、风险和错误码的机器权威在 `@proto-bridge/core/v2` Schema 中。
