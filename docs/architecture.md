# ProtoBridge 架构与数据模型

## 1. 产品定位

ProtoBridge 是 A/B/C 模型下的上下文桥接工具：

```text
A = Source project，需求或原型所在项目
B = Target project，真实实现所在项目
C = ProtoBridge，读取 A 和 B 后生成实现说明书的桥接工具
```

ProtoBridge 的输出是可审查、可修改、可交给 AI coding 工具继续实现的上下文包，而不是直接提交到目标 App 的业务代码。

核心目标：

- 从 source project 提取页面结构、交互、状态、路由、notes、i18n、资源和样式 token。
- 从 target project 提取模块、路由、状态管理习惯、主题、资源目录、公共组件和相似实现。
- 将 source facts 转成 target-facing 的实现规划。
- 输出 `migration-context.json` 和 `migration-spec.md`。

## 2. 非目标

ProtoBridge 不负责：

- 直接生成完整 Dart 页面代码。
- 一键迁移并自动提交目标 App。
- 把 Vue 模板、CSS class 或 DOM 结构逐层翻译成 Flutter Widget。
- 以 OCR 作为主输入。
- 处理复杂 Figma 高保真还原。
- 在 ProtoBridge 中保存 A/B 项目的开发规范；规范应从 A/B 自身仓库读取。

## 3. 总体架构

```text
CLI / MCP
  -> core generator
    -> AdapterRegistry
      -> SourceAdapter
      -> TargetAdapter
    -> optional Capture
    -> Planner
    -> SpecGenerator
```

当前默认组合：

```text
SourceAdapter = vue3-prototype
TargetAdapter = flutter-app
```

扩展方式：

- 新 source 技术栈新增 `SourceAdapter`。
- 新 target 技术栈新增 `TargetAdapter`。
- core 主流程只通过 registry 获取 adapter，不直接依赖具体技术栈实现。

## 4. 工程结构

```text
packages/core/src/
├── adapters/
│   ├── registry.ts
│   ├── types.ts
│   ├── source/
│   │   └── vue3-prototype/
│   │       ├── prototype-page.ts
│   │       └── vue-sfc.ts
│   └── target/
│       └── flutter-app/
│           ├── flutter-context.ts
│           ├── flutter-implementation-plan.ts
│           ├── flutter-migration-spec.ts
│           ├── flutter-recommendations.ts
│           ├── token-mapper.ts
│           └── planners/
│               ├── naming-strategy.ts
│               ├── page-pattern-classifier.ts
│               └── widget-blueprints.ts
├── capture/
│   └── playwright-capture.ts
├── generators/
│   ├── migration-context.ts
│   └── migration-spec.ts
├── types/
└── utils/
```

模块职责：

- `adapters/types.ts`：定义 `SourceAdapter`、`TargetAdapter` 和 adapter project config。
- `adapters/registry.ts`：注册并解析可用 adapter。
- `adapters/source/vue3-prototype`：读取 Vue3 原型工程并产出 source facts。
- `adapters/target/flutter-app`：读取 Flutter 工程上下文，执行 token mapping、recommendations、Flutter implementation planning 和 Flutter planners。
- `capture`：通过 Playwright 提取运行时截图、DOM、bbox 和 computed style。
- `generators`：组装 migration context，调用 target renderer 并写出文件。
- `types`：跨模块共享的数据结构。
- `utils`：路径、文件和 JS literal 解析工具。

## 5. 文件职责表

