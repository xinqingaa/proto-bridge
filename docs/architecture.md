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
│           └── token-mapper.ts
├── capture/
│   └── playwright-capture.ts
├── generators/
│   ├── migration-context.ts
│   └── migration-spec.ts
├── planners/
│   ├── naming-strategy.ts
│   ├── page-pattern-classifier.ts
│   └── widget-blueprints.ts
├── types/
└── utils/
```

模块职责：

- `adapters/types.ts`：定义 `SourceAdapter`、`TargetAdapter` 和 adapter project config。
- `adapters/registry.ts`：注册并解析可用 adapter。
- `adapters/source/vue3-prototype`：读取 Vue3 原型工程并产出 source facts。
- `adapters/target/flutter-app`：读取 Flutter 工程上下文，执行 token mapping 和 Flutter implementation planning。
- `capture`：通过 Playwright 提取运行时截图、DOM、bbox 和 computed style。
- `generators`：组装 migration context 并渲染 Markdown spec。
- `planners`：页面模式识别、Widget blueprint 和命名策略。
- `types`：跨模块共享的数据结构。
- `utils`：路径、文件和 JS literal 解析工具。

## 5. Adapter 接口

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

## 6. Source 分析

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

## 7. SFC 语义分析

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

## 8. Target 分析

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

## 9. Token 映射

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

## 10. Flutter Implementation Plan

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

## 11. Migration Context

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

## 12. 配置格式

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

## 13. 扩展点

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

## 14. 风险与边界

- `prototypeScreens.js` / `designScreens.js` 是 JS 文件，当前通过受控 literal 解析读取，复杂动态逻辑需要人工确认。
- Runtime capture 依赖页面可访问、浏览器环境和运行时状态；capture 失败不应阻断静态上下文生成。
- DOM tree 可能包含原型平台外壳，需要在 spec 中保留人工确认项。
- Token 映射无法命中语义 token 时，必须进入 `unresolved`，不能伪装成确定映射。
- Target adapter 输出的是实现建议，不应替代目标 App 的真实代码审查。
