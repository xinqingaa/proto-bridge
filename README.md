# ProtoBridge

ProtoBridge 是一个“原型到实现”的上下文桥接工具。它提供两套 workflow：CLI 模式是 source-aware migration，用源码、notes、i18n 和 target 约束生成迁移说明书；MCP 模式是 UI reconstruction，用 URL/rendered HTML/screenshot/OCR/runtime metadata 生成 `PageEvidence` 并产出可见 UI 还原计划。

它不是 Vue 转 Dart 工具，也不追求一键完美迁移。核心目标是把来源页面和目标工程之间最容易丢失的上下文结构化，降低后续实现和审查成本。

## 一、核心设计

CLI 模式使用 A/B/C 模型：

```text
A = Source project，需求或原型所在项目
B = Target project，真实实现所在项目
C = ProtoBridge，读取 A 和 B 后生成实现说明书的桥接工具
```

当前默认 adapter 组合：

```text
source.adapter = vue3-prototype
target.adapter = flutter-app
```

核心原则：

- `core` 通过 workflow 编排能力，不让 CLI 与 MCP 共用同一条流程。
- Source 能力放在 `SourceAdapter` 中，例如 `vue3-prototype`。
- Capability detection、`PageEvidence` capture 和 enrichers 放在 `snapshot/*`，当前主服务 MCP；CLI 只保留基础 screenshot / DOM capture。
- Target 能力通过 `target/flutter-app` facade 暴露，例如 conventions、examples、planning 和 validation。
- 新增 React、Figma、Android、iOS 或其他目标端时，应新增 adapter，并保持 core 编排层稳定。
- CLI 和 MCP 都是入口层，但分别只调用自己的 workflow，不复制 analyzer、planner 或 generator 逻辑。

## 二、适用场景

ProtoBridge 适合以下任务：

- 原型项目和目标 App 分属不同仓库，需要把需求、页面事实和目标工程规范连接起来。
- Source 页面已经能表达产品意图，但不能直接照搬到 target 技术栈。
- Target App 已有模块、路由、主题、组件、资源和状态管理规范，需要让迁移说明书遵守这些约束。
- 迁移任务需要交给人工、Cursor、Claude Code、Codex CLI 或其他 AI coding 工具继续实现。
- 页面实现前需要明确风险、人工确认项、路由参数、i18n、资源和 token 对应关系。

CLI source-aware migration 默认组合下，ProtoBridge 会：

- 从 Vue3 原型页面提取页面结构、交互、状态、路由、notes、i18n 和资源线索。
- 读取 Flutter App 中已有模块、路由、翻译、资源目录、公共组件和相似页面。
- 将来源页面事实整理成 Flutter-facing 的实现规划。
- 生成 `migration-context.json` 与 `migration-spec.md`。

MCP UI reconstruction 会：

- 通过 URL capture 保存 `screenshot.png` 和 `page-evidence.json`。
- 读取 YouFi Flutter target conventions、相似页面、主题、路由、i18n 和资源线索。
- 生成面向 AI coding agent 的 `ui-implementation-plan.json`。
- 可选导出 `ocr-result.json` 与 `ui-review.md`。

ProtoBridge 不负责：

- 直接生成完整 Dart 页面代码。
- 在 CLI 中把 Vue 页面确定性翻译成 Dart 业务代码。
- 直接提交业务代码到目标 App。
- 在 CLI 模式里用 OCR 作为主要输入。
- 在 MCP 模式中暴露 CLI source-aware migration 工具入口。
- 处理复杂 Figma 高保真还原。
- 把 A/B 项目的开发规范复制存放在 C 项目中；规范应从 A/B 自身仓库读取。

## 三、MCP 模式：UI Reconstruction

团队日常使用的目标体验不是“先手动生成 md，再复制给 AI 工具”，而是类似 Figma MCP 的 evidence-first 工作流：

