# Vue3 Source to Flutter Target Example

这个示例展示 ProtoBridge 的核心定位：它不把 Vue3 直接翻译成 Flutter，而是把原型源码、运行时页面证据和 Flutter 目标工程规范整理成可审查、可追溯、可验证的实现上下文。

当前示例覆盖两个页面：

| Case | Vue route | Flutter route | 目的 |
| --- | --- | --- | --- |
| simple | `/prototype/asset/holding-list` | `/account/holding-list` | 标题、摘要、筛选、基础列表和 loading/empty 边界。 |
| complex | `/prototype/asset/pnl-analysis` | `/account/pnl-analysis` | tab、筛选、指标卡、趋势图、交易列表和 bottom sheet 交互。 |

## 目录

```text
examples/vue3-to-flutter/
├── source-vue3/          # Vue3 + Vite + Vue Router + Pinia 原型工程
├── target-flutter/       # Flutter 目标工程
├── agent-output/         # 已落地的一次 agent 工作流静态文本产物，git tracked
├── output/               # pnpm run example 后生成，git ignored
├── screenshots/          # 原型截图和 Flutter 还原截图
├── proto-bridge.config.json
└── README.md
```

## 命令总览

| 命令 | 做什么 | 何时使用 |
| --- | --- | --- |
| `pnpm run example` | 生成 simple 与 complex 三个 tab 状态的 artifacts，并校验 Flutter `_proto` agent 产物入口。 | 想体验 ProtoBridge artifacts 到 Flutter 页面还原的完整示例。 |
| `pnpm run example:dev` | 启动 Vue 原型和 Flutter Web 静态预览。 | 想在浏览器里查看原型和生成页。 |
| `pnpm run example:android` | 运行 Flutter target 到 Android 设备或模拟器。 | 想在 Android 上查看生成页。 |

## 生成 artifacts 和 Flutter 页面

在仓库根目录执行：

```bash
pnpm run example
```

这个命令会：

- 构建 ProtoBridge packages。
- 构建 Vue3 source prototype。
- 启动 Vue3 prototype runtime。
- 生成 simple 页面 artifacts。
- 分别生成 complex 页面 overview、realized、risk 三个 tab 状态 artifacts。
- 按 `agent-output/flutter-proto-manifest.json` 将 agent 工作流静态文本产物安装到 Flutter target 的 `_proto` 入口。
- 校验 Flutter target 中安装后的 `_proto` 页面和 route registry。

`pnpm run example` 会刷新 ProtoBridge artifacts，并把仓库内提交的 agent 工作流产物安装到 Flutter target，是为了降低首次体验心智负担。真实项目中仍然可以按页面使用 CLI/MCP 生成上下文，再由开发者或 coding agent 在目标工程中实现。

`output/` 和 target 下的 Flutter `_proto` 安装结果都会被 git 忽略；可提交的 agent 产物位于 `agent-output/flutter-proto-files/*.dart.txt`，安装关系记录在 `agent-output/flutter-proto-manifest.json`。这样没有配置 AI agent 的阅读者也能直接运行预览，同时可以查看 agent 产物如何对应 artifacts。

生成完成后，会出现这些本地文件：

```text
output/simple/
output/complex-overview/
output/complex-realized/
output/complex-risk/
agent-output/flutter-proto-manifest.json
agent-output/flutter-proto-files/
target-flutter/lib/main_proto.dart
target-flutter/lib/app/app_proto.dart
target-flutter/lib/app/routes/app_pages_proto.dart
target-flutter/lib/app/modules/account/_proto/
```

`target-flutter/lib/main_proto.dart` 是本示例判断“是否使用 `_proto` 页面”的标记。存在这个文件时，预览命令会使用 `-t lib/main_proto.dart` 运行 agent 产物页。

## Agent 工作流产物

ProtoBridge 本体生成的是页面上下文 artifacts，不是 Vue 到 Dart 编译器。本示例里的 Flutter 页面是按真实 agent 工作流生成后保存为静态文本包；运行 `pnpm run example` 时再安装到 target 的 `_proto` 入口：

```text
输入：Vue3 source facts + runtime/screenshots + target Flutter 工程约定
可提交输出：agent-output/flutter-proto-manifest.json + agent-output/flutter-proto-files/*.dart.txt
运行时安装：target-flutter/lib/app/modules/account/_proto/
```

agent 生成时读取了：

```text
output/simple/{ui-build-review.md,ui-build-plan.json,page-canonical.json}
output/complex-overview/{ui-build-review.md,ui-build-plan.json,page-canonical.json}
output/complex-realized/{ui-build-review.md,ui-build-plan.json,page-canonical.json}
output/complex-risk/{ui-build-review.md,ui-build-plan.json,page-canonical.json}
target-flutter/lib/app/theme/
target-flutter/lib/app/common/widgets/
target-flutter/lib/app/routes/
```

落地约束是：使用 target 的主题 token、`flutter_bloc` 全局偏好状态、`CommonAppBar`、`CommonButton`、`SectionPanel` 等组件；simple 页默认展示全部数据；complex 页分别还原 overview、realized、risk 三个 tab 的结构。为了开源快速体验，这版 agent 结果会随仓库提交为 `.dart.txt` 静态文本，`pnpm run example` 负责刷新 artifacts 并按 manifest 安装到 `_proto`。

这份 agent 产物不是“纯机械从 output 直接吐出的 Dart”。它以 output 为主要页面事实来源，同时结合 target 工程规范做了必要工程化修正，例如接入 Flutter target 的 bloc 主题/多语言状态。后续如果要提升自动化程度，应继续评估 output 质量和 agent 指令质量，让这类修正尽量前移到工作流中。

