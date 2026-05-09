# ProtoBridge Workflows

本文档是 ProtoBridge 当前最重要的使用说明：项目同时保留两条 workflow，但它们不是同一流程的两个参数，而是两个不同入口、不同输入模型、不同产物和不同使用场景的工作流。

```text
CLI = Source-aware Migration
MCP = UI Reconstruction
```

## 1. 总览

| 项 | CLI 工作流 | MCP 工作流 |
| --- | --- | --- |
| 推荐命名 | Source-aware Migration | UI Reconstruction |
| 入口包 | `@proto-bridge/cli` | `@proto-bridge/mcp-server` |
| 主要目标 | 生成可审查迁移说明书 | 快速还原可见 UI |
| 主要使用者 | 维护者、开发者、批处理脚本 | AI coding agent、MCP client |
| 输入 | Vue route / URL / Vue SFC + source config | URL / rendered page / screenshot / OCR evidence |
| 是否读取 source 仓库 | 是 | 否 |
| 是否需要 `proto-bridge.config.json` | 是 | 否 |
| target root | config 中的 `target.root` | 默认 MCP 启动目录，也可传 `targetRoot` |
| 主产物 | `migration-context.json`、`migration-spec.md` | `screenshot.png`、`page-evidence.json`、`ui-implementation-plan.json` |
| 可选产物 | `screenshot.png`、`dom-snapshot.json` | `ocr-result.json`、`ui-review.md` |
| 业务行为 | 从源码、notes、i18n 中提取并说明 | 只记录可见交互线索和待确认项 |
| Dart 代码生成 | 不做 | MCP 不直接写，由 agent 写 |

核心边界：

- CLI 保留 source-aware 文档链路。
- MCP 只走 snapshot UI reconstruction。
- MCP 不暴露 `generate_migration_spec`、`get_migration_brief`、`read_migration_artifact`。
- 两条 workflow 可以共享 `target/flutter-app`、`snapshot/*`、`artifacts`、`shared`，但 workflow 之间不互相 import。

## 2. CLI：Source-Aware Migration

CLI 工作流适合需要“业务语义和可追溯说明书”的场景。它会读取 source 仓库和 target 仓库，把页面事实、notes、i18n、target conventions 汇总为面向 Flutter 实现者的迁移说明。

### 2.1 特点

- 从 Vue 原型工程读取 route、Vue SFC、页面配置、notes、i18n。
- 从 Flutter target 工程读取 modules、routes、translations、assets、common widgets、similar files。
- 生成 target-facing 的 Flutter 实现规划。
- 保留 `migration-context.json` 作为机器可读证据。
- 输出 `migration-spec.md` 作为人工和 AI coding 工具可读说明书。
- 可选执行 Playwright capture，补充截图和 DOM evidence。

### 2.2 输入模式

CLI 支持三种页面输入：

```bash
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/etf-detail"
npx @proto-bridge/cli generate --route /prototype/etf-detail
npx @proto-bridge/cli generate --vue prototype/src/views/prototype/etf/ETFDetailPage.vue
```

如果不传页面输入，交互式终端中会进入问答流程：

```bash
npx @proto-bridge/cli generate
```

### 2.3 配置方式

CLI 需要在执行目录下准备 `proto-bridge.config.json`，也可以用 `--config` 指定。

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

常用字段：

- `source.adapter`：当前默认 `vue3-prototype`。
- `source.root`：Vue 原型工程根目录。
- `target.adapter`：当前默认 `flutter-app`。
- `target.root`：Flutter target 工程根目录。
- `outputRoot`：输出根目录。
- `capture`：是否默认执行 Playwright capture。

单次执行可以覆盖配置：

```bash
npx @proto-bridge/cli generate \
  --config ./proto-bridge.config.json \
  --route /prototype/trade \
  --output ./output/custom-trade \
  --capture
```

### 2.4 产物

默认产物：

```text
output/<page>/
├── migration-context.json
└── migration-spec.md
```