| 文件 | 职责 | 技术栈归属 |
| --- | --- | --- |
| `adapters/registry.ts` | 注册并按 adapter id 获取 source/target adapter | core |
| `adapters/types.ts` | 定义 adapter project、`SourceAdapter`、`TargetAdapter` 接口 | core |
| `adapters/source/vue3-prototype.ts` | 注册 `vue3-prototype` source adapter | source/vue3 |
| `adapters/source/vue3-prototype/prototype-page.ts` | 读取 Vue3 原型页面配置、源码、notes、i18n 和页面元信息 | source/vue3 |
| `adapters/source/vue3-prototype/vue-sfc.ts` | 从 Vue SFC 中提取结构、状态、交互、路由、布局、资源和 token 线索 | source/vue3 |
| `adapters/target/flutter-app.ts` | 注册 `flutter-app` target adapter | target/flutter |
| `adapters/target/flutter-app/flutter-context.ts` | 扫描 Flutter 模块、routes、translations、assets、common widgets 和相似文件 | target/flutter |
| `adapters/target/flutter-app/token-mapper.ts` | 将 source token 和 computed style 映射到 Flutter theme 写法 | target/flutter |
| `adapters/target/flutter-app/flutter-recommendations.ts` | 生成 Flutter recommendations、风险和人工确认项 | target/flutter |
| `adapters/target/flutter-app/flutter-implementation-plan.ts` | 生成 Flutter 文件拆分、Widget 树、状态策略和 Controller/Adapter 边界 | target/flutter |
| `adapters/target/flutter-app/flutter-migration-spec.ts` | 将 `MigrationContext` 渲染为 Flutter-facing Markdown spec | target/flutter |
| `adapters/target/flutter-app/planners/page-pattern-classifier.ts` | 根据 source facts 判断页面模式，服务 Flutter implementation plan | target/flutter |
| `adapters/target/flutter-app/planners/widget-blueprints.ts` | 根据页面模式生成 Flutter Widget blueprint | target/flutter |
| `adapters/target/flutter-app/planners/naming-strategy.ts` | 提供 Flutter 文件和 Widget 命名策略 | target/flutter |
| `capture/playwright-capture.ts` | 运行时截图、DOM tree、bbox 和 computed style 提取 | core/capture |
| `generators/migration-context.ts` | 编排 source adapter、capture、target adapter 并生成 `MigrationContext` | core |
| `generators/migration-spec.ts` | 调用 target renderer，写入 `migration-context.json` 和 `migration-spec.md` | core |
| `types/index.ts` | 定义当前 context、source facts、target context、recommendations 和输出类型 | shared types |
| `utils/js-literal.ts` | 受控解析 JS literal 配置 | core utils |
| `utils/path.ts` | 路径、读写文件和 JSON 输出工具 | core utils |

目录归属原则：

- 技术栈专属逻辑放在对应 adapter 下。
- Flutter 页面模式、Widget blueprint、命名策略属于 `flutter-app` target adapter。
- `generators/migration-context.ts` 只做编排，不包含 Flutter recommendation 规则。
- `generators/migration-spec.ts` 只调用 target adapter 的 renderer；target-specific Markdown 规则放在 target adapter 内。

## 6. Adapter 接口

Adapter 是 ProtoBridge 中隔离技术栈差异的边界。Core 不直接理解 Vue、Flutter、React、Figma 或其他技术栈；Core 只要求 adapter 输出稳定的结构化事实和规划能力。

Adapter 的职责不是把某个项目的全部规范复制进 ProtoBridge，而是在运行时从 source/target 仓库读取与本次页面迁移相关的事实和约束。这样生成的说明书始终以 A/B 项目当前状态为准。

### SourceAdapter

Source adapter 负责把 source project 转成统一的页面事实。

当前 `vue3-prototype` 输入：

- `source.root`
- `route`
- `vue`

当前 `vue3-prototype` 输出：

- 页面元信息：route、screenId、module、label、title、owner、status、changelog。
- 页面源码与相对路径。
- notes 与 i18n。
- SFC facts：sections、components、interactions、state、routes、lifecycle、layout、assets、styleTokens。
- warnings。

Source 侧规范读取原则：

- **页面配置优先**：`prototypeScreens.js` 和 `designScreens.js` 是 route、screenId、module、view、status、owner、notes path 的主要来源。
- **notes 补充业务语义**：`prototype/notes/**` 用于读取业务背景、状态说明、交互规则、接口线索、验收标准和人工确认项。
- **i18n 确定文案边界**：`prototype/src/i18n/prototype/<screenId>.json` 用于生成文案表和 target 侧翻译建议。
- **SFC 源码提供结构事实**：template、script、style 只作为事实来源，不直接变成 target 代码。
- **source README/docs 是项目说明来源**：当 adapter 需要理解项目级说明时，应读取 source 仓库内 README、docs、架构说明或页面说明文件，而不是把这些规范硬编码到 ProtoBridge。

Source 侧信息进入 spec 的方式：

- 明确页面要表达什么：页面区块、状态、交互、路由、文案、资源。
- 明确证据来源：context 中保留 source path、notes path、i18n path、style token evidence。
- 明确不确定性：缺失 notes、无法匹配配置、动态逻辑无法静态解析时写入 warnings 和人工确认项。
- 避免技术栈泄漏：Markdown 不要求实现者照搬 Vue template、CSS class 或 DOM 层级。

### TargetAdapter

Target adapter 负责把 target project 转成可落地的实现上下文和规划能力。

当前 `flutter-app` 输入：

- `target.root`
- source module
- screenId
- route

当前 `flutter-app` 输出：

- Flutter modules。
- 推荐目标模块。
- routes 文件。
- translation 文件。
- asset 目录。
- reusable widgets。
- similar files。
- token map。
- Flutter implementation plan。
- warnings。

Target 侧规范读取原则：

