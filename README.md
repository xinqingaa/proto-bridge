# ProtoBridge

ProtoBridge 是一个“原型到实现”的上下文桥接工具。它读取 A 项目的原型、需求和页面事实，读取 B 项目的工程结构、组件、资源和实现约束，再生成可交给人工与 AI coding 工具继续实现的迁移上下文与说明书。

它不是 Vue 转 Dart 工具，也不追求一键完美迁移。核心目标是把来源页面和目标工程之间最容易丢失的上下文结构化，降低后续实现和审查成本。

## 一、核心设计

ProtoBridge 使用 A/B/C 模型：

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

- `core` 只负责编排，不直接写死具体技术栈流程。
- Source 能力放在 `SourceAdapter` 中，例如 `vue3-prototype`。
- Target 能力放在 `TargetAdapter` 中，例如 `flutter-app`。
- 新增 React、Figma、Android、iOS 或其他目标端时，应新增 adapter，并保持 core 编排层稳定。
- CLI 和 MCP 都是入口层，只调用 core，不复制 analyzer、planner 或 generator 逻辑。

## 二、适用场景

ProtoBridge 适合以下任务：

- 从 Vue3 原型页面提取页面结构、交互、状态、路由、notes、i18n 和资源线索。
- 读取 Flutter App 中已有模块、路由、翻译、资源目录、公共组件和相似页面。
- 将来源页面事实整理成 Flutter-facing 的实现规划。
- 生成 `migration-context.json` 与 `migration-spec.md`，供开发者、Cursor、Claude Code、Codex CLI 等工具使用。

ProtoBridge 不负责：

- 直接生成完整 Dart 页面代码。
- 直接提交业务代码到目标 App。
- 用 OCR 作为主要输入。
- 处理复杂 Figma 高保真还原。
- 把 A/B 项目的开发规范复制存放在 C 项目中；规范应从 A/B 自身仓库读取。

## 三、当前能力

当前实现包含以下能力：

- **Source 分析**：通过 route、URL 或 Vue 文件定位原型页面，读取页面配置、源码、notes、i18n 和页面元信息。
- **SFC 语义分析**：提取 sections、semantic components、interactions、state、routes、lifecycle、layout、assets 和 style token usage。
- **Runtime Capture**：可选使用 Playwright 获取 screenshot、DOM tree、bounding box 和 computed style。
- **Token 映射**：从 CSS var、mixin 和运行时样式中提取 token，并映射到 Flutter theme 写法。
- **Target 分析**：扫描 Flutter 模块、routes、translations、assets、common widgets 和相似文件。
- **Implementation Planning**：生成 Flutter 文件拆分、Widget 树、Widget 输入契约、状态管理建议、Controller/Adapter 边界和人工确认项。
- **Spec 生成**：输出 `migration-context.json` 与 `migration-spec.md`。

## 四、工程结构

```text
proto-bridge/
├── README.md
├── AGENT.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── docs/
│   ├── architecture.md
│   ├── migration-spec.md
│   └── integration.md
├── examples/
│   └── stock-trade/
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── adapters/
│   │       │   ├── registry.ts
│   │       │   ├── types.ts
│   │       │   ├── source/
│   │       │   │   └── vue3-prototype/
│   │       │   └── target/
│   │       │       └── flutter-app/
│   │       ├── capture/
│   │       ├── generators/
│   │       ├── planners/
│   │       ├── types/
│   │       └── utils/
│   ├── cli/
│   │   └── src/
│   └── mcp-server/
│       └── src/
└── output/
```

职责划分：

- `packages/core`：核心能力，包含 adapter registry、source/target adapter、capture、planner、generator 和通用类型。
- `packages/cli`：命令行入口，读取配置、解析参数、调用 core。
- `packages/mcp-server`：MCP 入口包，只暴露 core 能力，不放业务逻辑。
- `docs`：架构、集成方式和迁移说明书质量标准。
- `examples`：示例配置和可复现调用入口。

## 五、安装

项目使用 pnpm workspace。

```bash
npm i -g pnpm
pnpm install
```