开启 capture 后额外产出：

```text
output/<page>/
├── screenshot.png
└── dom-snapshot.json
```

`migration-context.json` 包含 source facts、capture evidence、token map、target context 和 recommendations。

`migration-spec.md` 是面向 Flutter 开发者和 AI coding 工具的说明书，重点描述目标文件拆分、Widget 组合、状态与交互建议、路由、i18n、资源、主题映射和人工确认项。

### 2.5 使用场景

适合：

- 需要读取 Vue 源码、notes、i18n 和页面配置。
- 需要生成可归档、可审查的迁移说明书。
- 需要批量梳理多个页面的迁移复杂度。
- 需要在真正实现前明确业务风险、人工确认项和 target 落点。
- source 和 target 分属不同仓库，需要固定跨仓库证据。

不适合：

- 只想快速还原一个线上/原型 URL 的可见 UI。
- 不想配置 source 仓库路径。
- 期望工具直接生成完整 Dart 业务代码。
- 主要输入是截图、OCR 或 rendered DOM。

### 2.6 扩展方向

CLI 工作流未来可以扩展：

- 扩展 source adapter，例如 React prototype、Figma export、静态 HTML。
- 更强的 Vue SFC / notes / i18n 分析。
- 更细的 migration spec 章节和质量校验。
- 在需要时复用 `snapshot/browser-capture`，增强运行时布局证据。
- 批处理命令和 CI 产物检查。

## 3. MCP：UI Reconstruction

MCP 工作流适合 AI coding agent 快速还原页面可见 UI。它不读取 Vue source，不依赖 `proto-bridge.config.json`，默认当前工作目录就是 YouFi Flutter target。

### 3.1 特点

- URL-first，优先从浏览器运行后的页面采集证据。
- `screenshot.png` 是主产物，不是调试附属文件。
- `page-evidence.json` 保存 rendered DOM、bbox、computed style、文案、资源、轻量交互线索和 capability-based metadata。
- `ui-implementation-plan.json` 面向 agent，描述 Flutter 文件落点、Widget 拆分、YouFi components、theme、i18n、assets 和 risks。
- OCR 是辅助证据，用于补充 DOM 看不到的文字。
- 业务接口、权限、风控、埋点、隐藏状态只能进入待确认项，不能写成确定结论。

### 3.2 输入模式

最常见输入是 URL：

```text
用 ProtoBridge 还原这个页面到 YouFi Flutter：
https://xiaofenhong.cc/TradeAppPrd/#/prototype/etf-detail?is_mobile=1
```

MCP tools 支持：

- `capture_page_evidence`：采集 URL，输出 screenshot 和 `PageEvidence`。
- `build_ui_implementation_plan`：从 snapshot 生成 UI plan。
- `ocr_screenshot`：持久化外部 OCR evidence，或返回 provider 缺失提示。
- `export_review_markdown`：导出人工 review 用 Markdown。
- `get_target_conventions`：读取 YouFi target conventions。
- `find_target_examples`：查找相似 Dart 示例。
- `validate_target_changes`：检查 agent 生成后的 target 改动。

### 3.3 配置方式

MCP 不需要 `proto-bridge.config.json`。推荐从 YouFi target 仓库启动 MCP，让 `process.cwd()` 成为默认 `targetRoot`。

本地源码开发：

```bash
cd /path/to/proto-bridge
pnpm run build
cd /path/to/youfi
node /path/to/proto-bridge/packages/mcp-server/dist/index.js
```

Codex 项目级配置：

```toml
# /path/to/youfi/.codex/config.toml
[mcp_servers.proto-bridge]
command = "npx"
args = [
  "-y",
  "@proto-bridge/mcp-server"
]
```

本地源码配置：

```toml
[mcp_servers.proto-bridge]
command = "node"
args = [
  "/path/to/proto-bridge/packages/mcp-server/dist/index.js"
]
```

Cursor 项目级配置：

