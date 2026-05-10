# ProtoBridge

ProtoBridge 是一个“原型到实现”的上下文桥接工具。它不直接把 Vue 代码翻译成 Dart，也不追求一键完美迁移；它的目标是把页面事实、视觉证据、target 工程约束和人工确认项整理成稳定、可追溯、可交给人工或 AI coding agent 继续落地的上下文包。

当前项目同时保留两套并列的一等工作模式：

```text
CLI = Source-aware Migration
MCP = UI Reconstruction
```

它们不是同一条流程的不同参数，而是两条不同入口、不同输入模型、不同产物、不同适用场景的 workflow。

## 一、架构设计与核心思路

ProtoBridge 的核心思路可以先用 A/B/C 模型理解：

```text
A = Source project，需求或原型所在项目
B = Target project，真实实现所在项目
C = ProtoBridge，读取 A 和 B 后生成实现上下文的桥接工具
```

默认 adapter 组合：

```text
source.adapter = vue3-prototype
target.adapter = flutter-app
```

整体设计原则：

- `core` 只负责 workflow 编排和共享能力沉淀，不把 CLI 与 MCP 写成同一条流程。
- CLI 和 MCP 都是入口层，但分别只调用自己的 workflow。
- source 技术栈能力放在 `source/*`，例如 `source/vue3-prototype`。
- 页面截图、rendered DOM、capability detection、OCR 和 evidence enrichers 放在 `snapshot/*`。
- target 工程能力放在 `target/*`，例如 `target/flutter-app` 的 conventions、examples、planning、validation。
- `artifacts` 只负责写出 JSON / Markdown 文件，不理解业务语义。
- `shared` 只保留真正跨 workflow 复用的小型通用能力。
- source/target 项目的业务规范不复制到 ProtoBridge 中，规范应从 source/target 自身仓库读取。

ProtoBridge 不负责：

- 直接生成完整 Dart 页面代码。
- 在 CLI 中把 Vue 页面确定性翻译成 Dart 业务代码。
- 在 MCP 中把纯截图直接反推成和 rendered DOM 同等级的 node tree。
- 在 MCP runtime 中暴露 CLI 的 source-aware migration 工具。
- 一键修改并自动提交 target 工程业务代码。

## 二、两种模式总览

| 项 | CLI 工作流 | MCP 工作流 |
| --- | --- | --- |
| 推荐命名 | Source-aware Migration | UI Reconstruction |
| 入口包 | `@proto-bridge/cli` | `@proto-bridge/mcp-server` |
| 主要目标 | 生成可审查、可归档的迁移说明书 | 快速还原可见 UI，并给 agent 提供 evidence-first 上下文 |
| 主要输入 | Vue route / URL / Vue SFC + source config | URL 为主输入，辅以 screenshot/OCR/runtime metadata |
| 是否读取 source 仓库 | 是 | 否 |
| 是否需要 `proto-bridge.config.json` | 是 | 否 |
| target root 来源 | `config.target.root` | 默认 MCP 启动目录，也可传 `targetRoot` |
| 主产物 | `migration-context.json`、`migration-spec.md` | `screenshot.png`、`page-evidence.json`、`ui-implementation-plan.json` |
| 可选产物 | `screenshot.png`、`dom-snapshot.json` | `ocr-result.json`、`ui-review.md` |
| 适合谁 | 维护者、开发者、批处理脚本、需要 source 语义的人 | AI coding agent、MCP client、只想快速还原可见 UI 的场景 |
| 代码生成职责 | 不直接写 Dart | MCP 不直接写 Dart，由 agent 实现 |

如何选择：

- 需要读取 Vue 源码、notes、i18n、页面配置和 target 约束时，用 CLI。
- 只给一个 URL，希望快速生成页面证据和 UI 实现计划时，用 MCP。
- 需要可归档、可审查的 Markdown 说明书时，用 CLI。
- 需要 evidence-first、agent 驱动的工作模式时，用 MCP。

## 三、CLI 模式：Source-aware Migration

### 1. 设计目标

CLI 的目标不是“自动写代码”，而是先把 source 语义和 target 工程约束整理成 target-facing 的实现说明，让人工或 AI coding 工具后续实现时少丢上下文。

它特别适合这些场景：

- source 和 target 分属不同仓库。
- 需要读取 Vue 源码、notes、i18n、页面配置。
- 需要在实现前明确风险、人工确认项、路由参数、资源和 token 对应关系。
- 需要生成可归档、可评审的迁移材料。

### 2. 工作模式

CLI 是 source-aware 的文档链路：

```text
页面输入
  -> 读取 source project
  -> 读取 target project
  -> 生成 migration context
  -> 渲染 migration spec
  -> 交给人工或 AI coding 工具继续实现
```

这里的核心不是“可见 UI 长什么样”，而是“这个页面在 target 工程里应该如何实现”。

