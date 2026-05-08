# 集成与工具入口

本文档说明 ProtoBridge 的 CLI、MCP、脚本化调用和输出集成方式。

## 1. CLI 入口

CLI 是当前稳定入口，主要用于生成可审查的迁移上下文和说明书：

```bash
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/etf-detail"
npx @proto-bridge/cli generate --route /prototype/etf-detail
npx @proto-bridge/cli generate --vue prototype/src/views/prototype/etf/ETFDetailPage.vue
npx @proto-bridge/cli generate
```

CLI 职责：

- 读取 `proto-bridge.config.json`。
- 解析页面输入、输出目录和 capture 参数。
- 调用 core `generateMigrationSpec`。
- 输出生成文件路径和 warning 数量。

CLI 不实现 source/target 分析、planner 或 spec 渲染逻辑，也不直接生成 Flutter Dart 业务文件。Dart 落地实现需要 AI coding agent 或人工开发完成。

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
  "outputRoot": "./output",
  "capture": false
}
```

CLI 参数可以覆盖页面输入、单次输出目录和 capture 行为：

```bash
npx @proto-bridge/cli generate \
  --config ./proto-bridge.config.json \
  --route /prototype/trade \
  --output ./output/custom-trade \
  --capture
```

## 3. 适用集成场景

ProtoBridge 当前适合接入以下流程：

- **人工实现前的上下文准备**：开发者先生成说明书，再按目标 App 规范实现页面。
- **AI coding 前的提示材料准备**：把 `migration-spec.md` 交给 Cursor、Claude Code、Codex CLI 等工具，把 `migration-context.json` 作为补充证据。
- **跨仓库迁移评审**：source 和 target 不在同一仓库时，用说明书固定页面事实、目标落点和人工确认项。
- **批量页面梳理**：对多个 route 生成 context，比较页面复杂度、缺失 notes、token unresolved 和 target 复用情况。
- **实现前风险扫描**：在写业务代码前确认路由、i18n、资源、权限、风控、埋点和异常态是否明确。

不适合的场景：

- 直接把 source 代码转换成 target 代码并自动提交。
- 在 CLI 内确定性生成完整 Flutter 页面代码。
- source 页面本身无法表达需求，且没有 notes、i18n 或人工说明。
- target 仓库不可访问，无法读取模块、路由、资源和组件约束。
- 需要像素级 Figma 还原但没有 target 工程上下文。

## 4. 下一步：MCP + AI Agent 自动化

团队日常使用期望更接近 Figma MCP：用户只给 AI 工具一个 route、URL 或 Vue 文件，后续由 AI 工具自动完成 Flutter 实现。ProtoBridge 的下一步方向是把上下文生成能力接入 MCP，而不是在 CLI 中内置 Dart 代码生成器。

推荐目标流程：

```text
用户在 AI coding 工具中输入 route / url / vue 文件
  -> AI agent 调用 ProtoBridge MCP 生成 migration context/spec
  -> AI agent 调用 MCP 获取 target 约束和相似 Flutter 实现
  -> AI agent 在 target repo 中创建或修改目标页面文件
  -> AI agent 调用 MCP 校验改动范围、缺失项和可追溯证据
```

这个流程中，`migration-spec.md` 仍然存在，但它是 MCP 提供给 agent 的上下文，不再要求用户手动复制给 AI 工具。详见 [MCP Agent 工作流](agent-mcp-workflow.md)。

## 5. Core 调用

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
  capture: false,
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
    -> TargetAdapter.buildRecommendations
  -> write migration-context.json
  -> write migration-spec.md
```

详细数据流：

| 步骤 | 输入 | 处理 | 输出 |
| --- | --- | --- | --- |
| 1 | config + CLI args | 解析 source、target、page input、outputRoot/output、capture | `GenerateMigrationSpecInput` |
| 2 | `source.adapter` | 从 registry 获取 SourceAdapter | source adapter 实例 |
| 3 | source root + route/vue/url | 读取页面配置、源码、notes、i18n、source docs 线索 | `PrototypePageAnalysis` |
| 4 | prototypeUrl | 截图和 DOM 提取 | `CaptureResult` |
| 5 | source styles + computed styles | 映射 Flutter token | `TokenMapResult` |
| 6 | target root + source module/screenId | 扫描模块、路由、翻译、资源、组件、相似文件、target docs 线索 | `FlutterContextAnalysis` |
| 7 | source facts + target context | 页面模式识别、Widget blueprint、状态策略、文件拆分 | `FlutterImplementationPlan` |
| 8 | context + plan | 渲染 JSON 和 Markdown | 输出文件 |

