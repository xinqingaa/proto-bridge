# 集成方式

ProtoBridge 支持 CLI、MCP 和 core library 三种接入方式。终端和批处理优先用 CLI，AI coding agent 优先用 MCP，需要嵌入到其他 Node.js 工具时使用 core。

## CLI

安装并初始化：

```bash
npx @proto-bridge/cli init
```

生成产物：

```bash
npx @proto-bridge/cli generate --route /prototype/asset/pnl-analysis
```

Runtime capture：

```bash
npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" \
  --capture
```

本地仓库：

```bash
cd /Users/name/work/proto-bridge
pnpm install
pnpm run build
pnpm run generate -- --route /prototype/asset/pnl-analysis
```

## MCP

发布包：

```bash
npx -y @proto-bridge/mcp-server
```

Codex：

```toml
[mcp_servers.proto-bridge]
command = "npx"
args = ["-y", "@proto-bridge/mcp-server"]
```

Codex 显式指定 config：

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
cd /Users/name/work/youfi
claude mcp add proto-bridge --scope project -- \
  npx -y @proto-bridge/mcp-server
```

MCP tools：

- `reconstruct_page_context`
- `read_target_conventions`
- `find_target_examples`
- `validate_ui_build`

## Core Library

```ts
import { reconstructPageContext } from '@proto-bridge/core/workflows/capability-first';

const result = await reconstructPageContext({
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

console.log(result.files.uiBuildReview);
```

需要自定义编排时，可以直接使用 capability APIs：

```ts
import { validateUiCapability } from '@proto-bridge/core/capabilities';

const result = await validateUiCapability({
  targetRoot: '/Users/name/work/youfi',
  allowedPaths: ['lib/app/modules/asset'],
});

console.log(result.status);
```

## Config

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

## 输出

```text
output/<page>-<timestamp>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
```