```text
用户在 AI coding 工具中输入 URL
  -> ProtoBridge MCP capture 页面并生成 page-evidence.json / screenshot.png
  -> ProtoBridge MCP 生成 ui-implementation-plan.json
  -> AI agent 读取 target 工程、相似 Flutter 页面和实现约束
  -> AI agent 在 target repo 中生成 Dart 页面
  -> ProtoBridge MCP 提供结果校验和证据追踪
```

因此，CLI 模式的职责是生成 `migration-context.json` 和 `migration-spec.md`，用于调试、审查、归档和 source-aware migration 场景。MCP 模式的职责是 UI reconstruction，不暴露 `generate_migration_spec`、`get_migration_brief`、`read_migration_artifact` 这类 CLI 模式工具。自动化落地 Dart 代码应由具备代码检索、编辑、验证和自我修正能力的 AI agent 完成。

两种 workflow 的配置、产物和使用场景详见 [ProtoBridge Workflows](docs/workflows.md)。

如果你想系统理解 MCP 是如何从 URL / screenshot / OCR 走到 `page-evidence.json`、`ui-implementation-plan.json`，以及 node、字体、颜色、布局、组件映射和 AI agent 生成 Dart 的完整链路，请直接看 [MCP UI Reconstruction 工作流](docs/mcp-ui-reconstruction-workflow.md)。

## 四、当前能力

当前实现包含以下能力：

- **Source 分析**：通过 route、URL 或 Vue 文件定位原型页面，读取页面配置、源码、notes、i18n 和页面元信息。
- **Source 规范读取**：读取 source 仓库中的页面配置、notes、i18n、README/docs 线索和页面内显式说明，用于理解需求意图与原型约束。
- **SFC 语义分析**：提取 sections、semantic components、interactions、state、routes、lifecycle、layout、assets 和 style token usage。
- **Runtime Capture**：可选使用 Playwright 获取 screenshot、DOM tree、bounding box 和 computed style。
- **Token 映射**：从 CSS var、mixin 和运行时样式中提取 token，并映射到 Flutter theme 写法。
- **Target 分析**：扫描 Flutter 模块、routes、translations、assets、common widgets 和相似文件。
- **Target 规范约束**：把 target 仓库中已经存在的目录结构、命名习惯、路由文件、翻译体系、资源目录、公共组件和相似页面作为 spec 约束来源。
- **Implementation Planning**：生成 Flutter 文件树、Widget 组合、输入数据/交互回调、状态管理与数据边界建议和人工确认项。
- **Spec 生成**：输出 `migration-context.json` 与 `migration-spec.md`。
- **UI Reconstruction**：MCP 从 URL 捕获 `screenshot.png`、`page-evidence.json`，再结合 YouFi target conventions 生成 `ui-implementation-plan.json`。

端到端流转：

```text
CLI input
  -> 解析 source/target adapter config
  -> SourceAdapter 读取 source 页面事实和 source 侧说明
  -> Capture 补充运行时布局信息
  -> TargetAdapter 读取 target 工程结构和实现约束
  -> TargetAdapter 映射 token 并生成 implementation plan
  -> source-aware workflow 输出 context 与说明书
```

```text
MCP input
  -> URL capture / rendered DOM / screenshot / OCR / runtime metadata
  -> UI reconstruction workflow 输出 screenshot.png 与 page-evidence.json
  -> target/flutter-app 读取 YouFi conventions/examples
  -> UI reconstruction workflow 输出 ui-implementation-plan.json
```

`migration-spec.md` 的生成会同时受三类信息约束：

- **Source facts**：页面要表达什么，包括结构、交互、状态、路由、文案和资源线索。
- **Target conventions**：目标 App 应该怎么写，包括模块、路由、组件、主题、资源、i18n 和相似实现。
- **ProtoBridge rules**：说明书应该如何表达，包括 target-facing、禁止直译、保留人工确认项、不伪造确定结论。

## 五、工程结构

