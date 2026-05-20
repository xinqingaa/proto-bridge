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

本仓库的脚本说明见 [development.md](development.md)。如果只是想体验内置 Vue3-to-Flutter 示例，优先从根 README 的“开源示例”或 [examples/vue3-to-flutter/README.md](../examples/vue3-to-flutter/README.md) 开始。

## 配置

在运行 ProtoBridge 的目录创建 `proto-bridge.config.json`。配置文件只放稳定环境信息；每次要还原哪个页面，通过 CLI 参数或 MCP tool arguments 传入。

### Source + Target 常用配置

有 prototype/source repository 和 Flutter target repository 时配置 `source` 和 `target`：

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
  "runtime": {
    "capture": true
  },
  "output": {
    "root": "./output"
  }
}
```

运行时传入 URL 后会推导 route；有 `source.root` 时自动补 source evidence，有 `target.root` 时生成 plan/review。

### Target 最小配置

如果没有源码，可以只配置 target：

```json
{
  "schemaVersion": 1,
  "target": {
    "adapter": "flutter-app",
    "root": "/Users/name/work/youfi"
  },
  "runtime": {
    "capture": true
  },
  "output": {
    "root": "./output"
  }
}
```

运行时传 URL 后会生成 runtime evidence、target conventions、`ui-build-plan.json` 和 `ui-build-review.md`。没有 source facts 时不会生成 `migration-spec.md`。

### URL-only

没有 source 和 target 时可以不写配置，直接传 URL 采集 evidence：

```bash
npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1"
```

字段说明：

- `source.root`：prototype/source repository 路径。配置后会根据 URL 推导 route 并自动补源码证据。
- `target.root`：目标工程路径。配置后生成 `ui-build-plan.json`、`ui-build-review.md` 和 validation hints；同时具备 source facts 时默认生成兼容/过渡产物 `migration-spec.md`。
- `runtime.capture`：默认 runtime capture 开关。
- `runtime.viewport`：可选采集 viewport。
- `output.root`：输出根目录。
- `url`、`route`、`vue`：页面输入，只通过 CLI 参数或 MCP tool arguments 传入，不写在 config 中。

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

同时具备 source 和 target facts 时会默认导出 `migration-spec.md`。需要显式确认时仍可传 `--source-brief`。它是兼容/过渡产物；实现时以 `ui-build-plan.json` 为准。

在 monorepo 内验证本地源码改动时，可以用根目录包装命令：

```bash
pnpm run generate -- \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1"
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

1. `ui-build-plan.json`：唯一机器契约，重点看 `targetConventions`、`implementationContract`、`sourceSemantics`、`visualPlan`、mappings 和 validation hints。
2. `ui-build-review.md`：从 plan 渲染的中文人类阅读视图。
3. `migration-spec.md`：source + target facts 可用时的兼容参考；如果与 plan 冲突，以 plan 为准。
4. `page-debug-index.json`：排查视觉 mismatch。
5. `page-canonical.json`：查看完整 provenance 和 source/runtime/screenshot/target facts。

Typography token 注意事项：如果 `ui-build-plan.json` 中某条 typography mapping 带 `lockToken=true`，实现时直接使用扫描或映射得到的 target text style token，不要再覆盖 `fontSize`、`height`、`fontWeight` 或 `fontFamily`。
