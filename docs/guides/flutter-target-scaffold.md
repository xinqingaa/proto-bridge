# Flutter Target 脚手架

`pnpm pb:new:flutter` 从 `apps/flutter_pb_app` 复制一份独立产品 target，去掉 `features` 业务示例，生成 Bootstrap 空壳、项目内 MCP launcher 和 Agent 上下文。生成后的目录默认与 proto-bridge 同级。底座使用 Riverpod 3、MMKV 和远程 unified_popups，主题只使用上下文 ThemeExtension。

## 命名

项目名必填，不再默认 `flutter_pb_example`。`example` 会进入 app 标题、bundle id、README 和测试，不适合作为真实 target 名称。

```bash
pnpm pb:new:flutter cold_chain_app
# -> ../cold_chain_app
```

推荐用产品名或 `flutter_pb_<prototypeId>`，例如 `cold_chain_app`、`flutter_pb_yike`。脚本会：

- 把名称规范化为 Dart package 的 `lower_snake_case`
- 生成显示名（可由 `--display-name` 覆盖）
- 生成 Android/iOS bundle id `com.protobridge.<package去掉下划线>`（可由 `--bundle-id` 覆盖）

已有目录非空时拒绝覆盖。

常用参数：

- `--prototype <id>`：只选择该原型绑定的主题包与继承依赖；默认全部。公共基础组件保持共享，业务 features 仍为空。
- `--parent <dir>`：自定义父目录，默认 proto-bridge 同级
- `--display-name <name>` / `--bundle-id <id>`：覆盖显示名和 bundle id
- `--yes`：非交互执行；`--dry-run` 只打印计划
- `--no-install`：跳过 `flutter pub get`（仍会 `dart format`）
- `--verify`：生成后额外跑 analyze/test/完整 DS 校验
- `--set-target`：生成后自动执行 `pb:target use`，把 Workspace `delivery.targetRoot` 指过去
- `--require-synced`：base 批次不是 `synced` 时直接失败

## 复制范围

复制：

- `lib/common`、`lib/theme`、`lib/storage`、`lib/app`、`lib/router`、`lib/main.dart`
- `android`、`ios`（排除 Pods、Generated、local.properties 等生成物）
- `docs`、`.agents`、`AGENTS.md`、`README.md`、`analysis_options.yaml`
- `proto-bridge.target.json`、`proto-bridge.sync.json`、`pubspec.lock`（保持与基线相同的依赖锁定）
- `test` 中与 target 底座相关的测试

排除：

- `lib/features/*`（业务示例，包括 demo 与冷链）
- `build/`、`.dart_tool/`、`.idea/`、`ios/Pods/`、`android/.gradle/`
- 生成文件和旧的 `widget_test.dart`、`cold_chain_ops_test.dart`

生成：

- `lib/app/bootstrap_page.dart`：等待固定 Handoff 的空壳
- `lib/features/README.md`：业务 feature 的放置约定
- `test/bootstrap_test.dart`
- `tool/mcp.mjs`、`tool/target.mjs`、`tool/verify.mjs`、`tool/ds-theme.mjs`、`tool/ds-sync.mjs`
- `.pb-scaffold.json`
- `.cursor/mcp.json`、`.codex/config.toml`、`.mcp.json`、`.agents/mcp.json`

## 项目内 MCP

生成目录不需要用户拼：

```bash
node /abs/proto-bridge/scripts/pb-mcp.mjs --target /abs/../flutter_pb_example
```

客户端统一指向项目自己的 launcher：

```json
{
  "mcpServers": {
    "proto-bridge": {
      "command": "node",
      "args": ["${workspaceFolder}/tool/mcp.mjs"]
    }
  }
}
```

`tool/mcp.mjs` 读取 `.pb-scaffold.json`，把 proto-bridge 根、workspace 配置和 target 绑定在一起。proto-bridge 路径只存一份；移动仓库后改这一处或重新生成。

