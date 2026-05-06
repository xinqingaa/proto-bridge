# ProtoBridge Agent 工作指南

## 1. 项目定位

ProtoBridge 是一个“原型到实现”的上下文桥接工具。它读取 source project 和 target project，生成可由人工审查、修订并交给 AI coding 工具继续实现的迁移上下文与说明书。

它不定位为 Vue 转 Dart，也不追求一键完美迁移。它的核心价值是把页面结构、交互逻辑、设计 token、资源、路由、notes、i18n 和目标端工程约束整理成稳定的实现上下文。

当前默认组合：

```text
source.adapter = vue3-prototype
target.adapter = flutter-app
```

A/B/C 模型：

```text
A = Source project，需求或原型所在项目
B = Target project，真实实现所在项目
C = ProtoBridge，读取 A 和 B 后生成实现说明书的桥接工具
```

## 2. 工作原则

- core 主流程只负责编排，不直接写死具体技术栈。
- 具体 source 技术栈放入 `SourceAdapter`。
- 具体 target 技术栈放入 `TargetAdapter`。
- CLI 和 MCP 只是入口层，不能复制 analyzer、planner 或 generator 逻辑。
- 新能力优先放在 `packages/core/src/adapters/**` 或 core 通用模块。
- 具体技术栈实现只放在 `packages/core/src/adapters/**`。
- 配置入口以 `source` 和 `target` project 描述为准。
- 文档描述当前架构和当前行为，不写历史迁移叙事。

## 3. 工程结构

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
├── generators/
├── planners/
├── types/
└── utils/
```

职责：

- `adapters/source/vue3-prototype`：读取 Vue3 原型工程。
- `adapters/target/flutter-app`：读取 Flutter 工程并生成 Flutter-facing 规划。
- `capture`：Playwright 运行时截图和 DOM 提取。
- `generators`：生成 migration context 和 markdown spec。
- `planners`：页面模式、Widget blueprint 和命名策略。
- `types`：共享数据模型。
- `utils`：通用工具。

## 4. 配置模型

当前配置使用 adapter project 描述：

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

页面输入可以来自：

- `url`
- `route`
- `vue`
- CLI 参数 `--url`、`--route`、`--vue`

## 5. Core 主流程

入口：`packages/core/src/generators/migration-context.ts`

流程：

```text
GenerateMigrationSpecInput
  -> AdapterRegistry.getSource(input.source.adapter)
  -> AdapterRegistry.getTarget(input.target.adapter)
  -> SourceAdapter.analyze
  -> optional capturePrototypePage
  -> TargetAdapter.mapTokens
  -> TargetAdapter.analyze
  -> TargetAdapter.buildImplementationPlan
  -> MigrationContext
