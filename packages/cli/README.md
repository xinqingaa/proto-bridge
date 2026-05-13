# @proto-bridge/cli

ProtoBridge CLI is the terminal entry for the capability-first workflow.

It reads `proto-bridge.config.json`, calls `reconstructPageContext`, and writes the unified artifact set used by humans and AI coding agents.

## Quick Start

```bash
npx @proto-bridge/cli init
npx @proto-bridge/cli generate --route /prototype/asset/pnl-analysis
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" --capture
```

Local repository usage:

```bash
pnpm run generate -- --route /prototype/asset/pnl-analysis
```

## Config

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
- `--url <url>`: runtime URL.
- `--route <route>`: source route.
- `--vue <file>`: Vue SFC path.
- `--prototype-url <url>`: capture URL when it differs from source identity.
- `--output <dir>`: full output directory for this run.
- `--capture`: run runtime capture for this run.
- `--source-brief`: also emit optional `migration-spec.md`.
- `--trace`: print capability orchestration trace.

## Output

```text
output/<page>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
    └── full-page.png      # when capture runs
```

Default runs do not emit `migration-context.json`. `migration-spec.md` is only emitted with `--source-brief`.