## Web 预览

```bash
pnpm run example:dev
```

入口地址：

```text
Vue prototype:  http://127.0.0.1:5173/
Flutter target: http://127.0.0.1:5599/
```

如果默认端口被占用，脚本会自动使用后续可用端口，请以终端输出为准。Flutter 入口是 build 后的静态预览，更适合稳定查看效果。`example:dev` 会优先运行 `pnpm run example` 生成的 `_proto` 页面；如果还没有生成，会显示兜底提示页。

两个入口页都会提供 simple 和 complex 两个页面的跳转。

`example:dev` 会在退出时关闭 Vue dev server 和 Flutter 静态服务，并释放本次使用的端口。脚本还会在构建前清理旧的 `build/web`，并禁用 Flutter Web service worker，避免浏览器加载旧的生成页缓存。

## Android 预览

```bash
pnpm run example:android
```

如果需要指定设备，可以透传 Flutter 参数：

```bash
pnpm run example:android -- -d emulator-5554
```

`example:android` 会在缺少 Android 平台目录时执行 `flutter create --platforms=android .`。Android 平台工程可以作为 Flutter 示例工程的一部分提交；真正的 build 目录仍由 Flutter 默认规则忽略。

没有显式传 `-d` 时，脚本会读取 `flutter devices --machine`，自动选择第一个可用 Android 设备。存在 `main_proto.dart` 时，脚本会使用 `-t lib/main_proto.dart` 运行生成页；不存在时会运行默认兜底入口。

## 推荐阅读顺序

```text
output/simple/ui-build-review.md
output/simple/ui-build-plan.json
output/simple/page-debug-index.json
output/simple/page-canonical.json

output/complex-overview/ui-build-review.md
output/complex-overview/ui-build-plan.json
output/complex-overview/page-debug-index.json
output/complex-overview/page-canonical.json

output/complex-realized/ui-build-review.md
output/complex-realized/ui-build-plan.json
output/complex-realized/page-debug-index.json
output/complex-realized/page-canonical.json

output/complex-risk/ui-build-review.md
output/complex-risk/ui-build-plan.json
output/complex-risk/page-debug-index.json
output/complex-risk/page-canonical.json
```

`ui-build-review.md` 适合人工先读；`ui-build-plan.json` 适合交给 coding agent；`page-debug-index.json` 用来排查证据合并；`page-canonical.json` 是完整上下文。

提交的 agent 产物位于：

```text
agent-output/flutter-proto-manifest.json
agent-output/flutter-proto-files/main_proto.dart.txt
agent-output/flutter-proto-files/app_proto.dart.txt
agent-output/flutter-proto-files/app_pages_proto.dart.txt
agent-output/flutter-proto-files/account_proto_models.dart.txt
agent-output/flutter-proto-files/account_proto_repository.dart.txt
agent-output/flutter-proto-files/account_proto_widgets.dart.txt
agent-output/flutter-proto-files/account_proto_pages.dart.txt
```

运行 `pnpm run example` 后会安装到：

```text
target-flutter/lib/app/modules/account/_proto/
target-flutter/lib/app/routes/app_pages_proto.dart
target-flutter/lib/app/app_proto.dart
target-flutter/lib/main_proto.dart
```

这些文件属于 agent 工作流安装结果，不代表 ProtoBridge 本体是 Vue 到 Dart 的编译器。

## 截图

| Prototype | Generated Flutter page |
| --- | --- |
| ![Prototype simple](screenshots/prototype-simple.png) | ![Flutter simple](screenshots/flutter-simple.png) |
| ![Prototype complex](screenshots/prototype-complex.png) | ![Flutter complex](screenshots/flutter-complex.png) |

## Source 工程

`source-vue3/` 是一个简化但正常的 Vue3 原型工程：

- Vue3 + Vite。
- Vue Router hash route。
- Pinia 管理筛选、tab、loading、弹层和选中记录。
- scoped style 和全局 CSS tokens。
- `prototype/src/config/prototypeScreens.js` 提供 route 到 Vue SFC 的映射。
- `prototype/notes/asset/*.md` 和 `prototype/src/i18n/prototype/*.json` 提供 source evidence。

URL-first 输入示例：

```bash
pnpm run generate -- \
  --config examples/vue3-to-flutter/proto-bridge.config.json \
  --url "http://127.0.0.1:5173/#/prototype/asset/pnl-analysis?tab=overview" \
  --output examples/vue3-to-flutter/output/complex-overview
```

## Target 工程

`target-flutter/` 是一个小型 Flutter target app，不是零散代码片段：

- Flutter 3.x。
- `lib/app/routes` 提供目标路由。
- `lib/app/theme` 提供色板、文本样式和 spacing tokens。
- `lib/app/common/widgets` 提供 `CommonAppBar`、`CommonButton`、`CommonEmpty`、`CommonLoading` 和 `SectionPanel`。
- `lib/app/modules/account/_proto` 是 `pnpm run example` 按 `agent-output/flutter-proto-manifest.json` 安装出来的运行时示例实现，用来展示还原页面的模块化落点。

示例里的 source module 是 `asset`，target module 是 `account`。产物中出现“Target suggested module (account) differs from source module (asset)”是预期的人工确认项，用来展示 ProtoBridge 如何把原型域名映射到客户端模块。

## 技术栈边界

当前仓库内置重点是：

```text
source: vue3-prototype
target: flutter-app
```

其他技术栈可以通过 adapter 扩展，但是否值得扩展取决于团队真实技术跨度、原型规范、目标工程约定和交付链路复杂度。这个示例表达的是 Vue3 原型到 Flutter 客户端实现这个场景下的一种工程化思路。
