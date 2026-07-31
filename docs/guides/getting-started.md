# 快速上手

本指南在本地启动 PBWork、初始化 Workspace、采集 Evidence，并为 Agent 启动 MCP。

## 环境

- Node.js 20 或更高版本
- pnpm 10
- Playwright Chromium

安装并构建：

```bash
pnpm install
pnpm build
```

首次安装 Playwright 浏览器时执行：

```bash
pnpm exec playwright install chromium
```

## 初始化 CLI Workspace

首次使用时创建 Workspace；已有 `proto-bridge.json` 时不要重复初始化：

```bash
pnpm pb -- workspace init \
  --workspace pbwork-local \
  --runtime http://127.0.0.1:3977

pnpm pb -- workspace doctor
```

默认配置文件是 `proto-bridge.json`，默认 Store 是 `.proto-bridge/store`。端口或 Store 不同，应以 `pnpm pb:up` 输出和实际配置为准。

## 启动 PBWork

```bash
pnpm pb:doctor
pnpm pb:up
```

启动前 Doctor 检查配置、浏览器和构建。`pb:up` 启动 PBWork Web
应用和 Local Service，终端会输出实际 URL、Workspace 和服务连接信息。
Runtime 使用 `/prototype/:prototypeId/:screenSlug`，工作台使用
`/workbench/*`。

## 通过 PBWork 采集

1. 在原型树中打开 Screen，并确认 Runtime 可以加载目标 Variant。
2. 打开“证据采集”，选择当前 Screen、Fragment、自定义范围或 Prototype。
3. 查看 Preflight、Case Matrix、warning 和范围。
4. 明确确认后启动 Job。
5. 在任务中心查看进度，在结果页 Review Facts、截图、Coverage 和 Issue。
6. 需要交给 Agent 时创建 Handoff。

详细操作语义见 [PBWork 与 PB 协作](./pbwork-and-pb.md)。

## 通过 CLI 采集

准备一个符合 `SelectionDraft` Schema 的 JSON 文件，然后：

```bash
pnpm pb -- preflight \
  --selection examples/selections/ledger-planet-task-list.json

pnpm pb -- capture run \
  --selection examples/selections/ledger-planet-task-list.json
```

warning 使用可重复的 `--accept-warning <warningId>` 逐项确认。CLI 不提供跳过全部检查的 `--force`。

完整命令以 [CLI README](../../packages/cli/README.md)和实际 `--help` 为准。

## 配置 MCP

```bash
pnpm pb:mcp -- --print-config
```

将输出中的直接 Node stdio 命令配置到 Cursor 或 Codex；不要把带生命周期日志的包管理器命令登记为 stdio server。MCP 必须绑定到 Handoff 所属 Workspace。Agent 的读取顺序见 [Agent 消费指南](./agent-consumption.md)。

需要生成一份持久 Journey receipt、固定读取检查和 Agent prompt 时：

```bash
pnpm pb:journey
```

所有根脚本和参数见[本地操作脚本](./operator-scripts.md)。

## 验证仓库

```bash
pnpm verify
```

完整门禁包含安装锁文件检查、构建、类型检查、Core/Service/CLI/PBWork 测试、真实浏览器 Runtime Capture、MCP、Consumer 和 PBWork → Store → MCP 垂直切片。
