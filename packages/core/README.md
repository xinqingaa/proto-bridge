# @proto-bridge/core

ProtoBridge core library。

大多数用户应优先使用 `@proto-bridge/cli` 或 `@proto-bridge/mcp-server`。当需要把 ProtoBridge 嵌入另一个 Node.js 工具，或围绕共享 capabilities 做自定义编排时，再直接使用本包。

## Workflow 接口

```ts
import { reconstructPageContext } from '@proto-bridge/core/workflows/capability-first';

const result = await reconstructPageContext({
  source: {
    adapter: 'vue3-prototype',
    root: '/path/to/vue3-prototype',
  },
  target: {
    adapter: 'flutter-app',
    root: '/path/to/flutter-project',
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
console.log(result.files.uiBuildReview);
```

## Capability 接口

```ts
import { validateUiCapability } from '@proto-bridge/core/capabilities';

const validation = await validateUiCapability({
  targetRoot: '/path/to/flutter-project',
  allowedPaths: ['lib/features/example'],
});

console.log(validation.status);
```

## 输出

```text
<outDir>/
├── page-canonical.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
```

`ui-build-plan.json` 是唯一机器契约，包含 `targetConventions`、`implementationContract` 和 `visualPlan`。`ui-build-review.md` 是从 plan 渲染的人类可读 brief。

## 项目事实边界

Core 不包含项目 preset。Vue 3 / Flutter 技术规则留在 adapter 与 analyzer；模块、组件、主题、路由、i18n、资产和文件组织来自本次 source / target 扫描。无法证明的事实保持 `unknown`。

## 公开 Subpaths

- `@proto-bridge/core/workflows/capability-first`
- `@proto-bridge/core/capabilities`
- `@proto-bridge/core/config`
- `@proto-bridge/core/target/flutter-app`
- `@proto-bridge/core/source/vue3-prototype`
- `@proto-bridge/core/snapshot`
- `@proto-bridge/core/artifacts`
- `@proto-bridge/core/shared`

完整产品文档见仓库根目录 `docs/overview.md`、`docs/artifacts.md`、`docs/usage.md`。

## 环境要求

- Node.js 20 或更高版本。
- ESM runtime。
