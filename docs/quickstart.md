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

在运行 ProtoBridge 的目录创建 `proto-bridge.config.json`。不同输入模式需要的最小配置不同，`source.root` 和 `url` 都不是所有场景必填。

### Source-only / Hybrid 常用配置

有 prototype/source repository 时配置 `source` 和 `target`：

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

这种配置可以直接跑 source-only；如果命令再传 `--url --capture`，就会变成 hybrid。

### Runtime-only 最小配置

如果没有源码，只有运行中的 URL，可以只配置 target：

```json
{
  "target": {
    "adapter": "flutter-app",
    "root": "/Users/name/work/youfi"
  },
  "outputRoot": "./output",
  "capture": false
}
```

然后在命令里传 `--url` 和 `--capture`。

### 完整配置示例

如果团队希望把常用页面身份也写入 config，可以额外写入 `route`、`url` 或 `prototypeUrl`：

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
  "route": "/prototype/asset/pnl-analysis",
  "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
  "outputRoot": "./output",
  "capture": true
}
```

字段说明：

- `source.root`：prototype/source repository 路径。只有使用 `--route` 或 `--vue` 做 source analysis 时需要。
- `target.root`：Flutter target repository 路径。生成 `ui-build-plan.json`、`ui-build-review.md` 和 validation 时通常需要。
- `outputRoot`：输出根目录。
- `capture`：默认 runtime capture 开关。
- `url`：运行中的 prototype URL。只有 runtime capture 时需要。
- `route`、`vue`、`url`、`prototypeUrl` 可以写在 config 中，也可以通过 command/tool arguments 传入。

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
