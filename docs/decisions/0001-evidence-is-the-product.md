# ADR 0001：Evidence 是产品输出

- 状态：Accepted

## 决策

ProtoBridge 的正式产品输出是可追溯 Evidence，而不是特定目标框架的实现计划或生成代码。

PB 负责证明原型中可观测的结构、状态、交互和像素事实，并保存来源、完整性、未知、冲突与风险。Coding Agent 结合目标仓库自身上下文决定具体实现。

## 理由

原型事实与目标工程表达属于不同知识域。相同页面可以由 Flutter、Web、原生移动端或其它技术实现；文件组织、路由、组件和状态框架也因目标仓库而异。

把这些目标决策固化进 PB 会产生三个问题：

- 在 Evidence 不足时仍要推导出看似完整的答案；
- Target 变化会迫使原型采集模型同步变化；
- Agent 无法区分原型事实、目标仓库事实与工具建议。

Evidence-first 让 PB 专注于可证明事实，Agent 专注于目标工程实现。

## 结果

- Evidence revision 不包含目标实现蓝图。
- Target query/validation 与 Capture 解耦。
- unknown 与 conflict 是合法结果。
- Handoff 是固定 Evidence 索引，不是任务规划。
- 新 Target Adapter 不改变 Evidence 核心对象。

