# ProtoBridge Agent 工作指南

## 1. 项目定位

ProtoBridge 是一个“原型到实现”的上下文桥接工具。当前项目有两套明确的工作模式：

```text
CLI 模式 = Source-aware Migration
MCP 模式 = Snapshot UI Reconstruction
```

CLI 模式读取 source project 和 target project，生成可审查、可归档、可交给人工或 AI coding 工具继续实现的迁移上下文与说明书。

MCP 模式读取 URL / rendered page / screenshot / OCR evidence，生成可见 UI 还原证据和 YouFi Flutter 实现计划，由 AI coding agent 在 target repo 中落地 Dart UI。

ProtoBridge 不定位为 Vue 转 Dart，也不追求一键完美迁移。它的核心价值是把页面事实、视觉证据、设计 token、资源、路由、notes、i18n 和目标端工程约束整理成稳定、可追溯的实现上下文。

当前默认技术栈：

```text
source.adapter = vue3-prototype
target.adapter = flutter-app
```

## 2. 工作原则

- `packages/cli` 只调用 `@proto-bridge/core/workflows/source-aware-migration`。
- `packages/mcp-server` 只调用 `@proto-bridge/core/workflows/snapshot-ui-reconstruction` 和 `@proto-bridge/core/target/flutter-app`。
- CLI 与 MCP 是两套 workflow，不通过参数切换成同一个流程。
- `adapters/` 只保留 adapter 协议和 registry，不承载具体技术栈实现。
- source 技术栈实现放在 `source/*`。
- snapshot / OCR / browser capture 能力放在 `snapshot/*`。
- target 技术栈实现和 YouFi / Flutter 能力放在 `target/*`。
- workflow 负责编排，不能把 source、snapshot、target 规则硬写进入口包。
- `artifacts` 只处理产物写入，不理解业务语义。
- `shared` 只放真正通用的小工具。
- 文档描述当前架构和当前行为，不写历史迁移叙事。

## 3. 工程结构

```text
packages/core/src/
├── adapters/
│   ├── registry.ts
│   └── types.ts
├── artifacts/
│   ├── artifact-writer.ts
│   └── index.ts
├── shared/
│   ├── paths.ts
│   └── index.ts
├── source/
│   └── vue3-prototype/
│       ├── adapter.ts
│       ├── prototype-page.ts
│       ├── vue-sfc.ts
│       ├── js-literal.ts
│       ├── types.ts
│       └── index.ts
├── snapshot/
│   ├── browser-capture/
│   │   ├── capture-rendered-page.ts
│   │   └── rendered-page-snapshot.ts
│   ├── ocr/
│   │   └── external-ocr.ts
│   ├── types.ts
│   └── index.ts
├── target/
│   └── flutter-app/
│       ├── adapter.ts
│       ├── context.ts
│       ├── target-connect.ts
│       ├── conventions.ts
│       ├── examples.ts
│       ├── theme-mapping.ts
│       ├── migration-planner.ts
│       ├── migration-recommendations.ts
│       ├── render-migration-markdown.ts
│       ├── ui-reconstruction-planner.ts
│       ├── validation.ts
│       ├── planners/
│       ├── types.ts
│       └── index.ts
├── workflows/
│   ├── source-aware-migration/
│   │   ├── generate-migration-context.ts
│   │   ├── generate-migration-spec.ts
│   │   ├── types.ts
│   │   └── index.ts
│   └── snapshot-ui-reconstruction/
│       ├── capture-page-snapshot.ts
│       ├── ocr-screenshot.ts
│       ├── build-ui-implementation-plan.ts
│       ├── render-ui-review-markdown.ts
│       ├── types.ts
│       └── index.ts
├── types/
│   └── index.ts
└── index.ts
```

职责：

- `workflows/source-aware-migration`：CLI 模式编排，生成 `migration-context.json` 和 `migration-spec.md`。
- `workflows/snapshot-ui-reconstruction`：MCP 模式编排，生成 `screenshot.png`、`page-snapshot.json`、`ui-implementation-plan.json`，可选生成 `ocr-result.json` 和 `ui-review.md`。
- `source/vue3-prototype`：读取 Vue3 原型工程、页面配置、notes、i18n、Vue SFC facts。
- `snapshot/*`：浏览器运行时页面证据、截图、DOM snapshot、OCR evidence。
- `target/flutter-app`：读取 YouFi / Flutter 工程约束，提供 conventions、examples、theme mapping、migration planner、UI reconstruction planner 和 validation。
- `adapters`：定义并注册 SourceAdapter / TargetAdapter。
- `artifacts`：JSON / Markdown 文件写入。
- `shared`：路径等通用工具。
- `types`：跨模块共享数据结构。

## 4. CLI 模式：Source-aware Migration

CLI 模式需要 `proto-bridge.config.json`，并读取 source 与 target 两个项目。

配置示例：

```json
{
  "source": {
    "adapter": "vue3-prototype",
    "root": "/Users/name/work/TradeAppPrd"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "/Users/name/work/youfi"
  },
  "outputRoot": "./output",
  "capture": false
}
```

