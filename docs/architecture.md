# ProtoBridge 架构与数据模型

本文档是 ProtoBridge 架构、配置、上下文 schema 的主维护入口。

## 1. 产品定位

ProtoBridge 不是代码翻译器，也不是一键生成 Dart 的工具。

它连接三个项目角色：

- **A：Source project** - 需求或原型所在项目。
- **B：Target project** - 功能最终落地的工程项目。
- **C：ProtoBridge** - 读取 A 和 B 后，生成面向实现的说明书。

第一阶段支持：

```text
A = Vue3 原型平台
B = Flutter App
C = ProtoBridge
```

稳定目标是：读取 A 中的目标页面，结合 B 的真实工程结构、开发规范、主题、路由、资源和通用组件，生成一篇 Flutter-facing 的实现说明书。

## 2. 非目标

ProtoBridge 不应该变成：

- 源码到 Dart 的逐行翻译器。
- 第一阶段直接生成完整 Dart 页面代码的工具。
- 固化 A/B 项目业务规则的地方。
- 人工 review 的替代品。
- 只能通过 MCP 使用、无法脚本化或 CI 使用的工具。

## 3. A/B/C 模型

A/B/C 模型固定，但 A 和 B 的技术栈不固定。

```text
source project A
  -> source adapter
  -> source context

target project B
  -> target adapter
  -> implementation context

ProtoBridge C
  -> project resolver
  -> adapter orchestration
  -> planner
  -> spec generation
  -> CLI and MCP entrypoints
```

第一阶段：

- source adapter：`vue3-prototype`
- target adapter：`flutter-app`

未来可能支持：

- `react-prototype -> flutter-app`
- `flutter-app -> vue-app`
- `flutter-app -> react-app`
- `figma-design -> flutter-app`

## 4. 当前工程结构

```text
packages/core/src/
├── analyzers/
│   ├── prototype-page.ts
│   ├── vue-sfc.ts
│   └── flutter-context.ts
├── capture/
│   └── playwright-capture.ts
├── planners/
│   ├── page-pattern-classifier.ts
│   ├── widget-blueprints.ts
│   └── naming-strategy.ts
├── generators/
│   ├── flutter-implementation-plan.ts
│   ├── migration-context.ts
│   └── migration-spec.ts
├── tokens/
│   └── token-mapper.ts
├── types/
└── utils/
```

职责划分：

- `analyzers`：读取 source/target 项目并产出结构化事实。
- `tokens`：做 source token 到 Flutter theme 写法的映射。
- `planners`：将 source facts 和 target context 转成 Flutter 实现规划。
- `generators`：生成 `migration-context.json` 和 `migration-spec.md`。
- `capture`：可选运行时截图、DOM、computed style 提取。

## 5. Core 模块职责

### 5.1 Source 分析

当前入口：`packages/core/src/analyzers/prototype-page.ts`

职责：

- 读取页面配置。
- 根据 URL/route/source file 定位页面。
- 读取 notes、i18n、页面源码。
- 调用 SFC 分析器得到内部 source facts。

### 5.2 Source SFC 语义分析

当前入口：`packages/core/src/analyzers/vue-sfc.ts`

职责：抽取内部分析事实，包括：

- sections / semantic components。
- interactions。
- state / constants / functions。
- routes / query / back 行为。
- lifecycle / event listener。
- layout hints。
- assets。
- style token usage。

这些内容进入 `migration-context.json`，用于调试和 planner。正式 `migration-spec.md` 不直接输出 source 技术栈、模板语法或 DOM/class 证据。

### 5.3 Target 分析

当前入口：`packages/core/src/analyzers/flutter-context.ts`

职责：

- 扫描 `lib/app/modules/**`。
- 查找 `app_routes.dart` 和 `app_pages.dart`。
- 查找翻译文件和资源目录。
- 推荐 Flutter 模块。
- 列出可复用 common widgets。

### 5.4 Planner

当前入口：

- `packages/core/src/planners/page-pattern-classifier.ts`
- `packages/core/src/planners/widget-blueprints.ts`
- `packages/core/src/planners/naming-strategy.ts`
- `packages/core/src/generators/flutter-implementation-plan.ts`

规划流程：

