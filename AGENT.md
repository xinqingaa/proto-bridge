# ProtoBridge 第一版实施计划

## 1. 项目定位

ProtoBridge 是一个“原型到实现”的上下文桥接工具。

它不直接定位为 Vue 转 Dart，也不绑定 Flutter。它的职责是从原型页面中提取页面结构、交互逻辑、设计 Token、资源、路由和目标端上下文，生成一份可由人工修缮、再交给 AI 工具继续实现的迁移说明书。

第一版目标只服务于：

- 输入：TradeAppPrd 的 Vue 原型页面
- 目标端上下文：YouFi Flutter App
- 输出：`migration-context.json` 和 `migration-spec.md`

第一版明确不做：

- 不直接生成 Dart 页面代码
- 不追求一键完美迁移
- 不以 OCR 作为主输入
- 不处理复杂 Figma 还原
- 不把核心逻辑写死在 MCP 层

## 2. 推荐工程位置

正式位置：

```text
/Users/lrq/work/proto-bridge
```

如果当前窗口或权限不方便，也可以先放在 YouFi 主项目内：

```text
/Users/lrq/work/youfi/proto-bridge
```

完成后迁移出去即可。工程内部不要依赖自身所在目录，应通过配置指定两个项目路径：

```text
prototypeRoot = /Users/lrq/work/youfi/TradeAppPrd
flutterRoot   = /Users/lrq/work/youfi
```

## 3. 总体架构

核心原则：CLI、MCP 都只是入口，真正的分析能力放在 `core`。

```text
proto-bridge/
├── package.json
├── tsconfig.base.json
├── README.md
├── docs/
│   ├── migration-spec-template.md
│   ├── context-schema.md
│   └── mcp-tools.md
├── examples/
│   └── stock-trade/
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types/
│   │       ├── analyzers/
│   │       │   ├── prototype-page.ts
│   │       │   ├── flutter-context.ts
│   │       │   └── vue-sfc.ts
│   │       ├── capture/
│   │       │   └── playwright-capture.ts
│   │       ├── tokens/
│   │       │   └── token-mapper.ts
│   │       ├── generators/
│   │       │   ├── migration-context.ts
│   │       │   └── migration-spec.ts
│   │       └── utils/
│   ├── cli/
│   │   ├── package.json
│   │   └── src/
│   │       └── index.ts
│   └── mcp-server/
│       ├── package.json
│       └── src/
│           └── index.ts
```

## 4. 第一版五个能力

### 4.1 analyzePrototypePage

输入：

- Vue 文件路径，例如：

```text
prototype/src/views/prototype/stock/StockTradePage.vue
```

- 或原型路由，例如：

```text
/prototype/trade
```

输出：

- 页面源码
- 页面类型：`prototype` / `design`
- route path
- screenId
- module
- label
- view 路径
- notes 文档内容
- i18n JSON
- 页面配置 changelog/status/owner

需要读取：

```text
TradeAppPrd/prototype/src/config/prototypeScreens.js
TradeAppPrd/prototype/src/config/designScreens.js
TradeAppPrd/prototype/notes/**
TradeAppPrd/prototype/src/i18n/prototype/**
```

实现建议：

- 第一版可以用文本解析配置文件，不需要完整 JS AST。
- 但要把解析函数封装好，后续可替换为 AST 或动态 import。
- 页面 notes 规则优先：
  - 配置或页面显式 notes
  - 否则按 `prototype/notes/<module>/<ComponentName>.md` 猜测

### 4.2 capturePrototypePage

用途：获取真实运行时布局，而不是只看 Vue 模板猜。

输入：

- `prototypeUrl`，例如：

```text
http://127.0.0.1:5173/prototype/trade
```

- 或由工具启动 dev server 后访问

输出：

- screenshot path
- viewport
- visible DOM tree
- text content
- bounding box
- computed style
- clickable hints
- scroll containers

实现建议：

- 使用 Playwright。
- 第一版不自动启动 dev server，要求调用者传入 `--prototype-url`。
- 后续再加 `--start-dev-server`。

DOM 提取字段建议：

