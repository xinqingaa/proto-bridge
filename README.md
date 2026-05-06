# ProtoBridge

ProtoBridge 是一个“原型到实现”的上下文桥接工具。

它的目标不是把 Vue 原型直接翻译成 Dart，也不是追求一键迁移。第一版的核心价值是：从 TradeAppPrd 的 Vue 原型页面中提取足够可靠的页面上下文，再结合 YouFi Flutter App 的真实工程结构，生成一份可以给人和 AI 工具共同使用的迁移说明书。

当前第一版服务于：

- 输入：`TradeAppPrd` 的 Vue 原型页面或原型路由。
- 目标端：`YouFi Flutter App`。
- 输出：`migration-context.json` 和 `migration-spec.md`。

## 一、适用场景

适合使用 ProtoBridge 的情况：

- 已经有 TradeAppPrd 原型页面，需要迁移到 YouFi Flutter App。
- 希望 AI 实现 Flutter 页面前，先获得结构化上下文。
- 需要把原型 notes、i18n、样式 token、路由、目标模块、可复用组件整理成一份统一文档。
- 希望迁移过程可审查、可补充、可逐步增强，而不是直接让 AI 猜页面。

暂不适合的情况：

- 直接生成完整 Dart 页面代码。
- 不看目标 Flutter 工程上下文的通用 Vue-to-Flutter 转换。
- 用 OCR 作为主要输入。
- 完整还原复杂 Figma 设计稿。
- 自动启动原型 dev server 并托管整个迁移流水线。

## 二、当前能力

当前闭环已经从“读取原型并生成基础说明书”升级为“生成 Flutter 视角的实现规划”：

```text
route / URL / Vue 文件
  -> 分析页面配置、notes、i18n 和源码结构
  -> 抽取结构化 source context
  -> 扫描样式 token、资源、状态、路由和布局线索
  -> 分析 YouFi Flutter 上下文
  -> PagePatternClassifier 识别页面模式
  -> WidgetBlueprintRegistry 生成 Flutter Widget 规划
  -> 生成 migration-context.json
  -> 生成纯 Flutter 视角 migration-spec.md
```

已支持能力：

- 解析 `prototypeScreens.js` 和 `designScreens.js`。
- 支持通过 `--url`、`--route` 或 `--vue` 定位页面。
- 自动读取页面源码、notes 和 `prototype/src/i18n/prototype/<screenId>.json`。
- 抽取页面区块、交互线索、状态线索、生命周期副作用、路由行为、布局特征、资源线索和样式 token 使用位置。
- 内置 YouFi 颜色 token 到 Flutter `themeService.colors` 的映射。
- 内置 YouFi typography mixin 到 Flutter `themeService.textStyles` 的映射。
- 扫描 Flutter 工程中的模块、路由文件、翻译文件、资源目录和通用组件。
- 根据 source 模块推荐目标 Flutter 模块。
- 通过 `PagePatternClassifier` 识别 `quote-detail`、`detail`、`list`、`form`、`trade-ticket`、`portfolio`、`settings`、`auth`、`wizard` 等页面模式。
- 通过 `WidgetBlueprintRegistry` 生成业务化 Flutter Widget 组合树、文件拆分、输入契约和状态管理组合建议。
- 正式 `migration-spec.md` 不暴露 source 技术栈细节，只输出 Flutter 实现视角；source 侧证据保留在 `migration-context.json` 供工具调试。

Playwright 截图和 DOM 提取的代码入口已预留并可通过 `--prototype-url` 使用，但第一阶段推荐先用 `--no-capture` 跑稳定闭环。

MCP 目前是 Phase 6 骨架，业务能力都在 `packages/core` 中，CLI 是当前主入口。

