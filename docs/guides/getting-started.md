# 快速上手

本指南在本地启动 PBWork、初始化 Workspace、交付 Evidence，并为 Agent 启动 MCP。

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

## 通过 PBWork 交付

1. 在原型树中打开 Screen，并确认 Runtime 可以加载目标 Variant。
2. 点击「交付到 Agent」（当前页 / 所选元素 / 原型范围均可）。
3. 在 Deliver FlowSheet 中核对范围；有 warning 时逐项确认。
4. 点击「开始交付」，在同一 Sheet 内等待采集完成。
5. 查看结果摘要与风险提醒，生成交接与 Agent 提示词。
6. 复制提示词，或打开已写入的 `.proto-bridge/deliveries/*/agent-prompt.md`。Agent 会先只读理解 Evidence 与目标工程，给出实现计划并等待确认，确认后再实施。

任务中心保留为后台历史；「采集结果」页仍可按需查看详情。详细语义见 [PBWork 与 PB 协作](./pbwork-and-pb.md)。

## 通过 CLI 交付

推荐一条命令完成采集、Handoff 与提示词：

```bash
pnpm pb -- deliver \
  --prototype cold-chain-ops \
  --screen exception-queue \
  --target apps/flutter_pb_app
```

也可用 Selection JSON（Core `SelectionDraft`）：由 Workbench「交付到 Agent」导出，或手写后交给 `--selection`。

warning / risk 使用可重复的 `--accept-warning` / `--ack-risk` 逐项确认。CLI 不提供 `--force`。

完整命令以 [CLI README](../../packages/cli/README.md)和实际 `--help` 为准。

## 配置 MCP

仓库默认提供 Cursor 项目级配置 `.cursor/mcp.json`。打开本仓库后在
Cursor **Settings → MCP** 刷新即可；也可用：

```bash
pnpm pb:mcp -- --print-config
```

对照或配置 Codex。不要把带生命周期日志的包管理器命令登记为 stdio server。
MCP 必须绑定到 Handoff 所属 Workspace。Agent 的读取顺序见 [Agent 消费指南](./agent-consumption.md)。

把 `agent-prompt.md`（或 Sheet 内复制的提示词）交给 Cursor / Codex 即可开始只读消费。提示词只携带固定身份、风险与渐进读取协议，不内嵌 Evidence Brief 或完整 Review Contract；Agent 通过 Handoff index 和按需投影建立理解，首轮只输出摘要与实施计划。

已经成功采集且原型没有变化时，不需要重新采集。在「采集结果」中点击「重新生成 Agent 提示词」，会复用当前 Snapshot 和已有 Handoff，只重新写 Delivery。CLI 等价方式是：

```bash
pnpm pb -- deliver \
  --bundle <bundle-id> \
  --snapshot <snapshot-id> \
  --target apps/flutter_pb_app
```

所有根脚本和参数见[本地操作脚本](./operator-scripts.md)。

## 验证仓库

```bash
pnpm verify
```

完整门禁包含安装锁文件检查、构建、类型检查、Core/Service/CLI/PBWork 测试、真实浏览器 Runtime Capture、MCP、Consumer 和 PBWork → Store → MCP 垂直切片。