```text
proto-bridge/
├── README.md
├── AGENT.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── docs/
│   ├── architecture.md
│   ├── workflows.md
│   ├── integration.md
│   ├── migration-spec.md
│   └── npm-publish.md
├── examples/
│   └── stock-trade/
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── adapters/
│   │       │   ├── registry.ts
│   │       │   ├── types.ts
│   │       ├── artifacts/
│   │       ├── shared/
│   │       │   ├── evidence/
│   │       │   └── protocols/
│   │       ├── source/
│   │       │   └── vue3-prototype/
│   │       ├── snapshot/
│   │       │   ├── browser-capture/
│   │       │   ├── capabilities/
│   │       │   └── enrichers/
│   │       ├── target/
│   │       │   └── flutter-app/
│   │       │       ├── planning/
│   │       │       └── validation/
│   │       ├── workflows/
│   │       │   ├── source-aware-migration/
│   │       │   └── ui-reconstruction/
│   │       ├── types/
│   │       └── index.ts
│   ├── cli/
│   │   └── src/
│   └── mcp-server/
│       └── src/
└── output/
```

职责划分：

- `packages/core`：核心能力，包含 workflow、adapter protocol、source、snapshot、target、artifacts、shared 和通用类型。
- `packages/cli`：source-aware migration 命令行入口，读取配置、解析参数、调用 `workflows/source-aware-migration`。
- `packages/mcp-server`：snapshot UI reconstruction MCP 入口，只暴露 MCP 模式工具和必要 target helper。
- `docs`：架构、集成方式和迁移说明书质量标准。
- `examples`：示例配置和可复现调用入口。

## 六、安装与运行

团队使用者不需要 clone 本仓库，也不需要安装 pnpm；通过 npm 自带的 npx 运行 CLI：

```bash
npx @proto-bridge/cli --help
npx @proto-bridge/cli init
npx @proto-bridge/cli generate
```

仓库开发者仍使用 pnpm workspace：

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm run generate -- --help
```

`pnpm run generate` 只是本仓库开发便利脚本；npm 发布后的用户入口是 `npx @proto-bridge/cli ...`。

## 七、配置

项目根目录需要本地配置文件：

```text
proto-bridge.config.json
```

可以通过 init 生成：

```bash
npx @proto-bridge/cli init
```

配置示例：

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

字段说明：

- `source.adapter`：Source adapter ID，当前支持 `vue3-prototype`。
- `source.root`：Source project 根目录。
- `target.adapter`：Target adapter ID，当前支持 `flutter-app`。
- `target.root`：Target project 根目录。
- `route`：可选，默认页面 route。
- `vue`：可选，默认 Vue 文件路径。
- `url`：可选，默认原型页面 URL。
- `prototypeUrl`：可选，Playwright capture 使用的运行时 URL。
- `outputRoot`：输出根目录，默认页面输出为 `outputRoot/<页面名>-<时间戳hash>`，避免同路由重复运行时覆盖旧结果。
- `capture`：是否默认执行截图和 DOM 提取。

## 八、使用方式

### 1. 使用完整 URL

推荐直接传浏览器里的原型 URL，CLI 会从 hash 或 pathname 中提取 route：

```bash
npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/fund-profile?anchor=overview&is_mobile=1"
```

### 2. 使用 route

```bash
npx @proto-bridge/cli generate \
  --route /prototype/trade
```

### 3. 使用 Vue 文件

```bash
npx @proto-bridge/cli generate \
  --vue prototype/src/views/prototype/stock/StockTradePage.vue
```

### 4. 开启运行时截图和 DOM 提取

先确保原型 dev server 正在运行，再执行：

```bash
npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/trade" \
  --prototype-url "http://localhost:5173/#/prototype/trade" \
  --capture
