# ProtoBridge Agent 工作指南

本文档面向在本仓库中协作的 AI agent 和开发者。它不是用户入门 README 的副本，而是“如何理解这个项目、如何判断该走哪条 workflow、以及修改代码时该遵守什么边界”的工作指南。

如果你第一次进入仓库，建议先读 [README.md](README.md) 建立整体认知；如果你已经要开始改代码、改 workflow 或补文档，请继续读本文件。

## 1. 项目定位

ProtoBridge 是一个“原型到实现”的上下文桥接工具。当前项目有两套并列的一等工作模式：

```text
CLI = Source-aware Migration
MCP = UI Reconstruction
```

它们不是同一条流程的参数切换，而是两条不同入口、不同输入模型、不同产物、不同使用场景的 workflow。

项目核心价值：

- 把 source 页面事实、视觉证据、设计 token、资源、路由、notes、i18n 和 target 工程约束整理成稳定上下文。
- 把“不确定信息”保留为 warnings、risks、business questions 或人工确认项。
- 让人工或 AI coding agent 在 target repo 中继续实现时，不必从零重新理解页面。

项目不做：

- 直接生成完整 Dart 业务页面。
- 在 CLI 中确定性翻译 Vue 到 Dart。
- 在 MCP 中从纯截图直接反推完整 rendered DOM 级别的 node tree。
- 在 ProtoBridge 中保存 source/target 项目的规范副本。

## 2. 整体架构心智模型

先用 A/B/C 模型理解：

```text
A = Source project
B = Target project
C = ProtoBridge
```

默认 adapter 组合：

```text
source.adapter = vue3-prototype
target.adapter = flutter-app
```

核心分层：

- `source/*`：回答“source 页面要表达什么”。
- `snapshot/*`：回答“页面可见 UI 是什么”。
- `target/*`：回答“目标工程应该怎么实现”。
- `workflows/*`：把上面三类能力编排成 CLI 或 MCP。
- `artifacts/*`：写出 JSON / Markdown 产物。
- `shared/*`：放小型通用能力，不承载业务语义。

最重要的判断原则：

- CLI 看的是 source-aware 文档链路。
- MCP 看的是 evidence-first UI reconstruction 链路。
- 不要试图把两者揉成同一条 workflow。

## 3. 什么时候用 CLI 视角，什么时候用 MCP 视角

当任务涉及以下内容时，应优先用 CLI 视角理解问题：

- `migration-context.json`
- `migration-spec.md`
- source route / Vue SFC / notes / i18n / 页面配置
- target-facing 的实现说明书
- source 和 target 跨仓库上下文整理

当任务涉及以下内容时，应优先用 MCP 视角理解问题：

- `page-evidence.json`
- `ui-implementation-plan.json`
- URL capture
- screenshot / OCR / runtime metadata
- target conventions / target examples / target validation
- AI coding agent 在 target repo 中落地 Dart UI

如果一个需求同时提到两边，先问自己：

1. 它要解决的是 source-aware 说明书问题，还是 visible UI reconstruction 问题？
2. 它的主输入是 source 仓库内容，还是 URL capture 出来的 evidence？
3. 它的主产物是 Markdown 说明书，还是 JSON evidence / JSON UI plan？

## 4. 两种 workflow 的边界

### CLI：Source-aware Migration

CLI 的职责：

- 读取 source project 和 target project。
- 分析页面配置、源码、notes、i18n、source docs 线索。
- 读取 target modules、routes、translations、assets、common widgets 和相似页面。
- 生成 `migration-context.json` 与 `migration-spec.md`。

CLI 不应该承担：

- 直接暴露 MCP tools。
- 把 OCR 当成主输入。
- 直接写 target 业务代码。

### MCP：UI Reconstruction

MCP 的职责：

- 以 URL capture 为主入口生成 `PageEvidence`。
- 用 screenshot、rendered DOM、runtime metadata、optional OCR 组织 visible UI evidence。
- 读取 target conventions 和 target examples。
- 生成 `ui-implementation-plan.json`，并提供 validate 工具给 agent 使用。

MCP 不应该承担：

- 读取 source 仓库中的 notes / i18n / Vue 语义作为主路径。
- 暴露 CLI 的 `generate_migration_spec` 一类能力。
- 把纯图片 OCR 夸大成 rendered DOM 等级的结构推断。

当前真实边界：

- `capture_page_evidence` 当前只接受 `url`。
- `ocr_screenshot` 只补充 OCR 文字证据。
- rendered HTML / DOM snapshot 直接输入是未来扩展方向，不是当前公开 MCP API。

## 5. 目录职责与修改边界

核心目录：

```text
packages/
├── core/
├── cli/
└── mcp-server/
```

修改时应遵守：

