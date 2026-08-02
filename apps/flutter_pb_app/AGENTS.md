# flutter_pb_app Agent Rules

这是一个独立的、可运行的 Flutter 产品工程。实现功能前必须先读本文件、`README.md` 和任务相关的 `docs/`，再检查实际代码和相似页面。

## 文档优先级

1. 固定 ProtoBridge Evidence 决定源页面的结构、文案、状态、交互和构图。
2. 本工程的 `AGENTS.md`、`docs/` 和实际代码决定目标侧的落点、组件职责、Theme、路由和验证方式。
3. Target adapter 查询结果只提供目标工程上下文，不能覆盖 Screenshot、Fragment、Case 或 revision。

文档缺失或与代码冲突时，编辑前必须报告，不得用熟悉的 Flutter 默认架构补齐未知项。

## 修改边界

- 业务页面和页面模型放在 `lib/features/<feature>/`。
- 路由常量和注册表只放在 `lib/router/`。
- 主题和语义 token 只放在 `lib/theme/`。
- 可复用 UI 和共享弹层只放在 `lib/common/`。
- 不在 feature 中复制公共组件、创建平行 Theme 或绕过既有路由/弹层边界。
- 只修改 Handoff 实现范围相关文件；发现无关变更时保留并在报告中区分。

## 实现流程

1. 阅读 Evidence 的固定 Snapshot、revision、Fragment 和 Screenshot。
2. 阅读目标文档、公共组件定义和相似页面。
3. 先列出 Evidence 组件到目标 symbol/import 的映射，以及 Case/variant/interaction 到目标状态/路由的映射。
4. 无法确认的映射、布局敏感值或状态必须标记 unresolved 并记录风险。
5. 使用现有 Theme、组件和路由实现；不得按外观用通用 widget 静默替换有语义的组件。
6. 实现后运行目标工程检查、测试和可用的同尺寸视觉验证。

## 必要验证

```bash
flutter analyze
flutter test
```

视觉验证遵循 [testing.md](docs/testing.md)。最终报告必须包含固定引用、原始风险、修改文件、验证结果、已知偏差和剩余风险。
