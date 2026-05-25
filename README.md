# ProtoBridge

ProtoBridge 是团队将“产品 PRD + Figma 静态设计稿 + 人工 UI 走查”的传统交付链路，升级为“交互原型 + 源码证据 + AI 编排 + 可验证产物”的工程化工具。

它把交互原型、运行时页面、截图证据和目标 Flutter 工程规范整理成页面级上下文，服务于人工开发者和 AI coding agent。它不直接把 Vue、HTML、DOM 或截图翻译成 Dart，也不自己生成生产页面；它负责产出一组可追溯、可审查、可验证的 artifacts，让实现者在修改目标应用前先回答清楚：要重建哪个页面、有哪些证据、目标工程有哪些约定、预期改哪些文件和 Widget、哪些风险需要确认、实现后应该如何验证。

```text
source / URL / screenshot / target repo
  -> shared capabilities
  -> page-canonical.json
  -> page-debug-index.json
  -> ui-build-plan.json
  -> ui-build-review.md
  -> implementation + validation
```

```mermaid
flowchart LR
  A["PRD"] --> B["Figma 静态稿"]
  B --> C["客户端各自理解实现"]
  C --> D["联调后 UI 走查"]
  D --> E["返工修正"]

  A2["产品 / UI / AI 交互原型"] --> B2["源码证据"]
  C2["运行时页面"] --> D2["运行时证据"]
  E2["目标 Flutter 工程"] --> F2["目标工程规范"]
  B2 --> G["ProtoBridge"]
  D2 --> G
  F2 --> G
  G --> H["可审查产物"]
  H --> I["AI agent / 开发者实现"]
  I --> J["实现后验证"]
```
## 为什么需要它

原来的链路通常是：产品输出 PRD，UI 在 Figma 出静态设计稿，前后端和客户端根据各自理解实现，联调后再由 UI 走查。痛点是 Figma 稿是静态的，无法完整表达交互、状态、滚动、弹窗、tab、空态和异常态；客户端需要自己补交互理解，组件、主题和状态样式也经常依赖人工解释和事后走查。

新的目标是让产品和 UI 配合 AI 建立交互原型平台，让原型平台里的组件、主题、布局、状态和交互尽量与客户端工程一一对应。ProtoBridge 负责把这个原型平台和客户端目标工程连接起来：采集 source 语义、runtime evidence、screenshot/OCR evidence 和 target conventions，生成可 review、可追溯、可验证的 artifacts。模式成熟后，UI 走查应从大规模事后兜底，逐步收敛为少量异常确认。

## 核心原则

ProtoBridge 的产物体系按证据职责分工，而不是让某一个来源统治全部字段。

| 证据来源 | 负责 | 不负责 |
| --- | --- | --- |
| Source semantics | 业务区块、状态意图、交互和生命周期意图、Widget contract、禁止直译项、资源和文案线索。 | 不决定目标工程使用哪种 state/routing/i18n/theme 框架。 |
| Target conventions | 目标 Flutter 工程实际使用的 state、routing、i18n、theme、component、file organization 模式。 | 不补造 source 中没有的业务语义，也不替代 runtime 视觉事实。 |
| Runtime / screenshot | 当前可见文案、bbox、section 顺序、computed style、截图、OCR 和视觉对照。 | 不反向决定文件拆分、状态 owner 或架构边界。 |

这三类证据最终汇入 `ui-build-plan.json`。它是实现蓝图，是 agent 默认执行的主文档；`ui-build-review.md` 是从这份 JSON 渲染出来的中文审查视图。

`page-canonical.json` 是证据原档，用于追溯来源、排查冲突和补查细节。`ui-build-plan.json` 会把实现时最容易被漏读的高价值证据提升成结构化契约，例如目标工程约定、文件/Widget 边界、重复 UI 单元的节点级行结构、控件 padding/radius/height、absence hints、动态文案提示和 validation hints。agent 默认应先执行 plan，而不是自行从 canonical 或截图里重新猜页面结构。

## 核心概念

| 概念 | 含义 |
| --- | --- |
| Mode | 入口形态。CLI 面向终端和批处理，MCP 面向 agent/tool 调用，core 面向嵌入式调用。 |
| Workflow | 面向常见输入组合的预设编排，例如 source-only、runtime-only、hybrid、screenshot/OCR 和 validation。 |
| Capability | 可复用的 core 能力，例如 `source.analyze`、`runtime.capture`、`target.inspect`、`ui.plan`、`ui.validate`。 |
| Restoration profile | source / target 之外的项目增强层。它提供模块别名、项目组件候选、业务词表和 token 映射，但不能伪造 target 扫描证据。 |
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

