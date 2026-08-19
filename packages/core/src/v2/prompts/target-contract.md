# Target Contract

目标工程是独立的产品代码库。先读取目标根目录可用的工程指令和规范文件，例如 `AGENTS.md`、`README.md`、`docs/`、`.agents/`、`.codex/` 或仓库声明的其他入口；不得假设这些文件一定存在。

真实目标工程中的文档和公开代码是当前工程约束的首要来源。调用适用的 Target adapter 查询规范和示例时，adapter 只负责发现、归一化和返回带来源的目标上下文；其内置规则是缺失文档时的保守 fallback，不是另一份可覆盖目标工程的规范。状态管理以目标 `docs/` 与 `AGENTS.md` 为准；adapter 不从 pubspec 或 Dart 用法推断状态库。Target 结果不是 Source Evidence，不能覆盖 Screenshot、Case 或 revision。

先形成一份短摘要，至少覆盖：

- 已读、缺失和互相冲突的目标文档；
- 目录边界、依赖方向、状态管理、路由、主题/token、组件和验证命令；
- Evidence `componentId/role -> target symbol/import/依据` 映射；
- Evidence Case/variant/interaction -> target state/navigation 映射；
- 影响实现的 unresolved 映射及其剩余风险。

如果没有可靠的 Target adapter 或目标工程规范，根据实际扫描到的代码和文档做有限判断，并明确报告未知项。不要把另一种工程的架构、组件命名、状态库或平台默认值带入当前目标。

`inspect_target_readiness` 中缺少 machine authority 表示该维度不能获得确定性的目标侧机器证明，不等于目标工程必须补充 Runtime Harness。实施仍以可靠的 mapping、目标工程规范、固定 Evidence 和实际测试为依据；最终报告必须披露未验证边界。
