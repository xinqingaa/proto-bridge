# @proto-bridge/core

Core library for ProtoBridge. It contains the two workflow entry points plus shared source, snapshot, and target capabilities.

Most users should use the CLI package for source-aware migration:

```bash
npx @proto-bridge/cli generate
```

Use `@proto-bridge/core` directly only when you want to embed ProtoBridge in another Node.js tool or service. Prefer the workflow subpath exports over the package root.

See `docs/workflows.md` in the repository for the full CLI/MCP workflow comparison.

## Requirements

- Node.js 20 or newer.
- ESM runtime.

## Install

```bash
npm install @proto-bridge/core
```

## Source-Aware Migration Usage

```ts
import { generateMigrationSpec } from '@proto-bridge/core/workflows/source-aware-migration';

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

## UI Reconstruction Usage

```ts
import {
  buildUiImplementationPlan,
  capturePageEvidence,
} from '@proto-bridge/core/workflows/ui-reconstruction';
import {
  getFlutterTargetConventions,
} from '@proto-bridge/core/target/flutter-app';
```

The UI reconstruction workflow is the MCP-facing path. Its primary artifacts are `screenshot.png`, `page-evidence.json`, and `ui-implementation-plan.json`.

## Main APIs

### `@proto-bridge/core/workflows/source-aware-migration`

#### `generateMigrationSpec(input)`

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

### `@proto-bridge/core/workflows/ui-reconstruction`

Provides URL evidence capture, OCR evidence, UI implementation plan generation, and optional review Markdown export.

Primary outputs:

- `screenshot.png`
- `page-evidence.json`
- `ui-implementation-plan.json`
- `ocr-result.json` when OCR is requested and available
- `ui-review.md` when review export is requested

### `@proto-bridge/core/target/flutter-app`

Shared YouFi / Flutter target helpers:

- conventions
- examples
- source-aware migration planner
- UI reconstruction planner
- validation

## Adapters

Current built-in adapters:

- Source: `vue3-prototype`
- Target: `flutter-app`

The adapter layer is intentionally separated from entry packages. CLI and MCP do not share the same workflow, but they can reuse target and snapshot capabilities through stable core facades.

## Capture

Runtime capture is optional. When `capture: true` and `prototypeUrl` is provided, core uses Playwright to collect:

- screenshot
- DOM snapshot
- bounding boxes
- computed style evidence

If capture fails, generation continues and the error is surfaced as a warning in the migration context.
