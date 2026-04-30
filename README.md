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

当前基础闭环已经跑通：

```text
route 或 Vue 文件
  -> 分析原型页面配置
  -> 读取 Vue 源码
  -> 读取 notes 文档
  -> 读取 i18n JSON
  -> 扫描样式 token
  -> 分析 YouFi Flutter 上下文
  -> 生成 migration-context.json
  -> 生成 migration-spec.md
```

已支持能力：

- 解析 `prototypeScreens.js` 和 `designScreens.js`。
- 支持通过 `--route` 查找页面，例如 `/prototype/trade`。
- 支持通过 `--vue` 指定 Vue 文件。
- 自动读取页面 Vue 源码。
- 自动查找 `prototype/notes/<module>/<ComponentName>.md`。
- 自动读取 `prototype/src/i18n/prototype/<screenId>.json`。
- 内置 YouFi 颜色 token 到 Flutter `themeService.colors` 的映射。
- 内置 YouFi typography mixin 到 Flutter `themeService.textStyles` 的映射。
- 扫描 Flutter 工程中的模块、路由文件、翻译文件、资源目录和通用组件。
- 根据原型模块推荐目标 Flutter 模块。
- 输出结构化 JSON 和 Markdown 迁移说明书。

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
│   ├── migration-spec-template.md
│   ├── context-schema.md
│   └── mcp-tools.md
├── examples/
│   └── stock-trade/
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── analyzers/
│   │       ├── capture/
│   │       ├── generators/
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

## 五、最小使用步骤

### 1. 确认两个工程路径

默认推荐路径：

```text
prototypeRoot = /Users/lrq/work/youfi/TradeAppPrd
flutterRoot   = /Users/lrq/work/youfi
```

这两个路径不应该写死在代码里，而是通过 CLI 参数传入。

### 2. 使用 route 生成迁移上下文

推荐先从 route 输入开始：

```bash
pnpm run generate -- \
  --prototype-root /Users/lrq/work/youfi/TradeAppPrd \
  --flutter-root /Users/lrq/work/youfi \
  --route /prototype/trade \
  --target flutter \
  --out ./output/stock-trade \
  --no-capture
```

执行成功后会输出：

```text
output/stock-trade/
├── migration-context.json
└── migration-spec.md
```

### 3. 使用 Vue 文件生成迁移上下文

如果暂时不知道 route，也可以指定 Vue 文件：

```bash
pnpm run generate -- \
  --prototype-root /Users/lrq/work/youfi/TradeAppPrd \
  --flutter-root /Users/lrq/work/youfi \
  --vue prototype/src/views/prototype/stock/StockTradePage.vue \
  --target flutter \
  --out ./output/stock-trade \
  --no-capture
```

### 4. 开启运行时截图和 DOM 提取

如果原型 dev server 已经启动，可以传入 `--prototype-url` 并去掉 `--no-capture`：