Codex 不会展开 `${workspaceFolder}`，所以 `.codex/config.toml` 写入 launcher 的绝对路径；Codex 仍需 trust 该目录后才会加载项目级 MCP 配置。

## 切换 Workspace target

PBWork 定稿提示词和 MCP 默认 target 来自 Workspace 配置。创建新目录后，把 `delivery.targetRoot` 指过去：

```bash
pnpm pb:target show
pnpm pb:target use ../cold_chain_app
# 重启 pnpm pb:up 和 MCP 客户端
```

`pb:target use` 会校验目录含 `pubspec.yaml` 和 `lib/`，写入相对 `proto-bridge.json` 的路径，并提示重启。`--json` 用于脚本。

## 验证

在生成目录：

```bash
node tool/target.mjs --show
node tool/target.mjs --bind
node tool/target.mjs --check
```

`--show` 只展示新工程与 Producer Workspace 的绑定关系；`--bind` 调用 Producer 的 target 命令更新其配置；`--check` 在不一致时返回非零状态。绑定后重启 Producer/MCP 客户端并重新生成定稿提示词。默认生成不会修改 Workspace。

原生验证：

```bash
flutter pub get
flutter analyze
flutter test
node tool/verify.mjs
node tool/ds-theme.mjs
```

`tool/verify.mjs` 执行 Flutter 原生检查和 当前组件与 Token 清单 的完整 target 校验；`tool/ds-theme.mjs` 只做 Token 校验。`node tool/ds-sync.mjs` 是 当前组件与 Token 清单 的完整同步门禁。

## PBWork 工作流

1. 在 PBWork 定稿并采集，确认提示词中的目标路径是生成目录。
2. 在 Cursor/Codex 打开生成目录；MCP 已配置。
3. 把提示词交给 agent。第一轮只读：读 Handoff、Screenshot、Target readiness，按 Screen 输出摘要和计划，然后暂停等待批准。
4. 批准后只在 `lib/features/` 落页面；完成后跑 `node tool/verify.mjs` 和验收 Skill。
5. 如果 `inspect_evidence_workspace` 返回的 `deliveryTargetRoot` 与提示词不一致，停止并先修 `delivery.targetRoot`。

## 与基线同步

新目录是复制，不是共享库。`proto-bridge.target.json` 的 Token 映射和 target 文档随目标走；DS 变化后需同步组件映射与实现。`.pb-scaffold.json` 保存生成时的 `baseSurfaceDigest` 与 `baseSyncStatus`，供维护时辨别来源；它不替代当前 Target 同步验证。基线变化不会自动进入已生成目录：

- 小改动：按需对比 `apps/flutter_pb_app`，保留业务 feature 后手工合并。
- 大改动：重新生成一个临时目录做 diff，再迁移需要的底座文件。
- 不要把 proto-bridge 的 `.proto-bridge/store`、Workspace 配置或 `output/` 复制进 target。

当前 Flutter Target adapter 只扫描 target 根下的 Dart，因此底座组件先保留在目标内，不抽成共享 package；抽包会让 resolver 看不到符号。

依赖安装先于格式化执行。依赖安装或格式化失败时脚本返回非零状态，并保留已经生成的文件供修复；不能把该结果描述为工程就绪。未传 `--verify` 时成功输出只声明文件生成，不声明原生验证通过。生成前会检查实际 Token 映射，不能仅凭 pending 数量为零放行。

首次生成时若 Producer 构建产物缺失，脚本先执行 `pnpm build`，再验证基线并复制；需事先完成仓库依赖安装。`--dry-run` 不触发构建。

路径与同步基线按真实目录记录；例如 macOS 的 `/tmp` 与 `/private/tmp` 指向同一目录，完整同步检查会归一化后比较。

生成目录携带 `proto-bridge.themes.json` 和类型化 Dart 主题；主题矩阵检查按记录的选择范围执行。资源同步目录 `assets/themes/` 由生成器管理，产品自有资源放在其它目录。
