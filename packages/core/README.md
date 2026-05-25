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
  // Optional. Use resolveProtoBridgeInput for config-driven auto profile resolution.
  route: '/prototype/asset/pnl-analysis',
  url: 'http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1',
  outDir: './output/pnl-analysis',
  capture: true,
  buildPlan: true,
  buildReview: true,
});

console.log(result.files.pageCanonical);
console.log(result.files.uiBuildPlan);
console.log(result.files.uiBuildReview);
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
└── screenshots/
```

`ui-build-plan.json` 是唯一机器契约，包含 `targetConventions`、`implementationContract` 和 `visualPlan`。`ui-build-review.md` 是从 plan 渲染的人类可读 brief。

## Restoration profile

Core 支持 `RestorationProfile`，用于把项目增强集中在 `packages/core/src/profile/`。profile 可以提供模块别名、target symbol 候选、source lexicon 和 theme token 映射；高置信组件、theme、route 和 i18n 仍必须由 target 扫描证据支持。

配置驱动入口建议使用 `resolveProtoBridgeInput`，它会解析顶层 `profile` 字段：`"auto"` 或不配置时按 `target.root` 目录名推断，`"generic"` 或 `false` 禁用业务增强，显式 id 例如 `"youfi"` 会强制启用对应 profile。

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