```

开启 capture 后会额外输出：

```text
output/stock-trade/
├── screenshot.png
└── dom-snapshot.json
```

## 九、CLI 参数

| 参数 | 是否必填 | 说明 |
| --- | --- | --- |
| `--config` | 否 | 配置文件路径，默认读取执行目录下的 `proto-bridge.config.json` |
| `--url` | 三选一 | 完整原型 URL，CLI 会自动提取 route |
| `--route` | 三选一 | 原型或设计稿路由，例如 `/prototype/trade` |
| `--vue` | 三选一 | Vue 文件路径，可为绝对路径或相对 `source.root` |
| `--prototype-url` | 否 | 运行中的原型页面 URL，用于 Playwright capture |
| `--source-adapter` | 否 | Source adapter，默认 `vue3-prototype` |
| `--target-adapter` | 否 | Target adapter，默认 `flutter-app` |
| `--output` | 否 | 覆盖本次生成的完整输出目录，相对路径按调用命令时的目录解析 |
| `--capture` | 否 | 执行截图和 DOM 提取 |

`--url`、`--route`、`--vue` 三选一；如果在交互式终端中都不提供，CLI 会进入问答式流程。未传 `--output` 时，输出目录为 `outputRoot/<页面名>-<时间戳hash>`。

## 十、输出文件

### migration-context.json

机器可读的结构化上下文，包含：

- `source`：页面路由、screenId、页面配置、notes、i18n、源码和 source facts。
- `source.sfc`：sections、interactions、state、routes、lifecycle、layout、assets、styleTokens 等调试证据。
- `capture`：可选截图、DOM tree、viewport、computed style。
- `tokenMap`：颜色 token、字体 token 和未命中项。
- `target`：Flutter 模块、routes、translations、assets、common widgets 和相似文件。
- `recommendations`：实现形态、Widget 拆分、实现规划、风险和人工确认项。

### migration-spec.md

给 Flutter 开发者和 AI coding 工具使用的迁移说明书。它保持 target-facing，不直接暴露 Vue 模板语法或 DOM/class 证据。

主要包含：

- 页面元信息和迁移结论。
- Flutter 实现规划。
- 目标文件树和 Widget 组合建议。
- 状态、交互、生命周期副作用。
- 路由和参数建议。
- 布局模型。
- CSS 样式到 Flutter 主题映射、i18n 和资源迁移建议。
- 可复用 Flutter 组件。
- 人工确认项。
- AI 实现提示词。

## 十一、实现原理

ProtoBridge 的实现原理不是“把 source 代码翻译成 target 代码”。CLI 模式先把 source 和 target 都转成结构化事实，再生成 target-facing 说明书；MCP 模式先把运行时页面转成 `PageEvidence`，再生成符合 YouFi 工程习惯的 UI 还原计划。

CLI source-aware migration 分为五层：

1. **入口层**：CLI 读取配置和页面输入，不做业务分析。
2. **Source 层**：SourceAdapter 读取 source 页面事实、source 侧说明和原型约束。
3. **Target 层**：TargetAdapter 读取 target 工程结构、组件、资源、路由、翻译和相似实现。
4. **Planning 层**：根据 source facts 和 target conventions 生成实现形态、文件拆分、Widget 树、状态策略和人工确认项。
5. **Spec 层**：把 planning payload 渲染成 target-facing Markdown，并把调试证据保留在 JSON context 中。

MCP UI reconstruction 分为四层：

1. **入口层**：MCP tool 读取 URL、viewport、输出目录和 target root。
2. **Evidence 层**：`snapshot/browser-capture`、`snapshot/capabilities` 和 `snapshot/enrichers` 共同构建 `PageEvidence`。
3. **Target 层**：`target/flutter-app` 读取 YouFi conventions、examples、theme、routes、i18n、assets，并执行 UI reconstruction planning。
4. **Artifact 层**：UI reconstruction workflow 写出 `screenshot.png`、`page-evidence.json`、`ui-implementation-plan.json`，可选写出 `ocr-result.json` 和 `ui-review.md`。

MCP 四层的端到端细节、输入边界和代码索引见 [MCP UI Reconstruction 工作流](docs/mcp-ui-reconstruction-workflow.md)。

### 1. SourceAdapter：vue3-prototype

入口：`packages/core/src/source/vue3-prototype/prototype-page.ts`

职责：

- 读取 `prototype/src/config/prototypeScreens.js`。
- 读取 `prototype/src/config/designScreens.js`。
- 通过 route 或 Vue 文件匹配页面配置。
- 解析页面源码、notes、i18n、changelog、status、owner 等元信息。
- 调用 SFC 语义分析器生成 source facts。

### 2. SFC 语义分析

入口：`packages/core/src/source/vue3-prototype/vue-sfc.ts`

提取内容：

- `sections`：页面结构区块。
- `components`：语义组件角色，例如 header、tabs、summary、list、chart、bottom-actions。
- `interactions`：click、model、conditional、loop、computed、watch 等交互线索。
- `state`：ref、reactive、computed、constant、function 等状态与数据线索。
- `routes`：navigate、back、read-query 等路由行为。
- `lifecycle`：onMounted、onBeforeUnmount、watch、event-listener。
- `layout`：fixed、sticky、scroll、safe-area、z-index、absolute、flex、grid、spacing。
- `assets`：image、svg、icon、background、inline-svg。
- `styleTokens`：CSS var、mixin、硬编码 fallback。

### 3. Notes 查找规则

Source adapter 按以下顺序查找 notes：

1. 页面配置中的显式 `notes` 或 `notesPath`。
2. `prototype/notes/<module>/<ComponentName>.md`。
3. 按 Vue 文件所在模块推断 notes 路径。

notes 用于补充业务意图、状态说明、接口线索、确认项和验收标准。

### 4. i18n 查找规则

Source adapter 根据 `screenId` 查找：

```text
prototype/src/i18n/prototype/<screenId>.json
```

输出说明书会把 i18n key、中文、繁体、英文和 Flutter `.tr` 使用建议整理成表格。

### 5. TargetAdapter：flutter-app

入口：`packages/core/src/target/flutter-app/context.ts`

职责：

- 扫描 `lib/app/modules/**`，识别可落地模块。
- 查找 `lib/app/routes/app_routes.dart` 和 `lib/app/routes/app_pages.dart`。
- 查找 `lib/app/translations/*.dart`。
- 查找 `assets/images`、`assets/dark_images`、`assets/svg`、`assets/json`。
- 扫描 common widget、pop、image、empty、loading 等可复用组件。
- 根据 source module、screenId、route 推荐 Flutter 模块。
- 在目标模块中查找相似文件，作为实现参考。

### 6. Token 映射

入口：`packages/core/src/target/flutter-app/theme-mapping.ts`

当前内置 Flutter token 映射包括：

- CSS color var -> `themeService.colors.*`。
- Typography mixin -> `themeService.textStyles.*`。
- Runtime computed style -> unresolved token fallback。

未命中 token 会进入 `tokenMap.unresolved`，并在说明书里作为人工确认项。

### 7. Flutter 实现规划

入口：`packages/core/src/target/flutter-app/planning/migration-planner.ts`

规划流程：

```text
source facts + target context
  -> PagePatternClassifier
  -> WidgetBlueprintRegistry
  -> NamingStrategy
  -> FlutterImplementationPlan
```

规划结果包括：

- `complexity`：simple / moderate / complex，Markdown 中渲染为简单 / 中等 / 复杂。
- `fileTree`：目标文件拆分。
- `widgetTree`：Widget 组合。
- `stateStrategy`：状态管理组合建议。
- `controllerBoundaries`：Controller、Adapter、Repository、Widget 的边界。
- `widgetContracts`：Widget 输入数据、交互回调和是否可读 Controller。
- `doNotTranslate`：禁止直译项。
- `checklist`：P0/P1/P2 人工确认项。

### 8. Spec 生成

入口：`packages/core/src/target/flutter-app/planning/render-migration-markdown.ts`

生成原则：

- `migration-context.json` 保留 source facts 和调试证据。
- `migration-spec.md` 面向 Flutter 实现者，只输出实现计划和必要确认项。
- 不把 Vue 模板结构逐层翻译成 Flutter Widget。
- 不把 mock 数据直接写入 Widget build。
- 不让每个子 Widget 直接依赖整个 Controller。

### 9. UI Reconstruction

入口：

- `packages/core/src/workflows/ui-reconstruction/capture-page-evidence.ts`
- `packages/core/src/workflows/ui-reconstruction/build-ui-implementation-plan.ts`
- `packages/core/src/target/flutter-app/planning/ui-reconstruction-planner.ts`

生成原则：

- `screenshot.png` 是主证据，不是调试附属文件。
- `page-evidence.json` 作为稳定中间模型，保留 rendered DOM、视觉区块、文案、样式、资源、交互线索和 capability-based metadata。
- `ui-implementation-plan.json` 面向 AI agent，聚焦可见 UI、文件落点、Widget 拆分、YouFi 组件/主题/i18n/assets 约束。
- 业务接口、权限、风控、埋点和隐藏状态只进入 TODO、risks 或 manual confirmations。

## 十二、验证结果

当前已用 `/prototype/trade` 做过生成验证，关键结果：

- `screenId = stock.trade`
- `target.platform = flutter`
- `target.suggestedModule = order`
- `recommendations.implementationPlan.complexity = complex`
- `migration-spec.md` 可生成页面元信息、Flutter 实现规划、Widget 拆分、状态与交互、路由参数、布局模型、Token 映射、i18n、资源迁移和人工确认项。

## 十三、开发约定

- CLI 模式能力优先放在 `workflows/source-aware-migration`、`source/**` 或 `target/**`。
- MCP 模式能力优先放在 `workflows/ui-reconstruction` 或 `snapshot/**`。
- YouFi / Flutter target 能力优先放在 `target/flutter-app`，必要时再下沉到 adapter 内部实现。
- CLI/MCP 只做入口封装，并分别只调用自己的 workflow。
- 扩展 source 技术栈时实现 `SourceAdapter`。
- 扩展 target 技术栈时实现 `TargetAdapter`。
- 文档应描述当前架构和当前行为，不写历史迁移叙事。
- 输出结果必须可人工审查和修改，不把不确定信息伪装成确定结论。

## 十四、常见问题

### 为什么不直接生成 Dart？

因为 deterministic CLI 缺少 AI agent 的代码检索、取舍、编辑、验证和自我修正能力。把 Vue 确定性翻译成 Dart 会迫使 ProtoBridge 在 CLI 内硬编码大量 Flutter 业务规范，长期不可维护。

自动化落地方式不是让 CLI 直接写 Dart，而是通过 MCP 把 `screenshot.png`、`page-evidence.json`、`ui-implementation-plan.json`、target 相似实现和工程约束提供给 AI coding agent，由 agent 在目标仓库中完成 Dart 实现。需要 source-aware 说明书时使用 CLI 模式。

### 为什么默认跳过 capture？

截图和 DOM 提取依赖原型 dev server、浏览器环境和页面运行状态。静态 source/target 上下文更稳定，capture 适合作为布局校对增强输入。

### warnings 是错误吗？

不是。warnings 表示需要人工确认或可进一步补充的信息，例如跳过 capture、某些 token 未命中语义映射、notes 缺失等。

### 相对 `--output` 路径按哪里解析？

相对 `--output` 按调用命令时的目录解析，而不是按 `packages/cli` 目录解析。

### `pnpm run typecheck` 和 `pnpm run build` 是必须的吗？

只有开发 ProtoBridge 本仓库时需要。团队使用 npm 包时直接运行 `npx @proto-bridge/cli generate`，不需要 pnpm。