- `packages/cli` 只做 CLI 入口、参数、配置、输出展示，不承载 source/target 业务规则。
- `packages/mcp-server` 只做 MCP 入口、tools、resources、prompts、session state，不承载 source-aware migration 逻辑。
- `packages/core/workflows/source-aware-migration` 只编排 CLI 模式。
- `packages/core/workflows/ui-reconstruction` 只编排 MCP 模式。
- `packages/core/source/*` 放 source 技术栈实现。
- `packages/core/snapshot/*` 放 URL capture、rendered DOM、OCR、evidence enrichers。
- `packages/core/target/*` 放 target 技术栈实现、planning、validation。
- `packages/core/artifacts/*` 只负责写文件。
- `packages/core/shared/*` 只放真正通用的小工具和协议。

不要做的事情：

- 不要把 source 规则硬写进 CLI 入口包。
- 不要把 target 规则硬写进 MCP 入口包。
- 不要让 workflow 相互 import。
- 不要把 source/target 项目的说明副本保存进 ProtoBridge 仓库。

## 6. 规范读取与证据原则

ProtoBridge 的一个重要原则是：规范来自 source/target 当前仓库，而不是来自 ProtoBridge 自己的记忆。

Source 侧可读取：

- 页面配置
- notes
- i18n
- 页面源码
- source README / docs / 架构说明 / 页面说明

Target 侧可读取：

- 模块目录
- route 文件
- translation 文件
- asset 目录
- common widgets
- 相似页面
- target README / docs / 架构说明 / 组件说明

证据优先级判断：

- source 信息约束“页面要表达什么”。
- page evidence 约束“页面可见 UI 是什么”。
- target 信息约束“目标工程应该怎么实现”。
- source/snapshot 与 target 习惯冲突时，实现建议优先服从 target 工程习惯，同时保留证据和人工确认项。
- 看不到的接口、权限、风控、埋点、隐藏状态不能伪装成确定结论。

## 7. 修改代码时的决策规则

当你要改代码时，优先遵守下面这些规则：

1. 先判断改动属于哪条 workflow。
2. 只在该 workflow 对应的层里改逻辑。
3. 如果是通用能力，再下沉到 `source`、`snapshot`、`target`、`artifacts` 或 `shared`。
4. 如果一个改动让 CLI 和 MCP 都要受益，优先把共享能力放进 `core`，不要在两个入口各写一份。
5. 如果文档描述和代码行为不一致，优先让文档描述“当前行为”，不要写历史叙事。

一些常见判断：

- 新增页面 capture 能力：优先看 `snapshot/*` 或 `workflows/ui-reconstruction/*`。
- 新增 source 分析能力：优先看 `source/vue3-prototype/*`。
- 新增 target 规划或校验能力：优先看 `target/flutter-app/*`。
- 新增 CLI 参数：只在 `packages/cli` 增加入口逻辑，并把业务实现放在 `core`。
- 新增 MCP tool：只在 `packages/mcp-server` 增加工具入口，并把业务实现放在 `core`。

## 8. 文档职责分工

本仓库文档分工应保持稳定：

- `README.md`：总览入口。先讲项目定位、整体架构、两种模式，再讲目录结构和深入阅读路径。
- `AGENT.md`：协作指南。强调 workflow 判断、目录边界、证据原则和修改约束。
- `docs/workflows.md`：两种 workflow 的详细对照、使用细节和产物。
- `docs/architecture.md`：模块边界、数据模型、目录职责和扩展点。
- `docs/mcp-ui-reconstruction-workflow.md`：MCP 详细工作流拆解。
- `docs/migration-spec.md`：CLI 产出的 Markdown 质量标准。
- `docs/integration.md`：CLI / MCP / core 的集成方式。

当你更新文档时：

- 总览入口放在 `README.md`。
- 协作规则放在 `AGENT.md`。
- 细节展开放到 `docs/`。
- 不要让 `README.md` 和 `AGENT.md` 同时承担全部详细说明。

## 9. 输出质量标准

CLI 生成的 `migration-spec.md` 至少应做到：

- 明确页面名称、route、screenId 和目标模块。
- 明确 Flutter 实现复杂度。
- 明确文件拆分、Widget 树、状态与交互建议。
- 明确 token、i18n、资源和可复用组件建议。
- 明确人工确认项。

MCP 生成的 `ui-implementation-plan.json` 至少应做到：

- 明确 evidence id、目标模块、route/title 和 viewport。
- 明确 planned file tree 和 widget tree。
- 明确 component mappings、theme mappings、i18n plan、asset plan、visible interactions。
- 明确 business questions、risks 和 validation hints。
- 不把 evidence 看不到的业务行为写成确定结论。

## 10. 风险边界

- JS 配置解析无法覆盖所有复杂动态逻辑，遇到不确定内容要写 warnings。
- Capture 依赖浏览器环境、页面可访问性和页面运行状态。
- OCR 是辅助 evidence，不应覆盖 rendered DOM 和 screenshot evidence。
- Target context 是实现建议，不替代目标 App 的代码审查。
- 交易类页面涉及接口、权限、风控、埋点和异常态时，应显式保留人工确认项。
- 输出结果必须可审查，不把推断内容伪装成确定事实。