约束传递方式：

- Source adapter 负责告诉说明书“页面要做什么”。
- Target adapter 负责告诉说明书“目标 App 里应该怎么做”。
- Spec generator 负责把两边信息整理成 target-facing 文档。
- warnings 和 checklist 负责保留不确定性，避免把推断内容写成确定结论。

## 6. MCP 入口

`packages/mcp-server` 是 MCP 协议入口包。Phase 1 只开放 URL Snapshot UI reconstruction 新链路，不暴露旧 source-aware migration tools。

当前发布入口：

```bash
npx -y @proto-bridge/mcp-server
```

当前 MCP tools：

- `capture_page_snapshot`
- `build_ui_implementation_plan`
- `ocr_screenshot`
- `export_review_markdown`
- `get_target_conventions`
- `find_target_examples`
- `validate_target_changes`

暂不开放：

- `generate_migration_spec`
- `get_migration_brief`
- `read_migration_artifact`

MCP 默认使用当前工作目录作为 `target.root`。旧 source-aware 链路继续保留在 CLI / core 中，但不从 MCP runtime 暴露。

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

保存为：

```text
/path/to/youfi/.cursor/mcp.json
```

Claude Code 项目级配置：

```bash
cd /path/to/youfi
claude mcp add proto-bridge --scope project -- \
  npx -y @proto-bridge/mcp-server
```

## 7. 输出文件

CLI 旧 source-aware 链路成功生成后，输出目录包含：

```text
output/<page>/
├── migration-context.json
├── migration-spec.md
├── screenshot.png        # capture enabled
└── dom-snapshot.json     # capture enabled
```

`migration-context.json` 是机器可读上下文。`migration-spec.md` 是面向 Flutter 实现者和 AI coding 工具的说明书。

MCP Phase 1 新链路输出：

```text
.proto-bridge/snapshots/<page>/
├── page-snapshot.json
├── screenshot.png
├── ui-implementation-plan.json
├── ocr-result.json      # optional OCR evidence
└── ui-review.md         # optional human review export
```

`page-snapshot.json` 是页面结构、视觉和文案证据。`ui-implementation-plan.json` 是 agent 直接消费的 YouFi UI 实现计划。

## 8. Capture 集成

Capture 输入：

```bash
npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/trade" \
  --prototype-url "http://localhost:5173/#/prototype/trade" \
  --capture
```

要求：

- 原型 dev server 已启动。
- `prototype-url` 可在浏览器中访问。
- 页面处于适合截图和 DOM 提取的状态。

Capture 失败时，core 会把错误写入 warnings，不阻断静态上下文生成。

## 9. AI 工具集成

在当前 CLI 流程下，推荐把 `migration-spec.md` 作为主要提示材料，把 `migration-context.json` 作为补充上下文。

在 MCP Phase 1 流程下，AI agent 应通过 `capture_page_snapshot` 和 `build_ui_implementation_plan` 获取 JSON 上下文，用户不需要手动复制 Markdown。

推荐交付方式：

1. 先让 AI 阅读 `migration-spec.md`。
2. 要求 AI 按“目标文件拆分”和“Widget 组合”实现。
3. 要求 AI 对照“状态与交互建议”“路由与布局”“CSS 样式/i18n/资源”逐项处理。
4. 要求 AI 不处理未确认的 P0/P1 问题，或者显式留下 TODO。
5. 需要追溯证据时，再查看 `migration-context.json` 中的 source/capture/target facts。

使用原则：

- 让 AI 按说明书中的 Flutter 实现规划落地。
- 让 AI 优先复用说明书列出的 common widgets、routes、translations、assets 和 theme tokens。
- 不要求 AI 逐层翻译 Vue 模板或 CSS class。
- 对 warnings 和人工确认项保持显式处理。

## 10. CI / 脚本化使用

推荐检查命令：

```bash
pnpm run typecheck
pnpm run build
```

推荐生成命令：

```bash
npx @proto-bridge/cli generate --route /prototype/trade
```

脚本化调用时应固定：

- config path。
- page input。
- output directory。
- capture 开关。

生成产物通常不需要提交到 ProtoBridge 仓库，除非它是示例或回归样本。
