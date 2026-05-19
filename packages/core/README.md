# @proto-bridge/core

ProtoBridge core library。

大多数用户应优先使用 `@proto-bridge/cli` 或 `@proto-bridge/mcp-server`。当需要把 ProtoBridge 嵌入另一个 Node.js 工具，或围绕共享 capabilities 做自定义编排时，再直接使用本包。

## Workflow 接口

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
console.log(result.files.migrationSpec);
```

## Capability 接口

```ts
import { validateUiCapability } from '@proto-bridge/core/capabilities';

const validation = await validateUiCapability({
  targetRoot: '/path/to/youfi',
  allowedPaths: ['lib/app/modules/asset'],
});

console.log(validation.status);
```

## 输出

```text
<outDir>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
├── migration-spec.md
└── screenshots/
```

## 公开 Subpaths

- `@proto-bridge/core/workflows/capability-first`
- `@proto-bridge/core/capabilities`
- `@proto-bridge/core/target/flutter-app`
- `@proto-bridge/core/source/vue3-prototype`
- `@proto-bridge/core/snapshot`
- `@proto-bridge/core/artifacts`
- `@proto-bridge/core/shared`

## 环境要求

- Node.js 20 或更高版本。
- ESM runtime。