## 三、工程结构

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
│   ├── integration.md
│   └── legacy redirect docs
├── examples/
│   └── stock-trade/
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── analyzers/
│   │       ├── capture/
│   │       ├── generators/
│   │       ├── planners/
│   │       ├── tokens/
│   │       ├── types/
│   │       └── utils/
│   ├── cli/
│   │   └── src/
│   └── mcp-server/
│       └── src/
└── output/
```

核心设计原则：

- `packages/core` 放真正的分析和生成能力。
- `packages/cli` 只负责参数解析和调用 core。
- `packages/mcp-server` 后续只封装 core，不写复杂业务逻辑。
- 输出结果要能被人工审查和修改，不把不确定信息伪装成确定结论。

## 三点五、Adapter 架构与 A/B/C 模型

ProtoBridge 当前已经引入 adapter 架构，用 A/B/C 模型描述 source、target 与桥接工具：

```text
A = Source project，需求或原型所在项目
B = Target project，真实实现所在项目
C = ProtoBridge，读取 A 和 B 后生成实现说明书的桥接工具
```

当前已落地的默认 adapter 组合仍然是：

```text
source adapter = vue3-prototype
target adapter = flutter-app
```

Vue 原型分析和 Flutter 工程分析已经沉到 adapter 中，core 主流程只负责编排。后续扩展 React、Flutter、Vue、Android、iOS 等组合时，应新增 adapter，而不是改写主流程。

后续规划重点：

- 配置使用 `source` / `target` 项目描述；旧的 `prototypeRoot` / `flutterRoot` 已移除。
- source 和 target 都支持 `local` 路径与 `remote` GitLab 仓库。
- remote 第一版支持 branch/tag，默认依赖用户本机已有 GitLab 权限。
- remote 仓库缓存到 `.proto-bridge/cache/repos`，该目录不进入版本管理。
- C 项目不保存 A/B 的开发规范，而是读取 A/B 自己仓库内的 README、docs 和架构文件。
- 输出保留三份文件：`migration-context.json`、`llm-prompt.md`、`migration-spec.md`。
- 大模型调用先只预留 provider 接口，不绑定具体供应商；在此之前 `llm-prompt.md` 可手动交给 Cursor、Claude Code 或 Codex CLI 使用。
- CLI 和 MCP 都保留，CLI 先稳定落地，MCP 后续作为 AI 工具协议入口。

详细规划见：

- `docs/architecture.md`
- `docs/migration-spec.md`
- `docs/integration.md`

## 四、安装

项目使用 pnpm workspace。
```
npm i -g pnpm
```

```bash
pnpm install
```

常用校验命令：

```bash
pnpm run typecheck
pnpm run build
pnpm run generate -- --help
```

日常生成迁移说明书时，不需要手动先执行 `pnpm run typecheck` 和 `pnpm run build`：

- `pnpm run typecheck` 是开发校验命令，改代码后或提交前运行。
- `pnpm run build` 是构建校验命令，改代码后或发布前运行。
- `pnpm run generate` 已经会自动构建 core 和 cli，再执行生成流程。

## 五、最小使用步骤

### 1. 创建本地配置文件

运行 `generate` 前，项目根目录必须存在：

```text
proto-bridge.config.json
```

如果没有这个文件，CLI 会直接提示并退出，不会继续执行后续分析流程。
根目录的 `pnpm run generate` 会在构建 core/cli 前先做这个检查，因此缺少配置时不会继续跑 build。

首次使用可以从示例复制：

```bash
cp proto-bridge.config.example.json proto-bridge.config.json
```

然后改成你本机的路径。推荐使用 adapter-aware 新格式：

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

团队成员各自维护自己的 `proto-bridge.config.json`。这个文件只保存本机路径，默认不进入版本管理；仓库只保留 `proto-bridge.config.example.json` 作为模板。

### 2. 使用完整原型 URL 生成迁移上下文

推荐直接把浏览器里的原型 URL 传给 `--url`，CLI 会自动从 hash 中提取真实路由：

```bash
pnpm run generate -- \
  --url "http://localhost:5173/#/prototype/fund-profile?anchor=overview&is_mobile=1" \
  --out ./output/fund-profile
```

上面的 URL 会被解析为：

```text
route = /prototype/fund-profile
query = anchor=overview&is_mobile=1
```

执行成功后会输出：

```text
output/fund-profile/
├── migration-context.json
├── llm-prompt.md
└── migration-spec.md
```

说明：`llm-prompt.md` 是下一阶段计划输出，目前文档先记录目标形态；当前实现仍以 `migration-context.json` 和 `migration-spec.md` 为主。

### 3. 使用 route 生成迁移上下文

如果已经知道原型路由，也可以直接传 `--route`：

```bash
pnpm run generate -- \
  --route /prototype/trade \
  --out ./output/stock-trade
```

### 4. 使用 Vue 文件生成迁移上下文

如果暂时不知道 route，也可以指定 Vue 文件：

```bash
pnpm run generate -- \
  --vue prototype/src/views/prototype/stock/StockTradePage.vue \
  --out ./output/stock-trade
