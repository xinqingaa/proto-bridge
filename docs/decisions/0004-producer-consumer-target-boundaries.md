# ADR 0004：Producer、Consumer 与 Target 单向分离

- 状态：Accepted

## 决策

PBWork 和 CLI 是 Evidence Producer；MCP 是固定 Evidence Consumer；Target query/validation 是独立只读边界。三者共享 Core Contract，但不共享可变业务状态。

## 理由

如果 MCP 同时创建采集任务，Agent 的读取过程会悄悄改变 Evidence。如果 Target 扫描结果进入 Capture merge，目标工程的既有实现会覆盖原型事实。如果 PBWork 与 CLI 各自展开 Matrix，同一输入会产生不同 Case。

## 结果

- PBWork/CLI 使用同一 Selection、Preflight、Capture 和 Store。
- MCP 不创建 Job、不写 Bundle。
- Target 结果不进入 Evidence revision。
- Agent 先读取固定 Evidence，再读取 Target 上下文。
- Target adapter 负责发现、解析和校验，不拥有具体目标产品的映射；真实目标文档/公开代码优先，可选机器 Contract 冲突时不得覆盖政策。
- 只有显式目标声明通过当前代码校验才能成为 `resolved`；启发式命中保持 `candidate`。
- CLI、MCP、Local Service 不复制 Core 状态和引用算法。
