# ProtoBridge

ProtoBridge 是一个原型到实现的上下文桥接工具。它不直接生成完整 Dart 页面，也不把 Vue 确定性翻译成 Flutter；它把 source facts、runtime evidence、screenshot/OCR、target conventions 和人工确认项合并成一套可追溯的页面上下文，让人工或 AI coding agent 继续落地实现。

当前主线已经收敛到 capability-first：

```text
CLI / MCP = 入口
capability = source.analyze / runtime.capture / screenshot.attach / target.inspect / page.merge / ui.plan / ui.review / ui.validate
artifact = page-canonical.json / page-debug-index.json / ui-build-plan.json / ui-build-review.md / screenshots
```

## 入口

ProtoBridge 保留两个入口，但它们调用同一套 capability-first 编排：

| 入口 | 适合场景 | 主命令 / tool |
| --- | --- | --- |
| CLI | 本地批处理、生成页面上下文、人工或 AI coding 前准备 | `proto-bridge generate` |
| MCP | Codex、Cursor、Claude Code 等 agent 动态调用 | `reconstruct_page_context` |

两者都支持三种输入形态：

- source-only：`source.root + route/vue`
- runtime-only：`url`
- hybrid：`source.root + route/vue + url`

## 配置

CLI 和 MCP 当前阶段都读取 `proto-bridge.config.json`。MCP 的 tool 参数会覆盖 config，config 会覆盖默认值。

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
  "outputRoot": "./output",
  "capture": false
}
```

关键字段：

- `source.root`：Vue prototype/source 仓库路径。有源码场景需要。
- `target.root`：Flutter target 仓库路径。
- `outputRoot`：产物输出根目录。
- `capture`：是否默认执行 runtime capture。
- `route` / `vue` / `url` / `prototypeUrl` 可写在 config 中，也可通过 CLI 参数或 MCP tool 参数传入。

## CLI

发布包：

```bash
npx @proto-bridge/cli init
npx @proto-bridge/cli generate --route /prototype/asset/pnl-analysis
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" --capture
```

本地开发：

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm run generate -- --route /prototype/asset/pnl-analysis
```

常用参数：

- `--config <file>`：配置文件路径，默认 `./proto-bridge.config.json`。
- `--route <route>`：source route。
- `--vue <file>`：Vue SFC 路径。
- `--url <url>`：runtime URL；可从 hash route 推断 route。
- `--prototype-url <url>`：source route 与 capture URL 分离时使用。
- `--output <dir>`：本次运行的完整输出目录。
- `--capture`：本次运行执行 runtime capture。
- `--source-brief`：额外导出可选 `migration-spec.md`，用于 source-aware brief 对照。
- `--trace`：打印 capability orchestration trace。

## MCP

发布包配置示例：

```toml
[mcp_servers.proto-bridge]
command = "npx"
args = ["-y", "@proto-bridge/mcp-server"]
```

本地源码配置示例：

```toml
[mcp_servers.proto-bridge]
command = "node"
args = ["/Users/name/work/proto-bridge/packages/mcp-server/dist/index.js"]
```

如果配置文件不在 MCP 启动目录，可传：

```toml
[mcp_servers.proto-bridge]
command = "node"
args = [
  "/Users/name/work/proto-bridge/packages/mcp-server/dist/index.js",
  "--config",
  "/Users/name/work/youfi/proto-bridge.config.json"
]
```

公开 tools：

- `reconstruct_page_context`：主入口，自动选择 source/runtime/screenshot/target capabilities 并生成统一产物。
- `read_target_conventions`：只读 target conventions。
- `find_target_examples`：只读 target 示例搜索。
- `validate_ui_build`：实现后验证 target 变更范围和 plan 风险。

MCP 不再暴露旧 URL-first 分步 tools。截图/OCR、plan、review 都通过 `reconstruct_page_context` 的参数和输出完成。

## 产物

默认主产物：

```text
output/<page>-<timestamp>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
    └── full-page.png      # runtime capture 时生成
```

说明：

- `page-canonical.json`：统一 canonical，上游事实、provenance、merge、mismatches、trace 都在这里。
- `page-debug-index.json`：排查索引，用于快速定位 section/node/style/mapping/risk。
- `ui-build-plan.json`：机器可读实现计划。
- `ui-build-review.md`：人类可读交接文档。
- `migration-spec.md`：仅在显式 `--source-brief` / `sourceBrief=true` 时作为可选 source-aware brief 输出。

默认不再输出 `migration-context.json`。

## 架构

```text
packages/core/src/
├── capabilities/      # source/runtime/screenshot/target/merge/plan/review capability facade
├── workflows/
│   └── capability-first/
├── source/            # source 技术栈实现
├── snapshot/          # browser capture、OCR、evidence enrichers
├── target/            # Flutter conventions、examples、planning、validation
├── artifacts/         # JSON / Markdown 写出
└── types/             # 共享数据结构
```

`packages/cli` 和 `packages/mcp-server` 只做入口、参数、配置、MCP 协议适配；业务能力沉淀在 `packages/core`。

## 文档

- [docs/workflows.md](docs/workflows.md)：CLI/MCP 入口和 capability-first workflow。
- [docs/architecture.md](docs/architecture.md)：架构、数据模型和扩展边界。
- [docs/integration.md](docs/integration.md)：CLI、MCP、core 集成方式。
- [docs/mcp-ui-reconstruction-workflow.md](docs/mcp-ui-reconstruction-workflow.md)：MCP/capability-first UI reconstruction 细节。
- [docs/migration-spec.md](docs/migration-spec.md)：可选 source brief 的质量标准。
- [docs/npm-publish.md](docs/npm-publish.md)：npm 发布流程。