## 产物权威链

```text
page-canonical.json
  证据原档，用于追溯来源、排查冲突和补查细节

page-debug-index.json
  调试索引，方便从截图/文本快速定位到证据

ui-build-plan.json
  实现蓝图，是 agent 默认执行的主文档

ui-build-review.md
  审查视图，方便人快速阅读实现蓝图
```

`ui-build-plan.json` 的主结构：

| 区域 | 作用 |
| --- | --- |
| `targetConventions.architectureProfile` | 目标工程扫描出的 state/routing/i18n/theme/component/file organization 模式。字段值必须来自证据；扫不到就是 `unknown` 或空集合。 |
| `restorationProfile` | 本次启用的项目增强来源，例如 `generic` 或自动推断出的 `youfi`。它只解释候选和增强来自哪里，不改变 target evidence 语义。 |
| `implementationContract` | 文件、Widget、状态策略、边界、Widget contract、source semantics、target bindings、warnings 和 manual questions。 |
| `visualPlan` | viewport、section、bbox、layout evidence、screenshot refs、节点级还原证据和动态文案提示。用于视觉还原，不决定架构拆分。 |
| `themeMappings` / `componentMappings` | 主题 token、字体锁定、组件复用候选和映射依据。 |
| `i18nPlan` / `interactionPlan` / `validationHints` | 文案、交互和实现后验证提示。 |

顶层 `fileTree` / `widgetTree` 会镜像 `implementationContract.fileTree/widgetTree`，用于现有消费者读取；主架构来源仍是 `implementationContract`。

`visualPlan.nodeAudits` 是重复卡片、列表项、按钮、chip、tab、appbar action 和 bottom action 的节点级还原契约。它保留行结构、文本/icon 顺序、控件尺寸、assetRefs 和“不要补不存在字段”的 absence hints。额外重复项可以保留在 plan 中但不展开到 review，确保实现蓝图保真，人类文档可读。

`visualPlan.dynamicTextHints` 会把列表数量、金额、百分比、日期和数量标签标成动态值，并同步到 `i18nPlan.texts[*].dynamic`。实现时这些值应来自 UI model 和 formatter，不应被写成固定翻译 key。

## 架构约束

ProtoBridge 通用 core 没有内置某个 Flutter 架构偏好。Restoration profile 可以把 GetX、themeService、CommonAppBar 这类项目经验放进候选池，但高置信 plan 仍必须有 target 扫描证据支撑；扫不到时只能保留抽象建议、低置信候选或人工确认项。

`restorationProfile` 与 `targetConventions.architectureProfile` 是两个概念：前者是项目增强配置，后者是 target repo 扫描出来的工程事实。如果 target architecture profile unknown，产物会保留抽象建议，并写入 `contractWarnings` 或 `manualQuestions`。实现者不应该猜测或引入一个新框架。

Typography lock 是 P0 视觉约束：如果 typography mapping 带 `lockToken=true`，实现时必须直接使用扫描或映射得到的 target text style token；除非 plan 明确列出来源覆盖证据，不要再覆盖 `fontSize`、`fontWeight`、`height` 或 `fontFamily`。

## 快速开始

安装并创建配置：

```bash
npx @proto-bridge/cli init
```

`proto-bridge.config.json` 只放稳定环境信息，不写本次要还原的页面：

```json
{
  "schemaVersion": 1,
  "source": {
    "adapter": "vue3-prototype",
    "root": "/Users/name/work/TradeAppPrd"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "/Users/name/work/youfi"
  },
  "profile": "auto",
  "runtime": {
    "capture": true
  },
  "output": {
    "root": "./output"
  }
}
```

`profile` 是可选字段；不配置或配置为 `"auto"` 时，会用 `target.root` 的目录名自动推断，例如 `/Users/name/work/youfi` 会启用内置 `youfi` profile。配置 `"generic"` 或 `false` 会禁用业务增强，只保留通用能力；显式配置 `"youfi"` 会强制使用 YouFi profile。

每次运行时通过 CLI 参数或交互输入告诉 ProtoBridge 要还原哪个页面。配置了 `source.root` 时会自动从 URL 推导 route 并补充源码证据：

```bash
npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1"
```

