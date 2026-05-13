# @proto-bridge/mcp-server

ProtoBridge MCP server exposes the capability-first UI reconstruction workflow to AI coding agents.

## Configuration

MCP reads `proto-bridge.config.json` from the server working directory by default. Tool arguments override config values.

```json
{
  "source": {
    "adapter": "vue3-prototype",
    "root": "/path/to/TradeAppPrd"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "/path/to/youfi"
  },
  "outputRoot": "./output",
  "capture": false
}
```

You can also pass a config path when starting the server:

```bash
npx -y @proto-bridge/mcp-server --config /path/to/proto-bridge.config.json
```

## Codex

```toml
[mcp_servers.proto-bridge]
command = "npx"
args = ["-y", "@proto-bridge/mcp-server"]
```

Local source variant:

```toml
[mcp_servers.proto-bridge]
command = "node"
args = [
  "/path/to/proto-bridge/packages/mcp-server/dist/index.js",
  "--config",
  "/path/to/youfi/proto-bridge.config.json"
]
```

## Cursor

Save as `.cursor/mcp.json` in the target repo:

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

## Tools

- `reconstruct_page_context`: primary tool. It selects source/runtime/screenshot/target capabilities and writes unified artifacts.
- `read_target_conventions`: read target Flutter conventions.
- `find_target_examples`: find similar target Dart files/snippets.
- `validate_ui_build`: validate target changes after implementation.

Legacy public step-by-step URL tools have been removed. OCR and screenshot evidence now go through `reconstruct_page_context` arguments such as `screenshotPath`, `ocrText`, and `ocrBoxes`.

## Main Output

```text
<outputRoot>/<page>-<timestamp>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
```

## Example Prompt

```text
Use ProtoBridge reconstruct_page_context for this page and implement the resulting ui-build-plan in the target Flutter app:
http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1
```
