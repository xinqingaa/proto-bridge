# @proto-bridge/core

Core library for ProtoBridge. It contains source and target adapters, runtime capture helpers, migration context generation, and migration spec rendering.

Most users should use the CLI package instead:

```bash
npx @proto-bridge/cli generate
```

Use `@proto-bridge/core` directly only when you want to embed ProtoBridge in another Node.js tool or service.

## Requirements

- Node.js 20 or newer.
- ESM runtime.

## Install

```bash
npm install @proto-bridge/core
```

## Basic Usage

```ts
import { generateMigrationSpec } from '@proto-bridge/core';

const result = await generateMigrationSpec({
  source: {
    adapter: 'vue3-prototype',
    root: '/path/to/TradeAppPrd',
  },
  target: {
    adapter: 'flutter-app',
    root: '/path/to/youfi',
  },
  route: '/prototype/etf-detail',
  outDir: './output/etf-detail',
  capture: false,
});

console.log(result.files.migrationSpec);
```

## Main API

### `generateMigrationSpec(input)`

Generates both machine-readable context and a Markdown implementation spec.

Important input fields:

- `source.adapter`: currently `vue3-prototype`.
- `source.root`: source prototype project root.
- `target.adapter`: currently `flutter-app`.
- `target.root`: target Flutter app root.
- `route`: route to match in prototype screen config.
- `vue`: Vue SFC path, useful when route metadata is missing.
- `prototypeUrl`: runtime URL for browser capture.
- `outDir`: full output directory.
- `capture`: whether to run Playwright screenshot and DOM capture.

Returns:

- `context`: structured migration context.
- `files.migrationContext`: generated JSON file path.
- `files.migrationSpec`: generated Markdown file path.
- `files.screenshot`: optional screenshot path.
- `files.domSnapshot`: optional DOM snapshot path.

## Adapters

Current built-in adapters:

- Source: `vue3-prototype`
- Target: `flutter-app`

The adapter layer is intentionally separated from the CLI so future entry points, such as MCP or custom automation scripts, can reuse the same generation pipeline.

## Capture

Runtime capture is optional. When `capture: true` and `prototypeUrl` is provided, core uses Playwright to collect:

- screenshot
- DOM snapshot
- bounding boxes
- computed style evidence

If capture fails, generation continues and the error is surfaced as a warning in the migration context.
