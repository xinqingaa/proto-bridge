# @proto-bridge/cli

ProtoBridge CLI runs the source-aware migration workflow. It generates migration context and implementation specs from a Vue prototype page to help Flutter developers or AI coding agents implement the corresponding target screen.

It intentionally does not run the MCP UI reconstruction workflow. For URL screenshot/page evidence/UI plan generation, use `@proto-bridge/mcp-server` from the YouFi target repository.

See `docs/workflows.md` in the repository for the full CLI/MCP workflow comparison.

## Requirements

- Node.js 20 or newer.
- A source Vue prototype project on your machine.
- A target Flutter app project on your machine.

You do not need pnpm to use the published CLI package. pnpm is only used by ProtoBridge maintainers inside this repository.

## Quick Start

Create a local config file:

```bash
npx @proto-bridge/cli init
```

Generate from a prototype URL:

```bash
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/etf-detail"
```

Or start the interactive flow:

```bash
npx @proto-bridge/cli generate
```

By default, output is written to `outputRoot/<page-name>-<timestamp-hash>`, for example `./output/etf-detail-moy123-1a2b3c`.

## Config

`init` creates `proto-bridge.config.json` in the current directory:

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

Fields:

- `source.root`: local path to the Vue prototype project.
- `target.root`: local path to the Flutter app project.
- `outputRoot`: root directory for generated files.
- Default directory names are timestamp-hashed to avoid overwriting repeated runs of the same route.
- `capture`: whether to run browser screenshot and DOM capture by default.

## Commands

```bash
npx @proto-bridge/cli init
npx @proto-bridge/cli generate --url <prototype-url>
npx @proto-bridge/cli generate --route <route>
npx @proto-bridge/cli generate --vue <file>
npx @proto-bridge/cli generate
```

Options:

- `--config <file>`: config path, defaults to `./proto-bridge.config.json`.
- `--url <url>`: full prototype URL; hash routes are extracted automatically.
- `--route <route>`: prototype route, for example `/prototype/etf-detail`.
- `--vue <file>`: Vue SFC path.
- `--prototype-url <url>`: runtime URL for Playwright capture.
- `--output <dir>`: override the full output directory for this run.
- `--capture`: run screenshot and DOM capture for this run.

## Output

Each run writes:

```text
output/<page>/
├── migration-context.json
├── migration-spec.md
├── screenshot.png        # when capture is enabled
└── dom-snapshot.json     # when capture is enabled
```

- `migration-spec.md` is the human-readable implementation brief.
- `migration-context.json` is structured evidence for AI coding tools or debugging.
- `screenshot.png` and `dom-snapshot.json` are optional capture artifacts for layout review.

## Notes

- If your shell shows `dquote>`, the command quote is not closed; press `Ctrl+C` and rerun, or use interactive mode.
- If the route cannot be matched, the CLI prints available route examples and suggests using `--vue`.
- Runtime capture is optional and defaults to disabled because it depends on a running prototype dev server.
- CLI stays source-aware by design; normalized `PageEvidence` and UI reconstruction artifacts belong to the MCP workflow.
