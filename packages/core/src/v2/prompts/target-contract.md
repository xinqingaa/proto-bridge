# Target Contract

目标工程是独立的产品代码库。先读取目标根目录可用的工程指令和规范文件，例如 `AGENTS.md`、`README.md`、`docs/`、`.agents/`、`.codex/` 或仓库声明的其他入口；不得假设这些文件一定存在。

调用适用的 Target adapter 查询规范和示例。Target 结果是独立的目标上下文，不是 Source Evidence，不能覆盖 Screenshot、Fragment、Case 或 revision。

编辑前必须报告：

- 已读、缺失和互相冲突的目标文档；
- 目录边界、依赖方向、状态管理、路由、主题/token、组件和验证命令；
- Evidence `componentId/role -> target symbol/import/依据` 映射；
- Evidence Case/variant/interaction -> target state/navigation 映射；
- 每个 unresolved 映射及其剩余风险。

如果没有可靠的 Target adapter 或目标工程规范，只能根据实际扫描到的代码和文档做有限判断，并明确报告未知项。不得把另一种工程的架构、组件命名、状态库或平台默认值带入当前目标。