```

`packages/core/src/generators/migration-spec.ts` 负责把 `MigrationContext` 渲染成 Markdown。

## 6. SourceAdapter：vue3-prototype

入口：`packages/core/src/adapters/source/vue3-prototype/prototype-page.ts`

读取：

```text
prototype/src/config/prototypeScreens.js
prototype/src/config/designScreens.js
prototype/notes/**
prototype/src/i18n/prototype/**
prototype/src/views/**
```

输出：

- 页面源码。
- page type：`prototype` / `design`。
- route path。
- screenId。
- module。
- label/title。
- view path。
- notes。
- i18n。
- changelog/status/owner。
- SFC facts。
- warnings。

## 7. SFC 语义分析

入口：`packages/core/src/adapters/source/vue3-prototype/vue-sfc.ts`

分析内容：

- sections / semantic components。
- interactions。
- state / constants / functions。
- routes / query / back 行为。
- lifecycle / event listener。
- layout hints。
- assets。
- style token usage。

这些内容进入 `migration-context.json`，用于调试、planner 和人工审查。正式 `migration-spec.md` 不直接输出 Vue 模板语法或 DOM/class 证据。

## 8. Runtime Capture

入口：`packages/core/src/capture/playwright-capture.ts`

用途：获取运行时布局信息，补充静态 SFC 分析。

输入：

- `prototypeUrl`
- `outDir`
- viewport

输出：

- screenshot path。
- DOM snapshot path。
- viewport。
- visible DOM tree。
- text content。
- bounding box。
- computed style。
- warnings。

Capture 失败时写入 warnings，不阻断静态上下文生成。

## 9. TargetAdapter：flutter-app

入口：`packages/core/src/adapters/target/flutter-app/flutter-context.ts`

读取：

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

输出：

- existingModules。
- suggestedModule。
- routesFiles。
- translationFiles。
- assetDirectories。
- reusableWidgets。
- similarFiles。
- warnings。

## 10. Token 映射

入口：`packages/core/src/adapters/target/flutter-app/token-mapper.ts`

职责：

- 扫描 source code 中的 CSS color token。
- 扫描 typography mixin。
- 接收 runtime computed style fallback。
- 输出 colors、typography 和 unresolved。

目标写法：

- `themeService.colors.*`
- `themeService.textStyles.*`

未命中 token 必须进入 unresolved，不要伪造确定映射。

## 11. Flutter 实现规划

入口：`packages/core/src/adapters/target/flutter-app/flutter-implementation-plan.ts`

职责：

- 判断页面复杂度。
- 生成目标文件拆分。
- 生成 Widget 组合树。
- 生成 Widget 输入契约。
- 生成状态管理组合建议。
- 生成 Controller/Adapter 边界。
- 生成禁止直译项。
- 生成 P0/P1/P2 checklist。

规划原则：

- 不把来源页面结构逐层翻译成 Flutter Widget。
- 不把临时 mock 数据直接写在 Widget build 中。
- 不让每个子 Widget 都直接依赖整个 Controller。
- 复杂页面先按 UI 状态、业务数据、派生状态和生命周期副作用归类。

## 12. 输出文件

### migration-context.json

机器可读上下文，包含 source、capture、tokenMap、target 和 recommendations。

### migration-spec.md

Flutter-facing 迁移说明书，包含：

- 页面元信息。
- 迁移结论。
- Flutter 实现规划。
- 页面结构拆分。
- Widget 拆分建议。
- 状态与交互。
- 路由与参数。
- 布局模型。
- 主题 Token 映射。
- i18n。
- 资源迁移。
- 可复用 Flutter 组件。
- 人工确认项。
- AI 实现提示词。

## 13. CLI 使用

```bash
pnpm run generate -- --route /prototype/trade --out ./output/stock-trade --no-capture
```

可用参数：

- `--config <file>`
- `--url <url>`
- `--route <route>`
- `--vue <file>`
- `--prototype-url <url>`
- `--source-adapter <id>`
- `--target-adapter <id>`
- `--out <dir>`
- `--no-capture`
- `--capture`

## 14. MCP 使用原则

MCP 层只导出 core 能力，不写业务逻辑。MCP 工具命名应围绕 adapter 和项目语义，例如：

- `listSupportedAdapters`
- `analyzeSourceProject`
- `analyzeTargetProject`
- `generateMigrationSpec`

## 15. 质量标准

生成的 `migration-spec.md` 至少应做到：

- 明确页面名称、route、screenId 和目标模块。
- 明确 Flutter 实现复杂度。
- 明确目标文件拆分和 Widget 树。
- 明确状态、交互和生命周期副作用。
- 明确路由参数和跳转行为。
- 明确布局风险：fixed、sticky、scroll、safe-area、z-index 等。
- 明确 token、i18n 和资源迁移建议。
- 明确可复用 Flutter 组件。
- 明确人工确认项。

## 16. 风险边界

- JS 配置解析可能无法覆盖复杂动态逻辑，遇到不确定信息应写 warnings。
- Capture 依赖运行时环境，不应作为唯一输入。
- Target context 是建议，不替代目标 App 的代码审查。
- 交易类页面涉及权限、风控、埋点和异常态，需要保留人工确认项。
- 输出结果必须可审查，不把推断内容伪装成确定事实。
