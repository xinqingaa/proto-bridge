# ProtoBridge Workflows

本文档是 ProtoBridge 的 workflow 说明书。它承接 [README.md](../README.md) 的总览，专门解释两条工作流各自的设计目标、输入模型、使用方式、工作模式、工作流、产物和能力边界。

```text
CLI = Source-aware Migration
MCP = UI Reconstruction
```

## 1. 总览

| 项 | CLI 工作流 | MCP 工作流 |
| --- | --- | --- |
| 推荐命名 | Source-aware Migration | UI Reconstruction |
| 入口包 | `@proto-bridge/cli` | `@proto-bridge/mcp-server` |
| 主要目标 | 生成可审查、可归档的迁移说明书 | 生成 evidence-first UI 还原上下文 |
| 主要输入 | Vue route / URL / Vue SFC + source config | URL 为主输入，辅以 screenshot/OCR/runtime metadata |
| 是否读取 source 仓库 | 是 | 否 |
| 是否需要 `proto-bridge.config.json` | 是 | 否 |
| target root 来源 | `config.target.root` | MCP 启动目录或 `targetRoot` 参数 |
| 主产物 | `migration-context.json`、`migration-spec.md` | `screenshot.png`、`page-evidence.json`、`ui-implementation-plan.json` |
| 可选产物 | `screenshot.png`、`dom-snapshot.json` | `ocr-result.json`、`ui-review.md` |
| 主要使用者 | 维护者、开发者、批处理脚本 | AI coding agent、MCP client |
| 代码生成职责 | 不直接写 Dart | 不直接写 Dart，由 agent 实现 |

如何快速选择：

- 需要 source 语义、notes、i18n、页面配置和 target-facing 说明书时，用 CLI。
- 只给 URL，希望快速还原可见 UI 并让 agent 实现时，用 MCP。

## 2. CLI：Source-aware Migration

### 2.1 设计目标

CLI 的目标是把 source 页面事实和 target 工程约束整理成可审查的迁移说明书，而不是直接生成目标端业务代码。

适合：

- source 和 target 分属不同仓库。
- 需要读取 Vue 源码、notes、i18n、页面配置。
- 需要实现前先明确风险、人工确认项、路由参数、资源和 token 对应关系。
- 需要批量生成迁移材料，供开发、评审或归档使用。

不适合：

- 用户只给一个 URL，希望快速还原可见 UI。
- 不想配置 source 仓库路径。
- 期望工具直接生成完整 Dart 页面代码。

### 2.2 输入模型

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

配置文件示例：

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

### 2.3 使用方式

发布包使用：

```bash
npx @proto-bridge/cli --help
npx @proto-bridge/cli init
npx @proto-bridge/cli generate --route /prototype/trade
```

本地仓库开发：

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm run generate -- --help
```

常见覆盖参数：

```bash
npx @proto-bridge/cli generate \
  --config ./proto-bridge.config.json \
  --route /prototype/trade \
  --output ./output/custom-trade \
  --capture
```

### 2.4 工作模式

CLI 是 source-aware 文档链路：

```text
页面输入
  -> 读取 source project
  -> 读取 target project
  -> 生成 migration context
  -> 渲染 migration spec
  -> 交给人工或 AI coding 工具继续实现
```

### 2.5 工作流

```text
CLI input
  -> 解析 source/target adapter config
  -> SourceAdapter 读取 source 页面事实和 source 侧说明
  -> optional Playwright capture 补充运行时布局证据
  -> TargetAdapter 读取 target 工程结构和实现约束
  -> TargetAdapter 映射 token 并生成 implementation plan
  -> source-aware workflow 输出 context 与说明书