```ts
type DomNodeSnapshot = {
  tag: string
  className?: string
  id?: string
  text?: string
  role?: string
  bbox?: { x: number; y: number; width: number; height: number }
  computedStyle?: {
    display?: string
    position?: string
    flexDirection?: string
    alignItems?: string
    justifyContent?: string
    gap?: string
    padding?: string
    margin?: string
    color?: string
    backgroundColor?: string
    fontSize?: string
    fontWeight?: string
    lineHeight?: string
    borderRadius?: string
    overflow?: string
  }
  children?: DomNodeSnapshot[]
}
```

注意：

- 截图/OCR 只做辅助，不作为主输入。
- DOM 和 computed style 比 OCR 更重要。

### 4.3 mapTokens

用途：把原型 CSS Token 映射到目标端主题系统。

第一版目标端只支持 Flutter。

输入：

- CSS 变量名
- SCSS typography mixin
- computed style 中的颜色/字号

输出：

- Flutter token 写法
- 是否命中语义 Token
- fallback 原因

关键映射：

```text
--color-text-normal       -> themeService.colors.colorTextNormal
--color-text-title        -> themeService.colors.colorTextTitle
--color-text-description  -> themeService.colors.colorTextDescription
--color-text-secondary    -> themeService.colors.colorTextSecondary
--color-text-label        -> themeService.colors.colorTextLabel
--color-bg-base           -> themeService.colors.colorBgBase
--color-bg-surface-1      -> themeService.colors.colorBgSurface1
--color-bg-surface-2      -> themeService.colors.colorBgSurface2
--color-light-line        -> themeService.colors.colorLightLine
--color-heavy-line        -> themeService.colors.colorHeavyLine
--color-trend-red-1       -> themeService.colors.colorTrendRed1
--color-trend-green-1     -> themeService.colors.colorTrendGreen1
```

Typography 映射：

```text
@include headline-b -> themeService.textStyles.headlineB
@include headline-m -> themeService.textStyles.headlineM
@include title-b    -> themeService.textStyles.titleB
@include title-m    -> themeService.textStyles.titleM
@include body-m     -> themeService.textStyles.bodyM
@include body-r     -> themeService.textStyles.bodyR
@include small1-m   -> themeService.textStyles.small1M
@include small1-r   -> themeService.textStyles.small1R
@include small2-r   -> themeService.textStyles.small2R
@include small3-r   -> themeService.textStyles.small3R
@include small4-r   -> themeService.textStyles.small4R
@include small4-m   -> themeService.textStyles.small4M
@include number1-b  -> themeService.textStyles.number1B
@include number2-b  -> themeService.textStyles.number2B
@include number3-b  -> themeService.textStyles.number3B
@include tab-b      -> themeService.textStyles.tabB
@include tab-m      -> themeService.textStyles.tabM
```

需要读取：

```text
TradeAppPrd/prototype/src/tokens/design-tokens.js
TradeAppPrd/prototype/src/style.scss
youfi/lib/app/services/theme_service.dart
youfi/lib/app/common/theme/app_colors_extension.dart
youfi/lib/app/common/theme/text_style_extension.dart
```

第一版可以内置 Flutter 映射表，后续再从文件自动生成。

### 4.4 analyzeFlutterContext

用途：让生成的迁移说明书贴近真实 Flutter App，而不是通用 Flutter。

输入：

- `flutterRoot`
- 原型 module / screenId / route
- 可选 target module

输出：

- 可能对应的 Flutter module
- 已有 common widgets
- 路由文件位置
- 翻译文件位置
- 资源目录建议
- 可能复用的相似页面或组件

需要扫描：

```text
lib/app/modules/**
lib/app/common/widget/**
lib/app/common/pop/**
lib/app/routes/app_routes.dart
lib/app/routes/app_pages.dart
lib/app/translations/en_US.dart
lib/app/translations/zh_CN.dart
lib/app/translations/zh_HK.dart
pubspec.yaml
assets/images/**
assets/dark_images/**
```

第一版推荐内置重点组件清单：

```text
CommonAppBar
CommonButton
CommonImage
CommonSvg
CommonNetImage
CommonToast
CommonEmpty
CommonLoading
Pop.sheet
YouFiPop
BaseGetView
BaseGetPullView
```