```json
{
  "mcpServers": {
    "proto-bridge": {
      "command": "npx",
      "args": [
        "-y",
        "@proto-bridge/mcp-server"
      ]
    }
  }
}
```

Claude Code 项目级配置：

```bash
cd /path/to/youfi
claude mcp add proto-bridge --scope project -- \
  npx -y @proto-bridge/mcp-server
```

### 3.4 产物

主产物：

```text
.proto-bridge/evidence/<page>/
├── screenshot.png
├── page-evidence.json
└── ui-implementation-plan.json
```

可选产物：

```text
.proto-bridge/evidence/<page>/
├── ocr-result.json
└── ui-review.md
```

`screenshot.png` 是视觉还原的基准证据。

`page-evidence.json` 是页面结构、文案、视觉、资源、交互和 capability metadata 的稳定中间模型。

`ui-implementation-plan.json` 是 agent 直接消费的 YouFi UI 实现计划。

`ui-review.md` 只用于人工讨论和归档，不是 agent 实现的必经路径。

### 3.5 推荐 Agent 流程

```text
1. 调用 capture_page_evidence(url)
2. 调用 build_ui_implementation_plan(evidenceId)
3. 按需调用 get_target_conventions()
4. 按需调用 find_target_examples(module/pattern/roles)
5. 在 target repo 中实现 Dart UI
6. 运行 analyzer/test 或至少做静态检查
7. 调用 validate_target_changes(planId)
8. 向用户汇报改动文件、验证结果和待确认项
```

### 3.6 使用场景

适合：

- 用户只给一个 URL，希望快速还原可见 UI。
- 不想配置 source 仓库路径。
- 页面业务行为暂时不要求完整迁移。
- AI agent 在 YouFi target 仓库中执行实现。
- 需要 screenshot + JSON evidence 支撑 UI 还原。

不适合：

- 需要从 Vue notes、i18n、源码中提取完整业务语义。
- 需要确定接口字段、权限、风控、埋点或复杂交易规则。
- 页面 URL 无法被 Playwright 访问。
- 页面状态需要登录、复杂操作或隐藏弹层才能看到，但没有额外 evidence。

### 3.7 扩展方向

MCP 工作流未来可以扩展：

- rendered HTML / DOM snapshot 直接输入。
- OCR provider 接入。
- `snapshot/html-snapshot` 分析能力。
- `snapshot/visual-analysis`：视觉区块分类、token evidence、asset evidence。
- 更强的 YouFi component matching。
- UI diff / screenshot review。
- agent prompt 模板和实现后自动校验。

## 4. 共享能力与依赖边界

两条 workflow 共享底层能力，但不共享编排。

```text
workflows/source-aware-migration
  -> source/vue3-prototype
  -> target/flutter-app
  -> artifacts/shared

workflows/ui-reconstruction
  -> snapshot/*
  -> target/flutter-app
  -> artifacts/shared
```

依赖规则：

- `packages/cli` 只 import `@proto-bridge/core/workflows/source-aware-migration`。
- `packages/mcp-server` 只 import `@proto-bridge/core/workflows/ui-reconstruction` 和 `@proto-bridge/core/target/flutter-app`。
- 两个 workflow 不能互相 import。
- `source/*` 不 import workflow。
- `snapshot/*` 不 import workflow。
- `target/*` 不 import CLI 或 MCP。
- `artifacts` 和 `shared` 不 import source、snapshot、target 或 workflow。

## 5. 如何选择

选择 CLI，当你需要：

- source 仓库参与分析。
- Markdown 迁移说明书。
- notes / i18n / Vue SFC 业务语义。
- 批处理、归档、审查、迁移前准备。

选择 MCP，当你需要：

- AI agent 直接在 YouFi 中实现可见 UI。
- URL / screenshot / rendered DOM 作为主要证据。
- 更短路径、更少配置。
- 先还原 UI，再人工或 agent 逐步补业务。
