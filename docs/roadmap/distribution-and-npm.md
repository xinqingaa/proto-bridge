# Roadmap：Producer git 分发与 npm 工具链

状态：Planned

日期：2026-08-21

优先级：P2；本轮不 publish

## 当前基线

Producer 安装面是 git clone 本仓库后执行 `pnpm pb:install`、`pnpm pb:init`、`pnpm pb:doctor`、`pnpm pb:up`。Workspace 配置 `delivery.targetRoot` 是 CLI 交付、PBWork 定稿和 MCP Target 工具的唯一默认目标工程路径。CLI `capture` / `deliver` 对非正式采集发出两层确认。PBWork 生命周期仍在浏览器 localStorage，不进入 Local Service 或 Store。

包可见性保持现状：`core` / `cli` / `mcp-server` 已标 public 字段，但仓库许可证为 `UNLICENSED`，且本轮不执行 `npm publish`。`local-service` 与 `pbwork` 保持 private。

## 目标

在不把 PBWork 或 Store 做成云服务的前提下，让目标工程或 Agent 客户端可以按需安装 Core、CLI 和 MCP，同时继续用 git 获得完整 Producer 工作台。

## 主线

1. 选定许可证并替换 `UNLICENSED`，明确哪些包可公开发布。
2. 决定 Local Service 随 CLI 的发布方式：同版本 npm 依赖，或打进 CLI bundle；禁止操作者再猜第二份默认路径。
3. MCP 原生读取 `proto-bridge.json`（不必总经 `scripts/pb-mcp.mjs`），仍禁止 Store 路径猜测和 cwd 回落。
4. 把 `scripts/pb-doctor.mjs` 收进 `proto-bridge doctor`。
5. 默认 `--help` 隐藏实验 `review show | approve-tranche | approve-finalize`；文档继续不把它们写成产品步骤。
6. 可选：生命周期从 PBWork localStorage 迁到 Workspace 文件，Local Service 只做 dumb get/put，不解释阶段语义。

## 探索项

- 是否把 MCP 与 CLI 做成同一 npm 包的两个 bin。
- 目标工程是否需要最小 `proto-bridge.json` 子集，仅含 `delivery.targetRoot` 与 Store 绑定。
- 私有 registry 与公开 npm 的并行策略。

## 依赖

- ADR [0011](../decisions/0011-producer-git-and-npm-tooling.md) 保持 git 分发 PBWork。
- 不把 Target 扫描写入 Evidence（ADR 0004）。
- 不把 Prototype lifecycle 写入 Core Store，除非主线第 6 项单独落地。

## 退出标准

- 本轮不 publish；本文件保持 Planned，直到有独立任务完成许可证与发布面。
- 现行文档继续写 git clone + 六个日常 `pb:*` 入口，不把未来 npm 命令写成当前步骤。
- 一旦开始 publish：`core` / `cli` / `mcp-server` 版本对齐；CLI 安装后可启动或调用同版本 Local Service；MCP 省略 `targetRoot` 时仍使用绑定的 `delivery.targetRoot`。
- 帮助隐藏实验 `review *` 之前，文档不得把这些命令写成产品步骤（当前已满足）。

## 范围缩减顺序

1. 先许可证与 Local Service 随 CLI 的打包方式。
2. 再 MCP 读配置与 `proto-bridge doctor`。
3. 最后才考虑生命周期 Workspace 文件和帮助藏实验命令。
