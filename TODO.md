# TODO

## 开源示例：Vue3 Source 到 Flutter Target

目标是用一个完整但克制的示例，把 ProtoBridge 的核心价值讲清楚：它不是把 Vue 直译成 Flutter，而是把原型源码、运行时证据和目标工程规范整理成可审查、可追溯、可验证的实现上下文。

当前内置适配重点是：

```text
source: vue3-prototype
target: flutter-app
```

其他技术栈可以通过 source/target adapter 扩展，但是否值得扩展取决于团队的技术跨度、原型规范、目标工程约定和交付链路复杂度。本项目首先服务 Vue3 原型到 Flutter 客户端实现这个真实场景。

### 1. 建立示例工程

规划目录：

```text
examples/vue3-to-flutter/
├── source-vue3/
├── target-flutter/
├── output/
├── screenshots/
└── README.md
```

- `source-vue3/`：可运行的 Vue3 交互原型，不做玩具 demo，要有接近真实原型工程的目录、路由、状态管理和样式组织。
- `target-flutter/`：可运行或接近可运行的 Flutter 示例工程，不只放零散代码片段，要展示 target conventions、routes、theme、i18n、assets、state management、feature structure 和 validation。
- `output/`：提交一次完成后的 artifact set。
- `screenshots/`：提交原型截图、Flutter 还原效果图和关键对比图。
- `README.md`：完整 walkthrough，说明如何运行、如何读产物、如何理解还原结果。

### 2. 工程成熟度要求

示例工程需要体现 ProtoBridge 面向真实团队协作，而不是只为了跑通 happy path。

`source-vue3/` 建议使用：

- Vue3 + Vite。
- Vue Router，路由路径保持和当前 adapter 的 URL-first 规则兼容。
- Pinia，用于页面筛选、列表数据、弹层状态或异步状态。
- 独立 CSS 或 scoped style，保留布局、颜色、间距、状态样式等可被 runtime/source evidence 捕捉的设计信息。
- `prototype/src/config/prototypeScreens.js`、`prototype/src/config/designScreens.js`、`prototype/src/views/prototype` 等目录结构要符合当前 `vue3-prototype` adapter 预期。
- notes、i18n、mock data、assets 可以少量但要真实存在，方便展示 source evidence 的价值。

`target-flutter/` 建议使用：

- Flutter 3.x。
- `flutter_bloc` / `bloc` 做简化但真实的状态管理，不只用 `setState`。
- 路由、主题、色板、文本样式、spacing/token、assets、l10n 或简化 i18n 目录。
- feature-first 或团队常见的分层结构，例如 `features/*/presentation`、`application`、`domain`、`data`。
- 至少包含目标页面所在 feature 的 screen、bloc/cubit、state、models、widgets、mock repository。
- 页面实现要能体现 Flutter target conventions，而不是把 Vue 结构照搬过去。

### 3. 设计示例页面

示例建议做两个页面，分别验证低复杂度和高复杂度场景。

简单页面：

- 标题、摘要区域和基础列表。
- 少量筛选或分组。
- 空态或 loading 态。
- 用于证明 ProtoBridge 可以处理常见列表页，而不是只处理复杂页面。

复杂页面：

- 顶部导航和页面标题。
- tab 或筛选控件。
- 数据卡片或摘要指标。
- 列表或交易记录。
- 图表、趋势或关键数值区域。
- 空态、loading 或错误态中的一种。
- 至少两个交互状态，例如 tab 切换、筛选展开、详情弹层、确认弹层、局部刷新。
- 用于证明 ProtoBridge 可以把 source evidence、runtime evidence 和 target conventions 汇合成更完整的实现上下文。

### 4. 提交完整产物

`examples/vue3-to-flutter/output/` 应包含：

```text
simple/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/full-page.png
complex/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/full-page.png
```

示例 README 中说明推荐阅读顺序：

```text
ui-build-review.md
ui-build-plan.json
page-debug-index.json
page-canonical.json
screenshots/full-page.png
```

### 5. 根 README 的展示方式

根 README 不放完整大 JSON，只展示高价值片段和效果图。

建议展示：

- 原型截图。
- Flutter 还原效果图。
- 简单页面和复杂页面各 1 组关键对比。
- `ui-build-review.md` 精选片段。
- `ui-build-plan.json` 精选片段。
- source/runtime/target evidence 汇合的简短说明。

较长内容使用 `<details>` 折叠，避免 README 被 artifact 细节淹没。

### 6. 说明还原效果

示例文档需要明确：

- 原型页面长什么样。
- Flutter target 预期还原到什么程度。
- 哪些判断来自 source evidence。
- 哪些判断来自 runtime screenshot、DOM、bbox 或 computed style。
- 哪些判断来自 target conventions。
- 哪些仍然是 manual confirmation。

### 7. 增加统一示例命令

目标命令：

```bash
pnpm run example
```

最终应完成：

- 启动或检查 Vue3 示例原型。
- 检查 Flutter 环境，至少提示 `flutter --version` 和依赖安装状态。
- 调用 ProtoBridge generate，分别生成简单页面和复杂页面的 artifact set。
- 打印产物路径和推荐阅读顺序。
- 可选：运行 Flutter target 的静态检查或测试，例如 `flutter analyze`、widget test 或 goldens，具体取决于后续实现成本。

可以拆内部脚本，但对用户只暴露一个主入口。

### 8. 接入 E2E

让 E2E 能指向这个示例：

```bash
pnpm run test:e2e -- --url <example-url> \
  --source-root examples/vue3-to-flutter/source-vue3 \
  --target-root examples/vue3-to-flutter/target-flutter
```

后续可以增加更短命令：

```bash
pnpm run test:e2e:example
```

E2E 需要覆盖两条页面链路：

- 简单页面：验证基础 source + runtime + target evidence 是否完整。
- 复杂页面：验证 tab、弹层、交互状态和目标工程规范是否能进入 plan/review。

### 9. 技术栈边界说明

文档中明确说明：

- 当前示例和内置适配重点是 Vue3 prototype 到 Flutter app。
- ProtoBridge 的架构允许扩展其他 source/target adapter。
- 是否需要扩展，取决于公司的技术栈、业务复杂度和交付方式。
- 本项目是基于团队真实场景形成的一套思考和实现，不是所有团队都必须采用的通用银弹。

建议核心表述：

```text
ProtoBridge does not translate Vue to Flutter directly.
It turns prototype source, runtime evidence, and target conventions
into reviewable, traceable, and verifiable implementation context.
```

中文版：

```text
ProtoBridge 不做 Vue 到 Flutter 的直译，而是把原型源码、运行时证据和目标工程规范整理成可审查、可追溯、可验证的实现上下文。
```

### 10. 完成验收

示例完成后确认：

- `pnpm run example` 可跑通。
- 根 README 不依赖本地环境也能看懂项目价值。
- `examples/vue3-to-flutter/README.md` 能指导开发者完整跑通。
- Vue3 source 不是玩具 demo，具备路由、Pinia、CSS、mock data、notes/i18n 等真实原型工程信号。
- Flutter target 不是零散片段，具备 Bloc、路由、主题、feature structure、widgets、models 和 target conventions。
- 简单页面和复杂页面都能产出完整、可读、可信的 artifact set。
- 截图和还原效果图能体现 Vue3 到 Flutter 的技术跨度和重建价值。
- 文档清楚说明当前只内置 Vue3/Flutter adapter，其他技术栈需要扩展。
