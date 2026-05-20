# 开发命令

本文档说明 monorepo 根目录下的 `pnpm` 脚本。正式使用 CLI、MCP 或 core API 的接入方式见 [integration.md](integration.md)，从配置到生成产物的最短路径见 [quickstart.md](quickstart.md)。

## 常用开发命令

| 命令 | 作用 | 何时使用 |
| --- | --- | --- |
| `pnpm run build` | 构建 `@proto-bridge/core`、`@proto-bridge/cli` 和 `@proto-bridge/mcp-server`。 | 修改源码后、本地 MCP 配置前、发布前。 |
| `pnpm run typecheck` | 对三个 package 执行 TypeScript no-emit 检查。 | 日常回归和提交前。 |
| `pnpm run lint` | 当前等同于 `pnpm run typecheck`。 | 需要统一 lint 入口时。 |
| `pnpm run dev` | 启动 CLI package 的源码开发入口。 | 调试 CLI 命令解析或终端交互。 |
| `pnpm run generate -- ...` | 先构建 core/cli，再运行本地源码版 `proto-bridge generate`。 | 在 monorepo 内用本地改动生成 artifacts。 |

`pnpm run generate --` 后面的参数会透传给 CLI，例如：

```bash
pnpm run generate -- \
  --config examples/vue3-to-flutter/proto-bridge.config.json \
  --url "http://127.0.0.1:5173/#/prototype/asset/pnl-analysis?tab=overview" \
  --output examples/vue3-to-flutter/output/complex-overview
```

## 示例命令

| 命令 | 作用 | 生成内容 |
| --- | --- | --- |
| `pnpm run example` | 跑完整 Vue3-to-Flutter 示例生成流程。 | `examples/vue3-to-flutter/output/**` 和 Flutter `_proto` 文件。 |
| `pnpm run example:clean` | 清理示例生成产物。 | 删除 Flutter `_proto` 入口/页面文件，并清空 `examples/vue3-to-flutter/output/`。 |
| `pnpm run example:dev` | 启动 Vue 原型和 Flutter Web 预览。 | `target-flutter/build/web/**`。 |
| `pnpm run example:android` | 运行 Flutter target 到 Android 设备或模拟器。 | Android/Flutter build 缓存。 |

`pnpm run example` 是 example harness：它一次性生成 simple 和 complex 两套 ProtoBridge artifacts，并生成可运行的 Flutter `_proto` 页面，目的是降低首次体验心智负担。真实项目中仍然推荐按页面使用 CLI/MCP 生成上下文，再由开发者或 coding agent 在目标工程中实现。

生成路径：

```text
examples/vue3-to-flutter/output/
examples/vue3-to-flutter/target-flutter/lib/main_proto.dart
examples/vue3-to-flutter/target-flutter/lib/app/app_proto.dart
examples/vue3-to-flutter/target-flutter/lib/app/routes/app_pages_proto.dart
examples/vue3-to-flutter/target-flutter/lib/app/modules/account/_proto/
```

这些路径默认 git ignored。`main_proto.dart` 存在表示已经生成过 Flutter 页面；不存在时，`example:dev` 和 `example:android` 会运行默认入口并显示兜底提示页。

`example:dev` 会自动清理旧的 `build/web`，禁用 Flutter Web service worker，并在退出时关闭 Vue dev server、Flutter 静态服务和本次使用的端口。

`example:android` 默认读取 `flutter devices --machine` 并选择第一个可用 Android 设备。需要指定设备时：

```bash
pnpm run example:android -- -d emulator-5554
```

## 测试命令

| 命令 | 覆盖范围 | 备注 |
| --- | --- | --- |
| `pnpm run test:config` | config schema、路径解析、URL route 推导和非法字段错误。 | 轻量，适合常跑。 |
| `pnpm run test:e2e:cli` | CLI `generate` 的 artifacts contract。 | 需要可访问 URL 和相关 source/target 根目录，或通过参数覆盖。 |
| `pnpm run test:e2e:mcp` | MCP tools、`reconstruct_page_context` 和 `validate_ui_build` 协议行为。 | 覆盖 agent/tool 接入路径。 |
| `pnpm run test:e2e` | 同时跑 CLI 和 MCP e2e。 | 全量回归。 |

`test:e2e` 默认使用：

```text
url:         http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1
sourceRoot:  ../TradeAppPrd
targetRoot:  ../youfi
outputRoot:  ./output/test-e2e
```

可以通过参数覆盖：

```bash
pnpm run test:e2e:cli -- \
  --url "http://127.0.0.1:5173/#/prototype/asset/pnl-analysis?tab=overview" \
  --source-root examples/vue3-to-flutter/source-vue3 \
  --target-root examples/vue3-to-flutter/target-flutter \
  --output-root output/test-e2e
```

## 生成与提交边界

不要提交这些生成内容：

```text
output/
packages/*/output/
examples/*/output/
examples/vue3-to-flutter/target-flutter/lib/main_proto.dart
examples/vue3-to-flutter/target-flutter/lib/app/app_proto.dart
examples/vue3-to-flutter/target-flutter/lib/app/routes/app_pages_proto.dart
examples/vue3-to-flutter/target-flutter/lib/app/modules/**/_proto/
examples/vue3-to-flutter/target-flutter/build/
```

可以提交稳定的示例源码、Flutter target 骨架、Android 平台工程、文档和脚本。`output/` 与 `_proto` 留给每个用户本地重新生成。