```bash
pnpm run generate -- \
  --prototype-root /Users/lrq/work/youfi/TradeAppPrd \
  --flutter-root /Users/lrq/work/youfi \
  --route /prototype/trade \
  --prototype-url http://127.0.0.1:5173/prototype/trade \
  --target flutter \
  --out ./output/stock-trade
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
| `--prototype-root` | 是 | TradeAppPrd 根目录 |
| `--flutter-root` | 是 | YouFi Flutter App 根目录 |
| `--route` | 二选一 | 原型或设计稿路由，例如 `/prototype/trade` |
| `--vue` | 二选一 | Vue 文件路径，可为绝对路径或相对 `prototypeRoot` |
| `--prototype-url` | 否 | 运行中的原型页面 URL，用于 Playwright capture |
| `--target` | 否 | 当前固定为 `flutter` |
| `--out` | 否 | 输出目录，相对路径会按调用命令时的目录解析 |
| `--no-capture` | 否 | 跳过截图和 DOM 提取 |

`--route` 和 `--vue` 必须二选一，不能同时传。

## 七、输出文件说明

### migration-context.json

机器可读的结构化上下文，主要包含：

- `source`：原型路由、screenId、Vue 文件、页面配置、notes、i18n。
- `capture`：截图、viewport、DOM tree、computed style。使用 `--no-capture` 时为空。
- `tokenMap`：颜色 token、字体 token、未命中 token。
- `target`：Flutter 模块建议、路由文件、翻译文件、资源目录、可复用组件。
- `recommendations`：推荐实现形态、Widget 拆分、风险和人工确认项。

### migration-spec.md

给人和 AI 共同使用的迁移说明书，主要包含：

- 页面元信息。
- 迁移结论。
- 页面结构拆分。
- Flutter Widget 拆分建议。
- 状态与交互建议。
- 路由与参数建议。
- 主题 token 映射。
- i18n 文案表。
- 资源迁移建议。
- 可复用 Flutter 组件。
- 原型 notes。
- 人工确认项。
- AI 实现提示词。

## 八、实现原理

### 1. 原型页面分析

入口：`packages/core/src/analyzers/prototype-page.ts`

分析过程：

1. 读取 `prototype/src/config/prototypeScreens.js`。
2. 读取 `prototype/src/config/designScreens.js`。
3. 从配置文件中提取 `prototypeModules` 或 `designModules` 数组。
4. 将模块和页面配置展开成页面索引。
5. 根据 `--route` 匹配 `path`，或根据 `--vue` 匹配 `view`。
6. 找到页面的 `screenId`、`module`、`label`、`status`、`owner`、`changelog` 等元信息。
7. 解析出实际 Vue 文件路径。
8. 读取 Vue 源码。
9. 按规则查找 notes 和 i18n。

第一版使用宽松 JS literal 提取方式解析配置文件，不要求配置文件是 JSON。解析逻辑封装在 `packages/core/src/utils/js-literal.ts`，后续可以替换为 AST 或动态 import。

### 2. Notes 查找规则

优先级：

1. 页面配置中显式声明的 notes 或 notesPath。
2. 根据 Vue 文件名猜测：

```text
prototype/notes/<module>/<ComponentName>.md
```

例如：

```text
screenId = stock.trade
view     = stock/StockTradePage.vue
notes    = prototype/notes/stock/StockTradePage.md
```

### 3. i18n 查找规则

根据 `screenId` 查找：

```text
prototype/src/i18n/prototype/<screenId>.json
```

例如：

```text
screenId = stock.trade
i18n     = prototype/src/i18n/prototype/stock.trade.json
```

### 4. Token 映射

入口：`packages/core/src/tokens/token-mapper.ts`

当前做两类扫描：

- CSS 变量：`var(--color-text-secondary)`、`--color-bg-base` 等。
- SCSS mixin：`@include small1-r`、`@include title-b` 等。

内置映射示例：

```text
--color-text-secondary -> themeService.colors.colorTextSecondary
--color-bg-base        -> themeService.colors.colorBgBase
@include small1-r      -> themeService.textStyles.small1R
@include title-b       -> themeService.textStyles.titleB
```

未命中的 token 会进入 `unresolved`，在 Markdown 中提示人工确认。

### 5. Flutter 上下文分析

入口：`packages/core/src/analyzers/flutter-context.ts`

分析内容：

- 扫描 `lib/app/modules/**` 获取已有模块。
- 查找 `lib/app/routes/app_routes.dart`。
- 查找 `lib/app/routes/app_pages.dart`。
- 查找翻译文件：
  - `lib/app/translations/en_US.dart`
  - `lib/app/translations/zh_CN.dart`
  - `lib/app/translations/zh_HK.dart`
- 查找资源目录：
  - `assets/images`
  - `assets/dark_images`
  - `assets/svg`
- 根据内置模块表推荐目标模块。
- 尝试列出可复用公共组件。

当前内置模块映射：

```text
stock         -> order
options       -> option
options-trade -> option
account       -> account
asset         -> account
security      -> auth
onboard       -> account
```

### 6. 迁移文档生成

入口：

- `packages/core/src/generators/migration-context.ts`
- `packages/core/src/generators/migration-spec.ts`

生成流程：

```text
analyzePrototypePage
  -> mapTokens
  -> analyzeFlutterContext
  -> optional capturePrototypePage
  -> createMigrationContext
  -> renderMigrationSpec
  -> write migration-context.json
  -> write migration-spec.md
```

推荐实现形态会根据 Vue 源码中是否存在 `ref`、`reactive`、`computed`、`@click`、`v-model` 等交互迹象初步判断。当前只是启发式判断，不等价于完整业务语义分析。

## 九、当前验证结果

已用以下命令完成基础验证：

```bash
pnpm run typecheck
pnpm run build
pnpm run generate -- \
  --prototype-root /Users/lrq/work/youfi/TradeAppPrd \
  --flutter-root /Users/lrq/work/youfi \
  --route /prototype/trade \
  --target flutter \
  --out ./output/stock-trade \
  --no-capture
```

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

状态：已生成第一版。

后续增强：

- 根据 Vue template 自动推断页面区块。
- 根据 script 自动提取状态、事件、路由跳转和 mock 数据。
- 自动提取资源引用。
- 自动生成更精确的 Flutter Widget 拆分表。
- 增加风险等级和实现优先级。

### Phase 6：MCP 封装

状态：骨架预留。

后续增强：

- 引入 MCP SDK。
- 封装以下工具：
  - `analyzePrototypePage`
  - `capturePrototypePage`
  - `mapTokens`
  - `analyzeFlutterContext`
  - `generateMigrationSpec`
- 保持 MCP 层只做协议封装，不写业务逻辑。

## 十一、未来优化方向

### 1. 配置解析升级

当前配置解析是宽松文本解析，足够跑通第一版，但仍有边界风险。

可选升级方向：

- 使用 AST 解析 JS 模块。
- 在 TradeAppPrd 中导出机器可读 JSON。
- 使用受控动态 import 加载配置。
- 为配置解析增加 fixture 测试。

### 2. Vue SFC 深度分析

当前主要读取 Vue 源码并做启发式扫描。

后续可以进一步解析：

- template AST。
- script setup AST。
- props、emits、ref、computed、watch。
- `@click`、`v-model`、`v-if`、`v-for`。
- 路由跳转和 query 参数。
- mock 数据结构。
- 图片、SVG、icon、背景图资源。

### 3. 设计 token 智能映射

当前是内置映射表。

后续可以增强为：

- 自动读取原型 token。
- 自动读取 Flutter theme extension。
- 基于名称相似度做候选推荐。
- 基于颜色值反查语义 token。
- 标记 raw color、hardcoded spacing、非语义字号。

### 4. Flutter 落地建议增强

后续可以让 spec 更贴近 YouFi 的真实代码风格：

- 推荐 View、Controller、Binding、Route 文件路径。
- 推荐 GetX 路由注册代码位置。
- 推荐翻译文件新增 key 的位置。
- 推荐资源迁移路径。
- 推荐可复用 Widget 的 import。
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

原型页面和 Flutter App 之间不只是语法差异，还涉及目标模块、路由、状态管理、主题、i18n、资源和已有公共组件。如果直接生成 Dart，AI 容易把 Vue DOM 直译成 Flutter Widget，反而增加返工成本。

ProtoBridge 的第一步是先生成迁移上下文，让实现者和 AI 都知道应该怎么落地。

### 为什么 `--no-capture` 是推荐起点？

截图和 DOM 提取依赖原型 dev server、浏览器环境和页面运行状态。第一版先把静态上下文跑稳定，后续再把 runtime capture 作为增强输入加入。

### 输出的 warnings 是错误吗？

不一定。warnings 表示“需要人工确认或后续增强”的信息。例如跳过 capture、某些 CSS token 未命中语义映射，都属于正常的第一版提示。

### 相对 `--out` 路径按哪里解析？

相对路径会按执行 `pnpm run generate` 时的目录解析，而不是 `packages/cli` 目录。这样在项目根目录执行命令时，输出会落到根目录的 `output/` 下。
