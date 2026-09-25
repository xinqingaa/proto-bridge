# ADR 0011：Producer 用 git 分发 PBWork，npm 计划只覆盖 Core/CLI/MCP

- 状态：Accepted
- 日期：2026-08-21

## 决策

当前 Producer 工作台按 **git clone 本仓库 + `pnpm pb:install` / `pnpm pb:init` / `pnpm pb:up`** 安装和启动。本轮不 `npm publish`，不改 `UNLICENSED`，也不把 `@proto-bridge/local-service` 或 `@proto-bridge/pbwork` 改为 public。

日后 npm 计划只覆盖：

- `@proto-bridge/core`
- `@proto-bridge/cli`（二进制 `proto-bridge`）
- `@proto-bridge/mcp-server`（二进制 `proto-bridge-mcp`）

Local Service 必须随 CLI 一起分发（bundled 或同版本依赖），因为 CLI 写命令在 `pnpm pb:up` 存活时经 Service 写入 Store。PBWork 是 Vite 应用与 Design System，不是 npm CLI 包。Store 不提供云端共享。

`proto-bridge.json` 的 `delivery.targetRoot` 是本 Workspace 的默认 Agent 目标工程路径，供 CLI `deliver`、PBWork 定稿提示词和 MCP Target 工具省略参数时使用。它不是 Evidence 字段，扫描结果不进入 Capture。

## 理由

PBWork 依赖本仓库的 Runtime、Design System、Workbench 和 Local Service 进程边界。把它发布成独立 npm 包会复制生命周期、Token 和 Capture 语义，并迫使 Target 工程安装一套它并不拥有的原型运行时。git clone 让同一套 Authoring Contract 与 `pnpm pb:up` 成为 Producer 的唯一安装面。

Core、CLI 和 MCP 才是可在目标工程或 Agent 客户端独立安装的工具面。CLI 已经依赖 Local Service，因此未来 publish 不能只发 CLI 而让操作者再猜 Service 路径。

三条入口曾经各自默认 `apps/flutter_pb_app` 或 `process.cwd()`。统一到 `delivery.targetRoot` 后，提示词、定稿确认 UI 和 `inspect_evidence_workspace` 指向同一绝对路径，且不复活已废弃的 V1 键 `target`。

## 后果

- 操作者 clone 仓库、执行 `pnpm pb:install` / `pnpm pb:init` / `pnpm pb:up`，在 PBWork 走待确定 → 定稿并自动采集。
- CLI `capture` / `deliver` 是非正式诊断：不改变 PBWork 生命周期，非交互使用必须 `--acknowledge-unofficial-capture`。
- 本仓库 `apps/flutter_pb_app` 只是示例 Target。真实目标可以在仓库外，由当前 Workspace 的 `delivery.targetRoot` 指向。
- npm 许可证、`local-service` 发布方式、MCP 原生读配置、`proto-bridge doctor` 和隐藏实验 `review *` 帮助，纳入[产品收口计划的 P2 边界](../roadmap/README.md#p2-进入条件不参与本次交付)，本轮不实施。
