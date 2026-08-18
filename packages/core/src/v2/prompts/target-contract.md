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

## Flutter authoritative Review readiness

当 `inspect_target_readiness` 识别到 Flutter Target 时，实施计划必须同时报告 Runtime Review authority。缺少或无法覆盖固定 Handoff 的 `review.version: 2` Contract 时，计划必须包含 Harness 补齐工作：声明 `dart-flutter-mcp` provider、Case/Scenario route/fixture/state binding 和稳定 finder；在 debug-only App 中提供 identity、prepare、observe service extension；启用 Flutter Driver extension；从同一运行 App 返回 typed State/Structure observation，并把 App build、Target commit/content digest 与 Review 固定绑定。该 Harness 只能在用户批准实施计划后实现。官方 MCP 只 attach 已运行 App；不得把模拟器 UDID、设备选择、启动/停止命令、target launcher 或自述 stdout 作为 Runtime fallback。非 Flutter Target 不要求或启动此 Harness。
