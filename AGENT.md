# ProtoBridge Agent 工作指南

本文档面向在本仓库协作的 AI agent 和开发者。当前主线是 capability-first，不再维护旧的 CLI source-aware workflow 或旧 MCP URL-first 分步 workflow 作为公开路径。

## 项目定位

ProtoBridge 是原型到实现的上下文桥接工具。它整理 source facts、runtime evidence、screenshot/OCR、target conventions 和人工确认项，生成可追溯的页面上下文。

ProtoBridge 不做：

- 直接生成完整 Dart 业务页面。
- 把 Vue 确定性翻译成 Flutter。
- 从纯截图伪造 rendered DOM 等级的 node tree。
- 在仓库内复制 source/target 项目的业务规范。

## 当前主线

```text
CLI / MCP = 入口
capability = 可复用底层能力
workflow = capability-first 编排
```

主编排入口：

- core：`reconstructPageContext`
- CLI：`proto-bridge generate`
- MCP：`reconstruct_page_context`

主产物：

- `page-canonical.json`
- `page-debug-index.json`
- `ui-build-plan.json`
- `ui-build-review.md`
- `screenshots/full-page.png`

`migration-spec.md` 只是显式开启 `sourceBrief` 时的可选 source-aware brief。默认不再输出 `migration-context.json`。

## 输入场景

三种场景都走同一条 capability-first 主链路：

- source-only：`source.root + route/vue`
- runtime-only：`url`
- hybrid：`source.root + route/vue + url`

CLI 和 MCP 当前阶段都读取 `proto-bridge.config.json`。MCP tool 参数优先于 config，config 优先于默认值。

## 能力边界

核心能力位于 `packages/core/src/capabilities`：

- `source.analyze`：读取 source 语义、结构、状态、交互、资源、token intent。
- `runtime.capture`：用浏览器采集可见 DOM、computed style、bbox、assets、interactions、screenshot。
- `screenshot.attach`：附加截图/OCR 证据。
- `target.inspect`：读取 Flutter target conventions、routes、theme、components、assets、examples。
- `page.merge`：按字段级优先级合并 facts，保留 provenance 和 mismatch warnings。
- `ui.plan`：从统一 canonical 生成 `ui-build-plan.json`。
- `ui.review`：生成 `ui-build-review.md`。
- `ui.validate`：实现后检查 target diff 和 plan 风险。

## 目录边界

- `packages/cli`：CLI 参数、配置、输出展示；不放业务规则。
- `packages/mcp-server`：MCP tools/resources/prompts/session；不放 core 业务规则。
- `packages/core/capabilities`：对外稳定能力 facade。
- `packages/core/workflows/capability-first`：统一编排。
- `packages/core/source`：source 技术栈实现。
- `packages/core/snapshot`：runtime capture、OCR、evidence enrichers。
- `packages/core/target`：target conventions、planning、validation。
- `packages/core/artifacts`：文件写出。

不要新增旧 workflow 的公共出口。需要给 CLI 和 MCP 共用的能力，应下沉到 core capability。

## 证据原则

- source 优先表达结构、语义、状态空间、设计意图。
- runtime 优先表达当前可见性、bbox、computed style、active/open state、可见文案。
- screenshot/OCR 优先表达最终视觉对照和补证。
- target repo 优先表达文件落点、组件复用、theme/i18n/asset conventions。

不能从证据里编造 API、权限、风控、埋点或隐藏业务行为。无法确认的内容进入 warnings、risks、manual confirmations 或 TODO。

## 修改规则

1. 先判断改动属于入口层、capability 层、target/source/snapshot 实现层，还是文档层。
2. 入口层只做协议和参数适配。
3. 共享能力进 core capability。
4. 删除旧路径时要同步删除公开 exports、tools/list、prompts、README 和 docs 叙述。
5. 文档必须描述当前行为，不保留会误导用户的旧工具名作为主路径。

常见判断：

- MCP 新增主要行为：优先扩展 `reconstruct_page_context` 输入或 core capability，不新增分步旧 tool。
- CLI 新增主要行为：扩展 `generate` 参数并调用 `reconstructPageContext`。
- 视觉证据问题：看 `snapshot` 和 `page-debug-index`。
- target mapping 问题：看 `target/flutter-app` 和 `ui.plan` capability。
- 配置问题：CLI/MCP 都应对齐 `proto-bridge.config.json`，再评估 env/roots/elicitation 等方案。

## 验证

常规改动至少运行：

```bash
pnpm run typecheck
pnpm run build
```

涉及 workflow、MCP tool、artifact contract 的改动还要运行：

```bash
pnpm run test:ui-reconstruction:matrix
```