```

### 5. 开启运行时截图和 DOM 提取

如果原型 dev server 已经启动，并且想生成 `screenshot.png` 和 `dom-snapshot.json`，可以使用 `--capture` 覆盖配置里的 `noCapture: true`：

```bash
pnpm run generate -- \
  --url "http://localhost:5173/#/prototype/fund-profile?anchor=overview&is_mobile=1" \
  --out ./output/fund-profile \
  --capture
```

输出会额外包含：

```text
output/stock-trade/
├── screenshot.png
└── dom-snapshot.json
```

第一版不会自动启动原型 dev server。调用方需要先确保 `prototype-url` 可以访问。

## 六、CLI 参数说明

| 参数 | 是否必填 | 说明 |
| --- | --- | --- |
| `--config` | 否 | 配置文件路径，默认读取执行目录下的 `proto-bridge.config.json` |
| `--url` | 三选一 | 完整原型 URL，CLI 会自动提取 hash route |
| `--route` | 三选一 | 原型或设计稿路由，例如 `/prototype/trade` |
| `--vue` | 三选一 | Vue 文件路径，可为绝对路径或相对 `source.root` |
| `--prototype-url` | 否 | 运行中的原型页面 URL，用于 Playwright capture |
| `--source-adapter` | 否 | Source adapter，当前支持 `vue3-prototype` |
| `--target-adapter` | 否 | Target adapter，当前支持 `flutter-app` |
| `--out` | 否 | 输出目录，相对路径会按调用命令时的目录解析 |
| `--no-capture` | 否 | 跳过截图和 DOM 提取 |
| `--capture` | 否 | 覆盖配置中的 `noCapture: true`，执行截图和 DOM 提取 |

`--url`、`--route`、`--vue` 用来指定页面输入，三者选一个即可。CLI 参数优先级高于 `proto-bridge.config.json`。

## 七、输出文件说明

### migration-context.json

机器可读的结构化上下文，主要包含：

- `source`：页面路由、screenId、页面配置、notes、i18n、源码分析结果。
- `source.sfc`：内部调试用的结构化 source facts，包括 sections、interactions、state、routes、lifecycle、layout、assets、styleTokens 等。
- `capture`：截图、viewport、DOM tree、computed style。使用 `--no-capture` 时为空。
- `tokenMap`：颜色 token、字体 token、未命中 token。
- `target`：Flutter 模块建议、路由文件、翻译文件、资源目录、可复用组件。
- `recommendations`：推荐实现形态、Flutter Widget 拆分、实现规划、风险和人工确认项。

### migration-spec.md

给 Flutter 开发者和 AI coding 工具共同使用的迁移说明书。正式说明书只保留 Flutter 实现视角，不暴露 source 技术栈、模板语法或 DOM/class 证据。主要包含：

- 页面元信息。
- 迁移结论和 Flutter 实现复杂度。
- Flutter 实现规划：目标文件拆分、Widget 组合树、Widget 输入契约、状态管理组合建议、Controller/Adapter 边界、禁止直译项。
- 页面结构拆分。
- Flutter Widget 拆分建议。
- 状态与交互建议。
- 路由与参数建议。
- 布局模型。
- 主题 token 映射和样式 token 使用位置。
- i18n 文案表。
- 资源迁移建议。
- 可复用 Flutter 组件。
- 人工确认项和 AI 实现提示词。

### llm-prompt.md

计划中的 LLM 提示词包。

该文件会组合：

- A 项目的目标页面上下文。
- A 项目自身的 README、docs、notes、i18n 等规范和需求材料。
- B 项目的 README、docs、模块结构、路由、主题、状态管理、资源、公共组件等工程上下文。
- 生成 `migration-spec.md` 所需的结构化指令。

在未接入具体模型供应商前，`llm-prompt.md` 可以作为人工复制到 Cursor、Claude Code、Codex CLI 或公司内部 AI 工具的交接文件。

## 八、实现原理

### 1. 原型页面分析

入口：`packages/core/src/adapters/source/vue3-prototype/prototype-page.ts`

分析过程：

1. 读取 `prototype/src/config/prototypeScreens.js`。
2. 读取 `prototype/src/config/designScreens.js`。
3. 从配置文件中提取 `prototypeModules` 或 `designModules` 数组。
4. 将模块和页面配置展开成页面索引。
5. 根据 `--route` 匹配 `path`，或根据 `--vue` 匹配 `view`。
6. 找到页面的 `screenId`、`module`、`label`、`status`、`owner`、`changelog` 等元信息。
7. 解析出实际源码文件路径并读取源码。
8. 按规则查找 notes 和 i18n。
9. 调用 `analyzeVueSfc` 生成内部 source facts。

第一版使用宽松 JS literal 提取方式解析配置文件，不要求配置文件是 JSON。解析逻辑封装在 `packages/core/src/utils/js-literal.ts`，后续可以替换为 AST 或动态 import。

### 2. Source SFC 语义分析

入口：`packages/core/src/adapters/source/vue3-prototype/vue-sfc.ts`

该模块只服务于内部上下文构建，正式 `migration-spec.md` 不直接输出 source 技术栈细节。当前可抽取：

- template sections / semantic components。
- interactions。
- state / computed / constants / functions。
- routes / route query / back 行为。
- lifecycle / event listener。
- layout hints：fixed、sticky、scroll、safe-area、z-index、flex、grid、spacing。
- assets：图片、图标、内联矢量、背景图。
- styleTokens：token、fallback、硬编码颜色值。

### 3. Notes 查找规则

优先级：

1. 页面配置中显式声明的 notes 或 notesPath。
2. 根据源码文件名猜测：

```text
prototype/notes/<module>/<ComponentName>.md
```

### 4. i18n 查找规则

根据 `screenId` 查找：

```text
prototype/src/i18n/prototype/<screenId>.json
```

### 5. Token 映射

入口：`packages/core/src/adapters/target/flutter-app/token-mapper.ts`

当前做两类扫描：

- CSS 变量：`var(--color-text-secondary)`、`--color-bg-base` 等。
- SCSS mixin：`@include small1-r`、`@include title-b` 等。

未命中的 token 会进入 `unresolved`，在 Markdown 中提示人工确认。

### 6. Flutter 上下文分析

入口：`packages/core/src/adapters/target/flutter-app/flutter-context.ts`

分析内容：

- 扫描 `lib/app/modules/**` 获取已有模块。
- 查找 `lib/app/routes/app_routes.dart`。
- 查找 `lib/app/routes/app_pages.dart`。
- 查找翻译文件。
- 查找资源目录。
- 根据内置模块表推荐目标模块。
- 尝试列出可复用公共组件。

### 7. Flutter 实现规划

入口：

- `packages/core/src/planners/page-pattern-classifier.ts`
- `packages/core/src/planners/widget-blueprints.ts`
- `packages/core/src/planners/naming-strategy.ts`
- `packages/core/src/adapters/target/flutter-app/flutter-implementation-plan.ts`

规划流程：

```text
source facts + target context
  -> PagePatternClassifier
  -> WidgetBlueprintRegistry
  -> NamingStrategy
  -> FlutterImplementationPlan
```

当前支持页面模式包括：`quote-detail`、`detail`、`list`、`form`、`trade-ticket`、`portfolio`、`settings`、`auth`、`onboarding`、`wizard`、`article`、`dashboard`、`unknown`。

规划结果包括：

- Flutter 实现复杂度。
- 目标文件拆分。
- Widget 组合树。
- Widget 输入契约。
- 状态管理组合建议。
- Controller/Adapter 边界。
- 禁止直译项。
- P0/P1/P2 checklist。

### 8. 迁移文档生成

入口：

- `packages/core/src/generators/migration-context.ts`
- `packages/core/src/generators/migration-spec.ts`

生成流程：

```text
SourceAdapter.analyze
  -> TargetAdapter.mapTokens
  -> TargetAdapter.analyze
  -> optional capturePrototypePage
  -> buildFlutterImplementationPlan
  -> createMigrationContext
  -> renderMigrationSpec
  -> write migration-context.json
  -> write migration-spec.md
```

`migration-context.json` 可以保留 source 侧分析证据；`migration-spec.md` 面向 Flutter 实现者，只输出 Flutter 实现计划和必要确认项。

## 九、当前验证结果

已用以下命令完成基础验证：

```bash
pnpm run typecheck
pnpm run build
pnpm run generate -- \
  --route /prototype/trade \
  --out ./output/stock-trade
```

其中 `typecheck` 和 `build` 是开发验证命令，不是每次使用 CLI 前都必须手动执行。普通生成只需要准备好 `proto-bridge.config.json` 后运行 `pnpm run generate -- ...`。

验证页面：

```text
route    = /prototype/trade
screenId = stock.trade
view     = stock/StockTradePage.vue
module   = 股票下单
target   = order
```

生成内容已包含：

- 页面元信息。
- notes 文档。
- i18n 文案表。
- Flutter 目标模块建议。
- 路由文件建议。
- 资源目录建议。
- 可复用组件建议。
- 颜色 token 映射。
- typography token 映射。
- 未命中 token 提示。
- AI 实现提示词。

## 十、阶段计划

### Phase 0：工程骨架

状态：已完成。

- pnpm workspace。
- TypeScript 配置。
- `packages/core`。
- `packages/cli`。
- `packages/mcp-server` 骨架。
- README 和 docs 基础文档。

### Phase 1：Prototype 分析

状态：已完成基础闭环。

- route 或 Vue 文件输入。
- 解析原型配置。
- 读取 Vue 源码。
- 读取 notes。
- 读取 i18n。
- 输出基础迁移说明书。

### Phase 2：Token 映射增强

状态：已完成内置映射，待增强。

后续增强：

- 从 `design-tokens.js` 自动生成颜色映射候选。
- 从 `style.scss` 自动提取 typography mixin。
- 支持 computed style 反查语义 token。
- 对 raw color、raw font-size 做风险提示。

### Phase 3：Flutter 上下文增强

状态：已完成基础扫描，待增强。

后续增强：

- 更准确地匹配相似 Flutter 页面。
- 扫描现有 Controller、Binding、View 命名模式。
- 自动推荐落地文件路径。
- 自动发现已有公共 Widget 的真实 import 路径。
- 根据翻译 key 命名规则给出新增 key 建议。

### Phase 4：Playwright Capture

状态：入口已实现，仍需打磨。

后续增强：

- 自动过滤原型容器、左侧导航、右侧 notes、手机 frame 外壳。
- 提取更稳定的可见 DOM tree。
- 增加 clickable hints。
- 增加 scroll container 识别。
- 将截图和 DOM 结构更深入地用于 Widget 拆分。

### Phase 5：迁移说明书增强

状态：已完成 Flutter 实现规划第一版。

已完成：

- Source SFC 语义分析：区块、状态、路由、生命周期、布局、资源、style token。
- PagePatternClassifier：识别 quote-detail、detail、list、form、trade-ticket、portfolio、settings、auth、wizard 等页面模式。
- WidgetBlueprintRegistry：按页面模式生成 Flutter Widget 组合树。
- FlutterImplementationPlan：生成目标文件拆分、Widget 输入契约、状态管理组合建议、Controller/Adapter 边界和 checklist。
- 正式 migration-spec.md 只保留 Flutter 实现视角，不暴露 source 技术栈细节。

后续增强：

- 为更多业务模块补充 page pattern 和 widget blueprint。
- 从 YouFi 真实代码中学习 Controller、Binding、Repository、EventBus 使用模式。
- 增强 common widget 匹配置信度和 import 路径推荐。
- 为低置信度页面模式输出更明确的人工确认项。

### Phase 6：MCP 封装

状态：骨架预留。

后续增强：

- 引入 MCP SDK。
- 封装以下工具：
  - `analyzeSourceProject`
  - `capturePrototypePage`
  - `mapTargetTokens`
  - `analyzeTargetProject`
  - `generateMigrationSpec`
- 保持 MCP 层只做协议封装，不写业务逻辑。

### Phase 7：A/B/C 通用架构规划

状态：文档规划中。

后续增强：

- 引入 A/B/C 模型：A 为 source project，B 为 target project，C 为 ProtoBridge。
- 配置升级为 `source` / `target` / `location` / `kind`。
- 支持 local path 和 remote GitLab branch/tag。
- remote 仓库缓存到 `.proto-bridge/cache/repos`。
- 抽象 `ProjectResolver`、`SourceAdapter`、`TargetAdapter`、`SpecGenerator`。
- 第一组 adapter 为 `vue3-prototype -> flutter-app`。
- 生成 `llm-prompt.md`，作为未接入具体 LLM provider 前的 AI 交接文件。
- 预留 LLM provider 接口，但不绑定具体供应商。

## 十一、未来优化方向

### 1. 配置解析升级

当前配置解析是宽松文本解析，足够跑通第一版，但仍有边界风险。

可选升级方向：

- 使用 AST 解析 JS 模块。
- 在 TradeAppPrd 中导出机器可读 JSON。
- 使用受控动态 import 加载配置。
- 为配置解析增加 fixture 测试。

### 2. Source 语义分析增强

当前已能抽取结构、状态、路由、生命周期、布局、资源和 style token。

后续可以进一步增强：

- 使用 AST 解析 template/script，而不是继续扩展正则。
- 将 source facts 与 runtime capture 的 bbox/computed style 合并。
- 更准确识别 loading、empty、error、disabled、selected 等 UI 状态。
- 将复杂图表、表单、交易流程抽象为稳定的 source facts。

### 3. 设计 token 智能映射

当前是内置映射表。

后续可以增强为：

- 自动读取原型 token。
- 自动读取 Flutter theme extension。
- 基于名称相似度做候选推荐。
- 基于颜色值反查语义 token。
- 标记 raw color、hardcoded spacing、非语义字号。

### 4. Flutter Planner 增强

当前已引入 PagePatternClassifier 和 WidgetBlueprintRegistry。

后续可以增强为：

- 为资产、交易、设置、登录、安全、记录、表单、消息等模块补充 blueprint。
- 从 YouFi 真实代码读取 BaseGetView、Controller、Binding、Repository、EventBus 使用习惯。
- 推荐 View、Controller、Binding、Route、Model、Widget、Adapter 文件路径。
- 推荐 GetX 路由注册代码位置。
- 推荐翻译文件新增 key 的位置。
- 推荐资源迁移路径。
- 推荐可复用 Widget 的 import 和置信度。
- 对不符合 YouFi 习惯的实现方式给出警告。

### 5. Capture 视觉上下文增强

Playwright capture 后续可以服务于：

- 首屏结构识别。
- 固定底部栏识别。
- 弹层和对话框识别。
- 滚动容器识别。
- 真实 computed style 提取。
- 生成截图参考和 DOM 区块摘要。

### 6. AI 实现闭环

当前输出的是迁移说明书。

未来可以增加：

- 输出 `llm-prompt.md`，把 A/B 项目上下文组织成可直接交给 AI 的提示词包。
- 预留 LLM provider 接口，但不在第一阶段绑定具体供应商。
- 根据 spec 生成 Flutter TODO patch。
- 自动检查实现中是否存在 raw color。
- 自动检查 hardcoded text 是否进入 i18n。
- 自动检查路由和资源是否注册。
- 自动生成迁移后自检清单。
- 对比截图和 Flutter 页面进行视觉差异分析。

### 7. 多目标端支持

当前第一版只支持 Flutter。

后续可以扩展：

- React。
- Android Compose。
- iOS SwiftUI。
- Web。
- 小程序。

架构上应保持 core 能力可扩展，target 相关逻辑通过平台分支隔离。

## 十二、开发约定

- 业务逻辑优先放在 `packages/core`。
- CLI 不写复杂分析逻辑。
- MCP 后续只封装 core。
- 新增能力要优先补类型定义。
- 不确定的信息要进入 warnings 或人工确认项。
- 生成文档要服务迁移实现，不追求表面完整。
- 第一版优先稳定跑通一个真实页面，再扩大覆盖范围。

## 十三、常见问题

### 为什么不直接生成 Dart？

原型页面和 Flutter App 之间不只是语法差异，还涉及目标模块、路由、状态管理、主题、i18n、资源和已有公共组件。如果直接生成 Dart，AI 容易逐层照搬来源页面结构，反而增加返工成本。

ProtoBridge 的第一步是先生成迁移上下文，让实现者和 AI 都知道应该怎么落地。

### 为什么 `--no-capture` 是推荐起点？

截图和 DOM 提取依赖原型 dev server、浏览器环境和页面运行状态。第一版先把静态上下文跑稳定，后续再把 runtime capture 作为增强输入加入。

### 输出的 warnings 是错误吗？

不一定。warnings 表示“需要人工确认或后续增强”的信息。例如跳过 capture、某些 CSS token 未命中语义映射，都属于正常的第一版提示。

### 相对 `--out` 路径按哪里解析？

相对路径会按执行 `pnpm run generate` 时的目录解析，而不是 `packages/cli` 目录。这样在项目根目录执行命令时，输出会落到根目录的 `output/` 下。

### `pnpm run typecheck` 和 `pnpm run build` 是必须的吗？

日常生成迁移说明书时不是必须手动执行。

推荐使用方式：

```bash
pnpm run generate -- --url "http://localhost:5173/#/prototype/fund-profile?anchor=overview&is_mobile=1" --out ./output/fund-profile
```

只有在改了 ProtoBridge 自身代码、提交前自检、或排查类型/构建问题时，再运行：

```bash
pnpm run typecheck
pnpm run build
```