常用命令：

```bash
pnpm run typecheck
pnpm run build
pnpm run generate -- --help
```

日常生成迁移说明书时，可以直接使用 `pnpm run generate`。该命令会先构建 core 和 cli，再执行生成流程。

## 六、配置

项目根目录需要本地配置文件：

```text
proto-bridge.config.json
```

可以从模板复制：

```bash
cp proto-bridge.config.example.json proto-bridge.config.json
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
  "outDir": "./output",
  "noCapture": true
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
- `outDir`：默认输出目录。
- `noCapture`：是否跳过截图和 DOM 提取。

## 七、使用方式

### 1. 使用完整 URL

推荐直接传浏览器里的原型 URL，CLI 会从 hash 或 pathname 中提取 route：

```bash
pnpm run generate -- \
  --url "http://localhost:5173/#/prototype/fund-profile?anchor=overview&is_mobile=1" \
  --out ./output/fund-profile
```

### 2. 使用 route

```bash
pnpm run generate -- \
  --route /prototype/trade \
  --out ./output/stock-trade \
  --no-capture
```

### 3. 使用 Vue 文件

```bash
pnpm run generate -- \
  --vue prototype/src/views/prototype/stock/StockTradePage.vue \
  --out ./output/stock-trade \
  --no-capture
```

### 4. 开启运行时截图和 DOM 提取

先确保原型 dev server 正在运行，再执行：

```bash
pnpm run generate -- \
  --url "http://localhost:5173/#/prototype/trade" \
  --prototype-url "http://localhost:5173/#/prototype/trade" \
  --out ./output/stock-trade \
  --capture