```

### 2.6 产物

默认产物：

```text
output/<page>-<timestamp-hash>/
├── migration-context.json
└── migration-spec.md
```

开启 capture 后额外产出：

```text
output/<page>-<timestamp-hash>/
├── screenshot.png
└── dom-snapshot.json
```

### 2.7 当前能力

- 通过 route、URL 或 Vue 文件定位原型页面。
- 读取页面配置、源码、notes、i18n 和页面元信息。
- 从 Vue SFC 中提取 sections、semantic components、interactions、state、routes、lifecycle、layout、assets 和 style token usage。
- 扫描 Flutter modules、routes、translations、assets、common widgets 和相似文件。
- 生成 Flutter 文件树、Widget 组合、状态管理建议和人工确认项。

## 3. MCP：UI Reconstruction

### 3.1 设计目标

MCP 的目标是走 evidence-first 工作模式：先 capture 页面证据，再生成 UI 实现计划，再由 agent 在 target repo 中落地代码。

适合：

- 用户只给一个 URL，希望快速还原页面可见 UI。
- 不想配置 source 仓库路径。
- 希望通过 Codex、Cursor、Claude Code 等 MCP client 驱动实现。
- 需要 `PageEvidence` 和 `ui-implementation-plan.json` 作为 agent 的主要上下文。

不适合：

- 需要从 Vue 源码、notes、i18n 中提取完整业务语义。
- 需要确定接口字段、权限、风控、埋点或复杂交易规则。
- 页面 URL 无法被 Playwright 访问。

### 3.2 输入模型

当前 MCP 工作流的主输入是 URL：

```text
用 ProtoBridge 还原这个页面到 YouFi Flutter：
https://xiaofenhong.cc/TradeAppPrd/#/prototype/etf-detail?is_mobile=1
```

当前公开 tools：

- `capture_page_evidence`
- `build_ui_implementation_plan`
- `ocr_screenshot`
- `export_review_markdown`
- `get_target_conventions`
- `find_target_examples`
- `validate_target_changes`

当前真实边界：

- `capture_page_evidence` 当前只接受 `url` 作为 capture 输入。
- `ocr_screenshot` 只补充 OCR 文字证据，不会单独生成和 rendered DOM 同等级的 node tree。
- rendered HTML / DOM snapshot 直接输入属于未来扩展方向，不是当前公开 MCP API。

### 3.3 使用方式

发布包接入：

```bash
npx -y @proto-bridge/mcp-server
```

本地源码开发：

```bash
cd /path/to/proto-bridge
pnpm run build
cd /path/to/youfi
node /path/to/proto-bridge/packages/mcp-server/dist/index.js
```

MCP 不需要 `proto-bridge.config.json`。推荐从 target 仓库启动，让 `process.cwd()` 成为默认 `targetRoot`。

如果需要 Codex、Cursor、Claude Code 的具体 MCP client 配置，统一查看 [integration.md](integration.md)。

### 3.4 工作模式

MCP 是 URL-first 的 evidence-first 链路：

```text
用户 / agent 给出 URL
  -> MCP capture 页面
  -> 生成 screenshot + page evidence
  -> 生成 UI implementation plan
  -> agent 读取 target 工程并实现 Dart UI
  -> MCP 校验改动范围和显式风险
```

### 3.5 工作流

```text
MCP input
  -> URL capture
  -> UI reconstruction workflow 输出 screenshot.png 与 page-evidence.json
  -> optional OCR / runtime metadata / capability enrichers
  -> target/flutter-app 读取 conventions/examples/theme/routes/i18n/assets
  -> UI reconstruction workflow 输出 ui-implementation-plan.json
  -> AI coding agent 在 target repo 中生成 Dart 页面
  -> validate_target_changes 做结果校验
```

### 3.6 产物

主产物：

```text
.proto-bridge/evidence/<page>-<timestamp>/
├── screenshot.png
├── page-evidence.json
└── ui-implementation-plan.json
```

可选产物：

```text
.proto-bridge/evidence/<page>-<timestamp>/
├── ocr-result.json
└── ui-review.md
```

### 3.7 Agent 推荐流程

1. 调用 `capture_page_evidence(url)`。
2. 调用 `build_ui_implementation_plan(evidenceId)`。
3. 按需调用 `get_target_conventions()` 和 `find_target_examples(...)`。
4. 在 target repo 中实现 Dart UI。
5. 运行 analyzer/test 或至少做静态检查。
6. 调用 `validate_target_changes(planId)`。
7. 向用户汇报改动文件、验证结果和待确认项。

### 3.8 当前能力

- 采集 URL，生成 screenshot 和 `PageEvidence`。
- 读取 target conventions、theme、routes、i18n、assets 和相似页面。
- 生成文件落点、Widget tree、component mappings、theme mappings、i18n plan、asset plan、visible interactions、risks 和 validation hints。
- 校验 target 改动范围、明显占位实现、TODO 和文件落点问题。

## 4. 共享能力与依赖边界

两条 workflow 共享底层能力，但不共享编排。

```text
workflows/source-aware-migration
  -> source/vue3-prototype
  -> optional snapshot/browser-capture
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
- `source/*`、`snapshot/*`、`target/*` 不 import CLI 或 MCP 入口包。

## 5. 深入阅读

- 想看模块边界、数据模型和目录职责：读 [architecture.md](architecture.md)。
- 想看 MCP 从 URL 到 `ui-implementation-plan.json` 的细节：读 [mcp-ui-reconstruction-workflow.md](mcp-ui-reconstruction-workflow.md)。
- 想看 CLI 说明书质量要求：读 [migration-spec.md](migration-spec.md)。
