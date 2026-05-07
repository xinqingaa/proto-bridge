# MCP Agent 工作流规划

本文档记录 ProtoBridge 下一阶段的自动化方向：不在 CLI 中直接生成 Flutter Dart 文件，而是通过 MCP 把迁移上下文提供给 AI coding agent，由 agent 在目标仓库中完成实现。

## 1. 背景判断

Vue 原型到 Flutter 页面不是稳定的字符串转换问题。真正影响实现质量的是目标仓库里的组件规范、相似页面、状态管理习惯、主题服务、路由方式、空态/加载态、代码风格和运行验证。

CLI 可以稳定生成 `migration-context.json` 和 `migration-spec.md`，但 CLI 缺少 agent 能力：

- 不能像开发者一样检索并理解 target 仓库中的相似实现。
- 不能在实现过程中根据编译错误和上下文反复修正。
- 不能可靠判断哪些 Vue 结构应该重组为 Flutter 的页面、Controller、model 和 widget。
- 如果强行内置 Dart 生成规则，会把大量 target 业务规范硬编码到 ProtoBridge，长期不可维护。

因此，ProtoBridge 的自动化方向应转为 MCP + AI coding agent。

## 2. 目标体验

用户在 AI coding 工具中只提供一个入口信息：

```text
用 ProtoBridge 迁移 /prototype/nav-history 到 YouFi Flutter。
```

或：

```text
用 ProtoBridge 迁移这个 URL：http://localhost:5173/#/prototype/fund-profile
```

期望流程：

```text
AI agent 调用 ProtoBridge MCP
  -> 生成 migration context/spec
  -> 获取 target 工程约束和相似 Flutter 页面
  -> 在 target repo 中实现 Dart 页面
  -> 运行或请求运行校验
  -> 汇报改动文件、风险和待确认项
```

用户不需要手动复制 `migration-spec.md` 给 AI 工具。`migration-spec.md` 是 agent 的上下文材料，也可以作为人工 review 产物保留。

## 3. 能力边界

ProtoBridge MCP 负责：

- 定位 source 页面：route、URL、Vue 文件。
- 生成 source facts、target facts、token mapping 和 migration spec。
- 给 agent 提供目标模块、相似页面、可复用组件、主题 token、i18n 和资源线索。
- 校验 agent 的改动范围和关键实现要求。

AI coding agent 负责：

- 阅读 spec/context 和 target 示例。
- 创建或修改 Flutter Dart 文件。
- 根据 target 项目习惯选择 `CommonAppBar`、`BaseGetView`、`ListView`、`SmartRefresher`、空态、加载态等实现方式。
- 运行 analyzer/test 或根据错误继续修复。

ProtoBridge MCP 不负责：

- 直接提交业务代码。
- 在 MCP server 内硬编码完整 Flutter 页面生成器。
- 绕过 agent 直接把 Vue template 转成 Dart widget。

## 4. 候选 MCP 工具

### `generateMigrationSpec`

输入 route、URL 或 Vue 文件，输出本次迁移的 context/spec 路径与核心摘要。

用途：

- 给 agent 建立页面事实。
- 生成可追溯的 `migration-context.json` 和 `migration-spec.md`。

### `getMigrationBrief`

读取已生成的 context/spec，返回 agent-friendly brief。

内容可以包括：

- 页面元信息。
- 推荐目标模块。
- 目标文件拆分。
- Widget 组合。
- 状态/交互/路由/i18n/资源摘要。
- 人工确认项。

### `findTargetExamples`

根据页面模式、模块和 widget role 搜索 target Flutter 仓库中的相似实现。

示例输入：

```json
{
  "module": "etf",
  "pattern": "record-list",
  "roles": ["app-bar", "data-list", "empty-state"]
}
```

示例输出：

- 相似 Dart 文件路径。
- 相关代码片段摘要。
- 可复用组件线索，例如 `CommonAppBar`、`CommonEmpty`、`SmartRefresher`。

### `getTargetConventions`

返回目标仓库当前可识别的实现约束。

内容可以包括：

- 模块目录结构。
- `BaseGetView` / `GetView` 使用习惯。
- `themeService.colors` 和 `themeService.textStyles`。
- AppBar、按钮、图片、空态、加载态等 common widgets。
- routes、i18n、assets 的位置。

### `validateTargetChanges`

对 agent 生成后的 target 改动进行结构性检查。

初期检查项：

- 是否只写入允许的 `_spec` 模块或用户指定范围。
- 是否误改 routes、i18n、全局文件。
- 是否还存在明显伪 UI，例如把说明文字直接放进 `Text('展示...')`。
- 是否使用 target 主题服务和 common widgets。
- 是否保留人工确认项或 TODO。

## 5. 推荐 Agent 流程

```text
1. 调用 generateMigrationSpec(route/url/vue)
2. 调用 getMigrationBrief()
3. 调用 findTargetExamples(pattern/module/roles)
4. 调用 getTargetConventions()
5. 在 target repo 中实现页面
6. 运行 analyzer/test 或至少做静态检查
7. 调用 validateTargetChanges()
8. 向用户汇报改动文件、验证结果和待确认项
```

## 6. CLI 与 MCP 的关系

CLI 保持简单稳定：

```bash
npx @proto-bridge/cli generate --route /prototype/nav-history
```

CLI 输出：

```text
output/<page>/
├── migration-context.json
└── migration-spec.md
```

MCP 面向 AI agent：

- 自动调用 core 能力生成 spec/context。
- 自动把 spec/context 作为上下文交给 agent。
- 提供 target 检索和校验工具。

## 7. 近期调研问题

- AI 工具侧如何发现并调用 ProtoBridge MCP。
- MCP 工具返回完整 Markdown、摘要还是结构化 JSON 更适合 agent。
- `findTargetExamples` 应该基于文件名、路由、语义 role 还是 embedding/检索增强。
- `validateTargetChanges` 的最低可用规则集。
- 是否需要一个 agent prompt 模板作为 MCP 返回值。
- 是否保留 `migration-spec.md` 文件产物，或仅在需要审查时导出。