页面输入可以来自：

- `--url <prototype-url>`
- `--route <route>`
- `--vue <file>`

核心流程：

```text
GenerateMigrationSpecInput
  -> AdapterRegistry.getSource(input.source.adapter)
  -> AdapterRegistry.getTarget(input.target.adapter)
  -> SourceAdapter.analyze
  -> optional capturePrototypePage
  -> TargetAdapter.mapTokens
  -> TargetAdapter.analyze
  -> TargetAdapter.buildRecommendations
  -> write migration-context.json
  -> write migration-spec.md
```

主产物：

```text
output/<page>/
├── migration-context.json
└── migration-spec.md
```

可选产物：

```text
output/<page>/
├── screenshot.png
└── dom-snapshot.json
```

CLI 模式适合：

- 需要读取 Vue 源码、notes、i18n 和页面配置。
- 需要可归档、可审查的迁移说明书。
- 需要迁移前梳理业务风险、人工确认项和 target 落点。
- 需要批量生成页面迁移材料。

## 5. MCP 模式：Snapshot UI Reconstruction

MCP 模式不读取 source 仓库，也不需要 `proto-bridge.config.json`。MCP 应从 YouFi target 仓库启动，默认 `process.cwd()` 就是 target root。

核心流程：

```text
URL / rendered page / screenshot / OCR evidence
  -> capture_page_snapshot
  -> screenshot.png
  -> page-snapshot.json
  -> build_ui_implementation_plan
  -> ui-implementation-plan.json
  -> AI coding agent implements Dart UI
  -> validate_target_changes
```

主产物：

```text
.proto-bridge/snapshots/<page>/
├── screenshot.png
├── page-snapshot.json
└── ui-implementation-plan.json
```

可选产物：

```text
.proto-bridge/snapshots/<page>/
├── ocr-result.json
└── ui-review.md
```

MCP tools：

- `capture_page_snapshot`
- `build_ui_implementation_plan`
- `ocr_screenshot`
- `export_review_markdown`
- `get_target_conventions`
- `find_target_examples`
- `validate_target_changes`

MCP 模式不暴露：

- `generate_migration_spec`
- `get_migration_brief`
- `read_migration_artifact`

MCP 模式适合：

- 用户只给 URL，希望快速还原可见 UI。
- AI coding agent 在 YouFi target repo 中实现页面。
- 页面业务行为暂时不要求完整迁移。
- 需要 screenshot + JSON evidence 支撑 UI 还原。

## 6. 规范读取与约束原则

ProtoBridge 不在自身仓库保存 source/target 项目的业务规范副本。需要规范时，应从 source/target 项目当前文件中读取。

Source 侧可读取：

- 页面配置。
- notes。
- i18n。
- 页面源码。
- source README/docs/架构说明/页面说明。

Target 侧可读取：

- 模块目录。
- route 文件。
- translation 文件。
- asset 目录。
- common widgets。
- 相似页面。
- target README/docs/架构说明/组件说明。

约束规则：

- source 信息约束“页面要表达什么”。
- snapshot evidence 约束“页面可见 UI 是什么”。
- target 信息约束“目标工程应该怎么实现”。
- source/snapshot 与 target 习惯冲突时，实现建议优先服从 target 工程习惯，同时保留证据和人工确认项。
- 信息缺失时写 warnings、risks 或 manual confirmations，不伪造确定结论。
- Markdown 面向 target 实现者，不直接暴露 source 模板语法或 CSS class 作为实现要求。

## 7. 质量标准

CLI 生成的 `migration-spec.md` 至少应做到：

- 明确页面名称、route、screenId 和目标模块。
- 明确 Flutter 实现复杂度。
- 明确目标文件拆分和 Widget 树。
- 明确状态、交互和生命周期副作用。
- 明确路由参数和跳转行为。
- 明确布局风险：fixed、sticky、scroll、safe-area、z-index 等。
- 明确 token、i18n 和资源迁移建议。
- 明确可复用 Flutter 组件。
- 明确人工确认项。

MCP 生成的 `ui-implementation-plan.json` 至少应做到：

- 明确 snapshot id、目标模块、页面 route/title 和 viewport。
- 明确 planned file tree。
- 明确 Widget tree。
- 明确 component mappings、theme mappings、i18n plan、asset plan。
- 明确 visible interactions。
- 明确 business questions、risks 和 validation hints。
- 不把 URL snapshot 看不到的接口、权限、风控、埋点写成确定结论。

## 8. 风险边界

- JS 配置解析可能无法覆盖复杂动态逻辑，遇到不确定信息应写 warnings。
- Capture 依赖浏览器环境、页面可访问性和页面运行状态。
- OCR 是辅助 evidence，不应覆盖 rendered DOM 和 screenshot evidence。
- Target context 是实现建议，不替代目标 App 的代码审查。
- 交易类页面涉及接口、权限、风控、埋点和异常态，需要保留人工确认项。
- 输出结果必须可审查，不把推断内容伪装成确定事实。