- **目录结构约束落点**：`lib/app/modules/**` 决定页面、Controller、Binding、Widget 和 model 的推荐落点。
- **路由文件约束导航**：`app_routes.dart` 和 `app_pages.dart` 决定 route 注册和 GetX 接入建议。
- **翻译文件约束 i18n**：`lib/app/translations/*.dart` 决定 `.tr` 使用和新增 key 的目标位置。
- **资源目录约束 asset 落点**：`assets/images`、`assets/dark_images`、`assets/svg`、`assets/json` 决定图片、暗色资源、SVG 和 JSON 资源建议。
- **公共组件约束 UI 实现**：common widgets、pop、image、empty、loading 等扫描结果会约束 spec 中的复用建议。
- **相似页面约束代码风格**：target module 中的 similar files 用于提示实现者优先参考已有页面结构、命名、Controller 组织和组件拆分。
- **target README/docs 是工程规范来源**：当 adapter 需要理解目标端约束时，应读取 target 仓库内 README、docs、架构文件、模块说明或组件说明，而不是在 ProtoBridge 中保存业务规范副本。

Target 侧信息进入 spec 的方式：

- 推荐目标模块和文件拆分。
- 推荐 route 注册位置和参数传递方式。
- 推荐 translation 和 asset 目标目录。
- 推荐可复用 common widgets。
- 推荐状态 owner、Controller/Adapter/Repository/Widget 边界。
- 标记 target 中缺失的组件、路由、资源或相似实现为人工确认项。

## 7. Source 分析

入口：`packages/core/src/adapters/source/vue3-prototype/prototype-page.ts`

读取内容：

```text
prototype/src/config/prototypeScreens.js
prototype/src/config/designScreens.js
prototype/notes/**
prototype/src/i18n/prototype/**
prototype/src/views/**
```

页面解析流程：

1. 读取 prototype/design screen config。
2. 用 route 或 Vue 文件匹配 screen config。
3. 推断 page type、module、screenId、view path。
4. 读取 Vue SFC 源码。
5. 读取 notes 和 i18n。
6. 调用 SFC analyzer 生成 source facts。
7. 汇总 warnings。

## 8. SFC 语义分析

入口：`packages/core/src/adapters/source/vue3-prototype/vue-sfc.ts`

分析内容：

- `sections`：app-bar、tab-bar、section、list、chart、bottom-bar、modal。
- `components`：header、tabs、summary、content-section、list、chart、bottom-actions、modal。
- `interactions`：click、model、conditional、loop、state、computed、watch。
- `state`：ui-state、mock-data、derived-data、navigation、lifecycle、chart-data、handler。
- `routes`：navigate、back、read-query。
- `lifecycle`：onMounted、onBeforeUnmount、watch、event-listener。
- `layout`：fixed、sticky、scroll、safe-area、z-index、absolute、flex、grid、spacing。
- `assets`：image、svg、icon、background、inline-svg。
- `styleTokens`：CSS var、mixin 和 fallback。

这些信息进入 `migration-context.json`，供 planner、调试和人工审查使用。`migration-spec.md` 只输出 target-facing 建议。

## 9. Target 分析

入口：`packages/core/src/adapters/target/flutter-app/flutter-context.ts`

扫描内容：

```text
lib/app/modules/**
lib/app/routes/app_routes.dart
lib/app/routes/app_pages.dart
lib/app/translations/*.dart
assets/images
assets/dark_images
assets/svg
assets/json
lib/app/common/{widget,widgets,pop}/**/*.dart
lib/app/widgets/**/*.dart
```

分析结果：

- `existingModules`
- `suggestedModule`
- `routesFiles`
- `translationFiles`
- `assetDirectories`
- `reusableWidgets`
- `similarFiles`
- `warnings`

## 10. Token 映射

入口：`packages/core/src/adapters/target/flutter-app/token-mapper.ts`

输入来源：

- Vue SFC style 中的 CSS var。
- Vue SFC style 中的 typography mixin。
- Playwright computed style fallback。

输出结构：

```ts
type TokenMapResult = {
  colors: TokenMapping[]
  typography: TokenMapping[]
  unresolved: TokenMapping[]
}
```

映射目标：

- `themeService.colors.*`
- `themeService.textStyles.*`

未命中项进入 `unresolved`，用于说明书和人工确认。

## 11. Flutter Implementation Plan

入口：`packages/core/src/adapters/target/flutter-app/flutter-implementation-plan.ts`

规划流程：

```text
source facts + target context
  -> PagePatternClassifier
  -> WidgetBlueprintRegistry
  -> NamingStrategy
  -> FlutterImplementationPlan
```

页面模式：

- `quote-detail`
- `detail`
- `list`
- `form`
- `trade-ticket`
- `portfolio`
- `record-list`
- `settings`
- `auth`
- `onboarding`
- `wizard`
- `article`
- `dashboard`
- `unknown`

输出结构：