模块映射第一版可以先做配置表：

```ts
const moduleMap = {
  stock: 'order',
  options: 'option',
  'options-trade': 'option',
  account: 'account',
  asset: 'account',
  security: 'auth',
  onboard: 'account',
}
```

后续根据实际迁移结果修正。

### 4.5 generateMigrationSpec

用途：生成给人和 AI 共同使用的 Markdown。

输出：

```text
output/<screenId>/migration-context.json
output/<screenId>/migration-spec.md
output/<screenId>/screenshot.png
```

Markdown 模板建议：

```md
# <页面名> Flutter 迁移说明书

## 页面元信息
- 原型路由：
- screenId：
- 原型文件：
- 页面类型：
- 推荐 Flutter 模块：
- 推荐实现形态：

## 一、迁移结论
- 页面复杂度：
- 建议是否直接实现：
- 主要风险：

## 二、页面结构拆分
- Scaffold
- AppBar
- 主滚动区
- 固定底部栏
- Sheet/Dialog
- 局部组件

## 三、Flutter Widget 拆分建议
| Widget | 类型 | 职责 | 备注 |
| --- | --- | --- | --- |

## 四、状态与交互
| 原型状态/事件 | Flutter 建议 | 备注 |
| --- | --- | --- |

## 五、路由与参数
| 原型 route/query | Flutter GetX 建议 |
| --- | --- |

## 六、主题 Token 映射
| 原型样式 | Flutter 写法 | 命中情况 |
| --- | --- | --- |

## 七、文案与 i18n
| key | zh_CN | zh_HK | en_US | Flutter 建议 |
| --- | --- | --- | --- | --- |

## 八、资源迁移
| 资源 | 原型路径 | Flutter 建议路径 | 暗色模式 |
| --- | --- | --- | --- |

## 九、可复用 Flutter 组件
| 场景 | 推荐组件 |
| --- | --- |

## 十、人工确认项
- [ ] ...

## 十一、AI 实现提示词
```
请基于本文档在 YouFi Flutter App 中实现该页面...
```
```

## 5. CLI 设计

第一版命令：

```bash
npm run generate -- \
  --prototype-root /Users/lrq/work/youfi/TradeAppPrd \
  --flutter-root /Users/lrq/work/youfi \
  --route /prototype/trade \
  --prototype-url http://127.0.0.1:5173/prototype/trade \
  --target flutter \
  --out ./output/stock-trade
```

也支持文件路径：

```bash
npm run generate -- \
  --prototype-root /Users/lrq/work/youfi/TradeAppPrd \
  --flutter-root /Users/lrq/work/youfi \
  --vue prototype/src/views/prototype/stock/StockTradePage.vue \
  --prototype-url http://127.0.0.1:5173/prototype/trade \
  --target flutter \
  --out ./output/stock-trade
```

参数：

```text
--prototype-root   必填，TradeAppPrd 根目录
--flutter-root     必填，YouFi Flutter 根目录
--route            route 输入，和 --vue 二选一
--vue              Vue 文件输入，和 --route 二选一
--prototype-url    可选，用于 Playwright 截图和 DOM 提取
--target           第一版固定 flutter
--out              输出目录
--no-capture       跳过 Playwright
```

## 6. MCP 工具设计

MCP 第一版只封装 core 能力，不写复杂业务逻辑。

工具列表：

```text
analyzePrototypePage
capturePrototypePage
mapTokens
analyzeFlutterContext
generateMigrationSpec
```

### analyzePrototypePage

输入：

```json
{
  "prototypeRoot": "/Users/lrq/work/youfi/TradeAppPrd",
  "route": "/prototype/trade"
}
```

输出：`PrototypePageAnalysis`

### capturePrototypePage

输入：

```json
{
  "url": "http://127.0.0.1:5173/prototype/trade",
  "outDir": "./output/stock-trade"
}
```

输出：`CaptureResult`

### mapTokens

输入：

```json
{
  "prototypeRoot": "/Users/lrq/work/youfi/TradeAppPrd",
  "flutterRoot": "/Users/lrq/work/youfi",
  "target": "flutter"
}
```

