# ProtoBridge Workflows

ProtoBridge 当前主线是 capability-first。CLI 和 MCP 是两个入口，底层调用同一个 `reconstructPageContext` 编排器。

```text
input
  -> source.analyze / runtime.capture / screenshot.attach / target.inspect
  -> page.merge
  -> page-canonical.json
  -> ui.plan
  -> ui-build-plan.json
  -> ui.review
  -> ui-build-review.md
```

## 1. 入口对照

| 项 | CLI | MCP |
| --- | --- | --- |
| 入口 | `@proto-bridge/cli` | `@proto-bridge/mcp-server` |
| 主命令 / tool | `generate` | `reconstruct_page_context` |
| 配置 | `proto-bridge.config.json` | `proto-bridge.config.json` + tool args override |
| source-only | 支持 | 支持 |
| runtime-only | 支持 | 支持 |
| hybrid | 支持 | 支持 |
| 是否直接写 Dart | 否 | 否，由 agent 实现 |
| 默认主产物 | 统一 artifact set | 统一 artifact set |

统一 artifact set：

```text
page-canonical.json
page-debug-index.json
ui-build-plan.json
ui-build-review.md
screenshots/full-page.png
```

`migration-spec.md` 仅在显式 `sourceBrief` / `--source-brief` 时输出。`migration-context.json` 默认不再输出。

## 2. 输入模型

### Source-only

适合只需要 source 语义和 target 规划，不需要 runtime 截图：

```bash
npx @proto-bridge/cli generate --route /prototype/asset/pnl-analysis
```

MCP tool args：

```json
{
  "route": "/prototype/asset/pnl-analysis"
}
```

前提是 `proto-bridge.config.json` 中有 `source.root` 和 `target.root`。

### Runtime-only

适合只有 URL，希望生成可见 UI evidence：

```bash
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" --capture
```

MCP tool args：

```json
{
  "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
  "capture": true
}
```

### Hybrid

适合 source 语义和 runtime 视觉事实都可用：

```bash
npx @proto-bridge/cli generate \
  --route /prototype/asset/pnl-analysis \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" \
  --capture
```

MCP tool args：

```json
{
  "route": "/prototype/asset/pnl-analysis",
  "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
  "capture": true
}
```

## 3. Config

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

优先级：

```text
CLI args / MCP tool args > proto-bridge.config.json > defaults
```

## 4. MCP Tools

当前公开 tools：

- `reconstruct_page_context`
- `read_target_conventions`
- `find_target_examples`
- `validate_ui_build`

旧 URL-first 分步 tools 已从公开 MCP tools 移除；不要在新文档或 prompt 中继续推荐旧工具名。

## 5. Agent 推荐流程

1. 调用 `reconstruct_page_context`。
2. 读取返回的 `ui-build-review.md` 和 `ui-build-plan.json`。
3. 按需调用 `read_target_conventions` / `find_target_examples`。
4. 在 target repo 中实现 Dart UI。
5. 运行 format/analyze/test。
6. 调用 `validate_ui_build`。
7. 报告改动文件、验证结果、warnings 和人工确认项。

## 6. 字段级优先级

- source：结构、语义、状态空间、设计意图。
- runtime：当前可见性、bbox、computed style、active/open state、可见文案。
- screenshot/OCR：最终视觉对照和补证。
- target repo：文件落点、组件复用、theme/i18n/asset conventions。
