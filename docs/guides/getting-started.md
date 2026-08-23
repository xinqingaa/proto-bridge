# 快速上手

本指南在本地安装依赖、初始化 Workspace、启动 PBWork、定稿采集 Evidence，并为 Agent 启动 MCP。日常入口是 `pb:install`、`pb:init`、`pb:doctor`、`pb:up`、`pb:reset` 和 `pb:clean`。

## 环境

- Node.js 20 或更高版本
- pnpm 10
- Playwright Chromium

安装并构建：

```bash
pnpm pb:install
pnpm build
```

`pnpm pb:install` 会安装 workspace 依赖并在缺失时安装 Playwright Chromium。离线或 CI 环境可用 `PB_SKIP_BROWSER_INSTALL=1` 跳过浏览器下载，再由环境自行提供浏览器。官方 `pnpm install` 仍可单独使用，但不是 ProtoBridge 的安装入口。

## 初始化 CLI Workspace

首次使用时运行 init。默认模式使用仓库默认值；交互时选择自定义即可逐项填写：

```bash
pnpm pb:init
```

非交互或自动化使用：

```bash
pnpm pb:init -- --yes
```

已有配置不会覆盖；需要修改配置时使用 `pnpm pb:init -- --reconfigure`。高级自动化仍可使用 `pnpm pb -- workspace init`。

默认配置文件是 `proto-bridge.json`，默认 Store 是 `.proto-bridge/store`。`delivery.targetRoot` 是本 Workspace 默认的 Agent 目标工程，相对配置文件目录解析。端口或 Store 不同，应以 `pnpm pb:up` 输出和实际配置为准。

## 启动 PBWork

```bash
pnpm pb:up
```

启动前 Doctor 检查配置、浏览器和构建。`pb:up` 启动 PBWork Web 应用和 Local Service，终端会输出实际 URL、Workspace 和服务连接信息。交互终端缺少配置时，`pb:up` 会进入 `pb:init` 引导；非交互环境会提示先运行 `pnpm pb:init`。环境缺失时会按问题提示运行 `pnpm pb:install` 或 `pnpm pb:doctor`，不会启动半套服务。
Runtime 使用 `/prototype/:prototypeId/:screenSlug`，工作台使用
`/workbench/*`。

## 通过 PBWork 定稿

1. 打开 Workbench 原型目录，确认 Runtime 可以加载正式页面。
2. 将原型推到「待确定」，再执行「定稿并采集」。系统自动采集整个原型，不选择单页或 Fragment。
3. 确认候选方案已经收敛，并逐项确认 warning。定稿确认页只读展示 Agent 提示词将指向的绝对路径（来自 `delivery.targetRoot`）。
4. 等待整原型采集完成，再逐项确认 risk。
5. 成功后生命周期变为已定稿，并写出唯一 Agent 提示词。复制提示词，或打开 `.proto-bridge/deliveries/*/agent-prompt.md`。Agent 会先只读理解 Evidence 与目标工程，给出实现计划并等待确认，确认后再实施。

改目标路径 = 编辑 `proto-bridge.json` 的 `delivery.targetRoot` 后重启 `pnpm pb:up`。不要在浏览器里改路径。详细语义见 [PBWork 与 PB 协作](./pbwork-and-pb.md)。

## 通过 CLI 诊断（非正式）

CLI `deliver` / `capture run` 不改变 PBWork 生命周期，也不会出现在「定稿采集」页。交互终端输入 `y` / `yes`；非 TTY 或 `--json` 必须加 `--acknowledge-unofficial-capture`。该旗标不能替代 `--accept-warning` / `--ack-risk`。窄范围（`--screen` / `--fragment` / `--selection` / `--only-*`）还有第二层确认。

```bash
pnpm pb -- deliver \
  --prototype cold-chain-ops \
  --acknowledge-unofficial-capture
```

省略 `--target` 时使用 Workspace `delivery.targetRoot`。`--target` 只覆盖这一次命令。也可用 Selection JSON（Core `SelectionDraft`）交给 `--selection`，同样视为非正式窄范围。

warning / risk 使用可重复的 `--accept-warning` / `--ack-risk` 逐项确认。CLI 不提供 `--force`。

完整命令以 [CLI README](../../packages/cli/README.md)和实际 `--help` 为准。

## 配置 MCP

仓库默认提供 Cursor 项目级配置 `.cursor/mcp.json`。打开本仓库后在
Cursor **Settings → MCP** 刷新即可；也可用：

```bash
pnpm pb:mcp -- --print-config
```

对照或配置 Codex。不要把带生命周期日志的包管理器命令登记为 stdio server。
MCP 必须绑定到 Handoff 所属 Workspace。助手、MCP 与文档如何分工，以及读取顺序，见 [Agent 消费指南](./agent-consumption.md)。

把 `agent-prompt.md`（或定稿面板内复制的提示词）交给 Cursor / Codex 即可开始只读消费。提示词只携带固定身份、风险与渐进读取协议，不内嵌 Evidence Brief 或完整 Review Contract；Agent 通过 Handoff index 和按需投影建立理解，首轮只输出摘要与实施计划。`inspect_evidence_workspace` 返回的 `deliveryTargetRoot` 应与提示词中的目标路径一致。

已经成功定稿且原型没有变化时，不需要重新采集。已定稿视图只读取绑定的提示词。CLI 在已有 Evidence 上续跑交接仍是非正式诊断：

```bash
pnpm pb -- deliver \
  --bundle <bundle-id> \
  --snapshot <snapshot-id> \
  --acknowledge-unofficial-capture
```

所有根脚本和参数见[本地操作脚本](./operator-scripts.md)。

## 清理本地状态

```bash
pnpm pb:reset
pnpm pb:clean
```

`pb:reset` 预览并清理 Evidence、Deliveries 和未导出 Review，保留 `proto-bridge.json`。`pb:clean` 会先停止由 `pb:up` 管理的进程，再删除 `proto-bridge.json` 与整个 `.proto-bridge`；交互终端要求输入 `DELETE`，非交互环境使用 `pnpm pb:clean -- --yes`。

## 验证仓库

```bash
pnpm verify
```

完整门禁包含安装锁文件检查、构建、类型检查、Core/Service/CLI/PBWork 测试、真实浏览器 Runtime Capture、MCP、Consumer 和 PBWork → Store → MCP 垂直切片。
