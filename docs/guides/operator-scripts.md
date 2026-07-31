# 本地操作脚本

仓库根脚本减少本地路径、端口和固定 ID 的手工拼接，但不定义新的产品语义。Selection、warning、risk、Capture、Handoff 和 MCP 读取仍由 CLI、Core 与 MCP 实现。

## 命令

| 命令 | 用途 | 是否写入持久状态 |
| --- | --- | --- |
| `pnpm pb:doctor` | 检查环境、配置、浏览器、构建、Store 和服务可达性 | 否 |
| `pnpm pb:up` | 按 Workspace 配置启动 PBWork 与 Local Service | Service 可以在启动恢复时终结 orphan Job |
| `pnpm pb -- <args>` | 从仓库根目录调用正式 CLI | 由具体 CLI 命令决定 |
| `pnpm pb:mcp` | 从配置解析 Store/Workspace 并启动 stdio MCP | 否 |
| `pnpm pb:journey` | 用真实 CLI 采集、创建 Handoff、检查 MCP 固定读取并保存收据 | 是 |

`pnpm pbwork` 是 `pnpm pb:up` 的兼容别名。

## Doctor

```bash
pnpm pb:doctor
pnpm pb:doctor -- --require-running
pnpm pb:doctor -- --json
```

默认模式允许 PBWork 和 Local Service 尚未启动；`--require-running` 把服务不可达视为失败。Doctor 检查：

- Node.js 与 pnpm；
- Workspace 配置和 loopback 边界；
- `service.allowedOrigins` 是否包含 Workbench origin；
- Store 的逻辑 Workspace；
- CLI/MCP 构建产物；
- Playwright Chromium；
- Runtime 与 Local Service 端口。

Doctor 不安装依赖、不启动服务、不修改配置。

## 启动 PBWork

```bash
pnpm pb:up
pnpm pb:up -- --config /absolute/path/to/proto-bridge.json
```

脚本读取配置中的 Runtime URL、Service 端口、Store、Workspace 和 Case 上限，启动 PBWork 与 Local Service，等待两个端口可达后打印 Workbench URL。`Ctrl+C` 同时停止两个子进程。

## 调用 CLI

```bash
pnpm pb -- workspace doctor
pnpm pb -- bundle list
pnpm pb -- preflight \
  --selection examples/selections/ledger-planet-task-list.json
```

包装脚本只缩短可执行路径；全部参数、输出和退出码仍由 `@proto-bridge/cli` 决定。构建产物缺失时会先运行根 `pnpm build`。

## 启动 MCP

```bash
pnpm pb:mcp
pnpm pb:mcp -- --config /absolute/path/to/proto-bridge.json
```

MCP wrapper 从配置解析绝对 Store root 和 Workspace，并通过 stdio 启动正式 MCP server。stdio 的 stdout 只用于 JSON-RPC，启动信息写入 stderr。

查看 Cursor/Codex 可用的配置材料：

```bash
pnpm pb:mcp -- --print-config
```

输出只包含命令、参数、Workspace 和 Store，不启动 MCP。
Agent 客户端应使用输出中的直接 `node scripts/pb-mcp.mjs` 命令，避免包管理器的生命周期日志进入 stdio。MCP 启动不会隐式构建；构建缺失时先运行 `pnpm build`。

## Guided Journey

先在一个终端运行：

```bash
pnpm pb:up
```

再在另一个终端运行：

```bash
pnpm pb:journey
```

默认使用
`examples/selections/ledger-planet-task-list.json`。自定义原型可以传入自己的 `SelectionDraft`：

```bash
pnpm pb:journey -- \
  --selection /absolute/path/to/selection.json \
  --target /absolute/path/to/apps/flutter_pb_app \
  --intent "实现本次原型范围"
```

Journey 顺序调用真实入口：

1. CLI Preflight；
2. 逐项确认 warning；
3. CLI Capture；
4. Snapshot inspect；
5. 逐项确认 Handoff risk；
6. Handoff create；
7. MCP 读取固定 Workspace、Handoff 和 Snapshot；
8. 生成 Agent prompt 与 Journey receipt。

warning 使用交互确认或可重复的 `--accept-warning <id>`；Handoff risk 使用交互确认或可重复的 `--ack-risk <kind>`。Journey 不提供全局确认或 force。

产物保存在：

```text
.proto-bridge/journeys/<timestamp>/
├── receipt.json
└── agent-prompt.md

.proto-bridge/journeys/latest.json
```

Receipt 记录 Selection、Workspace、Store、Bundle、Run、Snapshot、Handoff、确认项和 MCP 检查结果。目录属于本地操作记录，不提交 Git。

## 适用边界

- `pnpm verify` 是可重复的仓库门禁；
- `pnpm pb:journey` 是保留真实 Evidence 的本地操作验收；
- PBWork GUI 是交互选择与 Review 入口；
- Cursor/Codex 是真实 Consumer，Journey 只生成 prompt，不代替 Agent。

完整人工验收顺序应以当前验收任务文档为准；稳定的 Agent 读取规则仍由 [Agent 消费指南](./agent-consumption.md)定义。