### 3. 工作流

```text
CLI input
  -> 解析 source/target adapter config
  -> SourceAdapter 读取 source 页面事实和 source 侧说明
  -> optional Playwright capture 补充运行时布局证据
  -> TargetAdapter 读取 target 工程结构和实现约束
  -> TargetAdapter 映射 token 并生成 implementation plan
  -> source-aware workflow 输出 context 与说明书
```

### 4. 使用方式

发布包使用：

```bash
npx @proto-bridge/cli --help
npx @proto-bridge/cli init
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/etf-detail"
npx @proto-bridge/cli generate --route /prototype/trade
npx @proto-bridge/cli generate --vue prototype/src/views/prototype/stock/StockTradePage.vue
```

本地仓库开发：

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm run generate -- --help
```

CLI 需要配置文件：

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

- `source.root`：source 项目根目录。
- `target.root`：target 项目根目录。
- `route` / `url` / `vue`：页面输入。
- `prototypeUrl`：运行中的原型 URL，用于 Playwright capture。
- `outputRoot`：输出根目录。
- `capture`：是否默认执行截图和 DOM 提取。

### 5. 产出物

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

其中：

- `migration-context.json`：机器可读上下文，保留 source facts、capture evidence、token map、target context 和 recommendations。
- `migration-spec.md`：面向 Flutter 实现者和 AI coding 工具的 target-facing 说明书。

### 6. 当前能力

- 通过 route、URL 或 Vue 文件定位原型页面。
- 读取页面配置、源码、notes、i18n 和页面元信息。
- 从 Vue SFC 中提取 sections、semantic components、interactions、state、routes、lifecycle、layout、assets 和 style token usage。
- 扫描 Flutter modules、routes、translations、assets、common widgets 和相似文件。
- 映射 CSS var、mixin 和运行时样式到 Flutter theme 写法。
- 生成 Flutter 文件树、Widget 组合、状态管理建议和人工确认项。

CLI 不适合：

- 用户只给一个 URL，希望快速还原可见 UI。
- 不想配置 source 仓库路径。
- 期望工具直接生成完整 Dart 页面代码。

## 四、MCP 模式：UI Reconstruction

### 1. 设计目标

MCP 的目标不是先产出 Markdown，再手工复制给 AI 工具，而是直接走 evidence-first 工作模式：先 capture 页面证据，再生成 UI 实现计划，再由 agent 在 target repo 中落地代码。

它特别适合这些场景：

- 用户只给一个 URL，希望快速还原页面可见 UI。
- 不想配置 source 仓库路径。
- 希望通过 Codex、Cursor、Claude Code 等 MCP client 驱动实现。
- 需要 `PageEvidence` 和 `ui-implementation-plan.json` 作为 agent 的主要上下文。

### 2. 工作模式

MCP 是 URL-first 的 evidence-first 链路：

```text
用户 / agent 给出 URL
  -> MCP capture 页面
  -> 生成 screenshot + page evidence
  -> 生成 UI implementation plan
  -> agent 读取 target 工程并实现 Dart UI
  -> MCP 校验改动范围和显式风险
```

### 3. 工作流

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

当前真实边界：

- `capture_page_evidence` 当前只接受 `url` 作为 capture 输入。
- `ocr_screenshot` 只补充 OCR 文字证据，不会单独生成和 rendered DOM 同等级的 node tree。
- rendered HTML / DOM snapshot 直接输入是未来扩展方向，不是当前公开 MCP API。

### 4. 使用方式

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

Claude Code 项目级配置：

```bash
cd /path/to/youfi
claude mcp add proto-bridge --scope project -- \
  npx -y @proto-bridge/mcp-server
