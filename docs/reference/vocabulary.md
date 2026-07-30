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
| provenance | Fact 的具体来源、采集方式和上下文 |
| unknown | Evidence 没有证明的事实 |
| conflict | 多个来源不能一致解释的事实 |
| active Evidence | 当前可用的成功 revision |
| latest Attempt | 最近一次实际执行，可能失败且不等于 active Evidence |

状态、风险和错误码的机器权威在 `@proto-bridge/core/v2` Schema 中。

