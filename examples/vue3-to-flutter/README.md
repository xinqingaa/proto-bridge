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
├── target-flutter/       # Flutter + flutter_bloc 目标工程
├── output/               # ProtoBridge 产物，按 simple/complex 拆分
├── screenshots/          # 原型截图和 Flutter 还原截图
├── proto-bridge.config.json
└── README.md
```

## 一键运行

在仓库根目录执行：

```bash
pnpm run example
```

这个命令会：

- 构建 ProtoBridge packages。
- 构建 Vue3 source prototype。
- 检查 Flutter target 依赖。
- 安装/检查 Playwright Chromium。
- 启动 Vue3 prototype runtime。
- 分别生成 simple 和 complex 两套 artifacts。
- 构建 Flutter Web 并截取还原效果图。

如果只是想打开页面看效果：

```bash
pnpm run example:dev
```

入口地址：

```text
Vue prototype:  http://127.0.0.1:5173/
Flutter target: http://127.0.0.1:5599/
```

如果默认端口被占用，脚本会自动使用后续可用端口，请以终端输出为准。Flutter 入口是 build 后的静态预览，更适合稳定查看效果；需要 Flutter 热重载时可以单独进入 `target-flutter/` 使用 `flutter run`。

两个入口页都会提供 simple 和 complex 两个页面的跳转。

## 推荐阅读顺序

```text
output/simple/ui-build-review.md
output/simple/ui-build-plan.json
output/simple/page-debug-index.json
output/simple/page-canonical.json

output/complex/ui-build-review.md
output/complex/ui-build-plan.json
output/complex/page-debug-index.json
output/complex/page-canonical.json
```

`ui-build-review.md` 适合人工先读；`ui-build-plan.json` 适合交给 coding agent；`page-debug-index.json` 用来排查证据合并；`page-canonical.json` 是完整上下文。

## 截图

| Prototype | Flutter restored effect |
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
  --output examples/vue3-to-flutter/output/complex
```

## Target 工程

`target-flutter/` 是一个小型 Flutter target app，不是零散代码片段：

- Flutter 3.x。
- `flutter_bloc` / `bloc` 管理页面状态。
- `lib/app/routes` 提供目标路由。
- `lib/app/theme` 提供色板、文本样式和 spacing tokens。
- `lib/app/common/widgets` 提供 `CommonAppBar`、`CommonButton`、`CommonEmpty`、`CommonLoading` 和 `SectionPanel`。
- `lib/app/modules/account` 使用 feature-first 分层：`data`、`domain`、`application`、`presentation`。

示例里的 source module 是 `asset`，target module 是 `account`。产物中出现“Target suggested module (account) differs from source module (asset)”是预期的人工确认项，用来展示 ProtoBridge 如何把原型域名映射到客户端模块。

## 技术栈边界

当前仓库内置重点是：

```text
source: vue3-prototype
target: flutter-app
```

其他技术栈可以通过 adapter 扩展，但是否值得扩展取决于团队真实技术跨度、原型规范、目标工程约定和交付链路复杂度。这个示例表达的是 Vue3 原型到 Flutter 客户端实现这个场景下的一种工程化思路。
