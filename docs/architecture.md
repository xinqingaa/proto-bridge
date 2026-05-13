# ProtoBridge 架构与数据模型

## 1. 当前架构

ProtoBridge 当前采用 capability-first 架构：

```text
CLI / MCP
  -> reconstructPageContext
  -> source.analyze
  -> runtime.capture
  -> screenshot.attach
  -> target.inspect
  -> page.merge
  -> ui.plan
  -> ui.review
  -> ui.validate
```

CLI 和 MCP 是入口，不再各自维护一条公开 workflow。

## 2. 包边界

```text
packages/
├── core/
├── cli/
└── mcp-server/
```

- `packages/core`：capabilities、统一 workflow、source/snapshot/target 实现、artifact 写出和类型。
- `packages/cli`：命令行参数、config 读取、终端输出。
- `packages/mcp-server`：MCP stdio、tools、resources、prompts、session state。

入口层不承载业务规则；业务能力进入 core。

## 3. Core 目录

```text
packages/core/src/
├── capabilities/
├── workflows/
│   └── capability-first/
├── source/
├── snapshot/
├── target/
├── artifacts/
├── shared/
└── types/
```

- `capabilities`：稳定能力 facade。
- `workflows/capability-first`：统一编排。
- `source`：source 技术栈分析。
- `snapshot`：browser capture、OCR、evidence enrichers。
- `target`：Flutter conventions、examples、planning、validation。
- `artifacts`：JSON/Markdown 写出。
- `shared`：跨层小工具。

## 4. Canonical 与 Projection

Canonical artifact：

- `page-canonical.json`

Projection artifacts：

- `page-debug-index.json`
- `ui-build-plan.json`
- `ui-build-review.md`
- `screenshots/`

`page-canonical.json` 是最完整的页面上下文；projection 用于 debug、实现和 review。

## 5. PageCanonical

`page-canonical.json` 包含：

- `sourceFacts`
- `runtimeFacts`
- `screenshotFacts`
- `targetFacts`
- `merge`
- `fieldPriority`
- `mismatches`
- `manualConfirmations`
- `provenance`
- `orchestrationTrace`
- `nodes`
- `sections`
- `screenshots`
- `artifacts`

## 6. Field Priority

- source 优先表达结构、语义、状态空间、设计意图。
- runtime 优先表达当前真实渲染、bbox、computed style、可见文本、active/open state。
- screenshot/OCR 优先表达最终视觉对照和补证。
- target 优先表达模块、文件落点、组件复用、theme/i18n/asset conventions。

## 7. Public API

推荐外部 API：

- `@proto-bridge/core/workflows/capability-first`
- `@proto-bridge/core/capabilities`
- `@proto-bridge/core/target/flutter-app`
- `@proto-bridge/core/source/vue3-prototype`

旧公开 workflow subpath 已移除。`workflows/` 当前只保留 `capability-first`。
