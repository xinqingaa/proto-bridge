# 使用指南

安装、配置、CLI / MCP / Core 接入、仓库开发脚本与 npm 发布。

产品定位与架构见 [overview.md](overview.md)；产物字段见 [artifacts.md](artifacts.md)。

## 环境

- Node.js 20+  
- Flutter target repository（生成面向客户端的 plan / validation 通常需要）  
- 可选：prototype / source repository  
- 可选：可访问的 prototype URL（runtime capture）  

## 安装

发布版：

```bash
npx @proto-bridge/cli init
```

本地 monorepo：

```bash
cd /path/to/proto-bridge
pnpm install
pnpm run build
```

内置示例优先看 [examples/vue3-to-flutter/README.md](../examples/vue3-to-flutter/README.md)。

## 配置

`proto-bridge.config.json` 只放稳定环境信息；每次还原哪一页由 CLI 参数或 MCP arguments 传入。

```json
{
  "schemaVersion": 1,
  "source": {
    "adapter": "vue3-prototype",
    "root": "/path/to/vue3-prototype"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "/path/to/flutter-project"
  },
  "runtime": {
    "capture": true
  },
  "output": {
    "root": "./output"
  }
}
```

配置不描述项目架构，也不支持 project profile。模块、组件、主题、路由、i18n 和文件组织由运行时扫描 source / target 获得。

仅 target + URL 也可运行（无 source 时 `sourceSemantics` 为空或 visual fallback）。

优先级：

```text
CLI args / MCP tool args > proto-bridge.config.json > defaults
```

---

## 输入组合

| 输入 | 可运行 | 调用能力 | 入口 |
| --- | --- | --- | --- |
| source + target | 是 | source.analyze、target.inspect、merge、plan、review | CLI / MCP |
| URL + target | 是 | runtime.capture、target.inspect、merge、plan、review | CLI / MCP |
| source + URL + target | 是（推荐完整重建） | source + runtime + target + merge + plan + review | CLI / MCP |
| screenshot / OCR + target | 是 | screenshot.attach、target.inspect、merge、plan、review | **仅 MCP**（`screenshotPath` / `ocrText` / `ocrBoxes`） |
| 已实现 target diff | validation | ui.validate | MCP `validate_ui_build` |
| target only | 不生成页面上下文 | 可读 conventions 或做 validation | MCP |

CLI 支持 `--url` / `--route` / `--vue` 与 `--capture`；**不提供**独立 screenshot/OCR 参数。有 `source.root` 时，URL 会推导 route 并补充源码证据。

不要强行同时要求 source 与 URL。没有 `source.root` 时不要用 `route`/`vue` 硬跑 source analysis；没有 URL 时不要强行 capture。

---

## CLI

```bash
npx @proto-bridge/cli init

npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1"

npx @proto-bridge/cli generate --route /prototype/asset/pnl-analysis

npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" \
  --capture
```

不传页面参数且终端可交互时，会询问 `url` / `route` / `vue`。

常用 flag：`--config`、`--url`、`--route`、`--vue`、`--output`、`--capture`、`--trace`、`--source-root`、`--target-root`、`--source-adapter`、`--target-adapter`。

本地源码：

```bash
pnpm run generate -- --route /prototype/asset/pnl-analysis
```

---

## MCP

发布包：

```toml
[mcp_servers.proto-bridge]
command = "npx"
args = ["-y", "@proto-bridge/mcp-server"]
```

指定 config：

```toml
[mcp_servers.proto-bridge]
command = "npx"
args = [
  "-y",
  "@proto-bridge/mcp-server",
  "--config",
  "/path/to/proto-bridge.config.json"
]
```

本地构建：

```toml
[mcp_servers.proto-bridge]
command = "node"
args = [
  "/Users/name/work/proto-bridge/packages/mcp-server/dist/index.js",
  "--config",
  "/path/to/proto-bridge.config.json"
]
```

Tools：

| Tool | 作用 |
| --- | --- |
| `reconstruct_page_context` | 生成页面上下文与实现产物 |
| `read_target_conventions` | 读取目标工程规范 |
| `find_target_examples` | 搜索相似目标文件 / 片段 |
| `validate_ui_build` | 验证目标变更 |

Hybrid 示例：

```json
{
  "route": "/prototype/asset/pnl-analysis",
  "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
  "capture": true
}
```

Screenshot / OCR 示例：

```json
{
  "screenshotPath": "/Users/name/Desktop/page.png",
  "ocrText": ["Account Detail", "P/L Analysis"],
  "targetRoot": "/path/to/flutter-project"
}
```

