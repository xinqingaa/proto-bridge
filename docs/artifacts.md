# Evidence 对象与持久化边界

ProtoBridge 不写出页面实现计划。正式持久对象由 [V2 核心规范](plans/pb-v2-spec.md)和 `@proto-bridge/core/v2` 的可执行 Schema 定义。

主要对象：

| 对象 | 含义 |
| --- | --- |
| Workspace | Store 的逻辑身份与归属边界 |
| Bundle | 一个 Prototype 的长期 Evidence 容器 |
| Run | 一次已终结 Selection 的不可变执行记录 |
| Attempt | 单 Case 最新一次执行结果 |
| Evidence revision | 某 Case/scope 的不可变 Facts、provenance 与 Blob refs |
| Snapshot | Bundle 在提交时的固定 active Evidence 与 Coverage |
| Catalog revision | Prototype/Screen/Component/Token 等固定目录证据 |
| Issue | unknown、conflict、失败和限制的持久解释 |
| Staleness Report | 指定 Snapshot 相对明确输入的一次 freshness 判断 |
| Agent Handoff | 固定 Workspace、Snapshot、revision、范围与全部 risks |
| Blob | 受 owner refs 和读取策略约束的截图或调试数据 |

## 读取规则

- Agent 通过 MCP 读取，不解析 Store 目录；
- 所有历史读取使用明确逻辑 ID；
- revision/Blob 必须能由固定 Snapshot 或 Catalog 到达；
- debug/trace Blob 需要显式许可；
- 对象缺失、Workspace 不匹配或引用不可达时确定性失败；
- unknown、conflict、required risk 必须原样保留。

本地文件布局是实现细节，不是公共 Contract。