```

开启 capture 后会额外输出：

```text
output/stock-trade/
├── screenshot.png
└── dom-snapshot.json
```

## 八、CLI 参数

| 参数 | 是否必填 | 说明 |
| --- | --- | --- |
| `--config` | 否 | 配置文件路径，默认读取执行目录下的 `proto-bridge.config.json` |
| `--url` | 三选一 | 完整原型 URL，CLI 会自动提取 route |
| `--route` | 三选一 | 原型或设计稿路由，例如 `/prototype/trade` |
| `--vue` | 三选一 | Vue 文件路径，可为绝对路径或相对 `source.root` |
| `--prototype-url` | 否 | 运行中的原型页面 URL，用于 Playwright capture |
| `--source-adapter` | 否 | Source adapter，默认 `vue3-prototype` |
| `--target-adapter` | 否 | Target adapter，默认 `flutter-app` |
| `--out` | 否 | 输出目录，相对路径按调用命令时的目录解析 |
| `--no-capture` | 否 | 跳过截图和 DOM 提取 |
| `--capture` | 否 | 覆盖配置中的 `noCapture: true`，执行截图和 DOM 提取 |

`--url`、`--route`、`--vue` 三选一。CLI 参数优先级高于 `proto-bridge.config.json` 中的页面输入和输出目录。

## 九、输出文件

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
- 页面结构拆分和 Widget 拆分建议。
- 状态、交互、生命周期副作用。
- 路由和参数建议。
- 布局模型。
- Token、i18n 和资源迁移建议。
- 可复用 Flutter 组件。
- 人工确认项。
- AI 实现提示词。

## 十、实现原理

### 1. SourceAdapter：vue3-prototype

入口：`packages/core/src/adapters/source/vue3-prototype/prototype-page.ts`

职责：

- 读取 `prototype/src/config/prototypeScreens.js`。
- 读取 `prototype/src/config/designScreens.js`。
- 通过 route 或 Vue 文件匹配页面配置。
- 解析页面源码、notes、i18n、changelog、status、owner 等元信息。
- 调用 SFC 语义分析器生成 source facts。

### 2. SFC 语义分析

入口：`packages/core/src/adapters/source/vue3-prototype/vue-sfc.ts`

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

入口：`packages/core/src/adapters/target/flutter-app/flutter-context.ts`

职责：

- 扫描 `lib/app/modules/**`，识别可落地模块。
- 查找 `lib/app/routes/app_routes.dart` 和 `lib/app/routes/app_pages.dart`。
- 查找 `lib/app/translations/*.dart`。
- 查找 `assets/images`、`assets/dark_images`、`assets/svg`、`assets/json`。
- 扫描 common widget、pop、image、empty、loading 等可复用组件。
- 根据 source module、screenId、route 推荐 Flutter 模块。
- 在目标模块中查找相似文件，作为实现参考。

### 6. Token 映射

入口：`packages/core/src/adapters/target/flutter-app/token-mapper.ts`

当前内置 Flutter token 映射包括：

- CSS color var -> `themeService.colors.*`。
- Typography mixin -> `themeService.textStyles.*`。
- Runtime computed style -> unresolved token fallback。

未命中 token 会进入 `tokenMap.unresolved`，并在说明书里作为人工确认项。

### 7. Flutter 实现规划

入口：`packages/core/src/adapters/target/flutter-app/flutter-implementation-plan.ts`

规划流程：

```text
source facts + target context
  -> PagePatternClassifier
  -> WidgetBlueprintRegistry
  -> NamingStrategy
  -> FlutterImplementationPlan
```

规划结果包括：

- `complexity`：simple / moderate / complex。
- `fileTree`：目标文件拆分。
- `widgetTree`：Widget 组合树。
- `stateStrategy`：状态管理组合建议。
- `controllerBoundaries`：Controller、Adapter、Repository、Widget 的边界。
- `widgetContracts`：Widget 输入、回调和是否可读 Controller。
- `doNotTranslate`：禁止直译项。
- `checklist`：P0/P1/P2 人工确认项。

### 8. Spec 生成

入口：`packages/core/src/generators/migration-spec.ts`

生成原则：

- `migration-context.json` 保留 source facts 和调试证据。
- `migration-spec.md` 面向 Flutter 实现者，只输出实现计划和必要确认项。
- 不把 Vue 模板结构逐层翻译成 Flutter Widget。
- 不把 mock 数据直接写入 Widget build。
- 不让每个子 Widget 直接依赖整个 Controller。

## 十一、验证结果

当前已用 `/prototype/trade` 做过生成验证，关键结果：

- `screenId = stock.trade`
- `target.platform = flutter`
- `target.suggestedModule = order`
- `recommendations.implementationPlan.complexity = complex`
- `migration-spec.md` 可生成页面元信息、Flutter 实现规划、Widget 拆分、状态与交互、路由参数、布局模型、Token 映射、i18n、资源迁移和人工确认项。

## 十二、开发约定

- 新能力优先放在 `packages/core/src/adapters/**` 或 core 通用模块中。
- 具体技术栈实现只放在 `packages/core/src/adapters/**`。
- CLI/MCP 只做入口封装，不写复杂业务逻辑。
- 新 source 技术栈实现 `SourceAdapter`。
- 新 target 技术栈实现 `TargetAdapter`。
- 文档应描述当前架构和当前行为，不写历史迁移叙事。
- 输出结果必须可人工审查和修改，不把不确定信息伪装成确定结论。

## 十三、常见问题

### 为什么不直接生成 Dart？

因为当前最有价值的是稳定迁移上下文和实现说明书。直接生成完整页面容易把原型临时状态、mock 数据和 CSS 结构误当成目标端架构。

### 为什么默认跳过 capture？

截图和 DOM 提取依赖原型 dev server、浏览器环境和页面运行状态。静态 source/target 上下文更稳定，capture 适合作为布局校对增强输入。

### warnings 是错误吗？

不是。warnings 表示需要人工确认或可进一步补充的信息，例如跳过 capture、某些 token 未命中语义映射、notes 缺失等。

### 相对 `--out` 路径按哪里解析？

相对 `--out` 按调用命令时的目录解析，而不是按 `packages/cli` 目录解析。

### `pnpm run typecheck` 和 `pnpm run build` 是必须的吗？

修改代码后建议运行。日常生成说明书可以直接使用 `pnpm run generate`，脚本会自动构建 core 和 cli。