```ts
type FlutterImplementationPlan = {
  complexity: 'simple' | 'moderate' | 'complex'
  summary: string
  fileTree: FlutterPlannedFile[]
  widgetTree: FlutterWidgetPlan[]
  stateStrategy: FlutterStateStrategy[]
  controllerBoundaries: FlutterControllerBoundary[]
  widgetContracts: FlutterWidgetContract[]
  doNotTranslate: string[]
  checklist: FlutterChecklistItem[]
}
```

## 12. Spec 约束生成机制

`migration-spec.md` 不是 source facts 的简单展开，而是三类约束合并后的 target-facing 文档。

### 12.1 输入约束

| 来源 | 内容 | 用途 |
| --- | --- | --- |
| Source page config | route、screenId、module、view、status、owner | 确定页面身份和 source 入口 |
| Source notes | 业务意图、交互说明、验收标准 | 补充源码无法表达的需求语义 |
| Source i18n | key、多语言文案 | 生成文案迁移和 `.tr` 建议 |
| Source SFC facts | 结构、状态、交互、布局、资源、token | 生成页面拆分、状态和布局建议 |
| Runtime capture | screenshot、DOM、bbox、computed style | 校对首屏布局和样式 fallback |
| Target modules | 模块目录和相似文件 | 约束文件落点和复用参考 |
| Target routes | route 注册文件 | 约束导航接入方式 |
| Target translations | 翻译文件 | 约束 i18n 落点 |
| Target assets | 资源目录 | 约束资源迁移路径 |
| Target widgets | common widgets 和 pop/image/empty/loading | 约束 UI 复用建议 |

### 12.2 合并规则

- Source 描述“页面需要什么”，target 描述“目标工程允许和推荐怎么实现”。
- 当 source 结构和 target 习惯冲突时，spec 以 target 工程习惯为实现建议，以 source facts 作为需求证据。
- 当 source 信息缺失时，spec 不补造结论，而是写 warnings 或人工确认项。
- 当 target 缺少可复用组件或相似实现时，spec 给出保守落地建议，并要求人工确认。
- Runtime capture 只补充布局和样式事实，不覆盖 source notes 或 target 工程约束。

### 12.3 Markdown 渲染约束

Markdown 生成时遵守以下规则：

- 页面元信息必须来自 source config 或明确推断。
- Flutter 实现规划必须来自 target adapter 的 implementation plan。
- Widget 拆分按业务区块和 Flutter 布局模型组织，不按 Vue DOM 层级组织。
- 状态模型先分类，再建议 owner，避免把临时状态逐个搬进 Controller。
- 路由、i18n、asset、theme token 必须指向 target 工程中的实际文件或目录线索。
- 风险和人工确认项必须可执行，不能写成泛泛提醒。
- 不确定信息必须保留不确定性表达。

## 13. Migration Context

TypeScript source of truth：`packages/core/src/types/index.ts`

```ts
type MigrationContext = {
  source: PrototypePageAnalysis
  capture?: CaptureResult
  tokenMap: TokenMapResult
  target: FlutterContextAnalysis
  recommendations: MigrationRecommendations
}
```

字段说明：

- `source`：页面路由、screenId、页面配置、notes、i18n、源码和 source facts。
- `capture`：可选截图、DOM snapshot、viewport、computed style。
- `tokenMap`：颜色、字体和未命中 token。
- `target`：Flutter 模块、路由、翻译、资源、可复用组件和相似文件。
- `recommendations`：实现形态、实现规划、风险和人工确认项。

## 14. 配置格式

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
  "outDir": "./output/stock-trade",
  "noCapture": true
}
```

页面输入可来自：

- `url`
- `route`
- `vue`
- CLI 参数 `--url`、`--route`、`--vue`

## 15. 扩展点

### 新增 SourceAdapter

需要实现：

- adapter id。
- source root 解析。
- 页面输入解析。
- source facts 输出。
- warnings。

### 新增 TargetAdapter

需要实现：

- adapter id。
- target root 解析。
- target context 输出。
- token mapping。
- implementation plan。
- warnings。

### ProjectResolver

本地路径已经通过 `source.root` 和 `target.root` 表达。远程 Git、branch、tag、commit pinning 和本地缓存可以作为 resolver 能力接入，不应侵入 adapter 主流程。

## 16. 风险与边界

- `prototypeScreens.js` / `designScreens.js` 是 JS 文件，当前通过受控 literal 解析读取，复杂动态逻辑需要人工确认。
- Runtime capture 依赖页面可访问、浏览器环境和运行时状态；capture 失败不应阻断静态上下文生成。
- DOM tree 可能包含原型平台外壳，需要在 spec 中保留人工确认项。
- Token 映射无法命中语义 token 时，必须进入 `unresolved`，不能伪装成确定映射。
- Target adapter 输出的是实现建议，不应替代目标 App 的真实代码审查。
