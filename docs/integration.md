# 集成与工具入口

本文档说明 ProtoBridge 的三种接入方式：CLI、MCP server 和 core library。当前推荐统一走 capability-first。

## 1. CLI

```bash
npx @proto-bridge/cli init
npx @proto-bridge/cli generate --route /prototype/asset/pnl-analysis
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" --capture
```

配置文件：

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

输出：

```text
output/<page>-<timestamp>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
```

## 2. MCP

发布包入口：

```bash
npx -y @proto-bridge/mcp-server
```

本地源码入口：

```bash
cd /path/to/proto-bridge
pnpm run build
cd /path/to/youfi
node /path/to/proto-bridge/packages/mcp-server/dist/index.js --config /path/to/youfi/proto-bridge.config.json
```

公开 tools：

- `reconstruct_page_context`
- `read_target_conventions`
- `find_target_examples`
- `validate_ui_build`：MCP 入口，内部调用 core `ui.validate` capability。

Codex：

```toml
[mcp_servers.proto-bridge]
command = "npx"
args = ["-y", "@proto-bridge/mcp-server"]
```

Cursor：

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
cd /path/to/youfi
claude mcp add proto-bridge --scope project -- \
  npx -y @proto-bridge/mcp-server
```

## 3. Core

```ts
import { reconstructPageContext } from '@proto-bridge/core/workflows/capability-first';

await reconstructPageContext({
  source: {
    adapter: 'vue3-prototype',
    root: '/Users/name/work/TradeAppPrd',
  },
  target: {
    adapter: 'flutter-app',
    root: '/Users/name/work/youfi',
  },
  route: '/prototype/asset/pnl-analysis',
  url: 'http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1',
  outDir: './output/pnl-analysis',
  capture: true,
  buildPlan: true,
  buildReview: true,
});
```

## 4. 常见场景

source-only：

```bash
npx @proto-bridge/cli generate --route /prototype/asset/pnl-analysis
```

runtime-only：

```bash
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" --capture
```

hybrid：

```bash
npx @proto-bridge/cli generate \
  --route /prototype/asset/pnl-analysis \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" \
  --capture
```

发布前基础检查：

```bash
pnpm run typecheck
pnpm run build
pnpm run test:ui-reconstruction:matrix
```