```text
source facts + target context
  -> PagePatternClassifier
  -> WidgetBlueprintRegistry
  -> NamingStrategy
  -> FlutterImplementationPlan
```

当前支持页面模式：

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

## 6. 当前配置格式

当前配置文件仍支持第一阶段字段：

```json
{
  "prototypeRoot": "/path/to/TradeAppPrd",
  "flutterRoot": "/path/to/youfi",
  "target": "flutter",
  "outDir": "./output",
  "noCapture": true
}
```

页面输入可以来自 CLI：

```bash
pnpm run generate -- --url "http://localhost:5173/#/prototype/etf-detail" --out ./output/etf-detail
pnpm run generate -- --route /prototype/etf-detail --out ./output/etf-detail
pnpm run generate -- --vue prototype/src/views/prototype/etf/ETFDetailPage.vue --out ./output/etf-detail
```

## 7. 规划配置格式

下一阶段配置应升级为 A/B 项目描述：

```json
{
  "source": {
    "kind": "vue3-prototype",
    "location": {
      "type": "remote",
      "repo": "git@gitlab.company.com:group/prototype.git",
      "ref": "main"
    }
  },
  "target": {
    "kind": "flutter-app",
    "location": {
      "type": "remote",
      "repo": "git@gitlab.company.com:group/mobile-app.git",
      "ref": "develop"
    }
  },
  "input": {
    "route": "/prototype/trade"
  },
  "outputDir": "./output/stock-trade",
  "capture": {
    "enabled": false,
    "url": "http://localhost:5173/#/prototype/trade"
  }
}
```

本地模式：

```json
{
  "source": {
    "kind": "vue3-prototype",
    "location": {
      "type": "local",
      "path": "/Users/name/work/TradeAppPrd"
    }
  },
  "target": {
    "kind": "flutter-app",
    "location": {
      "type": "local",
      "path": "/Users/name/work/youfi"
    }
  }
}
```

## 8. Migration Context 当前结构

当前 TypeScript source of truth 是 `packages/core/src/types/index.ts`。

```ts
type MigrationContext = {
  source: PrototypePageAnalysis
  capture?: CaptureResult
  tokenMap: TokenMapResult
  target: FlutterContextAnalysis
  recommendations: MigrationRecommendations
}
```

主要字段：

- `source`：页面路由、screenId、页面配置、notes、i18n、源码和内部 source facts。
- `source.sfc`：内部调试和 planner 使用的 source facts。
- `capture`：可选截图、DOM snapshot、viewport、computed style。
- `tokenMap`：颜色、字体、未命中 token。
- `target`：Flutter 模块、路由、翻译、资源、可复用组件。
- `recommendations`：实现形态、实现规划、风险、人工确认项。

## 9. FlutterImplementationPlan 结构

`recommendations.implementationPlan` 是正式说明书最重要的 planning payload。

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

设计原则：

- `migration-context.json` 可以保留 source facts 和调试证据。
- `migration-spec.md` 应渲染 `FlutterImplementationPlan`，不渲染原始 source facts。
- Widget 树通过 page pattern + blueprint 生成，不应针对单一业务页面写死。

## 10. ProjectResolver / Adapter 规划

后续需要引入 `ProjectResolver`：

- 支持本地路径。
- 支持远程 GitLab 仓库。
- 支持 branch 或 tag ref。
- 缓存到 `.proto-bridge/cache/repos`。
- 输出 repo URL、ref、commit hash、本地路径等元信息。

SourceAdapter / TargetAdapter 后续应该从 core 主流程中抽象出来：

```text
ProjectResolver
  -> SourceAdapter
  -> TargetAdapter
  -> Planner
  -> SpecGenerator
```

## 11. Remote GitLab / Cache 规划

远程仓库应该 clone 到：

```text
.proto-bridge/cache/repos
```

该目录应被 Git 忽略。

第一版 remote 支持 branch/tag。commit pinning 可后续增加。

## 12. 风险与边界

- 配置解析目前是宽松文本解析，后续可升级为 AST 或受控动态 import。
- Capture 输出可能包含原型容器、手机框、导航框架，需要过滤。
- 页面模式分类是启发式，需要 confidence 和 fallback。
- 正式说明书不应泄露 source 技术栈细节。
- 缺少业务 notes、接口、风控或权限信息时，必须进入人工确认项。
