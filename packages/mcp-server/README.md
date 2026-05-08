# @proto-bridge/mcp-server

ProtoBridge MCP server exposes the URL Snapshot UI reconstruction workflow to AI coding agents.

Phase 1 is intentionally snapshot-only:

- It does not require `proto-bridge.config.json`.
- It uses the current working directory as the YouFi Flutter target root.
- It does not expose the old source-aware migration tools.
- It does not write Dart files by itself. The AI coding tool captures a page snapshot, builds a UI implementation plan, edits the target Flutter repository, then validates the result.

## Requirements

- Node.js 20 or newer.
- Run the MCP server from the target YouFi Flutter repository, or pass `targetRoot` to tools.
- The page URL must be reachable by Playwright in the MCP server environment.

## Published Package Usage

Point your AI tool at the npm package from the YouFi repository:

```bash
npx -y @proto-bridge/mcp-server
```

## Local Source Usage

When developing ProtoBridge locally:

```bash
cd /path/to/proto-bridge
pnpm run build
cd /path/to/youfi
node /path/to/proto-bridge/packages/mcp-server/dist/index.js
```

## Codex Configuration

Project-level Codex config in the YouFi repository:

```toml
# /path/to/youfi/.codex/config.toml
[mcp_servers.proto-bridge]
command = "npx"
args = [
  "-y",
  "@proto-bridge/mcp-server"
]
```

Local source variant:

```toml
[mcp_servers.proto-bridge]
command = "node"
args = [
  "/path/to/proto-bridge/packages/mcp-server/dist/index.js"
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
        "@proto-bridge/mcp-server"
      ]
    }
  }
}
```

Save it as:

```text
/path/to/youfi/.cursor/mcp.json
```

## Claude Code Configuration

Project-level Claude Code setup from the YouFi repository:

```bash
cd /path/to/youfi
claude mcp add proto-bridge --scope project -- \
  npx -y @proto-bridge/mcp-server
```

## Tools

- `capture_page_snapshot`: capture a rendered URL into `page-snapshot.json` and `screenshot.png`.
- `build_ui_implementation_plan`: build `ui-implementation-plan.json` from a snapshot and YouFi target conventions.
- `ocr_screenshot`: persist OCR evidence for a screenshot, or return a clear warning when no OCR provider is configured.
- `export_review_markdown`: export a human-readable `ui-review.md` from a snapshot and UI implementation plan.
- `get_target_conventions`: scan target Flutter conventions, reusable components, theme, routes, i18n, and assets.
- `find_target_examples`: find similar target Dart files with matched symbols and snippets.
- `validate_target_changes`: inspect target git changes for scope, placeholder UI, TODOs, and hard-coded colors.

Not exposed in Phase 1:

- `generate_migration_spec`
- `get_migration_brief`
- `read_migration_artifact`

The old source-aware chain remains in `@proto-bridge/core` / `@proto-bridge/cli`, but it is not available through the MCP runtime.

## Example Prompt

```text
Use ProtoBridge to reconstruct this page in YouFi Flutter:
https://xiaofenhong.cc/TradeAppPrd/#/prototype/etf-detail?is_mobile=1
```

The agent should call `capture_page_snapshot`, then `build_ui_implementation_plan`, inspect target conventions/examples as needed, optionally call `export_review_markdown` for human review, implement Dart UI, and finally call `validate_target_changes` with the returned `planId`.
