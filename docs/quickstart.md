# 快速开始

本文档展示从配置到生成产物的最短路径。

## 环境要求

- Node.js 20 或更高版本。
- 一个 Flutter target repository。
- 可选：一个 prototype/source repository。
- 可选：用于 runtime capture 的运行中 prototype URL。

## 安装

使用发布版 CLI：

```bash
npx @proto-bridge/cli init
```

使用本地仓库：

```bash
cd /Users/name/work/proto-bridge
pnpm install
pnpm run build
```

## 配置

在运行 ProtoBridge 的目录创建 `proto-bridge.config.json`。ProtoBridge 采用 URL-first 配置：`page.url` 是主入口；`source.root` 和 `target.root` 都是增强项。

### Source + Target 常用配置

有 prototype/source repository 和 Flutter target repository 时配置 `source` 和 `target`，运行时通常只需要 URL：

```json
{
  "schemaVersion": 1,
  "source": {
    "adapter": "vue3-prototype",
    "root": "/Users/name/work/TradeAppPrd"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "/Users/name/work/youfi"
  },
  "page": {
    "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1"
  },
  "runtime": {
    "capture": true
  },
  "output": {
    "root": "./output"
  }
}
```

这种配置会从 URL 推导 route；有 `source.root` 时自动补 source evidence，有 `target.root` 时生成 plan/review。

### Target + URL 最小配置

如果没有源码，只有运行中的 URL，可以只配置 target：

```json
{
  "schemaVersion": 1,
  "target": {
    "adapter": "flutter-app",
    "root": "/Users/name/work/youfi"
  },
  "page": {
    "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1"
  },
  "runtime": {
    "capture": true
  },
  "output": {
    "root": "./output"
  }
}
```

这会生成 runtime evidence、target conventions、`ui-build-plan.json` 和 `ui-build-review.md`。

### URL-only 配置

没有 source 和 target 时也可以只采集 URL evidence：

```json
{
  "schemaVersion": 1,
  "page": {
    "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1"
  },
  "runtime": {
    "capture": true
  },
  "output": {
    "root": "./output"
  }
}
```

字段说明：

- `page.url`：主页面输入。通常只维护这个字段。
- `page.route`、`page.vue`：高级覆盖字段。只有 URL 自动映射不够时才需要。
- `source.root`：prototype/source repository 路径。配置后会根据 URL 推导 route 并自动补源码证据。
- `target.root`：目标工程路径。配置后生成 `ui-build-plan.json`、`ui-build-review.md` 和 validation hints。
- `runtime.capture`：默认 runtime capture 开关。
- `runtime.viewport`：可选采集 viewport。
- `output.root`：输出根目录。

CLI 和 MCP 的优先级：

```text
command or tool arguments > proto-bridge.config.json > defaults
```

## CLI 示例

Source-only：

```bash
npx @proto-bridge/cli generate --route /prototype/asset/pnl-analysis
```

要求：config 中有 `source.root` 和 `target.root`。

Runtime-only：

```bash
npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" \
  --capture
```

要求：config 中至少有 `target.root`；不需要 `source.root`。

Hybrid：

```bash
npx @proto-bridge/cli generate \
  --route /prototype/asset/pnl-analysis \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" \
  --capture
```

要求：config 中有 `source.root` 和 `target.root`，并且 URL 可访问。

指定输出目录：

```bash
npx @proto-bridge/cli generate \
  --route /prototype/asset/pnl-analysis \
  --output ./output/pnl-analysis
```

打印编排 trace：

```bash
npx @proto-bridge/cli generate \
  --route /prototype/asset/pnl-analysis \
  --trace
```

额外导出可选 source brief：

```bash
npx @proto-bridge/cli generate \
  --route /prototype/asset/pnl-analysis \
  --source-brief
```

## MCP 配置

Codex：

```toml
[mcp_servers.proto-bridge]
command = "npx"
args = ["-y", "@proto-bridge/mcp-server"]
```

显式指定 config：

```toml
[mcp_servers.proto-bridge]
command = "npx"
args = [
  "-y",
  "@proto-bridge/mcp-server",
  "--config",
  "/Users/name/work/youfi/proto-bridge.config.json"
]
```

本地构建：

```toml
[mcp_servers.proto-bridge]
command = "node"
args = [
  "/Users/name/work/proto-bridge/packages/mcp-server/dist/index.js",
  "--config",
  "/Users/name/work/youfi/proto-bridge.config.json"
]
```

Cursor `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "proto-bridge": {
      "command": "npx",
      "args": ["-y", "@proto-bridge/mcp-server"]
    }
  }
}
```

Claude Code：

```bash
cd /Users/name/work/youfi
claude mcp add proto-bridge --scope project -- \
  npx -y @proto-bridge/mcp-server
```

## MCP Tool 示例

Source-only：

```json
{
  "name": "reconstruct_page_context",
  "arguments": {
    "route": "/prototype/asset/pnl-analysis"
  }
}
```

Runtime-only：

```json
{
  "name": "reconstruct_page_context",
  "arguments": {
    "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
    "capture": true
  }
}
```

Hybrid：

```json
{
  "name": "reconstruct_page_context",
  "arguments": {
    "route": "/prototype/asset/pnl-analysis",
    "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
    "capture": true,
    "trace": true
  }
}
```

Validation：

```json
{
  "name": "validate_ui_build",
  "arguments": {
    "pageId": "page-pnl-analysis-20260514T05343",
    "targetRoot": "/Users/name/work/youfi"
  }
}
```

## 阅读结果

建议阅读顺序：

1. `ui-build-review.md`：实现指导。
2. `ui-build-plan.json`：精确 file/widget/mapping 细节。
3. `page-debug-index.json`：排查视觉 mismatch。
4. `page-canonical.json`：查看完整 provenance 和 source/runtime/screenshot/target facts。