Validation 示例：

```json
{
  "pageId": "page-pnl-analysis-20260514T05343",
  "targetRoot": "/path/to/flutter-project"
}
```

### Agent 消费流程（目标工程实现）

1. `reconstruct_page_context`  
2. 读 `ui-build-review.md` 和截图，确认页面、风险及人工修订
3. 按需读取 `ui-build-plan.json` 的 `implementationContract`、`visualPlan`、`stylePlan` 和交互字段
4. 只有证据冲突时读取 `page-canonical.json`；需要 B 细节时调用 `read_target_conventions` / `find_target_examples`
5. 在 target Flutter 仓库实现  
6. format / analyze / tests  
7. `validate_ui_build`  

---

## Core 嵌入

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

console.log(result.files.uiBuildPlan);
```

单独 validation：

```ts
import { validateUiCapability } from '@proto-bridge/core/capabilities';

const result = await validateUiCapability({
  targetRoot: '/path/to/flutter-project',
  allowedPaths: ['lib/features/example'],
});
```

---

## 仓库开发命令

| 命令 | 作用 |
| --- | --- |
| `pnpm run build` | 构建 core / cli / mcp-server |
| `pnpm run typecheck` | 三包 TypeScript 检查 |
| `pnpm run lint` | 当前等同 typecheck |
| `pnpm run dev` | CLI 源码开发入口 |
| `pnpm run generate -- ...` | 构建后跑本地 `proto-bridge generate` |
| `pnpm run example` | 生成示例 artifacts 与 Flutter `_proto` 页 |
| `pnpm run example:clean` | 清理示例生成物 |
| `pnpm run example:dev` | Vue 原型 + Flutter Web 预览 |
| `pnpm run example:android` | Flutter target 到 Android |
| `pnpm run test:config` | config 解析测试 |
| `pnpm run test:e2e:cli` | CLI artifacts 契约 |
| `pnpm run test:e2e:mcp` | MCP 协议与 tools |
| `pnpm run test:e2e` | CLI + MCP |

`pnpm run example` 是体验 harness，不是「自动生成生产 Dart」的产品定义。生成路径默认 gitignore：

```text
examples/vue3-to-flutter/output/
examples/vue3-to-flutter/target-flutter/lib/main_proto.dart
examples/vue3-to-flutter/target-flutter/lib/app/app_proto.dart
examples/vue3-to-flutter/target-flutter/lib/app/routes/app_pages_proto.dart
examples/vue3-to-flutter/target-flutter/lib/app/modules/**/_proto/
```

推荐体验顺序：

```bash
pnpm run example
pnpm run example:dev
```

Vue：`http://127.0.0.1:5173/`；Flutter Web：`http://127.0.0.1:5599/`（端口占用时顺延，以终端为准）。

e2e 默认 url / sourceRoot / targetRoot 可用参数覆盖，见根 `package.json` 与 `scripts/test-e2e.mjs`。

改本仓库的约束与检查单：`AGENT.md`、`skills/proto-bridge`。

---

## npm 发布

发布包：`@proto-bridge/core`、`@proto-bridge/cli`、`@proto-bridge/mcp-server`。  
不发布 monorepo 根项目 `proto-bridge`。

用户入口：

```bash
npx @proto-bridge/cli init
npx @proto-bridge/cli generate --route /prototype/trade
npx -y @proto-bridge/mcp-server
```

发布前：

```bash
npm config get registry
npm whoami
pnpm install
pnpm run typecheck
pnpm run build
pnpm --filter @proto-bridge/core pack --dry-run
pnpm --filter @proto-bridge/cli pack --dry-run
pnpm --filter @proto-bridge/mcp-server pack --dry-run
```

顺序：`core` → `cli` → `mcp-server`。

```bash
pnpm --filter @proto-bridge/core publish --access public --registry=https://registry.npmjs.org/
pnpm --filter @proto-bridge/cli publish --access public --registry=https://registry.npmjs.org/
pnpm --filter @proto-bridge/mcp-server publish --access public --registry=https://registry.npmjs.org/
```

版本：`patch` 兼容修复；`minor` 兼容新功能；`major` 破坏性变更。`workspace:*` 在 pack/publish 时转为当前发布版本。依赖新能力的包需同链发布。

发布后：

```bash
npm view @proto-bridge/core version
npm view @proto-bridge/cli version
npm view @proto-bridge/mcp-server version
cd /tmp
npx @proto-bridge/cli@latest --help
```

约束：`bin` 指向 `dist/index.js`；`prepack` 会自动 build；正式发布前建议工作区干净。
