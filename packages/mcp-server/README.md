# @proto-bridge/mcp-server

ProtoBridge MCP server exposes migration context, target Flutter conventions, similar YouFi examples, and validation helpers to AI coding agents.

It does not write Dart files by itself. The AI coding tool calls ProtoBridge tools, reads the generated context/spec, edits the target Flutter repository, and validates the result.

## Requirements

- Node.js 20 or newer.
- A target Flutter repository with `proto-bridge.config.json`.
- The source Vue prototype repository must be reachable from `proto-bridge.config.json`.

Example `proto-bridge.config.json` in the YouFi repository:

```json
{
  "source": {
    "adapter": "vue3-prototype",
    "root": "../TradeAppPrd"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "."
  },
  "outputRoot": "./protoBridgeOutput",
  "capture": false
}
```

## Published Package Usage

After publishing, point your AI tool at the npm package:

```bash
npx -y @proto-bridge/mcp-server --config /path/to/youfi/proto-bridge.config.json
```

## Local Source Usage

When developing ProtoBridge locally:

```bash
cd /path/to/proto-bridge
pnpm run build
node /path/to/proto-bridge/packages/mcp-server/dist/index.js \
  --config /path/to/youfi/proto-bridge.config.json
```

## Codex Configuration

Project-level Codex config in the YouFi repository:

```toml
# /path/to/youfi/.codex/config.toml
[mcp_servers.proto-bridge]
command = "npx"
args = [
  "-y",
  "@proto-bridge/mcp-server",
  "--config",
  "/path/to/youfi/proto-bridge.config.json"
]
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

Restart Codex after changing MCP config.

## Cursor Configuration

Project-level Cursor config in the YouFi repository:

```json
{
  "mcpServers": {
    "proto-bridge": {
      "command": "npx",
      "args": [
        "-y",
        "@proto-bridge/mcp-server",
        "--config",
        "/path/to/youfi/proto-bridge.config.json"
      ]
    }
  }
}
```

Save it as:

```text
/path/to/youfi/.cursor/mcp.json
```

Local source variant:

```json
{
  "mcpServers": {
    "proto-bridge": {
      "command": "node",
      "args": [
        "/path/to/proto-bridge/packages/mcp-server/dist/index.js",
        "--config",
        "/path/to/youfi/proto-bridge.config.json"
      ]
    }
  }
}
```

Restart Cursor or reload MCP servers after changing the config.

## Claude Code Configuration

Project-level Claude Code setup from the YouFi repository:

```bash
cd /path/to/youfi
claude mcp add proto-bridge --scope project -- \
  npx -y @proto-bridge/mcp-server \
  --config /path/to/youfi/proto-bridge.config.json
```

Local source variant:

```bash
cd /path/to/youfi
claude mcp add proto-bridge --scope project -- \
  node /path/to/proto-bridge/packages/mcp-server/dist/index.js \
  --config /path/to/youfi/proto-bridge.config.json
```

## Tools

- `generate_migration_spec`: generate `migration-context.json` and `migration-spec.md` from a URL, route, or Vue file.
- `get_migration_brief`: return a compact agent-friendly brief from a run or context file.
- `read_migration_artifact`: read the generated spec or context.
- `get_target_conventions`: scan target Flutter conventions, reusable components, theme, routes, i18n, and assets.
- `find_target_examples`: find similar target Dart files with matched symbols and snippets.
- `validate_target_changes`: inspect target git changes for scope, placeholder UI, TODOs, and hard-coded colors.

## Example Prompt

```text
Use ProtoBridge to migrate /prototype/trade into YouFi Flutter.
```

The agent should call `generate_migration_spec`, read the brief, find target examples, inspect target conventions, implement Dart files, and then run validation.