输出：`TokenMapResult`

### analyzeFlutterContext

输入：

```json
{
  "flutterRoot": "/Users/lrq/work/youfi",
  "prototypeModule": "stock",
  "screenId": "stock.trade"
}
```

输出：`FlutterContextAnalysis`

### generateMigrationSpec

输入：

```json
{
  "prototypeRoot": "/Users/lrq/work/youfi/TradeAppPrd",
  "flutterRoot": "/Users/lrq/work/youfi",
  "route": "/prototype/trade",
  "prototypeUrl": "http://127.0.0.1:5173/prototype/trade",
  "target": "flutter",
  "outDir": "./output/stock-trade"
}
```

输出：生成文件路径。

## 7. 数据结构建议

### MigrationContext

```ts
type MigrationContext = {
  source: {
    prototypeRoot: string
    pageType: 'prototype' | 'design'
    route?: string
    vuePath: string
    screenId?: string
    module?: string
    label?: string
    sourceCode?: string
    notes?: string
    i18n?: Record<string, unknown>
  }
  capture?: {
    screenshotPath?: string
    viewport?: { width: number; height: number }
    domTree?: DomNodeSnapshot[]
  }
  tokenMap: {
    colors: TokenMapping[]
    typography: TokenMapping[]
    unresolved: TokenMapping[]
  }
  target: {
    platform: 'flutter'
    flutterRoot: string
    suggestedModule?: string
    reusableWidgets: string[]
    routesFiles: string[]
    translationFiles: string[]
    assetDirectories: string[]
    similarFiles: string[]
  }
  recommendations: {
    implementationShape: 'StatelessWidget' | 'StatefulWidget' | 'BaseGetView'
    widgetBreakdown: WidgetRecommendation[]
    risks: string[]
    manualQuestions: string[]
  }
}
```

### TokenMapping

```ts
type TokenMapping = {
  source: string
  target?: string
  targetPlatform: 'flutter'
  confidence: 'high' | 'medium' | 'low'
  reason?: string
}
```

### WidgetRecommendation

```ts
type WidgetRecommendation = {
  name: string
  type: 'page' | 'section' | 'component' | 'sheet' | 'dialog'
  responsibility: string
  suggestedFlutterWidget?: string
  notes?: string
}
```

## 8. 实施阶段

### Phase 0：工程骨架

目标：能安装依赖，能跑 CLI 空命令。

任务：

- [ ] 创建 monorepo
- [ ] 配置 TypeScript
- [ ] 创建 `packages/core`
- [ ] 创建 `packages/cli`
- [ ] 创建 `packages/mcp-server`
- [ ] 写 README
- [ ] 写基础配置示例

验收：

```bash
npm install
npm run typecheck
npm run build
```

### Phase 1：Prototype 分析

目标：输入 route 或 Vue 文件，输出页面元信息。

任务：

- [ ] 解析 `prototypeScreens.js`
- [ ] 解析 `designScreens.js`
- [ ] route -> screen config
- [ ] view -> Vue 文件
- [ ] 查找 notes
- [ ] 查找 i18n
- [ ] 输出 `prototype-analysis.json`

验收：

```bash
npm run generate -- --route /prototype/trade --no-capture
```

能输出：

- screenId = `stock.trade`
- view = `stock/StockTradePage.vue`
- Vue 源码
- notes 文档
- i18n 内容

### Phase 2：Token 映射

目标：能从样式和 Token 表输出 Flutter 主题建议。

任务：

- [ ] 内置 CSS color -> Flutter color map
- [ ] 内置 mixin -> Flutter text style map
- [ ] 扫描 Vue style 中的 CSS var
- [ ] 扫描 Vue style 中的 `@include`
- [ ] 输出命中和未命中列表

验收：

`migration-spec.md` 中出现：

```text
--color-text-secondary -> themeService.colors.colorTextSecondary
@include small1-r -> themeService.textStyles.small1R
```

### Phase 3：Flutter 上下文分析

目标：让 spec 能告诉 AI 在 App 中怎么落地。

任务：

