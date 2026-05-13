# @proto-bridge/core

Core library for ProtoBridge capability-first reconstruction. Most users should use `@proto-bridge/cli` or `@proto-bridge/mcp-server`; use core directly only when embedding ProtoBridge in another Node.js tool.

## Main API

```ts
import { reconstructPageContext } from '@proto-bridge/core/workflows/capability-first';

const result = await reconstructPageContext({
  source: {
    adapter: 'vue3-prototype',
    root: '/path/to/TradeAppPrd',
  },
  target: {
    adapter: 'flutter-app',
    root: '/path/to/youfi',
  },
  route: '/prototype/asset/pnl-analysis',
  url: 'http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1',
  outDir: './output/pnl-analysis',
  capture: true,
  buildPlan: true,
  buildReview: true,
});

console.log(result.files.pageCanonical);
console.log(result.files.uiBuildPlan);
```

## Outputs

```text
<outDir>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
```

`migration-spec.md` is only emitted when `sourceBrief: true`. `migration-context.json` is no longer emitted by the capability-first workflow.

## Public Subpaths

- `@proto-bridge/core/workflows/capability-first`
- `@proto-bridge/core/capabilities`
- `@proto-bridge/core/target/flutter-app`
- `@proto-bridge/core/source/vue3-prototype`
- `@proto-bridge/core/snapshot`
- `@proto-bridge/core/artifacts`
- `@proto-bridge/core/shared`

Legacy public workflow subpaths for source-aware migration and URL-first UI reconstruction have been removed. Their reusable behavior now lives behind capability-first facades.

## Requirements

- Node.js 20 or newer.
- ESM runtime.