```

MCP 不需要 `proto-bridge.config.json`。推荐从 target 仓库启动，让 `process.cwd()` 成为默认 `targetRoot`。

### 5. Agent 工作模式

MCP 模式中，ProtoBridge 负责提供证据和计划，agent 负责真正的代码落地：

1. 调用 `capture_page_evidence(url)`。
2. 调用 `build_ui_implementation_plan(evidenceId)`。
3. 按需调用 `get_target_conventions()` 和 `find_target_examples(...)`。
4. 在 target repo 中实现 Dart UI。
5. 运行 analyzer/test 或至少做静态检查。
6. 调用 `validate_target_changes(planId)`。
7. 向用户汇报改动文件、验证结果和待确认项。

### 6. 产出物

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

其中：

- `screenshot.png`：视觉还原基准证据。
- `page-evidence.json`：页面结构、文案、视觉、资源、交互和 capability metadata 的稳定中间模型。
- `ui-implementation-plan.json`：agent 直接消费的 YouFi Flutter UI 实现计划。
- `ui-review.md`：人工 review 用 Markdown，不是 agent 的必经路径。

### 7. 当前能力

- 采集 URL，生成 screenshot 和 `PageEvidence`。
- 读取 target conventions、theme、routes、i18n、assets 和相似页面。
- 生成文件落点、Widget tree、component mappings、theme mappings、i18n plan、asset plan、visible interactions、risks 和 validation hints。
- 校验 target 改动范围、明显占位实现、TODO 和文件落点问题。

MCP 不适合：

- 需要从 Vue 源码、notes、i18n 中提取完整业务语义。
- 需要确定接口字段、权限、风控、埋点或复杂交易规则。
- 页面 URL 无法被 Playwright 访问。

## 五、代码目录结构与架构设计

仓库结构：

```text
proto-bridge/
├── README.md
├── AGENT.md
├── docs/
├── packages/
│   ├── core/
│   ├── cli/
│   └── mcp-server/
├── examples/
└── scripts/
```

核心源码结构：

```text
packages/core/src/
├── adapters/          # adapter 协议和 registry
├── artifacts/         # JSON / Markdown 写出
├── shared/            # 小型通用能力
├── source/            # source 技术栈实现
├── snapshot/          # capture、rendered DOM、OCR、evidence enrichers
├── target/            # target 技术栈实现
├── workflows/         # 两套 workflow 编排入口
└── types/             # 共享数据结构
```

各目录职责：

- `packages/core`：项目核心能力，沉淀 workflow、adapter protocol、source、snapshot、target、artifacts、shared 和通用类型。
- `packages/cli`：CLI 入口，只负责 source-aware migration 命令行参数、配置读取和 workflow 调用。
- `packages/mcp-server`：MCP 入口，只暴露 UI reconstruction tools、resources、prompts 和必要 target helpers。
- `source/*`：读取 source 页面事实和 source 侧说明。
- `snapshot/*`：负责 URL capture、rendered DOM 抽取、OCR 和 evidence enrichers。
- `target/*`：负责 target conventions、examples、planning 和 validation。
- `docs/`：放详细工作流、架构模式、专项说明，而不是重复承担总览入口。

## 六、设计流转

CLI 和 MCP 共享底层能力，但不共享编排。

CLI 流转：

```text
packages/cli
  -> workflows/source-aware-migration
    -> source/vue3-prototype
    -> optional snapshot/browser-capture
    -> target/flutter-app
    -> artifacts
    -> migration-context.json / migration-spec.md
```

MCP 流转：

```text
packages/mcp-server
  -> workflows/ui-reconstruction
    -> snapshot/browser-capture
    -> snapshot/capabilities
    -> snapshot/enrichers
    -> snapshot/ocr
    -> target/flutter-app conventions / examples / planning / validation
    -> artifacts
    -> screenshot.png / page-evidence.json / ui-implementation-plan.json
```

这也是为什么项目要分成 `source / snapshot / target / workflows`：

- `source` 负责回答“source 页面要表达什么”。
- `snapshot` 负责回答“页面可见 UI 是什么”。
- `target` 负责回答“目标工程应该怎么实现”。
- `workflows` 负责把这些能力按照不同模式编排起来。

## 七、深入文档

如果你已经理解整体设计，想继续看细节，请按下面顺序阅读：

1. [ProtoBridge Workflows](docs/workflows.md)
内容：两种 workflow 的详细对照、使用方式、产物和适用场景。

2. [ProtoBridge 架构与数据模型](docs/architecture.md)
内容：模块边界、数据模型、目录职责和扩展点。

3. [MCP UI Reconstruction 工作流](docs/mcp-ui-reconstruction-workflow.md)
内容：MCP 从 URL / screenshot / OCR 走到 `page-evidence.json` 和 `ui-implementation-plan.json` 的完整链路。

4. [迁移说明书模板与质量标准](docs/migration-spec.md)
内容：CLI 输出的 `migration-spec.md` 应该达到什么质量。

5. [集成与工具入口](docs/integration.md)
内容：CLI / MCP / core 的集成方式和工具入口。

6. [npm 发布指南](docs/npm-publish.md)
内容：npm 包如何首次发布、更新发布，以及更新时要改哪些内容。

## 八、常见问题

### 为什么不直接生成 Dart？

因为 ProtoBridge 的职责是提供上下文和证据，不是把所有实现决策硬编码进生成器。真正的代码落地需要 agent 或开发者结合 target 工程上下文做检索、取舍、编辑、验证和修正。

### 为什么 CLI 和 MCP 不做成同一条流程？

因为两者的输入模型、使用场景和产物完全不同。CLI 关注 source-aware 的说明书链路，MCP 关注 evidence-first 的 UI reconstruction 链路；把它们揉成一条流程会让边界变乱。

### `pnpm run typecheck` 和 `pnpm run build` 是必须的吗？

只有开发 ProtoBridge 本仓库时需要。团队使用 npm 包时直接运行 `npx @proto-bridge/cli ...` 或 `npx -y @proto-bridge/mcp-server` 即可。