不传页面参数时，CLI 会询问 `url/route/vue`：

```bash
npx @proto-bridge/cli generate
```

`--route` 和 `--vue` 是高级覆盖入口，通常不需要传：

```bash
npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" \
  --route /prototype/asset/pnl-analysis
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

阅读顺序：

1. `ui-build-plan.json`：给 agent 和自动校验使用的实现蓝图。
2. `ui-build-review.md`：给人快速 review 的中文视图。
3. `page-debug-index.json`：排查视觉偏差时的索引。
4. `page-canonical.json`：完整证据、provenance 和 trace。
5. `screenshots/`：视觉对照。

## 开源示例

仓库内提供一个完整示例：[Vue3 source 到 Flutter target](examples/vue3-to-flutter/README.md)。

示例命令分三类：

| 命令 | 作用 | 适合场景 |
| --- | --- | --- |
| `pnpm run example` | 生成示例 `output/` artifacts，并在 Flutter target 中生成 `_proto` 页面代码。 | 首次体验完整示例闭环。 |
| `pnpm run example:clean` | 删除 `_proto` 安装结果并清空示例 `output/`。 | 想让 Flutter target 回到 fallback 状态，或确认下一次产物是全新生成。 |
| `pnpm run example:dev` | 启动 Vue 原型和 Flutter Web 预览。 | 在浏览器查看原型和生成页。 |
| `pnpm run example:android` | 运行 Flutter target 到 Android 设备或模拟器。 | 在 Android 上查看生成页。 |

推荐顺序：

```bash
pnpm run example
pnpm run example:dev
pnpm run example:android
```

打开：

```text
Vue prototype:  http://127.0.0.1:5173/
Flutter target: http://127.0.0.1:5599/
```

如果默认端口被占用，脚本会自动顺延到可用端口，请以终端输出的地址为准。

示例包含一个 Vue3 + Pinia 原型工程、一个 Flutter target 工程，以及可本地生成的 ProtoBridge artifacts 和 Flutter `_proto` 页面。`output/` 和 `_proto` 生成代码不会提交到仓库，便于每个用户重新体验生成过程。`main_proto.dart` 存在表示已经运行过 `pnpm run example`；不存在时，预览命令会显示兜底提示页。这个示例展示的是当前内置适配重点：

```text
source: vue3-prototype
target: flutter-app
```

效果预览：

| Prototype | Generated Flutter page |
| --- | --- |
| ![Prototype simple](examples/vue3-to-flutter/screenshots/prototype-simple.png) | ![Flutter simple](examples/vue3-to-flutter/screenshots/flutter-simple.png) |

<details>
<summary>产物片段</summary>

`ui-build-plan.json` 是实现蓝图。它把 source semantics、target conventions 和 runtime/screenshot 视觉事实拆到不同职责区：

```text
targetConventions         # target repo 扫描出的 state/routing/i18n/theme/component/file organization 证据
implementationContract   # 文件、Widget、状态边界、source semantics 和 contract rules
visualPlan               # runtime/screenshot 视觉事实、section、bbox、截图引用
```

`ui-build-review.md` 从 `ui-build-plan.json` 渲染，是中文优先的审查视图。它会把目标工程扫描结果、实现契约、来源语义、视觉计划、字体锁定、风险和校验提示整理成适合人工 review 的表格与摘要。

运行 `pnpm run example` 后会生成完整产物：

```text
examples/vue3-to-flutter/output/simple
examples/vue3-to-flutter/output/complex-overview
examples/vue3-to-flutter/output/complex-realized
examples/vue3-to-flutter/output/complex-risk
```

</details>

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
├── development.md
├── artifacts.md
├── integration.md
└── npm-publish.md
```

## 文档导航

- [项目背景](docs/background.md)：产品背景、协作问题和目标收益。
- [架构说明](docs/architecture.md)：架构图组、证据分层、capability、artifact 和包边界。
- [工作流](docs/workflows.md)：source-only、runtime-only、hybrid、screenshot/OCR 和 validation。
- [快速开始](docs/quickstart.md)：安装、配置、CLI、MCP 和最小示例。
- [开发命令](docs/development.md)：仓库脚本、示例命令、测试命令和生成目录规则。
- [产物说明](docs/artifacts.md)：输出文件结构、契约权威链和阅读方式。
- [集成方式](docs/integration.md)：CLI、MCP 和 core 嵌入参考。
- [npm 发布指南](docs/npm-publish.md)：发布检查清单。
