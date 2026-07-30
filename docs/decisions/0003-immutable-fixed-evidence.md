# ADR 0003：历史不可变，消费使用固定引用

- 状态：Accepted

## 决策

Run、Attempt、Evidence revision、Snapshot、Catalog revision、Issue、Staleness Report 和 Agent Handoff 都是不可变对象。Handoff 固定 Workspace、Snapshot、revision 和范围；Consumer 不使用 active/latest 替代固定引用。

## 理由

如果“当前结果”可以被后续采集覆盖，同一个 Handoff 在不同时间会指向不同事实，Review、实现和回归无法复现。失败重试还可能把上一次成功 Evidence 覆盖为空。

将身份拆开可以同时表达：

- Case 的长期稳定身份；
- 最近一次 Attempt 的真实结果；
- 当前可用的成功 Evidence；
- 某次 Review 和 Handoff 实际看到的 Snapshot。

## 结果

- 新采集追加 Run/revision/Snapshot，不覆盖历史。
- active successful Evidence 与 latest Attempt 分离。
- 失败或降级结果不能替换更可信 active revision。
- Staleness Report 判断 Snapshot，不修改 Snapshot。
- MCP 校验对象可达性并拒绝 latest fallback。
- Store 文件路径不属于公共引用。

