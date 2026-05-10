# 集成与工具入口

本文档说明 ProtoBridge 的三种主要接入方式：CLI、MCP server 和 core library。它承接 [README.md](../README.md) 的总览，重点回答“外部系统应该怎样接入 ProtoBridge，而不是 ProtoBridge 内部如何实现”。

## 1. 接入方式总览

ProtoBridge 当前有三种主要接入路径：

1. `@proto-bridge/cli`
适合生成 source-aware 的迁移说明书。

2. `@proto-bridge/mcp-server`
适合让 AI coding agent 通过 MCP 获取 `PageEvidence` 和 UI implementation plan。

3. `@proto-bridge/core`
适合在自定义 Node.js 工具、脚本或服务中直接调用 workflow。

## 2. CLI 接入

CLI 是稳定的文档生成入口，主要用于生成 `migration-context.json` 和 `migration-spec.md`。

常用命令：

```bash
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/etf-detail"
npx @proto-bridge/cli generate --route /prototype/etf-detail
npx @proto-bridge/cli generate --vue prototype/src/views/prototype/etf/ETFDetailPage.vue
npx @proto-bridge/cli generate
```

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

适合接入的外部流程：

- 人工实现前的上下文准备
- AI coding 前的提示材料准备
- 跨仓库迁移评审
- 批量页面梳理
- 实现前风险扫描

## 3. MCP 接入

MCP 模式适合 evidence-first 的 UI reconstruction 场景。

发布包入口：

```bash
npx -y @proto-bridge/mcp-server
```

本地源码入口：

```bash
cd /path/to/proto-bridge
pnpm run build
cd /path/to/youfi
node /path/to/proto-bridge/packages/mcp-server/dist/index.js
```

MCP 不需要 `proto-bridge.config.json`。推荐从 target 仓库启动，让 `process.cwd()` 成为默认 `targetRoot`。

当前 MCP tools：

- `capture_page_evidence`
- `build_ui_implementation_plan`
- `ocr_screenshot`
- `export_review_markdown`
- `get_target_conventions`
- `find_target_examples`
- `validate_target_changes`

当前输入边界：

- `capture_page_evidence` 使用 URL 打开页面并生成首份 `PageEvidence`。
- `ocr_screenshot` 只补充截图文字证据，不替代 URL capture。
- MCP runtime 不暴露 CLI 的 source-aware migration tools。

## 4. AI 工具配置

### 4.1 Codex

```toml
# /path/to/youfi/.codex/config.toml
[mcp_servers.proto-bridge]
command = "npx"
args = [
  "-y",
  "@proto-bridge/mcp-server"
]
```

### 4.2 Cursor

保存为 `/path/to/youfi/.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "proto-bridge": {
      "command": "npx",
      "args": [
        "-y",
        "@proto-bridge/mcp-server"
      ]
    }
  }
}
```

### 4.3 Claude Code

```bash
cd /path/to/youfi
claude mcp add proto-bridge --scope project -- \
  npx -y @proto-bridge/mcp-server
```

## 5. Core 代码级接入

如果你需要在自定义 Node.js 工具或服务中直接嵌入 ProtoBridge，优先通过 `@proto-bridge/core` 的 workflow subpath exports 调用。

### 5.1 CLI workflow

```ts
import { generateMigrationSpec } from '@proto-bridge/core/workflows/source-aware-migration';

await generateMigrationSpec({
  source: {
    adapter: 'vue3-prototype',
    root: '/Users/name/work/TradeAppPrd',
  },
  target: {
    adapter: 'flutter-app',
    root: '/Users/name/work/youfi',
  },
  route: '/prototype/trade',
  outDir: './output/stock-trade',
  capture: false,
});
```

### 5.2 MCP workflow

```ts
import {
  buildUiImplementationPlan,
  capturePageEvidence,
} from '@proto-bridge/core/workflows/ui-reconstruction';
import {
  findFlutterTargetExamples,
  getFlutterTargetConventions,
} from '@proto-bridge/core/target/flutter-app';
```

建议：

- 通过 workflow 调用高层能力。
- 不要在外部集成中直接拼装内部模块细节，除非你明确要做更细粒度扩展。

## 6. 产物如何接入外部流程

### 6.1 CLI 产物

```text
output/<page>-<timestamp-hash>/
├── migration-context.json
├── migration-spec.md
├── screenshot.png        # capture enabled
└── dom-snapshot.json     # capture enabled
```

推荐用法：

- `migration-spec.md` 作为人工实现或 AI coding 的主要提示材料。
- `migration-context.json` 作为补充证据和调试上下文。

### 6.2 MCP 产物

```text
.proto-bridge/evidence/<page>-<timestamp>/
├── screenshot.png
├── page-evidence.json
├── ui-implementation-plan.json
├── ocr-result.json      # optional OCR evidence
└── ui-review.md         # optional human review export
```

推荐用法：

- `page-evidence.json` 作为 visible UI 证据。
- `ui-implementation-plan.json` 作为 agent 的主要实现计划。
- `ui-review.md` 用于人工讨论和归档。

## 7. 常见集成场景

### 7.1 人工实现前准备

先运行 CLI，得到 `migration-spec.md`，再由开发者在 target 工程中手工实现。

### 7.2 AI coding 前准备

如果需要 source-aware 语义，先运行 CLI；如果只需要快速还原 visible UI，则直接走 MCP。

### 7.3 Agent 驱动 UI 还原

在 target repo 中启动 MCP server，让 agent 先调用 `capture_page_evidence` 和 `build_ui_implementation_plan`，再在 target repo 中落地代码。

### 7.4 CI / 脚本化使用

脚本化调用时应固定：

- config path
- page input
- output directory
- capture 开关

推荐基础检查：

```bash
pnpm run typecheck
pnpm run build
```