- [ ] 扫描 Flutter module
- [ ] 扫描 common widgets
- [ ] 检查 route 文件
- [ ] 检查 translation 文件
- [ ] 检查 assets 目录
- [ ] 根据 moduleMap 推荐目标模块

验收：

`migration-spec.md` 中出现：

- 推荐模块
- 可复用组件
- 路由文件
- 翻译文件
- 资源目录建议

### Phase 4：Playwright Capture

目标：获取运行时 DOM 和截图。

任务：

- [ ] 接收 `--prototype-url`
- [ ] 截图保存
- [ ] 提取 DOM tree
- [ ] 提取 bounding box
- [ ] 提取 computed style
- [ ] 写入 `migration-context.json`

验收：

输出目录包含：

```text
screenshot.png
dom-snapshot.json
```

### Phase 5：生成迁移说明书

目标：产出第一版可用 Markdown。

任务：

- [ ] 汇总 Prototype 分析
- [ ] 汇总 Capture
- [ ] 汇总 Token 映射
- [ ] 汇总 Flutter 上下文
- [ ] 生成 `migration-context.json`
- [ ] 生成 `migration-spec.md`

验收：

Markdown 能直接交给 AI 实现 Flutter 页面，且包含：

- 页面结构
- widget 拆分
- 状态与交互
- token 映射
- i18n
- 资源
- 人工确认项

### Phase 6：MCP 封装

目标：让 Claude Code、Cursor、Codex 等工具可以通过 MCP 调用同一套能力。

任务：

- [ ] 引入 MCP SDK
- [ ] 封装 5 个工具
- [ ] 编写 MCP 配置说明
- [ ] 保持 MCP 层无业务逻辑

验收：

AI 工具能调用：

```text
generateMigrationSpec
```

并拿到生成文件路径。

## 9. 第一版完成标准

选择一个中等复杂度页面，例如：

```text
/prototype/trade
```

执行命令后生成：

```text
output/stock-trade/
├── migration-context.json
├── migration-spec.md
├── screenshot.png
└── dom-snapshot.json
```

`migration-spec.md` 至少满足：

- 不把 Vue 当 Dart 直译
- 明确推荐 Flutter 页面形态
- 明确哪些地方用 `themeService.colors`
- 明确哪些地方用 `themeService.textStyles`
- 明确哪些 App 公共组件可复用
- 明确哪些文案需要 `.tr`
- 明确哪些资源需要迁移或确认
- 明确人工确认项

## 10. 风险与边界

### 10.1 配置文件解析风险

`prototypeScreens.js` 是 JS 文件，不是 JSON。

第一版可以用宽松文本解析，但后续建议改成：

- 运行时动态 import
- 或用 AST 解析
- 或在 TradeAppPrd 中导出机器可读 JSON

### 10.2 DOM 结构过深

Vue DOM 包含原型容器、手机框、导航框架。

capture 时需要过滤：

- 左侧导航
- 右侧 notes
- phone frame 外壳
- dev 工具按钮

第一版可以先不过滤完整，只在 spec 中标注“需人工清理”。

### 10.3 目标端不止 Flutter

第一版只做 Flutter，但架构不能写死。

建议所有 target 写成：

```ts
target: 'flutter' | 'react' | 'android' | 'ios'
```

第一版只实现 `flutter` 分支。

### 10.4 MCP 兼容性

不同 AI 工具对 MCP 支持程度不同。

因此必须保留 CLI，MCP 只做封装。

## 11. 后续扩展方向

第二版可以考虑：

- React target
- Android XML/Compose target
- iOS SwiftUI/UIKit target
- Figma MCP 输入
- 自动生成 Flutter TODO patch
- 与截图做视觉差异比对
- 自动检查 raw color / hardcoded text
- 自动生成资源迁移报告
- 自动生成 i18n key 建议

## 12. 推荐第一步

先完成 Phase 0 和 Phase 1，不要同时做 Playwright 和 MCP。

第一步最小闭环：

```text
route 或 Vue 文件
  -> analyzePrototypePage
  -> migration-context.json
  -> migration-spec.md 的页面元信息和 notes 部分
```

只要这一步稳定，后续 Token、Flutter Context、Capture 都是逐步增强。
