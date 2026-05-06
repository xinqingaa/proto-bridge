# 集成与工具入口

本文档说明 ProtoBridge 的 CLI、MCP、脚本化调用和输出集成方式。

## 1. CLI 入口

CLI 是当前主要入口：

```bash
pnpm run generate -- --url "http://localhost:5173/#/prototype/etf-detail" --out ./output/etf-detail
pnpm run generate -- --route /prototype/etf-detail --out ./output/etf-detail
pnpm run generate -- --vue prototype/src/views/prototype/etf/ETFDetailPage.vue --out ./output/etf-detail
```

CLI 职责：

- 读取 `proto-bridge.config.json`。
- 解析页面输入、输出目录和 capture 参数。
- 调用 core `generateMigrationSpec`。
- 输出生成文件路径和 warning 数量。

CLI 不实现 source/target 分析、planner 或 spec 渲染逻辑。

## 2. 配置

```json
{
  "source": {
    "adapter": "vue3-prototype",
    "root": "/Users/name/work/TradeAppPrd"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "/Users/name/work/youfi"
  },
  "route": "/prototype/trade",
  "outDir": "./output/stock-trade",
  "noCapture": true
}
```

CLI 参数可以覆盖页面输入、输出目录和 capture 行为：

```bash
pnpm run generate -- \
  --config ./proto-bridge.config.json \
  --route /prototype/trade \
  --out ./output/stock-trade \
  --no-capture
```

## 3. Core 调用

CLI 和 MCP 都调用 core。核心调用入口：

```ts
import { generateMigrationSpec } from '@proto-bridge/core';

await generateMigrationSpec({
  source: {
    adapter: 'vue3-prototype',
    root: '/Users/name/work/TradeAppPrd',
  },
  target: {
    adapter: 'flutter-app',
    root: '/Users/name/work/youfi',
  },
  route: '/prototype/trade',
  outDir: './output/stock-trade',
  noCapture: true,
});
```

Core 编排流程：

```text
generateMigrationSpec
  -> createMigrationContext
    -> AdapterRegistry.getSource
    -> SourceAdapter.analyze
    -> optional capturePrototypePage
    -> TargetAdapter.mapTokens
    -> TargetAdapter.analyze
    -> TargetAdapter.buildImplementationPlan
  -> write migration-context.json
  -> write migration-spec.md
```

## 4. MCP 入口

`packages/mcp-server` 是 MCP 协议入口包。它只导出 core 能力，不复制业务逻辑。

当前导出：

- `capturePrototypePage`
- `defaultAdapterRegistry`
- `generateMigrationSpec`
- `GenerateMigrationSpecInput`
- `SourceAdapter`
- `TargetAdapter`

MCP 工具命名应围绕 adapter 和项目语义，例如：

- `listSupportedAdapters`
- `analyzeSourceProject`
- `analyzeTargetProject`
- `generateMigrationSpec`

## 5. 输出文件

成功生成后，输出目录包含：

```text
output/<page>/
├── migration-context.json
├── migration-spec.md
├── screenshot.png        # capture enabled
└── dom-snapshot.json     # capture enabled
```

`migration-context.json` 是机器可读上下文。`migration-spec.md` 是面向 Flutter 实现者和 AI coding 工具的说明书。

## 6. Capture 集成

Capture 输入：

```bash
pnpm run generate -- \
  --url "http://localhost:5173/#/prototype/trade" \
  --prototype-url "http://localhost:5173/#/prototype/trade" \
  --capture
```

要求：

- 原型 dev server 已启动。
- `prototype-url` 可在浏览器中访问。
- 页面处于适合截图和 DOM 提取的状态。

Capture 失败时，core 会把错误写入 warnings，不阻断静态上下文生成。

## 7. AI 工具集成

推荐把 `migration-spec.md` 作为主要提示材料，把 `migration-context.json` 作为补充上下文。

使用原则：

- 让 AI 按说明书中的 Flutter 实现规划落地。
- 让 AI 优先复用说明书列出的 common widgets、routes、translations、assets 和 theme tokens。
- 不要求 AI 逐层翻译 Vue 模板或 CSS class。
- 对 warnings 和人工确认项保持显式处理。

## 8. CI / 脚本化使用

推荐检查命令：

```bash
pnpm run typecheck
pnpm run build
```

推荐生成命令：

```bash
pnpm run generate -- --route /prototype/trade --out ./output/stock-trade --no-capture
```

脚本化调用时应固定：

- config path。
- page input。
- output directory。
- capture 开关。

生成产物通常不需要提交到 ProtoBridge 仓库，除非它是示例或回归样本。
