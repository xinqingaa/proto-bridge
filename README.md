# ProtoBridge

ProtoBridge 是团队将“产品 PRD + Figma 静态设计稿 + 人工 UI 走查”的传统交付链路，升级为“交互原型 + 源码证据 + AI 编排 + 可验证产物”的工程化工具。

它把交互原型、运行时页面、截图证据和目标工程规范整理成实现上下文，服务于人工开发者和 AI coding agent。它不直接把 Vue 翻译成 Flutter，也不自己生成完整 Dart 页面；它负责产出一组可追溯的页面级产物，让实现者在修改目标应用前先回答清楚：要重建哪个页面、有哪些证据、目标工程有哪些约定、预期改哪些文件和 Widget、哪些风险需要确认、实现后应该如何验证。

```text
source / URL / screenshot / target repo
  -> shared capabilities
  -> page-canonical.json
  -> ui-build-plan.json
  -> ui-build-review.md
  -> implementation + validation
```

## 为什么需要它

原来的链路通常是：产品输出 PRD，UI 在 Figma 出静态设计稿，前后端和客户端根据各自理解实现，联调后再由 UI 走查。痛点是 Figma 稿是静态的，无法完整表达交互、状态、滚动、弹窗、tab、空态和异常态；客户端需要自己补交互理解，组件、主题和状态样式也经常依赖人工解释和事后走查。

新的目标是让产品和 UI 配合 AI 建立交互原型平台，让原型平台里的组件、主题、布局、状态和交互尽量与客户端工程一一对应。ProtoBridge 负责把这个原型平台和客户端目标工程连接起来：采集 source 语义、runtime evidence、screenshot/OCR evidence 和 target conventions，生成可 review、可追溯、可验证的 artifacts。模式成熟后，UI 走查应从大规模事后兜底，逐步收敛为少量异常确认。

## 核心概念

| 概念 | 含义 |
| --- | --- |
| Mode | 入口形态。CLI 面向终端和批处理，MCP 面向 agent/tool 调用，core 面向嵌入式调用。 |
| Workflow | 面向常见输入组合的预设编排，例如 source-only、runtime-only、hybrid。 |
| Capability | 可复用的 core 能力，例如 `source.analyze`、`runtime.capture`、`target.inspect`、`ui.plan`、`ui.validate`。 |
| Artifact | 可持久化的输出产物，例如 `page-canonical.json`、`ui-build-plan.json`、`ui-build-review.md`。 |

CLI 和 MCP 是同一套 core capabilities 的不同入口：

| 入口 | 适合场景 | 主命令 / Tool |
| --- | --- | --- |
| CLI | 本地准备、批量生成、人工 review | `proto-bridge generate` |
| MCP | Codex、Cursor、Claude Code 等 agent | `reconstruct_page_context` |
| Core | 在其他 Node.js 工具里嵌入 ProtoBridge | `reconstructPageContext` |

## 输入组合

Source 和 URL 都不是绝对必填。按你手头已有的证据选择模式：

| 输入 | 是否可运行 | 适合场景 |
| --- | --- | --- |
| source + target | 可以 | 有原型源码，想提取结构、状态、交互、组件和 token intent。 |
| URL + target | 可以 | 没有源码或只想采集当前运行态视觉证据。 |
| source + URL + target | 可以 | 同时利用源码意图和运行时事实，推荐用于完整重建。 |
| screenshot/OCR + target | 可以 | 作为视觉和文字补证，不能替代完整 source/runtime evidence。 |
| target only | 不生成页面上下文 | 可读取目标规范或做实现后 validation。 |

`target.root` 对生成面向客户端的 plan 和 validation 通常是必需的；`source.root` 只在 source-only 或 hybrid 场景需要；`url` 只在 runtime-only 或 hybrid capture 场景需要。

## 快速开始

安装并创建配置：

```bash
npx @proto-bridge/cli init
```

`proto-bridge.config.json` 常用 source + target 示例：

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

基于源码生成上下文：

```bash
npx @proto-bridge/cli generate --route /prototype/asset/pnl-analysis
```

从运行中的原型采集 runtime evidence：

```bash
npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" \
  --capture
```

同时使用 source 和 runtime evidence：

```bash
npx @proto-bridge/cli generate \
  --route /prototype/asset/pnl-analysis \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" \
  --capture
```

## 输出产物

```text
output/<page>-<timestamp>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
    └── full-page.png
```

- `page-canonical.json`：完整页面上下文，包含事实、provenance、merge 决策、warnings 和 trace。
- `page-debug-index.json`：面向调试的紧凑索引，帮助定位 section、node、style、mapping 和 risk。
- `ui-build-plan.json`：机器可读实现计划。
- `ui-build-review.md`：人类可读实现交接文档。
- `screenshots/`：runtime capture 生成的视觉证据。

## MCP

发布包配置：

```toml
[mcp_servers.proto-bridge]
command = "npx"
args = ["-y", "@proto-bridge/mcp-server"]
```

本地源码构建配置：

```toml
[mcp_servers.proto-bridge]
command = "node"
args = [
  "/Users/name/work/proto-bridge/packages/mcp-server/dist/index.js",
  "--config",
  "/Users/name/work/youfi/proto-bridge.config.json"
]
```

MCP tools：

- `reconstruct_page_context`：生成统一页面上下文和实现产物。
- `read_target_conventions`：读取目标 Flutter 工程规范。
- `find_target_examples`：搜索相似目标文件和代码片段。
- `validate_ui_build`：通过共享 `ui.validate` capability 验证目标变更。

## 仓库结构

```text
packages/
├── core/          # capabilities、workflow 编排、source/snapshot/target 逻辑
├── cli/           # 终端入口
└── mcp-server/    # MCP stdio server、tools、resources、prompts

docs/
├── background.md
├── architecture.md
├── workflows.md
├── quickstart.md
├── artifacts.md
├── integration.md
├── migration-spec.md
└── npm-publish.md
```

## 文档导航

- [项目背景](docs/background.md)：产品背景、协作问题和目标收益。
- [架构说明](docs/architecture.md)：mode、workflow、capability、artifact 和包边界。
- [工作流](docs/workflows.md)：source-only、runtime-only、hybrid、screenshot/OCR 和 validation。
- [快速开始](docs/quickstart.md)：安装、配置、CLI、MCP 和最小示例。
- [产物说明](docs/artifacts.md)：输出文件结构和阅读方式。
- [集成方式](docs/integration.md)：CLI、MCP 和 core 嵌入参考。
- [迁移说明书标准](docs/migration-spec.md)：可选 source brief 的质量标准。
- [npm 发布指南](docs/npm-publish.md)：发布检查清单。
